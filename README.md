# Soterion AI Platform

Enterprise spatial intelligence platform powered by LiDAR. Real-time security threat detection, passenger flow analytics, and operations optimization for airports, seaports, stadiums, transit hubs, and hospitals.

## Architecture

```
React + Vite frontend → Fastify REST API → PostgreSQL/TimescaleDB → Python FastAPI ML → Redis pub/sub
```

### Services

| Service | Port | Tech |
|---------|------|------|
| Web Dashboard | 5174 | React 18, Vite, Tailwind, Zustand, React Query |
| REST API | 3001 | Fastify, TypeScript, postgres.js, BullMQ |
| ML Service | 8000 | FastAPI, ONNX Runtime, scikit-learn |
| Database | 5434 | TimescaleDB (PostgreSQL 16) |
| Cache/Queue | 6379 | Redis 7 |

### Key Features
- **12 Dashboard Widgets**: Digital twin, threat feed, zone intelligence, heatmap, sensor grid, leaderboard, shift scorecard, flow funnel, commercial intel, incident replay, surge prediction, ROI calculator
- **Predictive Crowd Intelligence**: ML-powered surge prediction 15-30 minutes ahead
- **Gamification Engine**: Shift scores, streaks, badges, missions, leaderboard
- **Multi-Vertical**: Airport, seaport, stadium, transit hub, hospital - config-driven
- **SOC 2 / FedRAMP Ready**: Immutable audit log, RBAC, session management, compliance reports
- **Edge SDK**: `pip install soterion-edge` - hardware-agnostic LiDAR integration

## Quick Start

### Prerequisites
- Node.js 20+
- Docker Desktop
- Python 3.9+

### Setup

```bash
# 1. Start infrastructure
docker compose up -d

# 2. Install dependencies
npm install
cd apps/web && npm install && cd ../..

# 3. Run database migrations
for f in infra/db/migrations/*.sql; do
  docker compose exec -T db psql -U soterion -d soterion < "$f"
done

# 4. Seed demo data
docker compose exec -T db psql -U soterion -d soterion < infra/db/seed.sql
docker compose exec -T db psql -U soterion -d soterion < infra/db/seed_demo.sql
docker compose exec -T db psql -U soterion -d soterion < infra/db/seed_rbac.sql

# 5. Fix password hashes
HASH=$(node -e "require('bcrypt').hash('soterion123',12).then(h=>console.log(h))")
docker compose exec -T db psql -U soterion -d soterion -c "UPDATE operators SET password_hash='$HASH'"

# 6. Start services
cd services/ml && python3 -m uvicorn app.main:app --port 8000 &
cd apps/api && NODE_ENV=development npx tsx src/server.ts &
cd apps/web && npx vite --host &

# 7. Open browser
open http://localhost:5174
```

### Login Credentials
| Email | Password | Role |
|-------|----------|------|
| admin@soterion.io | soterion123 | Admin |
| amara.o@soterion.io | soterion123 | Operator |
| priya.s@soterion.io | soterion123 | Supervisor |

## Project Structure

```
soterion/
├── apps/web/          React + Vite frontend (12 widgets, 5 views, admin panel)
├── apps/api/          Fastify REST API (70+ routes, BullMQ workers)
├── services/ml/       Python FastAPI ML inference service
├── packages/edge-sdk/ Python Edge SDK for LiDAR sensors
├── infra/db/          SQL migrations + seed data
├── infra/k6/          Load tests
├── .github/workflows/ CI pipeline
└── docs/              Plans and architecture docs
```

## API Endpoints

### Core
- `POST /api/v1/auth/login` - Authentication
- `GET /api/v1/zones` - Zone intelligence
- `GET /api/v1/sensors` - Sensor network status
- `GET /api/v1/alerts` - Threat feed
- `POST /api/v1/alerts/:id/acknowledge` - Acknowledge alert

### Analytics
- `GET /api/v1/predictions/surge` - Crowd surge predictions
- `GET /api/v1/analytics/roi` - ROI metrics
- `GET /api/v1/reports/compliance` - Compliance reports (TSA/ICAO/GDPR)

### Gamification
- `GET /api/v1/leaderboard` - Operator rankings
- `GET /api/v1/scores/shift` - Shift performance
- `GET /api/v1/badges` - Badge definitions
- `GET /api/v1/missions` - Active missions

### Admin
- `GET /api/v1/admin/facilities` - Facility management
- `GET /api/v1/admin/operators` - Operator management
- `GET /api/v1/admin/audit-log` - Immutable audit log
- `GET /api/v1/admin/compliance/soc2` - SOC 2 status

## Tech Stack
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Zustand, TanStack Query
- **API**: Fastify, TypeScript, postgres.js, BullMQ, Zod, bcrypt
- **ML**: FastAPI, ONNX Runtime, scikit-learn, Pydantic
- **Database**: TimescaleDB (PostgreSQL 16), Redis 7
- **DevOps**: Docker Compose, GitHub Actions, Playwright, k6
- **Edge**: Python SDK with httpx, Pydantic

## License
Proprietary - Soterion AI Ltd.
