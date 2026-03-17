import { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { apiKeyMiddleware } from '../middleware/apiKey.js';
import { authMiddleware } from '../middleware/auth.js';
import sql from '../db/client.js';
import { redis } from '../lib/redis.js';
import { addAnomalyJob } from '../jobs/queues.js';
import {
  IngestPayloadSchema,
  StreamsQuerySchema,
  TracksQuerySchema,
  DensityParamsSchema,
  DensityQuerySchema,
  HeatmapParamsSchema,
  QueueParamsSchema,
} from '../schemas/lidar.js';

export default async function lidarRoutes(fastify: FastifyInstance): Promise<void> {
  // ==========================================================================
  // POST /api/v1/lidar/ingest [API_KEY auth]
  // Accepts a batch of tracked objects from an edge LiDAR node.
  // ==========================================================================
  fastify.post('/api/v1/lidar/ingest', {
    preHandler: apiKeyMiddleware,
  }, async (request, reply) => {
    const parsed = IngestPayloadSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'Validation Error',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const payload = parsed.data;
    const receiptId = uuidv4();

    // ----- Idempotency check -----
    const idempotencyKey = request.headers['x-idempotency-key'] as string | undefined;
    if (idempotencyKey) {
      const existing = await redis.get(`idempotency:${idempotencyKey}`);
      if (existing) {
        const cached = JSON.parse(existing);
        return reply.code(200).send(cached);
      }
    }

    // ----- Look up sensor to get zone_id -----
    const sensorRows = await sql`
      SELECT id, zone_id FROM sensor_nodes WHERE id = ${payload.sensor_id}
    `;
    const sensor = sensorRows[0];
    if (!sensor) {
      return reply.code(404).send({ error: 'Sensor not found', sensor_id: payload.sensor_id });
    }
    const zoneId: string = sensor.zone_id;

    // ----- Batch INSERT into track_objects -----
    const now = new Date(payload.timestamp);
    if (payload.track_objects.length > 0) {
      const rows = payload.track_objects.map((t) => ({
        time: now,
        track_id: t.track_id,
        sensor_id: payload.sensor_id,
        zone_id: zoneId,
        centroid: JSON.stringify({ x: t.centroid.x, y: t.centroid.y, z: t.centroid.z }),
        velocity_ms: t.velocity_ms,
        classification: t.classification,
        behavior_score: t.behavior_score,
        dwell_secs: t.dwell_secs,
      }));

      // Use postgres.js bulk insert for performance
      await sql`
        INSERT INTO track_objects ${sql(rows, 'time', 'track_id', 'sensor_id', 'zone_id', 'centroid', 'velocity_ms', 'classification', 'behavior_score', 'dwell_secs')}
      `;
    }

    // ----- Upsert zone_density: count tracks per zone -----
    const trackCount = payload.track_objects.length;
    // Get zone capacity for density_pct calculation (default 100 if not set)
    const zoneRows = await sql`
      SELECT sla_wait_mins FROM zones WHERE id = ${zoneId}
    `;
    // Use a reasonable capacity estimate: 100 persons per zone as default
    const zoneCapacity = 100;
    const densityPct = Math.min(100, (trackCount / zoneCapacity) * 100);

    const avgDwell = trackCount > 0
      ? payload.track_objects.reduce((sum, t) => sum + t.dwell_secs, 0) / trackCount
      : 0;

    await sql`
      INSERT INTO zone_density (time, zone_id, count, density_pct, avg_dwell_secs)
      VALUES (${now}, ${zoneId}, ${trackCount}, ${densityPct}, ${avgDwell})
    `;

    // ----- Publish to anomaly-processing queue -----
    let jobId = '';
    if (payload.track_objects.length > 0) {
      jobId = await addAnomalyJob({
        sensor_id: payload.sensor_id,
        facility_id: payload.facility_id,
        zone_id: zoneId,
        timestamp: payload.timestamp,
        track_objects: payload.track_objects,
      });
    }

    const response = {
      receipt_id: receiptId,
      tracks_ingested: payload.track_objects.length,
      processing_queued: payload.track_objects.length > 0,
      job_id: jobId || undefined,
    };

    // ----- Store idempotency result -----
    if (idempotencyKey) {
      // Cache for 5 minutes
      await redis.set(`idempotency:${idempotencyKey}`, JSON.stringify(response), 'EX', 300);
    }

    return reply.code(202).send(response);
  });

  // ==========================================================================
  // GET /api/v1/lidar/streams
  // Lists active sensor streams with health status.
  // ==========================================================================
  fastify.get('/api/v1/lidar/streams', {
    preHandler: authMiddleware,
  }, async (request, reply) => {
    const parsed = StreamsQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'Validation Error',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const query = parsed.data;
    const facilityId = request.operator!.airport_id;

    // Query sensor_nodes joined with zones to filter by facility
    const streams = await sql`
      SELECT
        sn.id AS sensor_id,
        sn.label AS serial_number,
        sn.zone_id,
        z.name AS zone_name,
        sn.health AS status,
        sn.last_ping_at,
        sn.model,
        sn.range_meters
      FROM sensor_nodes sn
      JOIN zones z ON z.id = sn.zone_id
      JOIN terminals t ON t.id = z.terminal_id
      WHERE t.airport_id = ${facilityId}
      ${query.zone_id ? sql`AND sn.zone_id = ${query.zone_id}` : sql``}
      ${query.status ? sql`AND LOWER(sn.health) = ${query.status}` : sql``}
      ORDER BY sn.label ASC
    `;

    return reply.code(200).send({
      streams: streams.map((s) => ({
        sensor_id: s.sensor_id,
        serial_number: s.serial_number,
        zone_id: s.zone_id,
        zone_name: s.zone_name,
        status: s.status?.toLowerCase() ?? 'unknown',
        last_heartbeat: s.last_ping_at ? new Date(s.last_ping_at).toISOString() : null,
        model: s.model,
        range_meters: s.range_meters,
      })),
      total: streams.length,
    });
  });

  // ==========================================================================
  // GET /api/v1/lidar/tracks
  // Query track_objects for the last 30 seconds (live tracks).
  // ==========================================================================
  fastify.get('/api/v1/lidar/tracks', {
    preHandler: authMiddleware,
  }, async (request, reply) => {
    const parsed = TracksQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'Validation Error',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const query = parsed.data;
    const facilityId = request.operator!.airport_id;
    const since = new Date(Date.now() - 30_000); // last 30 seconds

    try {
      const tracks = await sql`
        SELECT
          tr.track_id,
          tr.sensor_id,
          tr.zone_id,
          (tr.centroid->>'x')::numeric AS cx,
          (tr.centroid->>'y')::numeric AS cy,
          (tr.centroid->>'z')::numeric AS cz,
          tr.velocity_ms,
          tr.classification,
          tr.behavior_score,
          tr.dwell_secs,
          tr.time
        FROM track_objects tr
        JOIN sensor_nodes sn ON sn.id = tr.sensor_id
        JOIN zones z ON z.id = tr.zone_id
        JOIN terminals t ON t.id = z.terminal_id
        WHERE t.airport_id = ${facilityId}
          AND tr.time >= ${since}
          ${query.zone_id ? sql`AND tr.zone_id = ${query.zone_id}` : sql``}
          ${query.sensor_id ? sql`AND tr.sensor_id = ${query.sensor_id}` : sql``}
        ORDER BY tr.time DESC
        LIMIT ${query.limit}
        OFFSET ${query.offset}
      `;

      return reply.code(200).send({
        tracks: tracks.map((t) => ({
          track_id: t.track_id,
          sensor_id: t.sensor_id,
          zone_id: t.zone_id,
          centroid: { x: t.cx, y: t.cy, z: t.cz },
          velocity_ms: t.velocity_ms,
          classification: t.classification,
          behavior_score: t.behavior_score,
          dwell_secs: t.dwell_secs,
          time: new Date(t.time).toISOString(),
        })),
        total: tracks.length,
        limit: query.limit,
        offset: query.offset,
      });
    } catch (err) {
      request.log.error(err, 'Error fetching live tracks');
      // Return empty result gracefully instead of 500
      return reply.code(200).send({
        tracks: [],
        total: 0,
        limit: query.limit,
        offset: query.offset,
      });
    }
  });

  // ==========================================================================
  // GET /api/v1/lidar/zones/:zoneId/density
  // Returns the latest zone_density row for a given zone.
  // ==========================================================================
  fastify.get('/api/v1/lidar/zones/:zoneId/density', {
    preHandler: authMiddleware,
  }, async (request, reply) => {
    const paramsParsed = DensityParamsSchema.safeParse(request.params);
    if (!paramsParsed.success) {
      return reply.code(400).send({
        error: 'Validation Error',
        details: paramsParsed.error.flatten().fieldErrors,
      });
    }

    const queryParsed = DensityQuerySchema.safeParse(request.query);
    if (!queryParsed.success) {
      return reply.code(400).send({
        error: 'Validation Error',
        details: queryParsed.error.flatten().fieldErrors,
      });
    }

    const { zoneId } = paramsParsed.data;
    const facilityId = request.operator!.airport_id;

    // Verify zone belongs to facility
    const zoneCheck = await sql`
      SELECT z.id FROM zones z
      JOIN terminals t ON t.id = z.terminal_id
      WHERE z.id = ${zoneId} AND t.airport_id = ${facilityId}
    `;
    if (zoneCheck.length === 0) {
      return reply.code(404).send({ error: 'Zone not found' });
    }

    // Get latest density
    const current = await sql`
      SELECT time, count, density_pct, avg_dwell_secs
      FROM zone_density
      WHERE zone_id = ${zoneId}
      ORDER BY time DESC
      LIMIT 1
    `;

    // Get recent history (last 10 entries)
    const history = await sql`
      SELECT time, count, density_pct, avg_dwell_secs
      FROM zone_density
      WHERE zone_id = ${zoneId}
      ORDER BY time DESC
      LIMIT 10
      OFFSET 1
    `;

    return reply.code(200).send({
      zone_id: zoneId,
      current: current.length > 0 ? {
        person_count: current[0].count,
        occupancy_pct: parseFloat(current[0].density_pct),
        avg_dwell_seconds: parseFloat(current[0].avg_dwell_secs ?? '0'),
        timestamp: new Date(current[0].time).toISOString(),
      } : null,
      history: history.map((h) => ({
        person_count: h.count,
        occupancy_pct: parseFloat(h.density_pct),
        avg_dwell_seconds: parseFloat(h.avg_dwell_secs ?? '0'),
        timestamp: new Date(h.time).toISOString(),
      })),
    });
  });

  // ==========================================================================
  // GET /api/v1/lidar/heatmap/:terminalId
  // Aggregates zone_density for all zones in a terminal, returns GeoJSON.
  // ==========================================================================
  fastify.get('/api/v1/lidar/heatmap/:terminalId', {
    preHandler: authMiddleware,
  }, async (request, reply) => {
    const paramsParsed = HeatmapParamsSchema.safeParse(request.params);
    if (!paramsParsed.success) {
      return reply.code(400).send({
        error: 'Validation Error',
        details: paramsParsed.error.flatten().fieldErrors,
      });
    }

    const { terminalId } = paramsParsed.data;
    const facilityId = request.operator!.airport_id;

    // Verify terminal belongs to facility
    const termCheck = await sql`
      SELECT id FROM terminals WHERE id = ${terminalId} AND airport_id = ${facilityId}
    `;
    if (termCheck.length === 0) {
      return reply.code(404).send({ error: 'Terminal not found' });
    }

    // Get latest density for each zone in the terminal, with zone boundary
    const zoneDensities = await sql`
      SELECT DISTINCT ON (z.id)
        z.id AS zone_id,
        z.name AS zone_name,
        z.type AS zone_type,
        z.boundary AS geometry,
        zd.count,
        zd.density_pct,
        zd.avg_dwell_secs,
        zd.time
      FROM zones z
      LEFT JOIN LATERAL (
        SELECT count, density_pct, avg_dwell_secs, time
        FROM zone_density
        WHERE zone_id = z.id
        ORDER BY time DESC
        LIMIT 1
      ) zd ON true
      WHERE z.terminal_id = ${terminalId}
      ORDER BY z.id
    `;

    // Build GeoJSON FeatureCollection
    const features = zoneDensities.map((zd) => ({
      type: 'Feature' as const,
      properties: {
        zone_id: zd.zone_id,
        zone_name: zd.zone_name,
        zone_type: zd.zone_type,
        person_count: zd.count ?? 0,
        density_pct: zd.density_pct ? parseFloat(zd.density_pct) : 0,
        avg_dwell_secs: zd.avg_dwell_secs ? parseFloat(zd.avg_dwell_secs) : 0,
        timestamp: zd.time ? new Date(zd.time).toISOString() : null,
      },
      geometry: zd.geometry ?? null,
    }));

    return reply.code(200).send({
      type: 'FeatureCollection',
      terminal_id: terminalId,
      timestamp: new Date().toISOString(),
      features,
    });
  });

  // ==========================================================================
  // GET /api/v1/lidar/queue/:checkpointId
  // Returns latest queue_metrics for a checkpoint zone.
  // ==========================================================================
  fastify.get('/api/v1/lidar/queue/:checkpointId', {
    preHandler: authMiddleware,
  }, async (request, reply) => {
    const paramsParsed = QueueParamsSchema.safeParse(request.params);
    if (!paramsParsed.success) {
      return reply.code(400).send({
        error: 'Validation Error',
        details: paramsParsed.error.flatten().fieldErrors,
      });
    }

    const { checkpointId } = paramsParsed.data;
    const facilityId = request.operator!.airport_id;

    // Verify checkpoint zone belongs to facility
    const zoneCheck = await sql`
      SELECT z.id, z.name, z.sla_wait_mins
      FROM zones z
      JOIN terminals t ON t.id = z.terminal_id
      WHERE z.id = ${checkpointId} AND t.airport_id = ${facilityId}
    `;
    if (zoneCheck.length === 0) {
      return reply.code(404).send({ error: 'Checkpoint zone not found' });
    }

    const zone = zoneCheck[0];

    // Get latest queue metrics
    const latest = await sql`
      SELECT time, queue_depth, wait_time_mins, throughput_per_hr, sla_met
      FROM queue_metrics
      WHERE zone_id = ${checkpointId}
      ORDER BY time DESC
      LIMIT 1
    `;

    // Get previous reading for trend calculation
    const previous = await sql`
      SELECT queue_depth
      FROM queue_metrics
      WHERE zone_id = ${checkpointId}
      ORDER BY time DESC
      LIMIT 1
      OFFSET 1
    `;

    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (latest.length > 0 && previous.length > 0) {
      const diff = latest[0].queue_depth - previous[0].queue_depth;
      if (diff > 2) trend = 'increasing';
      else if (diff < -2) trend = 'decreasing';
    }

    return reply.code(200).send({
      checkpoint_id: checkpointId,
      checkpoint_name: zone.name,
      sla_wait_mins: zone.sla_wait_mins,
      current: latest.length > 0 ? {
        queue_depth: latest[0].queue_depth,
        wait_time_mins: parseFloat(latest[0].wait_time_mins ?? '0'),
        throughput_per_hr: latest[0].throughput_per_hr,
        sla_met: latest[0].sla_met,
        timestamp: new Date(latest[0].time).toISOString(),
      } : null,
      trend,
    });
  });

  // GET /api/v1/lidar/density-history - time-series density for heatmap animation
  fastify.get('/api/v1/lidar/density-history', {
    preHandler: authMiddleware,
  }, async (request, reply) => {
    const airportId = request.operator!.airport_id;
    const query = request.query as { minutes?: string };
    const minutes = Math.min(parseInt(query.minutes || '120', 10), 480);
    const since = new Date(Date.now() - minutes * 60 * 1000);

    try {
      const rows = await sql`
        SELECT
          date_trunc('minute', zd.time) -
            ((EXTRACT(MINUTE FROM zd.time)::int % 5) || ' minutes')::interval AS bucket,
          z.id AS zone_id,
          z.name AS zone_name,
          ROUND(AVG(zd.count))::int AS avg_count,
          ROUND(AVG(zd.density_pct)::numeric, 1) AS avg_density_pct,
          ROUND(AVG(zd.avg_dwell_secs)::numeric, 0) AS avg_dwell_secs
        FROM zone_density zd
        JOIN zones z ON z.id = zd.zone_id
        JOIN terminals t ON t.id = z.terminal_id
        WHERE t.airport_id = ${airportId}
          AND zd.time >= ${since}
        GROUP BY bucket, z.id, z.name
        ORDER BY bucket ASC, z.name ASC
      `;

      return reply.code(200).send({
        minutes,
        bucket_size_minutes: 5,
        snapshots: rows,
      });
    } catch (err) {
      request.log.error(err, 'Error fetching density history');
      return reply.code(200).send({ minutes, bucket_size_minutes: 5, snapshots: [] });
    }
  });

  // ==========================================================================
  // GET /api/v1/lidar/tracks/paths - aggregated movement paths per track
  // ==========================================================================
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
}
