# Dev Mock Data Layer - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the Soterion dashboard display life-like data in dev mode so all widgets render with realistic content.

**Architecture:** Fix seed SQL to work without PostGIS, add rich time-series demo data, add a mock emitter that generates live zone density and alerts on timers. All gated behind NODE_ENV=development.

**Tech Stack:** SQL (seed data), TypeScript (mock emitter in Fastify API), existing Zustand/React Query on frontend (no changes needed).

---

### Task 1: Fix seed.sql for JSONB geometry columns

**Files:**
- Modify: `infra/db/seed.sql`

**What:** The seed uses `ST_GeomFromText()` and `ST_MakePoint()` PostGIS functions, but the schema now uses JSONB columns instead of GEOMETRY. Replace all PostGIS function calls with plain JSONB objects.

**Steps:**
1. Replace all `ST_GeomFromText('POLYGON(...)')` with `'{"type":"Polygon","coordinates":[...]}'::jsonb`
2. Replace all `ST_MakePoint(x,y,z)` with `'{"x":x,"y":y,"z":z}'::jsonb`
3. Re-run: `docker compose exec -T db psql -U soterion -d soterion < infra/db/seed.sql`
4. Verify: `SELECT count(*) FROM zones;` returns 5, `SELECT count(*) FROM sensor_nodes;` returns 10

**Commit:** `fix: update seed.sql to use JSONB instead of PostGIS geometry functions`

---

### Task 2: Create rich demo data seed (`infra/db/seed_demo.sql`)

**Files:**
- Create: `infra/db/seed_demo.sql`

**What:** Insert 24 hours of realistic time-series data so all dashboard widgets have content to display.

**Data to generate:**

**Zone density (zone_density table)** - For each of the 5 zones, insert one row every 30 seconds for the past 24 hours (~2880 rows per zone, ~14,400 total). Use `generate_series` with time-of-day patterns:
- 00:00-06:00: low (10-25% density)
- 06:00-09:00: ramping up (25-70%)
- 09:00-12:00: peak (60-85%)
- 12:00-14:00: moderate (40-60%)
- 14:00-18:00: second peak (55-80%)
- 18:00-22:00: declining (30-50%)
- 22:00-00:00: low (15-30%)

**Queue metrics (queue_metrics table)** - For checkpoint zone only (Z1), insert rows every 30s for 24h. Queue depth correlates with zone density. SLA met when wait < 15 mins.

**Anomaly events (anomaly_events table)** - Insert 40 events spread over 24h:
- 20 LOITERING (severity 1-3, high confidence)
- 8 CROWD_SURGE (severity 3-4, during peaks)
- 5 INTRUSION (severity 4-5, random times)
- 4 ABANDONED_OBJECT (severity 2-3)
- 3 PERIMETER_BREACH (severity 4-5)
- Half acknowledged, half pending
- Reference real zone IDs and airport_id from seed

**Shift scores (shift_scores table)** - 14 days of scores for all 5 operators:
- Amara O.: consistently high (880-940), 12-day streak
- James W.: good (840-910), 9-day streak
- Priya S.: strong (860-920), 7-day streak
- Chen L.: variable (780-890), 5-day streak
- Admin: moderate (800-860), no streak (admin doesn't do shifts often)
- Each with realistic sub-scores (security, flow, response, compliance, uptime)

**Operator badges (operator_badges table)** - Award badges:
- Amara: FIRST_DETECT, SEVEN_DAY_STREAK, FAST_RESPONDER, ZERO_FALSE_POSITIVES
- James: FIRST_DETECT, SEVEN_DAY_STREAK, FAST_RESPONDER
- Priya: FIRST_DETECT, SEVEN_DAY_STREAK
- Chen: FIRST_DETECT
- Admin: FIRST_DETECT

**Mission progress (mission_progress table)** - For each active mission, give each operator partial progress (40-80% complete).

**Commit:** `feat: add rich demo data seed for dev dashboard`

---

### Task 3: Fix API queries that reference PostGIS functions

**Files:**
- Modify: `apps/api/src/routes/lidar.ts` (remove ST_X/ST_Y/ST_Z calls, use JSONB extraction)
- Modify: `apps/api/src/routes/zones.ts` (remove ST_AsGeoJSON, use JSONB directly)
- Modify: `apps/api/src/routes/sensors.ts` (remove geometry references)

**What:** Grep for all `ST_` function calls in the API routes and replace with JSONB operators (`->`, `->>`, `::jsonb`). The DB columns are now JSONB, not GEOMETRY.

**Steps:**
1. `grep -rn "ST_\|GEOMETRY\|geometry(" apps/api/src/routes/`
2. Replace each ST_ call with JSONB equivalent
3. Test each endpoint returns 200

**Commit:** `fix: replace PostGIS function calls with JSONB operators in API routes`

---

### Task 4: Create mock live emitter (`apps/api/src/dev/mockEmitter.ts`)

**Files:**
- Create: `apps/api/src/dev/mockEmitter.ts`
- Modify: `apps/api/src/server.ts` (import and start emitter in dev mode)

**What:** A module that runs on timers to simulate live data flowing through the system.

**Behavior:**
- **Every 5s:** INSERT new `zone_density` row for each zone with small random walk (+/- 5%) from current value. This makes the heatmap and zone panel update in real time.
- **Every 30-90s (random):** INSERT new `anomaly_event` with random type/severity. Publish to Redis `alerts:{airport_id}` channel so WebSocket subscribers get notified.
- **On startup:** Insert a batch of mock `track_objects` (even though they won't display without the 3D twin working, the tracks endpoint will return data).

**Guard:** Only runs when `NODE_ENV === 'development'`. Logs `[MockEmitter] Started - generating live demo data` on activation.

**Graceful shutdown:** Clear all timers on SIGINT/SIGTERM.

**Commit:** `feat: add dev mock emitter for live dashboard data`

---

### Task 5: Fix Vite proxy for WebSocket and port alignment

**Files:**
- Modify: `apps/web/vite.config.ts`

**What:** The Vite dev server is on port 5174 but the proxy config targets 5173. Also the WS proxy path needs to match the API's WebSocket routes. Update to ensure the proxy works regardless of which port Vite picks.

**Steps:**
1. Change `server.port` to `5174` (or remove to let it auto-pick)
2. Ensure WS proxy covers `/ws/alerts` and `/ws/live` paths
3. Test that `curl http://localhost:5174/api/v1/health` returns 200 (proxied to API)

**Commit:** `fix: update vite proxy config for correct port and WS paths`

---

### Task 6: Verify end-to-end dashboard rendering

**Steps:**
1. Run seed: `docker compose exec -T db psql -U soterion -d soterion < infra/db/seed.sql`
2. Run demo seed: `docker compose exec -T db psql -U soterion -d soterion < infra/db/seed_demo.sql`
3. Restart API: `cd apps/api && NODE_ENV=development npx tsx src/server.ts`
4. Open browser: `http://localhost:5174`
5. Login: `admin@soterion.io` / `soterion123`
6. Verify each view:
   - **Ops Center**: Zone density bars updating, threat feed with alerts, heatmap colored
   - **Security**: Alert history table populated, stats panel with counts
   - **Leaderboard**: 5 operators ranked, badges shown, scores animated
   - **Sensors**: 10 sensors in grid, status indicators
7. Check console: No crashing errors (some warnings acceptable)

**Commit:** `docs: verify dev dashboard rendering complete`
