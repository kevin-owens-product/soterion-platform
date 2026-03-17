# LiDAR Tracking Enhancements - Design

## Problem
The platform has a complete LiDAR ingest pipeline and rich time-series data, but the frontend underutilizes it. Cross-zone intelligence is hardcoded to return mocks, the heatmap is static, there's no track path visualization, incident replay has no actual playback, and queue predictions don't surface forecasted wait times in the zone panel.

## Enhancements (Priority Order)

### 1. Cross-Zone Intelligence Fix
**Effort:** Small (remove dev-mode guard, wire production queries)
- Remove `NODE_ENV === 'development'` short-circuit in intelligence.ts:55-60
- Production queries already exist and work (lines 62-182)
- Three detection types: wrong-way flow, unusual dwell, perimeter probe

### 2. Time-Lapse Heatmap
**Effort:** Medium (new API endpoint + frontend animation)
- New endpoint: GET /api/v1/lidar/zones/density-history?minutes=120
- Returns 5-min interval density snapshots per zone for the last N minutes
- Frontend: add play/pause timeline scrubber to W04_Heatmap
- Animate zone colors through historical density values

### 3. Track Path Visualization
**Effort:** Medium (new API endpoint + SVG path overlay on digital twin)
- New endpoint: GET /api/v1/lidar/tracks/paths?zone_id=X&minutes=10
- Aggregates track_objects by track_id, returns ordered centroid arrays
- Frontend: SVG polyline overlay on W01_DigitalTwin showing movement paths
- Color-code by classification (person=cyan, vehicle=amber, object=gray)

### 4. Predictive Queue Wait Time in Zone Panel
**Effort:** Small (surface existing prediction data in zone panel)
- W03_ZonePanel already computes queue metrics locally with hardcoded formulas
- Replace with real data from /predictions/surge (already fetched elsewhere)
- Add "+15m" and "+30m" predicted wait time badges

### 5. Incident Replay with Track Overlay
**Effort:** Medium (new API endpoint + animate tracks on incident detail)
- New endpoint: GET /api/v1/alerts/:id/tracks
- Returns track_objects matching the alert's track_ids in the 2-min window around created_at
- Frontend: W10_IncidentReplay play button animates track positions on a mini zone map
- Timeline scrubber controls playback position

## Architecture
All enhancements use existing database tables (track_objects, zone_density, anomaly_events). No new migrations needed. Two new API endpoints for track paths and incident tracks. Frontend changes are additive to existing widgets.
