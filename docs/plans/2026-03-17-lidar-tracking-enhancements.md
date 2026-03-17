# LiDAR Tracking Enhancements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Maximize utilization of LiDAR tracking data across 5 enhancements: cross-zone intelligence, time-lapse heatmap, track path visualization, predictive queue display, and incident replay with track overlay.

**Architecture:** All enhancements read from existing TimescaleDB tables (track_objects, zone_density, anomaly_events). Two new API endpoints aggregate track paths. Frontend changes are additive to existing React widgets using existing React Query + Zustand patterns.

**Tech Stack:** Fastify API (TypeScript), React 18, Recharts, SVG overlays, React Query, postgres.js

---

### Task 1: Cross-Zone Intelligence — Remove Dev-Mode Guard

**Files:**
- Modify: `apps/api/src/routes/intelligence.ts:55-60`

**Step 1: Remove the development mode short-circuit**

In `apps/api/src/routes/intelligence.ts`, the dev-mode guard at lines 55-60 returns hardcoded mock data instead of running the real production queries. Remove the guard so production queries always run.

Replace lines 55-60:
```typescript
    // In development mode, return mock anomalies to avoid empty results
    if (process.env.NODE_ENV === 'development') {
      return reply.code(200).send({
        anomalies: DEV_MOCK_ANOMALIES,
        generated_at: new Date().toISOString(),
      });
    }
```

With nothing (delete these lines entirely). The production queries at lines 62-182 will now always execute.

**Step 2: Also remove the DEV_MOCK_ANOMALIES constant (lines 14-39)** since it's no longer referenced.

**Step 3: Test**

```bash
curl -s "https://soterion-api.onrender.com/api/v1/intelligence/flow-anomalies" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

Expected: Real anomalies from zone_density/track_objects queries (may be empty array if no anomalies detected — that's correct).

**Step 4: Commit**

```bash
git add apps/api/src/routes/intelligence.ts
git commit -m "feat: enable production cross-zone intelligence queries"
```

---

### Task 2: Density History API Endpoint

**Files:**
- Modify: `apps/api/src/routes/lidar.ts` (add new endpoint)

**Step 1: Add GET /api/v1/lidar/density-history endpoint**

Add after the existing `/lidar/queue/:checkpointId` endpoint (around line 400). This returns zone density snapshots bucketed at 5-minute intervals for the last N minutes.

```typescript
  // GET /api/v1/lidar/density-history - time-series density for heatmap animation
  fastify.get('/api/v1/lidar/density-history', {
    preHandler: authMiddleware,
  }, async (request, reply) => {
    const airportId = request.operator!.airport_id;
    const query = request.query as { minutes?: string };
    const minutes = Math.min(parseInt(query.minutes || '120', 10), 480);

    try {
      const rows = await sql`
        SELECT
          time_bucket('5 minutes', zd.time) AS bucket,
          z.id AS zone_id,
          z.name AS zone_name,
          ROUND(AVG(zd.count))::int AS avg_count,
          ROUND(AVG(zd.density_pct)::numeric, 1) AS avg_density_pct,
          ROUND(AVG(zd.avg_dwell_secs)::numeric, 0) AS avg_dwell_secs
        FROM zone_density zd
        JOIN zones z ON z.id = zd.zone_id
        JOIN terminals t ON t.id = z.terminal_id
        WHERE t.airport_id = ${airportId}
          AND zd.time >= NOW() - ${minutes + ' minutes'}::interval
        GROUP BY bucket, z.id, z.name
        ORDER BY bucket ASC, z.name ASC
      `;

      return reply.code(200).send({
        minutes,
        bucket_size_minutes: 5,
        snapshots: rows,
      });
    } catch (err) {
      // Fallback for non-TimescaleDB (no time_bucket function)
      try {
        const rows = await sql`
          SELECT
            date_trunc('minute', zd.time) -
              (EXTRACT(MINUTE FROM zd.time)::int % 5 || ' minutes')::interval AS bucket,
            z.id AS zone_id,
            z.name AS zone_name,
            ROUND(AVG(zd.count))::int AS avg_count,
            ROUND(AVG(zd.density_pct)::numeric, 1) AS avg_density_pct,
            ROUND(AVG(zd.avg_dwell_secs)::numeric, 0) AS avg_dwell_secs
          FROM zone_density zd
          JOIN zones z ON z.id = zd.zone_id
          JOIN terminals t ON t.id = z.terminal_id
          WHERE t.airport_id = ${airportId}
            AND zd.time >= NOW() - ${minutes + ' minutes'}::interval
          GROUP BY bucket, z.id, z.name
          ORDER BY bucket ASC, z.name ASC
        `;
        return reply.code(200).send({
          minutes,
          bucket_size_minutes: 5,
          snapshots: rows,
        });
      } catch (fallbackErr) {
        request.log.error(fallbackErr, 'Error fetching density history');
        return reply.code(200).send({ minutes, bucket_size_minutes: 5, snapshots: [] });
      }
    }
  });
```

**Step 2: Add frontend API function**

In `apps/web/src/lib/api.ts`, add:

```typescript
export interface DensitySnapshot {
  bucket: string;
  zoneId: string;
  zoneName: string;
  avgCount: number;
  avgDensityPct: number;
  avgDwellSecs: number;
}

export async function getDensityHistory(minutes = 120): Promise<{ snapshots: DensitySnapshot[] }> {
  return apiFetch(`/api/v1/lidar/density-history?minutes=${minutes}`);
}
```

**Step 3: Commit**

```bash
git add apps/api/src/routes/lidar.ts apps/web/src/lib/api.ts
git commit -m "feat: add density history endpoint for heatmap time-lapse"
```

---

### Task 3: Time-Lapse Heatmap UI

**Files:**
- Modify: `apps/web/src/widgets/W04_Heatmap.tsx`

**Step 1: Add time-lapse controls to the heatmap widget**

Add a play/pause button and timeline slider below the heatmap grid. When playing, the heatmap cycles through historical density snapshots at 500ms per frame, coloring zones based on past density values instead of current.

Key changes:
- Add `useQuery` for `getDensityHistory(120)` with 60s refetch
- Add state: `playing: boolean`, `frameIndex: number`, `frames: Map<string, DensitySnapshot[]>` (keyed by bucket timestamp)
- Add `useEffect` with `setInterval(500ms)` that advances `frameIndex` when playing
- When playing, override zone density display with historical frame data
- Add transport bar: play/pause button + range slider + timestamp label
- When paused on a frame, show "2h 15m ago" relative time label

Transport bar markup (add below the zone grid):
```tsx
<div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0', borderTop: '1px solid #1a1a1a' }}>
  <button onClick={() => setPlaying(!playing)}
    style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 4, padding: '4px 10px', color: '#d4d4d4', cursor: 'pointer', fontFamily: 'IBM Plex Mono', fontSize: 11 }}>
    {playing ? '⏸' : '▶'}
  </button>
  <input type="range" min={0} max={frameCount - 1} value={frameIndex}
    onChange={(e) => { setPlaying(false); setFrameIndex(Number(e.target.value)); }}
    style={{ flex: 1, accentColor: '#f59e0b' }} />
  <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: '#737373', minWidth: 80, textAlign: 'right' }}>
    {playing || frameIndex < frameCount - 1 ? timeLabel : 'LIVE'}
  </span>
</div>
```

**Step 2: Commit**

```bash
git add apps/web/src/widgets/W04_Heatmap.tsx
git commit -m "feat: add time-lapse animation to density heatmap"
```

---

### Task 4: Track Paths API Endpoint

**Files:**
- Modify: `apps/api/src/routes/lidar.ts` (add new endpoint)

**Step 1: Add GET /api/v1/lidar/tracks/paths endpoint**

This aggregates track_objects by track_id, returning an ordered array of centroid positions per track. Used for path visualization.

```typescript
  // GET /api/v1/lidar/tracks/paths - aggregated movement paths per track
  fastify.get('/api/v1/lidar/tracks/paths', {
    preHandler: authMiddleware,
  }, async (request, reply) => {
    const airportId = request.operator!.airport_id;
    const query = request.query as { zone_id?: string; minutes?: string; limit?: string };
    const minutes = Math.min(parseInt(query.minutes || '10', 10), 60);
    const limit = Math.min(parseInt(query.limit || '50', 10), 200);
    const since = new Date(Date.now() - minutes * 60 * 1000);

    try {
      const rows = await sql`
        SELECT
          tr.track_id,
          tr.classification,
          MAX(tr.behavior_score) AS max_behavior_score,
          MAX(tr.velocity_ms) AS max_velocity,
          json_agg(
            json_build_object(
              'x', (tr.centroid->>'x')::numeric,
              'y', (tr.centroid->>'y')::numeric,
              'z', (tr.centroid->>'z')::numeric,
              't', EXTRACT(EPOCH FROM tr.time)::bigint
            ) ORDER BY tr.time ASC
          ) AS points
        FROM track_objects tr
        JOIN zones z ON z.id = tr.zone_id
        JOIN terminals t ON t.id = z.terminal_id
        WHERE t.airport_id = ${airportId}
          AND tr.time >= ${since}
          ${query.zone_id ? sql`AND tr.zone_id = ${query.zone_id}` : sql``}
        GROUP BY tr.track_id, tr.classification
        HAVING COUNT(*) >= 2
        ORDER BY MAX(tr.time) DESC
        LIMIT ${limit}
      `;

      return reply.code(200).send({ tracks: rows, minutes, count: rows.length });
    } catch (err) {
      request.log.error(err, 'Error fetching track paths');
      return reply.code(200).send({ tracks: [], minutes, count: 0 });
    }
  });
```

**Step 2: Add frontend API function**

In `apps/web/src/lib/api.ts`:

```typescript
export interface TrackPath {
  trackId: string;
  classification: string;
  maxBehaviorScore: number;
  maxVelocity: number;
  points: Array<{ x: number; y: number; z: number; t: number }>;
}

export async function getTrackPaths(zoneId?: string, minutes = 10): Promise<{ tracks: TrackPath[] }> {
  const params = new URLSearchParams({ minutes: String(minutes) });
  if (zoneId) params.set('zone_id', zoneId);
  return apiFetch(`/api/v1/lidar/tracks/paths?${params}`);
}
```

**Step 3: Commit**

```bash
git add apps/api/src/routes/lidar.ts apps/web/src/lib/api.ts
git commit -m "feat: add track paths endpoint for movement visualization"
```

---

### Task 5: Track Path Overlay on Digital Twin

**Files:**
- Modify: `apps/web/src/widgets/W01_DigitalTwin.tsx`

**Step 1: Add SVG track path overlay**

Add a `useQuery` for `getTrackPaths()` with 10s refetch. Render SVG polylines over the zone grid, mapping centroid coordinates to pixel positions within each zone card.

Key implementation:
- Normalize track centroid x/y coordinates to 0-1 range within each zone's boundary
- Render SVG overlay per zone with polyline paths
- Color by classification: PERSON=#06b6d4 (cyan), VEHICLE=#f59e0b (amber), OBJECT=#737373 (gray)
- Opacity based on recency (newer = more opaque)
- High behavior_score tracks get thicker stroke (2px vs 1px) and red color
- Toggle button to show/hide tracks

**Step 2: Commit**

```bash
git add apps/web/src/widgets/W01_DigitalTwin.tsx
git commit -m "feat: add track path overlay to digital twin"
```

---

### Task 6: Predictive Queue Wait Time in Zone Panel

**Files:**
- Modify: `apps/web/src/widgets/W03_ZonePanel.tsx:81-119`

**Step 1: Replace hardcoded queue formulas with prediction data**

The current `QueueMetricsSection` (lines 81-119) calculates queue metrics locally with formulas like `density * 0.2`. Replace with data from the surge prediction endpoint.

Add a `useQuery` for `getSurgePredictions()` with 30s refetch in the parent component, pass the matching zone's prediction to `QueueMetricsSection`.

Replace the hardcoded calculations with:
```typescript
const prediction = predictions?.find(p => p.zoneId === zone.id);
const queueDepth = prediction ? Math.round(prediction.currentCount / 3) : Math.round(count / 3);
const waitTime = prediction
  ? Number(prediction.predictedDensity_15m) * 0.18
  : density * 0.2;
const throughput = prediction
  ? 200 + (Number(prediction.currentDensityPct) * 0.5)
  : 180 + density * 0.6;
```

Add predicted wait time badges after the current metrics grid:
```tsx
{prediction && (
  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
    <div style={{ flex: 1, padding: '6px 8px', background: '#111', borderRadius: 4, textAlign: 'center' }}>
      <div style={{ fontSize: 9, color: '#525252', fontFamily: 'IBM Plex Mono' }}>+15 MIN</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: '#d4d4d4' }}>
        {prediction.predictedDensity_15m?.toFixed(0) ?? '—'}%
      </div>
    </div>
    <div style={{ flex: 1, padding: '6px 8px', background: '#111', borderRadius: 4, textAlign: 'center' }}>
      <div style={{ fontSize: 9, color: '#525252', fontFamily: 'IBM Plex Mono' }}>+30 MIN</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: '#d4d4d4' }}>
        {prediction.predictedDensity_30m?.toFixed(0) ?? '—'}%
      </div>
    </div>
  </div>
)}
```

**Step 2: Commit**

```bash
git add apps/web/src/widgets/W03_ZonePanel.tsx
git commit -m "feat: show predicted queue wait times from surge model"
```

---

### Task 7: Incident Track Replay API Endpoint

**Files:**
- Modify: `apps/api/src/routes/alerts.ts` (add new endpoint)

**Step 1: Add GET /api/v1/alerts/:id/tracks endpoint**

Returns track_objects matching an alert's track_ids in the 2-minute window around the alert's created_at timestamp.

```typescript
  // GET /api/v1/alerts/:id/tracks - track positions for incident replay
  fastify.get('/api/v1/alerts/:id/tracks', {
    preHandler: authMiddleware,
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const airportId = request.operator!.airport_id;

    try {
      // Get the alert to find track_ids and timestamp
      const alerts = await sql`
        SELECT id, track_ids, zone_id, created_at
        FROM anomaly_events
        WHERE id = ${id} AND airport_id = ${airportId}
        LIMIT 1
      `;

      if (alerts.length === 0) {
        return reply.code(404).send({ error: 'Not Found', message: 'Alert not found' });
      }

      const alert = alerts[0];
      const windowStart = new Date(new Date(alert.created_at).getTime() - 60_000);
      const windowEnd = new Date(new Date(alert.created_at).getTime() + 60_000);

      // Get all tracks in the zone during the incident window
      const tracks = await sql`
        SELECT
          track_id,
          classification,
          behavior_score,
          velocity_ms,
          centroid,
          dwell_secs,
          time
        FROM track_objects
        WHERE zone_id = ${alert.zone_id}
          AND time >= ${windowStart}
          AND time <= ${windowEnd}
        ORDER BY track_id, time ASC
      `;

      return reply.code(200).send({
        alert_id: id,
        zone_id: alert.zone_id,
        window: { start: windowStart.toISOString(), end: windowEnd.toISOString() },
        track_count: new Set(tracks.map((t: any) => t.track_id)).size,
        frames: tracks,
      });
    } catch (err) {
      request.log.error(err, 'Error fetching incident tracks');
      return reply.code(200).send({ alert_id: id, frames: [], track_count: 0 });
    }
  });
```

**Step 2: Add frontend API function**

In `apps/web/src/lib/api.ts`:

```typescript
export interface IncidentFrame {
  trackId: string;
  classification: string;
  behaviorScore: number;
  velocityMs: number;
  centroid: { x: number; y: number; z: number };
  dwellSecs: number;
  time: string;
}

export async function getIncidentTracks(alertId: string): Promise<{ frames: IncidentFrame[]; trackCount: number }> {
  return apiFetch(`/api/v1/alerts/${alertId}/tracks`);
}
```

**Step 3: Commit**

```bash
git add apps/api/src/routes/alerts.ts apps/web/src/lib/api.ts
git commit -m "feat: add incident track replay endpoint"
```

---

### Task 8: Incident Replay with Track Animation

**Files:**
- Modify: `apps/web/src/widgets/W10_IncidentReplay.tsx`

**Step 1: Wire up transport controls and track visualization**

When an incident is selected:
1. Fetch tracks via `getIncidentTracks(selectedId)`
2. Group frames by timestamp (bucket to nearest second)
3. Play button advances through frames at 200ms intervals
4. Render track positions as colored dots on a mini zone map (SVG)
5. Timeline scrubber shows the 2-minute incident window

Key state additions:
- `frames: IncidentFrame[]` — fetched track data
- `playbackIndex: number` — current frame position
- `playbackTimer: ReturnType<typeof setInterval> | null`

Mini zone map (SVG in the detail panel, replacing the empty space):
```tsx
<svg viewBox="0 0 200 120" style={{ width: '100%', height: 120, background: '#0a0a0a', borderRadius: 4, border: '1px solid #1a1a1a' }}>
  {/* Zone boundary */}
  <rect x={10} y={10} width={180} height={100} rx={4} fill="none" stroke="#1a1a1a" strokeWidth={1} />
  {/* Track positions at current frame */}
  {currentFrameTracks.map((track, i) => (
    <circle key={i}
      cx={mapX(track.centroid.x)}
      cy={mapY(track.centroid.y)}
      r={track.behaviorScore > 70 ? 5 : 3}
      fill={track.behaviorScore > 70 ? '#ef4444' : track.classification === 'PERSON' ? '#06b6d4' : '#f59e0b'}
      opacity={0.9}
    />
  ))}
  {/* Trail lines for tracked objects */}
  {trackTrails.map((trail, i) => (
    <polyline key={i}
      points={trail.points.map(p => `${mapX(p.x)},${mapY(p.y)}`).join(' ')}
      fill="none" stroke={trail.color} strokeWidth={1} opacity={0.4}
    />
  ))}
</svg>
```

Wire play/pause button (line 356) to start/stop the interval. Wire timeline slider to set `playbackIndex`.

**Step 2: Commit**

```bash
git add apps/web/src/widgets/W10_IncidentReplay.tsx
git commit -m "feat: add track position animation to incident replay"
```

---

### Task 9: Final Integration Commit

**Step 1: Verify all endpoints work**

```bash
# Cross-zone intelligence
curl -s "$API/api/v1/intelligence/flow-anomalies" -H "Authorization: Bearer $TOKEN"

# Density history
curl -s "$API/api/v1/lidar/density-history?minutes=60" -H "Authorization: Bearer $TOKEN"

# Track paths
curl -s "$API/api/v1/lidar/tracks/paths?minutes=15" -H "Authorization: Bearer $TOKEN"

# Incident tracks
curl -s "$API/api/v1/alerts/ae000000-0000-4000-8000-000000000001/tracks" -H "Authorization: Bearer $TOKEN"
```

**Step 2: Push and verify on Render**

```bash
git push origin main
```

Verify all 5 enhancements render correctly on https://soterion-web.onrender.com after deploy.
