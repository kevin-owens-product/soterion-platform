# CLAUDE.md — Soterion AI Platform

This file is the primary instruction source for Claude Code when working on the Soterion platform.
Read this fully before writing any code or running any commands.

---

## What Is Soterion

Soterion is an enterprise AI platform for airports. It ingests LiDAR point cloud data from a sensor
network and transforms it into real-time security threat detection, passenger flow intelligence, and
operations analytics - delivered through a unified command dashboard with gamification mechanics that
drive operator performance.

**Stack in one line:** React + Vite frontend → Node/Fastify REST API → PostgreSQL/TimescaleDB →
Python FastAPI ML service → Redis pub/sub → WebSocket live streams.

---

## Repository Structure

```
soterion/
├── CLAUDE.md                      ← you are here
├── README.md
├── .env.example
├── docker-compose.yml             ← local dev: all services
├── render.yaml                    ← Render deployment blueprint
├── .gitignore
│
├── apps/
│   ├── web/                       ← React + Vite frontend
│   │   ├── src/
│   │   │   ├── components/        ← shared UI components
│   │   │   ├── views/             ← page-level views (OpsCenter, Security, Leaderboard, Sensors)
│   │   │   ├── widgets/           ← W-01 through W-10 dashboard widgets
│   │   │   ├── store/             ← Zustand global state slices
│   │   │   ├── hooks/             ← useAlerts, useSensorStatus, useShiftScore, useMissions
│   │   │   ├── lib/               ← API client (React Query), WebSocket client
│   │   │   ├── types/             ← TypeScript types matching backend models
│   │   │   └── main.tsx
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   └── package.json
│   │
│   └── api/                       ← Node.js + Fastify REST API
│       ├── src/
│       │   ├── routes/            ← lidar.ts, alerts.ts, zones.ts, scores.ts, operators.ts
│       │   ├── db/                ← PostgreSQL client, migrations, seed data
│       │   ├── jobs/              ← BullMQ workers (anomaly processor, score calculator, badge engine)
│       │   ├── ws/                ← WebSocket server (sensor streams, alert push)
│       │   ├── middleware/        ← auth (JWT + API key), rate limiting, error handling
│       │   └── server.ts
│       └── package.json
│
├── services/
│   └── ml/                        ← Python FastAPI ML inference service
│       ├── app/
│       │   ├── main.py            ← FastAPI app
│       │   ├── models/            ← ONNX anomaly model, queue prediction model
│       │   ├── inference.py       ← point cloud → anomaly score pipeline
│       │   └── schemas.py         ← Pydantic request/response models
│       └── requirements.txt
│
├── infra/
│   ├── db/
│   │   ├── migrations/            ← SQL migration files (numbered, sequential)
│   │   └── seed.sql               ← demo data for local dev
│   └── redis/
│       └── redis.conf
│
└── docs/
    ├── PRD.md                     ← full product requirements
    ├── API.md                     ← endpoint reference
    └── ARCHITECTURE.md            ← system design decisions
```

---

## Database Schema

Run migrations in order. Use `psql $DATABASE_URL -f infra/db/migrations/00N_name.sql`.

### 001_extensions.sql
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS timescaledb;
```

### 002_core_tables.sql
```sql
-- Airports (multi-tenant root)
CREATE TABLE airports (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  iata_code   CHAR(3) UNIQUE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Terminals within airports
CREATE TABLE terminals (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  airport_id  UUID REFERENCES airports(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  floor_plan  JSONB  -- GeoJSON polygon layout
);

-- Spatial zones within terminals
CREATE TABLE zones (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  terminal_id  UUID REFERENCES terminals(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  type         TEXT CHECK (type IN ('security','gate','baggage','curb','lounge','retail','restricted')),
  boundary     GEOMETRY(POLYGON, 4326),
  sla_wait_mins INT DEFAULT 15
);

-- LiDAR sensor nodes
CREATE TABLE sensor_nodes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  zone_id       UUID REFERENCES zones(id),
  label         TEXT NOT NULL,          -- e.g. "S-001"
  model         TEXT,                   -- e.g. "Hesai JT128"
  coords        GEOMETRY(POINTZ, 4326), -- x,y,z install position
  fov_degrees   NUMERIC DEFAULT 360,
  range_meters  NUMERIC DEFAULT 50,
  health        TEXT DEFAULT 'ONLINE' CHECK (health IN ('ONLINE','DEGRADED','OFFLINE')),
  last_ping_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Operator accounts
CREATE TABLE operators (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  airport_id    UUID REFERENCES airports(id),
  name          TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  role          TEXT DEFAULT 'operator' CHECK (role IN ('operator','supervisor','admin')),
  team          TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### 003_time_series.sql
```sql
-- Track objects (ephemeral, no PII)
CREATE TABLE track_objects (
  time          TIMESTAMPTZ NOT NULL,
  track_id      UUID NOT NULL,
  sensor_id     UUID REFERENCES sensor_nodes(id),
  zone_id       UUID REFERENCES zones(id),
  centroid      GEOMETRY(POINTZ, 4326),
  velocity_ms   NUMERIC,
  classification TEXT CHECK (classification IN ('PERSON','VEHICLE','OBJECT','UNKNOWN')),
  behavior_score NUMERIC CHECK (behavior_score BETWEEN 0 AND 100),
  dwell_secs    INT DEFAULT 0
);
SELECT create_hypertable('track_objects', 'time');
CREATE INDEX ON track_objects (zone_id, time DESC);

-- Zone density snapshots (aggregated every 5s from tracks)
CREATE TABLE zone_density (
  time          TIMESTAMPTZ NOT NULL,
  zone_id       UUID REFERENCES zones(id),
  count         INT NOT NULL,
  density_pct   NUMERIC,
  avg_dwell_secs NUMERIC
);
SELECT create_hypertable('zone_density', 'time');

-- Queue metrics per checkpoint
CREATE TABLE queue_metrics (
  time          TIMESTAMPTZ NOT NULL,
  zone_id       UUID REFERENCES zones(id),
  queue_depth   INT NOT NULL,
  wait_time_mins NUMERIC,
  throughput_per_hr INT,
  sla_met       BOOLEAN
);
SELECT create_hypertable('queue_metrics', 'time');
```

### 004_events.sql
```sql
-- Anomaly events from AI detection
CREATE TABLE anomaly_events (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  airport_id    UUID REFERENCES airports(id),
  zone_id       UUID REFERENCES zones(id),
  type          TEXT CHECK (type IN ('LOITERING','INTRUSION','CROWD_SURGE','ABANDONED_OBJECT','PERIMETER_BREACH','DRONE_DETECTED')),
  severity      INT CHECK (severity BETWEEN 1 AND 5),
  confidence    NUMERIC CHECK (confidence BETWEEN 0 AND 1),
  track_ids     UUID[],
  snapshot_s3   TEXT,  -- S3 key for point cloud frames
  acknowledged  BOOLEAN DEFAULT FALSE,
  acknowledged_by UUID REFERENCES operators(id),
  acknowledged_at TIMESTAMPTZ,
  escalated     BOOLEAN DEFAULT FALSE,
  resolved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON anomaly_events (airport_id, created_at DESC);
CREATE INDEX ON anomaly_events (zone_id, severity, acknowledged);
```

### 005_gamification.sql
```sql
-- Shift score records
CREATE TABLE shift_scores (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  operator_id     UUID REFERENCES operators(id),
  airport_id      UUID REFERENCES airports(id),
  shift_date      DATE NOT NULL,
  shift_start     TIMESTAMPTZ,
  shift_end       TIMESTAMPTZ,
  total_score     NUMERIC,
  security_score  NUMERIC,
  flow_score      NUMERIC,
  response_score  NUMERIC,
  compliance_score NUMERIC,
  uptime_score    NUMERIC,
  streak_multiplier NUMERIC DEFAULT 1.0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(operator_id, shift_date)
);

-- Badge definitions
CREATE TABLE badge_definitions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key         TEXT UNIQUE NOT NULL,  -- e.g. "FIRST_THREAT_DETECTED"
  name        TEXT NOT NULL,
  description TEXT,
  icon        TEXT,
  category    TEXT
);

-- Earned badges
CREATE TABLE operator_badges (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  operator_id UUID REFERENCES operators(id),
  badge_id    UUID REFERENCES badge_definitions(id),
  earned_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(operator_id, badge_id)
);

-- KPI missions
CREATE TABLE missions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  airport_id    UUID REFERENCES airports(id),
  title         TEXT NOT NULL,
  description   TEXT,
  metric_key    TEXT NOT NULL,   -- e.g. "alerts_acknowledged_before_escalation"
  target_value  NUMERIC NOT NULL,
  reward_type   TEXT,            -- "score_bonus" | "badge_progress" | "streak_protect"
  reward_value  TEXT,
  resets_at     TIMESTAMPTZ,
  active        BOOLEAN DEFAULT TRUE
);

-- Operator mission progress
CREATE TABLE mission_progress (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  operator_id UUID REFERENCES operators(id),
  mission_id  UUID REFERENCES missions(id),
  progress    NUMERIC DEFAULT 0,
  completed   BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(operator_id, mission_id)
);
```

---

## API Endpoints

All endpoints prefix: `/api/v1`. Auth: `Authorization: Bearer <jwt>` unless marked `[API_KEY]`.

### LiDAR Ingest (internal / edge node use)
```
POST   /lidar/ingest              [API_KEY] Ingest point cloud batch from edge node
GET    /lidar/streams             List active sensor stream health
GET    /lidar/tracks              Live track list (current window)
GET    /lidar/zones/:zoneId/density  Real-time density snapshot
GET    /lidar/heatmap/:terminalId    Heatmap GeoJSON + PNG
GET    /lidar/queue/:checkpointId   Queue depth, wait, throughput
WS     /ws/live/:sensorId           Real-time point cloud delta stream
```

### Alerts & Events
```
GET    /alerts                    List alerts (filter: zone, severity, acknowledged, date)
GET    /alerts/:id                Single alert detail with track IDs + snapshot
POST   /alerts/:id/acknowledge    Acknowledge alert (operator action)
POST   /alerts/:id/escalate       Escalate to supervisor
GET    /alerts/stats              Aggregated stats (today: counts by type, avg confidence)
```

### Zones & Terminals
```
GET    /zones                     List zones for airport (with current density)
GET    /zones/:id                 Zone detail + sensor list
GET    /terminals                 List terminals
GET    /terminals/:id/flow        Passenger flow funnel data (curb → check-in → security → gate)
```

### Sensors
```
GET    /sensors                   All sensors for airport with health status
GET    /sensors/:id               Sensor detail + uptime history
PATCH  /sensors/:id               Update health, location, model
GET    /sensors/:id/metrics       Latency, packet loss, ping history (time-series)
```

### Operators & Auth
```
POST   /auth/login                Email + password → JWT
POST   /auth/refresh              Refresh JWT
GET    /operators/me              Current operator profile
GET    /operators                 [supervisor+] List operators for airport
```

### Gamification
```
GET    /scores/shift              Current shift score breakdown (live, recalculates on request)
GET    /scores/history            Operator's shift score history
GET    /leaderboard               Weekly leaderboard for airport (ranked)
GET    /badges                    All badge definitions
GET    /badges/mine               Operator's earned badges
GET    /missions                  Active missions for airport
GET    /missions/progress         Operator's mission progress
```

---

## Shift Score Formula

Calculated at shift end by BullMQ worker `shift-score-calculator`. Stored in `shift_scores`.

```
total_score = (
  security_score  * 0.30 +
  flow_score      * 0.25 +
  response_score  * 0.20 +
  compliance_score * 0.15 +
  uptime_score    * 0.10
) * streak_multiplier

security_score  = f(threat_detection_rate, false_positive_rate, response_time_critical)
flow_score      = f(queue_sla_pct, throughput_vs_forecast, bottleneck_events)
response_score  = f(median_ack_time, p95_ack_time)
compliance_score = f(required_actions_completed_pct, escalation_protocol_adherence)
uptime_score    = f(assigned_sensors_online_pct_during_shift)

streak_multiplier = min(2.0, 1 + (consecutive_qualifying_shifts * 0.05))
                    where qualifying = total_score > 750
```

---

## Environment Variables

Required in both `.env` (local) and Render env vars (production):

```bash
# Database
DATABASE_URL=postgresql://soterion:password@localhost:5432/soterion
REDIS_URL=redis://localhost:6379

# Auth
JWT_SECRET=<32-char minimum random string>
API_KEY_SALT=<random string for hashing API keys>

# ML Service
ML_SERVICE_URL=http://localhost:8000

# AWS (point cloud frame storage)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=soterion-frames
AWS_REGION=eu-west-2

# App
NODE_ENV=development
PORT=3001
WEB_URL=http://localhost:5173
```

---

## Local Dev Setup

```bash
# 1. Clone and install
git clone https://github.com/<org>/soterion
cd soterion
npm install               # installs all workspace packages

# 2. Start infrastructure
docker-compose up -d      # postgres + timescaledb + redis

# 3. Run migrations
psql $DATABASE_URL -f infra/db/migrations/001_extensions.sql
psql $DATABASE_URL -f infra/db/migrations/002_core_tables.sql
psql $DATABASE_URL -f infra/db/migrations/003_time_series.sql
psql $DATABASE_URL -f infra/db/migrations/004_events.sql
psql $DATABASE_URL -f infra/db/migrations/005_gamification.sql
psql $DATABASE_URL -f infra/db/seed.sql

# 4. Start services
npm run dev:api           # Fastify API on :3001
npm run dev:ml            # Python ML service on :8000
npm run dev:web           # Vite dev server on :5173
```

---

## Docker Compose (local)

```yaml
version: "3.9"
services:
  db:
    image: timescale/timescaledb-ha:pg16-latest
    environment:
      POSTGRES_DB: soterion
      POSTGRES_USER: soterion
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  pgdata:
```

---

## Render Deployment (render.yaml)

```yaml
services:
  - type: web
    name: soterion-api
    runtime: node
    buildCommand: cd apps/api && npm install && npm run build
    startCommand: cd apps/api && npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: soterion-db
          property: connectionString
      - key: REDIS_URL
        fromService:
          name: soterion-redis
          type: redis
          property: connectionString
      - key: JWT_SECRET
        generateValue: true
      - key: ML_SERVICE_URL
        fromService:
          name: soterion-ml
          type: web
          property: host

  - type: web
    name: soterion-web
    runtime: static
    buildCommand: cd apps/web && npm install && npm run build
    staticPublishPath: apps/web/dist
    routes:
      - type: rewrite
        source: /*
        destination: /index.html

  - type: web
    name: soterion-ml
    runtime: python
    buildCommand: cd services/ml && pip install -r requirements.txt
    startCommand: cd services/ml && uvicorn app.main:app --host 0.0.0.0 --port $PORT

databases:
  - name: soterion-db
    databaseName: soterion
    plan: standard

  - name: soterion-redis
    type: redis
    plan: standard
```

---

## Build Phases for Claude Code

Work through these phases in order. Do not skip ahead. Complete each phase fully before moving to the next.

### Phase 1 — Scaffold (start here)
- [ ] Create monorepo structure matching the tree above
- [ ] `apps/web`: Vite + React 18 + TypeScript + Tailwind project
- [ ] `apps/api`: Fastify + TypeScript project with src/ structure
- [ ] `services/ml`: Python FastAPI project with requirements.txt
- [ ] Root `package.json` with workspaces + scripts (dev:web, dev:api, dev:ml)
- [ ] `docker-compose.yml`, `.env.example`, `.gitignore`, `render.yaml`
- [ ] All SQL migration files in `infra/db/migrations/`

### Phase 2 — Database + API foundation
- [ ] Fastify server.ts with plugin registration (cors, jwt, sensible)
- [ ] Database client (postgres.js or pg) with connection pool
- [ ] Auth routes: POST /auth/login, POST /auth/refresh
- [ ] JWT middleware (verify token, attach operator to request)
- [ ] API key middleware for ingest endpoints
- [ ] Sensor routes (GET /sensors, GET /sensors/:id)
- [ ] Zone routes (GET /zones)

### Phase 3 — LiDAR ingest pipeline
- [ ] POST /lidar/ingest endpoint with Zod schema validation
- [ ] TimescaleDB write path for track_objects and zone_density
- [ ] BullMQ queue setup (Redis connection, queue definitions)
- [ ] Anomaly processor worker: consume ingest → call ML service → write anomaly_events
- [ ] WebSocket server on /ws/live/:sensorId
- [ ] Redis pub/sub for broadcasting new anomaly_events to connected clients

### Phase 4 — Dashboard frontend
- [ ] Zustand store slices: alertsStore, sensorStore, operatorStore, shiftStore
- [ ] React Query setup with API client and auth header injection
- [ ] useAlerts hook (WebSocket + REST fallback)
- [ ] useSensorStatus hook (5s polling)
- [ ] useShiftScore hook (30s polling)
- [ ] App shell: sidebar nav, header with score display, view router
- [ ] W-02 Live Threat Feed: alert cards, acknowledge button, severity badges
- [ ] W-03 Queue Intelligence Panel: per-checkpoint metrics cards
- [ ] W-04 Passenger Flow Heatmap: Canvas heatmap with terminal floor plan overlay
- [ ] W-05 Sensor Network Status: health grid

### Phase 5 — Analytics and 3D
- [ ] W-08 Journey Analytics Timeline: funnel chart with Recharts
- [ ] W-06 Shift Performance Scorecard: SVG animated rings per dimension
- [ ] W-01 Airport Digital Twin: Three.js scene, zone color-coded geometry
- [ ] Python ML service: FastAPI app, ONNX model loading, /predict/anomaly endpoint
- [ ] Queue wait time prediction: scikit-learn model, /predict/queue endpoint

### Phase 6 — Gamification
- [ ] Shift score calculation worker (BullMQ, runs at shift end or on-demand)
- [ ] Badge engine: event listener on anomaly_events + shift_scores → check badge criteria → INSERT operator_badges
- [ ] Streak calculation: daily job checking shift_scores, updating streak counter in Redis
- [ ] Mission progress tracker: BullMQ worker updating mission_progress on qualifying events
- [ ] W-07 Operator Leaderboard: weekly aggregate query, ranked table component
- [ ] GET /leaderboard, GET /badges/mine, GET /missions/progress endpoints
- [ ] Toast notification system in frontend for badge unlocks and mission completions

### Phase 7 — Production hardening
- [ ] Rate limiting (fastify-rate-limit): 100/min general, 1000/min ingest
- [ ] SOC 2 audit logging: middleware writing every authenticated request to audit_log table
- [ ] Multi-tenant query scoping: RLS policies or `WHERE airport_id = $operator.airportId` enforcement
- [ ] AES-256 encryption for snapshot_s3 references
- [ ] Playwright e2e tests for critical flows: login, alert acknowledge, leaderboard load
- [ ] k6 load test for POST /lidar/ingest at 1000 req/s
- [ ] GitHub Actions CI: lint → typecheck → test → build on every PR

---

## Key Conventions

- **No PII ever stored.** track_objects has no names, faces, or IDs. The system sees positions and behaviors, not people.
- **airport_id scoping everywhere.** Every query against alerts, zones, sensors, scores must filter by the operator's airport_id. No cross-tenant data.
- **Feature flags for all new widgets.** Use a `VITE_FF_WIDGET_NAME=true` env var pattern. Default off.
- **WebSocket reconnect.** The frontend WS client must handle reconnection with exponential backoff (1s, 2s, 4s, max 30s).
- **Edge-first for latency.** Anomaly detection runs on the edge node (Python ONNX). The cloud API receives scored events, not raw point clouds, except for incident replay.
- **Zod everywhere in the API.** All request bodies and query params validated with Zod schemas. No raw req.body access.
- **TypeScript strict mode** in both web and api packages.

---

## Design System (Soterion brand)

```css
--color-bg:          #080808;
--color-surface:     #0e0e0e;
--color-surface-alt: #111111;
--color-border:      #1a1a1a;
--color-text:        #d4d4d4;
--color-text-muted:  #737373;
--color-text-dim:    #525252;
--color-accent:      #f59e0b;   /* amber — primary brand */
--color-critical:    #ef4444;
--color-high:        #f97316;
--color-medium:      #f59e0b;
--color-ok:          #22c55e;
--color-info:        #06b6d4;
--font-display:      'Bebas Neue', sans-serif;
--font-mono:         'IBM Plex Mono', monospace;
--font-body:         'Barlow', sans-serif;
```

All Tailwind custom tokens are defined as CSS variables in `apps/web/src/styles/tokens.css`.

---

## Questions Claude Code Should Ask Before Building

If any of the following are unclear, ask before writing code:

1. What is the GitHub org/username for the repo?
2. Is a Render account already connected via MCP?
3. Is there existing airport/terminal data to seed, or should the seed use Heathrow T2 as the demo airport?
4. What is the LiDAR sensor brand being used in the pilot airport? (Affects edge node config)
5. Should the ML service use a real ONNX model or a deterministic mock for the initial build?

---

*Last updated: March 2026 — Soterion AI platform v1.0*

---

## Multi-Vertical Expansion Architecture

Soterion Platform is facility-agnostic. The core spatial intelligence layer (LiDAR ingest, track objects,
anomaly detection, density analytics) applies to any physical environment where people and assets move.
This section defines the config-driven abstraction that enables vertical expansion without forking the codebase.

### Supported Facility Types

```typescript
type FacilityType =
  | "AIRPORT"
  | "SEAPORT"
  | "TRANSIT_HUB"        // train stations, bus terminals
  | "STADIUM"
  | "HOSPITAL"
  | "SHOPPING_CENTRE"
  | "LOGISTICS_WAREHOUSE"
  | "CRITICAL_INFRASTRUCTURE"  // data centres, utilities
  | "CAMPUS"             // universities, corporate HQ
  | "CUSTOM";
```

### Schema Changes for Multi-Vertical

#### 006_facilities.sql
```sql
-- Replace airports table with generic facilities
CREATE TABLE facilities (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  type            TEXT NOT NULL,  -- FacilityType enum
  short_code      TEXT UNIQUE NOT NULL,  -- e.g. "LHR", "PORT-FELIXSTOWE"
  address         TEXT,
  country_code    CHAR(2),
  timezone        TEXT DEFAULT 'UTC',
  config          JSONB DEFAULT '{}',   -- vertical-specific config blob
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Zone type taxonomy is now configurable per facility type
CREATE TABLE zone_type_definitions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  facility_type   TEXT NOT NULL,
  key             TEXT NOT NULL,        -- e.g. "DOCK", "PITCH", "WARD"
  label           TEXT NOT NULL,        -- display name
  default_sla     JSONB,               -- type-specific SLA defaults
  UNIQUE(facility_type, key)
);

-- KPI definitions are configurable per facility type
CREATE TABLE kpi_definitions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  facility_type   TEXT NOT NULL,
  key             TEXT NOT NULL,        -- e.g. "TURNAROUND_MINS", "DWELL_SECS"
  label           TEXT NOT NULL,
  unit            TEXT,
  direction       TEXT CHECK (direction IN ('lower_better', 'higher_better')),
  default_target  NUMERIC,
  UNIQUE(facility_type, key)
);

-- ML model registry - different anomaly models per vertical
CREATE TABLE ml_model_registry (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  facility_type   TEXT NOT NULL,
  model_key       TEXT NOT NULL,        -- e.g. "anomaly_v2", "crowd_v1"
  onnx_s3_key     TEXT NOT NULL,
  version         TEXT NOT NULL,
  active          BOOLEAN DEFAULT FALSE,
  deployed_at     TIMESTAMPTZ,
  UNIQUE(facility_type, model_key, version)
);

-- Compliance frameworks per vertical
CREATE TABLE compliance_frameworks (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  facility_type   TEXT NOT NULL,
  framework_key   TEXT NOT NULL,        -- e.g. "TSA", "ICAO", "CQC", "ISO_28000"
  label           TEXT NOT NULL,
  rules           JSONB DEFAULT '[]',   -- array of rule definitions
  UNIQUE(facility_type, framework_key)
);
```

### Vertical Zone Taxonomies (seed data)

```sql
-- Airport zones (existing)
INSERT INTO zone_type_definitions (facility_type, key, label) VALUES
  ('AIRPORT', 'security_checkpoint', 'Security Checkpoint'),
  ('AIRPORT', 'gate', 'Departure Gate'),
  ('AIRPORT', 'baggage_claim', 'Baggage Claim'),
  ('AIRPORT', 'arrivals_curb', 'Arrivals Curb'),
  ('AIRPORT', 'lounge', 'Departure Lounge'),
  ('AIRPORT', 'retail', 'Retail Zone'),
  ('AIRPORT', 'restricted', 'Restricted Airside');

-- Seaport zones
INSERT INTO zone_type_definitions (facility_type, key, label) VALUES
  ('SEAPORT', 'berth', 'Berth / Dock'),
  ('SEAPORT', 'container_yard', 'Container Yard'),
  ('SEAPORT', 'gate_in', 'Gate In'),
  ('SEAPORT', 'gate_out', 'Gate Out'),
  ('SEAPORT', 'customs', 'Customs Inspection'),
  ('SEAPORT', 'reefer_zone', 'Refrigerated Container Zone'),
  ('SEAPORT', 'restricted', 'Restricted Quayside');

-- Stadium zones
INSERT INTO zone_type_definitions (facility_type, key, label) VALUES
  ('STADIUM', 'turnstile', 'Entry Turnstile Bank'),
  ('STADIUM', 'concourse', 'Concourse'),
  ('STADIUM', 'stand', 'Seating Stand'),
  ('STADIUM', 'pitch_perimeter', 'Pitch Perimeter'),
  ('STADIUM', 'concession', 'Concession Area'),
  ('STADIUM', 'vip_lounge', 'VIP / Hospitality'),
  ('STADIUM', 'emergency_exit', 'Emergency Exit Corridor');

-- Hospital zones
INSERT INTO zone_type_definitions (facility_type, key, label) VALUES
  ('HOSPITAL', 'emergency', 'Emergency Department'),
  ('HOSPITAL', 'ward', 'Patient Ward'),
  ('HOSPITAL', 'reception', 'Reception / Triage'),
  ('HOSPITAL', 'restricted_theatre', 'Operating Theatre (Restricted)'),
  ('HOSPITAL', 'pharmacy', 'Pharmacy'),
  ('HOSPITAL', 'car_park', 'Car Park / Drop-off'),
  ('HOSPITAL', 'corridor', 'Main Corridor');

-- Transit hub zones
INSERT INTO zone_type_definitions (facility_type, key, label) VALUES
  ('TRANSIT_HUB', 'platform', 'Platform'),
  ('TRANSIT_HUB', 'concourse', 'Main Concourse'),
  ('TRANSIT_HUB', 'ticket_hall', 'Ticket Hall'),
  ('TRANSIT_HUB', 'barrier', 'Fare Barrier Bank'),
  ('TRANSIT_HUB', 'interchange', 'Interchange Corridor'),
  ('TRANSIT_HUB', 'restricted_track', 'Trackside (Restricted)');
```

### Vertical-Specific Anomaly Types

Each facility type registers its own anomaly taxonomy. Core types (INTRUSION, CROWD_SURGE, ABANDONED_OBJECT)
are universal. Additional types are vertical-specific:

```typescript
const ANOMALY_TYPES = {
  // Universal
  INTRUSION:          ["ALL"],
  CROWD_SURGE:        ["ALL"],
  ABANDONED_OBJECT:   ["ALL"],
  LOITERING:          ["ALL"],

  // Airport / Transit
  PERIMETER_BREACH:   ["AIRPORT", "TRANSIT_HUB", "CRITICAL_INFRASTRUCTURE"],
  DRONE_DETECTED:     ["AIRPORT", "STADIUM", "CRITICAL_INFRASTRUCTURE"],
  WRONG_WAY:          ["AIRPORT", "TRANSIT_HUB"],   // person moving against flow

  // Seaport / Logistics
  VEHICLE_OVERSPEED:  ["SEAPORT", "LOGISTICS_WAREHOUSE"],
  CONTAINER_PROXIMITY:["SEAPORT", "LOGISTICS_WAREHOUSE"],
  UNAUTHORISED_VEHICLE:["SEAPORT", "LOGISTICS_WAREHOUSE", "CRITICAL_INFRASTRUCTURE"],

  // Stadium
  PITCH_INCURSION:    ["STADIUM"],
  EXIT_BLOCKAGE:      ["STADIUM"],
  CROWD_CRUSH_RISK:   ["STADIUM"],   // density + velocity vector anomaly

  // Hospital
  PATIENT_FALL_RISK:  ["HOSPITAL"],  // sudden stop + prone position detection
  RESTRICTED_ACCESS:  ["HOSPITAL", "CRITICAL_INFRASTRUCTURE"],
  ASSET_REMOVAL:      ["HOSPITAL"],  // medical equipment leaving zone
};
```

### Vertical Compliance Frameworks

```typescript
const COMPLIANCE_MAP = {
  AIRPORT:                  ["TSA", "ICAO_ANNEX_17", "GDPR"],
  SEAPORT:                  ["ISO_28000", "ISPS_CODE", "GDPR"],
  STADIUM:                  ["GREEN_GUIDE_UK", "FIFA_SAFETY", "GDPR"],
  HOSPITAL:                 ["CQC", "NHS_ESTATES", "GDPR", "HIPAA"],
  TRANSIT_HUB:              ["DFT_UK", "RSSB", "GDPR"],
  LOGISTICS_WAREHOUSE:      ["ISO_28000", "HSE_UK", "GDPR"],
  CRITICAL_INFRASTRUCTURE:  ["NIS2", "ISO_27001", "GDPR"],
};
```

### Frontend: Facility Type Config Context

The React app loads a `facilityConfig` object on login that drives:
- Which zone types are available in the UI
- Which anomaly types appear in the threat feed
- Which KPIs are shown in the queue panel
- Which compliance framework is shown in reports
- Which ML model to request from the inference service

```typescript
// src/lib/facilityConfig.ts
interface FacilityConfig {
  facilityType: FacilityType;
  zoneTypes: ZoneTypeDefinition[];
  anomalyTypes: string[];
  kpiDefinitions: KpiDefinition[];
  complianceFrameworks: string[];
  activeMLModels: Record<string, string>;  // modelKey → version
}

// Loaded once at login, stored in Zustand facilityStore
// All widgets read from facilityConfig, never hardcode facility-specific values
```

### Phase 8 — Multi-Vertical Abstraction (add to build plan)

- [ ] Run migration 006_facilities.sql, update all foreign keys from `airport_id` to `facility_id`
- [ ] Seed zone_type_definitions for all 6 verticals
- [ ] Seed kpi_definitions: airport (queue wait, throughput) + seaport (turnaround, dwell) + stadium (ingress rate, crowd density) + hospital (response time, restricted access events)
- [ ] Seed compliance_frameworks with rule stubs for all verticals
- [ ] ML model registry: register airport anomaly model as `AIRPORT/anomaly_v1`, add stub entries for other verticals
- [ ] API: facility config endpoint `GET /api/v1/facility/config` returning full FacilityConfig for authenticated facility
- [ ] Frontend: facilityStore Zustand slice, load config on login
- [ ] All widgets refactored to consume facilityConfig rather than hardcoded airport strings
- [ ] Zone type selector in admin: dropdown populated from zone_type_definitions for facility type
- [ ] Anomaly type filter in threat feed: driven by facility anomaly types, not hardcoded enum
- [ ] Compliance module stub: framework-aware report generator reading compliance_frameworks table
- [ ] Onboarding flow: new facility wizard (name, type, timezone, zone setup, sensor registration)
- [ ] Multi-facility switcher in header: operators with access to multiple facilities can switch context

---

## Vertical Go-to-Market Priority Order

Based on LiDAR adoption maturity and willingness to pay:

1. **Airports** - already in motion, highest security spend, proven LiDAR ROI
2. **Seaports and freight terminals** - ISO 28000 compliance pressure, high asset value, vehicle + container tracking
3. **Stadiums and arenas** - crowd crush liability post-Hillsborough/Astroworld, Green Guide compliance, event-based contracts
4. **Transit hubs** - Train Operating Companies and Network Rail actively investing in crowd intelligence
5. **Hospitals and NHS trusts** - CQC compliance, restricted area enforcement, asset tracking

Each vertical is a distinct ICP with different procurement cycles and buyer personas.
Target one vertical at a time. Do not spread across all five simultaneously.

---

---

## Security, Compliance, and Admin Platform

Soterion Platform must achieve **SOC 2 Type II** and **FedRAMP Moderate** authorization.
FedRAMP Moderate is the governing standard - it is a superset of SOC 2 and maps to NIST SP 800-53 Rev 5
with approximately 325 controls. Build to FedRAMP Moderate and SOC 2 is covered.

FedRAMP Moderate is required for any US federal agency customer (TSA, CBP, DoD facilities, VA hospitals).
It is also increasingly demanded by state and local government airport operators as a procurement signal.

---

### Compliance Posture Overview

| Standard | Level | Governing Framework | Timeline |
|---|---|---|---|
| SOC 2 Type I | Security + Availability + Confidentiality | AICPA TSC | Before first enterprise pilot |
| SOC 2 Type II | All 5 Trust Service Criteria | AICPA TSC | 6 months post-Type I |
| FedRAMP Moderate | NIST SP 800-53 Rev 5 | ~325 controls | 12-18 months, requires 3PAO |
| GDPR | Data Protection | EU Regulation 2016/679 | At launch (EU facilities) |
| ISO 27001 | Information Security | ISO/IEC 27001:2022 | 18-24 months |

---

### Database: Security and Audit Schema

#### 007_security.sql

```sql
-- Immutable audit log (append-only, no UPDATE or DELETE permitted)
CREATE TABLE audit_log (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_time      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_id        UUID,                    -- operator id (null for system events)
  actor_email     TEXT,                    -- denormalised for log integrity
  actor_ip        INET NOT NULL,
  actor_user_agent TEXT,
  facility_id     UUID,
  action          TEXT NOT NULL,           -- e.g. "alert.acknowledge", "sensor.update"
  resource_type   TEXT,                    -- e.g. "anomaly_event", "sensor_node"
  resource_id     UUID,
  before_state    JSONB,                   -- snapshot before mutation
  after_state     JSONB,                   -- snapshot after mutation
  outcome         TEXT CHECK (outcome IN ('SUCCESS','FAILURE','DENIED')),
  session_id      UUID,
  request_id      UUID                     -- correlates to API request trace
);
-- Hypertable for time-series querying at scale
SELECT create_hypertable('audit_log', 'event_time');
-- Prevent any modifications to audit records
CREATE RULE audit_no_update AS ON UPDATE TO audit_log DO INSTEAD NOTHING;
CREATE RULE audit_no_delete AS ON DELETE TO audit_log DO INSTEAD NOTHING;

-- Operator sessions
CREATE TABLE operator_sessions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  operator_id     UUID REFERENCES operators(id),
  facility_id     UUID REFERENCES facilities(id),
  jwt_jti         TEXT UNIQUE NOT NULL,    -- JWT ID claim for revocation
  ip_address      INET NOT NULL,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  expires_at      TIMESTAMPTZ NOT NULL,
  revoked_at      TIMESTAMPTZ,
  revoke_reason   TEXT
);

-- Role-based access control
CREATE TABLE roles (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  facility_id UUID REFERENCES facilities(id),
  name        TEXT NOT NULL,
  description TEXT,
  is_system   BOOLEAN DEFAULT FALSE,       -- system roles cannot be deleted
  UNIQUE(facility_id, name)
);

CREATE TABLE permissions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource    TEXT NOT NULL,              -- e.g. "alerts", "sensors", "leaderboard"
  action      TEXT NOT NULL,             -- e.g. "read", "write", "acknowledge", "escalate"
  description TEXT,
  UNIQUE(resource, action)
);

CREATE TABLE role_permissions (
  role_id       UUID REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY(role_id, permission_id)
);

CREATE TABLE operator_roles (
  operator_id UUID REFERENCES operators(id) ON DELETE CASCADE,
  role_id     UUID REFERENCES roles(id) ON DELETE CASCADE,
  granted_by  UUID REFERENCES operators(id),
  granted_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY(operator_id, role_id)
);

-- API keys (for edge nodes and integrations)
CREATE TABLE api_keys (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  facility_id     UUID REFERENCES facilities(id),
  label           TEXT NOT NULL,
  key_hash        TEXT UNIQUE NOT NULL,    -- bcrypt hash, never store plaintext
  key_prefix      CHAR(8) NOT NULL,        -- first 8 chars for display (e.g. "sk_live_")
  scopes          TEXT[] NOT NULL,         -- e.g. ["lidar:ingest", "sensors:read"]
  last_used_at    TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,
  revoked_at      TIMESTAMPTZ,
  created_by      UUID REFERENCES operators(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Security incidents (FedRAMP IR control family)
CREATE TABLE security_incidents (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  facility_id     UUID REFERENCES facilities(id),
  title           TEXT NOT NULL,
  severity        TEXT CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  category        TEXT,                   -- e.g. "unauthorised_access", "data_exposure", "availability"
  description     TEXT,
  detected_at     TIMESTAMPTZ NOT NULL,
  reported_at     TIMESTAMPTZ,
  contained_at    TIMESTAMPTZ,
  resolved_at     TIMESTAMPTZ,
  root_cause      TEXT,
  remediation     TEXT,
  notified_parties TEXT[],               -- FedRAMP: US-CERT notification within 1 hour for HIGH/CRITICAL
  created_by      UUID REFERENCES operators(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Data retention policies (FedRAMP AU-11, GDPR Art 5)
CREATE TABLE retention_policies (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  facility_id     UUID REFERENCES facilities(id),
  data_type       TEXT NOT NULL,          -- e.g. "track_objects", "audit_log", "anomaly_events"
  retention_days  INT NOT NULL,
  legal_basis     TEXT,                   -- GDPR legal basis
  auto_purge      BOOLEAN DEFAULT FALSE,
  last_purged_at  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Vulnerability tracking (FedRAMP RA-5)
CREATE TABLE vulnerability_findings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source          TEXT,                   -- "snyk", "penetration_test", "internal_scan"
  severity        TEXT CHECK (severity IN ('CRITICAL','HIGH','MEDIUM','LOW','INFORMATIONAL')),
  cve_id          TEXT,
  title           TEXT NOT NULL,
  description     TEXT,
  affected_component TEXT,
  discovered_at   TIMESTAMPTZ NOT NULL,
  remediation_due TIMESTAMPTZ,           -- FedRAMP: CRITICAL=15d, HIGH=30d, MEDIUM=90d
  remediated_at   TIMESTAMPTZ,
  status          TEXT CHECK (status IN ('OPEN','IN_PROGRESS','REMEDIATED','ACCEPTED','FALSE_POSITIVE')),
  risk_acceptance_reason TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

### SOC 2 Trust Service Criteria Implementation

#### Security (CC6-CC9)
- All data encrypted at rest (AES-256) and in transit (TLS 1.3 minimum)
- JWT tokens: RS256 signed, 15-minute expiry, refresh token rotation
- API keys: bcrypt-hashed, scope-limited, revocable, never logged in plaintext
- MFA enforced for all operator accounts (TOTP via authenticator app)
- Passwords: bcrypt cost factor 12, minimum 12 characters, breach-check via HaveIBeenPwned API
- Session management: absolute timeout 8 hours, idle timeout 30 minutes, concurrent session limit 3
- IP allowlisting configurable per facility
- Rate limiting on all endpoints; auth endpoints limited to 5 attempts per 15 minutes with exponential backoff

#### Availability (A1)
- 99.99% uptime SLA (52 minutes downtime per year)
- Multi-AZ database deployment (Render managed Postgres with standby)
- Redis Sentinel for cache high availability
- WebSocket reconnect with exponential backoff (1s, 2s, 4s, max 30s)
- Health check endpoints: GET /health (public), GET /health/deep (internal)
- Automated failover: edge nodes fall back to local processing if API unreachable
- Synthetic monitoring: Datadog Synthetics running every 60 seconds from 3 regions

#### Processing Integrity (PI1)
- Zod schema validation on every ingest and mutation endpoint
- Request ID (UUID) on every API response, logged to audit_log
- Idempotency keys on POST /lidar/ingest to prevent duplicate processing
- Database constraint enforcement as final safety net (not just app-layer validation)
- BullMQ job retries: max 3 with exponential backoff; dead letter queue for inspection

#### Confidentiality (C1)
- No PII ever stored (LiDAR privacy-by-physics)
- Track IDs are ephemeral UUIDs - no linkage to identity possible
- Snapshot S3 keys AES-256 encrypted in database
- Staff access to production data requires approval + audit log entry
- Database column-level encryption for api_key_hash and session tokens
- GDPR data subject request tooling in admin platform

#### Privacy (P1-P8)
- Privacy notice displayed at facility onboarding
- Data retention policies enforced by nightly BullMQ cron job
- Right to erasure: admin platform provides data purge workflow
- Data processing agreements (DPA) template in compliance documentation

---

### FedRAMP Moderate: Critical Control Families

FedRAMP Moderate requires a 3PAO (Third Party Assessment Organization) audit.
These are the control families that require specific implementation attention:

#### AC - Access Control
```
AC-2:  Account management. Operator accounts reviewed quarterly. Inactive accounts 
       disabled after 90 days. Privileged access requires supervisor approval.
AC-3:  Access enforcement. RBAC enforced at API middleware layer AND database RLS policies.
       Dual enforcement: no single point of failure.
AC-6:  Least privilege. API keys scoped to minimum required permissions.
       Admin role requires explicit grant, not default.
AC-17: Remote access. All remote admin access via MFA + VPN or zero-trust proxy.
AC-19: Mobile device policy. Admin platform mobile access restricted; 
       operator dashboard mobile read-only.
```

#### AU - Audit and Accountability
```
AU-2:  Audit events. Every authentication, authorisation decision, data access,
       and configuration change logged to audit_log.
AU-3:  Audit record content. Each record contains: timestamp, actor, IP, action,
       resource, outcome, before/after state, request ID.
AU-9:  Audit log protection. audit_log is append-only (DB rules prevent UPDATE/DELETE).
       Log integrity verified by daily hash chain check.
AU-11: Audit log retention. Minimum 90 days hot, 3 years cold (S3 Glacier).
AU-12: Audit generation. Audit middleware on every authenticated API route.
       Cannot be disabled without code change and deployment.
```

#### CM - Configuration Management
```
CM-2:  Baseline configuration. Infrastructure defined in Terraform. 
       All config in version control. No manual console changes in production.
CM-3:  Configuration change control. All infra changes via PR with approval.
       Terraform plan reviewed before apply.
CM-6:  Configuration settings. CIS benchmarks applied to all compute.
       Security groups, IAM policies defined in Terraform only.
CM-8:  System component inventory. All services, databases, and third-party
       integrations documented in CLAUDE.md and system security plan.
```

#### IA - Identification and Authentication
```
IA-2:  MFA required for all operator accounts. TOTP (RFC 6238).
       WebAuthn/passkeys supported as alternative.
IA-5:  Authenticator management. Password policy enforced, breach-check on set.
       API key rotation enforced every 90 days for privileged scopes.
IA-8:  Non-organisational users. External system integrations (LiDAR edge nodes)
       authenticate via scoped API keys, not operator credentials.
```

#### IR - Incident Response
```
IR-4:  Incident handling. security_incidents table tracks full lifecycle.
       FedRAMP requires US-CERT notification within 1 hour for HIGH/CRITICAL.
       Admin platform incident response workflow enforces this timeline.
IR-6:  Incident reporting. Automated PagerDuty/Slack alert on CRITICAL severity.
       Incident commander assigned via admin platform.
IR-8:  Incident response plan. Documented procedure in /docs/INCIDENT_RESPONSE.md.
       Tabletop exercise required quarterly.
```

#### RA - Risk Assessment
```
RA-5:  Vulnerability scanning. Snyk on every PR. Weekly full dependency scan.
       Penetration test annually by approved vendor.
       vulnerability_findings table tracks all findings with FedRAMP remediation SLAs:
       CRITICAL: 15 days, HIGH: 30 days, MEDIUM: 90 days.
```

#### SC - System and Communications Protection
```
SC-8:  Transmission confidentiality. TLS 1.3 minimum on all connections.
       TLS 1.0 and 1.1 disabled. Certificate pinning on edge node connections.
SC-28: Protection at rest. AES-256 for all stored data. 
       Database encryption at rest (Render managed).
SC-39: Process isolation. Each service runs in its own container.
       ML service has no database access (API only).
```

#### SI - System and Information Integrity
```
SI-2:  Flaw remediation. Snyk CRITICAL/HIGH blocks PR merge.
       Automated dependency updates via Dependabot.
SI-3:  Malicious code protection. Container image scanning on every build.
       Base images pinned to specific SHA digests, not floating tags.
SI-4:  System monitoring. Datadog APM + anomaly detection on API metrics.
       Alert on: p99 latency spike, error rate > 1%, unusual auth failure rate.
```

---

### Admin Platform: Features and Routes

The admin platform is a separate React app (or distinct route group) accessible only to
`ADMIN` and `PLATFORM_ADMIN` roles. It is the control plane for the entire Soterion Platform.

#### Route Structure
```
/admin
  /dashboard          - Platform health overview, compliance posture summary
  /facilities         - Facility list, create, configure, deactivate
  /facilities/:id     - Facility detail: zones, sensors, operators, retention policy
  /operators          - All operators across facilities, create, deactivate
  /operators/:id      - Operator detail: roles, sessions, badge history, shift scores
  /roles              - Role definitions, permission matrix
  /api-keys           - API key management: create, scope, rotate, revoke
  /audit-log          - Immutable audit log viewer with filters and export
  /security
    /incidents        - Security incident tracker, lifecycle management
    /vulnerabilities  - Vulnerability findings, remediation tracking
    /sessions         - Active operator sessions, force-revoke
  /compliance
    /soc2             - SOC 2 control status dashboard
    /fedramp          - FedRAMP control family status, evidence collection
    /gdpr             - GDPR requests, data retention, DPA management
  /retention          - Data retention policy configuration per facility
  /system
    /health           - All service health, uptime history
    /sensors          - Cross-facility sensor fleet overview
    /jobs             - BullMQ queue status, dead letter queue
    /logs             - Application log viewer (non-audit)
```

#### Admin Dashboard Widgets
- **Compliance Posture Ring**: SOC 2 and FedRAMP control pass rate (green/amber/red)
- **Audit Volume Chart**: Events per hour over 24h, anomaly spike highlighting
- **Active Sessions**: Count of active operator sessions by facility
- **Vulnerability Summary**: Open findings by severity with SLA countdown
- **Incident Tracker**: Open incidents by severity, time since detection
- **Data Retention Status**: Tables approaching retention limit, last purge timestamps
- **API Key Health**: Keys expiring within 30 days, last-used deltas
- **Platform Uptime**: 30-day availability per service

---

### Security Middleware Stack (Fastify)

Register in this order in server.ts:

```typescript
// 1. Request ID (every request gets a UUID for tracing)
app.addHook('onRequest', requestIdHook);

// 2. Rate limiting (before auth to protect auth endpoints)
app.register(fastifyRateLimit, {
  global: true,
  max: 100,
  timeWindow: '1 minute',
  keyGenerator: (req) => req.ip,
  onExceeded: (req) => auditLog('rate_limit.exceeded', req),
});

// 3. Auth validation (JWT or API key depending on route)
app.addHook('onRequest', authMiddleware);

// 4. Facility scoping (attach facility context, enforce tenant isolation)
app.addHook('onRequest', facilityContextMiddleware);

// 5. Permission check (RBAC enforcement)
app.addHook('preHandler', permissionMiddleware);

// 6. Audit logging (after auth so actor is known, before handler so failures are logged)
app.addHook('preHandler', auditMiddleware);

// 7. Response security headers
app.addHook('onSend', securityHeadersHook);
// Headers: Strict-Transport-Security, X-Content-Type-Options, X-Frame-Options,
//          Content-Security-Policy, Referrer-Policy, Permissions-Policy
```

---

### Phase 9 — Security, Compliance, and Admin Platform

Add to Claude Code build plan after Phase 8:

- [ ] Run migration 007_security.sql
- [ ] Seed: default roles (operator, supervisor, admin, platform_admin), permissions matrix, system API key scopes
- [ ] Auth hardening: RS256 JWT (replace HS256), 15-min expiry, refresh token rotation, JWT jti tracking in operator_sessions
- [ ] MFA: TOTP implementation (otplib), QR code enrolment flow, backup codes, enforcement gate
- [ ] Password policy: bcrypt cost 12, minimum 12 chars, HaveIBeenPwned breach check on set/change
- [ ] Full security middleware stack registered in correct order (see above)
- [ ] RBAC: role_permissions table loaded into Redis on startup, permission check middleware on every route
- [ ] Audit middleware: writes every authenticated request to audit_log with before/after state diff
- [ ] Append-only audit_log: Postgres rules (no UPDATE, no DELETE), daily hash chain integrity check job
- [ ] API key management: bcrypt hash on create, scope validation on use, rotation enforcement job
- [ ] Session management: absolute 8h timeout, idle 30min timeout, concurrent session limit, force-revoke endpoint
- [ ] Security headers: HSTS, CSP, X-Frame-Options, Referrer-Policy on all responses
- [ ] TLS enforcement: reject TLS < 1.3 at load balancer level, certificate pinning config for edge nodes
- [ ] Data retention: nightly BullMQ cron job purging expired records per retention_policies table
- [ ] Vulnerability tracking: Snyk CI integration blocking merge on CRITICAL/HIGH, weekly full scan job
- [ ] Admin platform frontend: separate /admin route group, PLATFORM_ADMIN role gate
- [ ] Admin: Facility management CRUD, operator management, role assignment UI
- [ ] Admin: API key management UI (create, scope selector, copy-once display, revoke)
- [ ] Admin: Audit log viewer with filters (actor, action, resource, date range, outcome), CSV export
- [ ] Admin: Security incident tracker (create, assign, lifecycle stages, resolution)
- [ ] Admin: Vulnerability findings dashboard with FedRAMP SLA countdown badges
- [ ] Admin: Active session viewer with force-revoke capability
- [ ] Admin: SOC 2 control status dashboard (manual evidence collection + auto-populated from audit_log stats)
- [ ] Admin: FedRAMP control family status (AC, AU, CM, IA, IR, RA, SC, SI families)
- [ ] Admin: GDPR request management (access request, erasure request, data export)
- [ ] Admin: Data retention policy configuration UI per facility per data type
- [ ] Admin: BullMQ job queue health viewer, dead letter queue inspector
- [ ] Admin: Cross-facility sensor fleet overview
- [ ] Penetration test: schedule with approved 3PAO vendor (required before FedRAMP package submission)
- [ ] System Security Plan (SSP): document all 325 FedRAMP Moderate controls in /docs/SSP.md
- [ ] Playwright e2e: admin login, audit log view, role assignment, API key rotation

---

### Environment Variables: Security Additions

```bash
# Auth
JWT_PRIVATE_KEY=<RS256 private key PEM>
JWT_PUBLIC_KEY=<RS256 public key PEM>
JWT_EXPIRY_SECONDS=900              # 15 minutes
REFRESH_TOKEN_EXPIRY_SECONDS=86400  # 24 hours

# MFA
TOTP_ISSUER=Soterion

# Passwords
HIBP_API_KEY=<HaveIBeenPwned API key>

# Session
SESSION_IDLE_TIMEOUT_MINS=30
SESSION_ABSOLUTE_TIMEOUT_HOURS=8
SESSION_MAX_CONCURRENT=3

# Rate limiting
AUTH_RATE_LIMIT_MAX=5
AUTH_RATE_LIMIT_WINDOW_MINS=15

# Audit log
AUDIT_LOG_S3_BUCKET=soterion-audit-cold
AUDIT_LOG_HOT_RETENTION_DAYS=90
AUDIT_LOG_COLD_RETENTION_YEARS=3

# Vulnerability
SNYK_TOKEN=<Snyk API token>

# Incident notification (FedRAMP IR)
PAGERDUTY_ROUTING_KEY=<PagerDuty key>
USCERT_NOTIFICATION_EMAIL=<US-CERT reporting email for FedRAMP>
```

---

*Last updated: March 2026 — Soterion Platform v1.0 — SOC 2 + FedRAMP Moderate Edition*
