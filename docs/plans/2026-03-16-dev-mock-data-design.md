# Dev Mock Data Layer - Design

## Goal
Make the Soterion dashboard show life-like data in development so all widgets, views, and interactions can be demonstrated without real LiDAR sensors.

## Approach: DB Seed + Live Mock Emitter (Hybrid A+C)

### Part 1: Rich DB Seed Script (`infra/db/seed_demo.sql`)
Populate the database with realistic historical data that the existing API queries will return naturally:

- **Zone density**: 24 hours of 5-second snapshots for all 5 zones (varying by time of day - quiet at night, busy 7-11am and 4-7pm)
- **Queue metrics**: Checkpoint queue data mirroring density patterns with SLA violations during peak
- **Anomaly events**: 30-50 events over past 24h with realistic distribution (mostly LOW/MEDIUM, a few HIGH, 1-2 CRITICAL). Mix of LOITERING, CROWD_SURGE, INTRUSION, ABANDONED_OBJECT. Some acknowledged, some pending.
- **Shift scores**: 14 days of scores for all 5 operators with realistic variation (750-950 range), creating meaningful leaderboard rankings and streak data
- **Operator badges**: Award some badges to operators based on their scores
- **Mission progress**: Partial progress on active missions

### Part 2: Mock Live Emitter (`apps/api/src/dev/mockEmitter.ts`)
A dev-only module that runs timers to simulate live data feeds:

- **Every 5s**: Generate new zone_density rows with small random walk from previous values
- **Every 2s**: Emit mock track_objects (10-30 people moving through zones) via the existing track polling endpoint
- **Every 30-60s**: Generate a new anomaly_event (random type/severity) and publish via Redis pub/sub (feeds the WebSocket alert stream)
- **Every 5min**: Update shift score components slightly

Activated only when `NODE_ENV=development`. Starts automatically with the API server.

### Part 3: Fix Remaining Query Issues
- Remove PostGIS `ST_*` function calls from queries (use JSONB centroid instead)
- Fix the zones query to return seeded zones correctly
- Ensure all API endpoints return proper array responses

### What This Enables
- Ops Center: Live-updating zone density bars, heatmap colors changing, threat feed with alerts to acknowledge
- Security: Alert history table populated, response time metrics calculated from real data
- Leaderboard: Ranked operators with scores, streaks, badges
- Sensors: Grid showing ONLINE/DEGRADED/OFFLINE status from seed data
- 3D Twin: Dots representing track objects moving through zones
- Gamification: Missions with partial progress, earned badges displayed

### What It Doesn't Do
- No real WebSocket upgrade (Vite proxy limitation) - live feeds use REST polling instead
- No real ML inference - anomaly events are randomly generated
- No real point cloud rendering - 3D twin shows colored boxes and dots
