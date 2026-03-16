import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import sql from '../db/client.js';
import { authMiddleware } from '../middleware/auth.js';

const SensorIdParamsSchema = z.object({
  id: z.string().uuid(),
});

const SensorsQuerySchema = z.object({
  zone_id: z.string().uuid().optional(),
  status: z.enum(['ONLINE', 'DEGRADED', 'OFFLINE']).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const PatchSensorBodySchema = z.object({
  health: z.enum(['ONLINE', 'DEGRADED', 'OFFLINE']).optional(),
  label: z.string().min(1).max(200).optional(),
  model: z.string().min(1).max(200).optional(),
});

const SensorMetricsQuerySchema = z.object({
  from: z.coerce.number().optional().describe('Unix timestamp ms'),
  to: z.coerce.number().optional().describe('Unix timestamp ms'),
  limit: z.coerce.number().int().min(1).max(1000).default(100),
});

export default async function sensorRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('preHandler', authMiddleware);

  // ------------------------------------------------------------------
  // GET /api/v1/sensors
  // ------------------------------------------------------------------
  fastify.get('/api/v1/sensors', async (request, reply) => {
    const parsed = SensorsQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'Validation Error',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const { zone_id, status, limit, offset } = parsed.data;
    const airportId = request.operator!.airport_id;

    try {
      // Build dynamic filter fragments
      const zoneFilter = zone_id ? sql`AND sn.zone_id = ${zone_id}` : sql``;
      const statusFilter = status ? sql`AND sn.health = ${status}` : sql``;

      const sensors = await sql`
        SELECT
          sn.id,
          sn.zone_id,
          sn.label,
          sn.model,
          sn.fov_degrees,
          sn.range_meters,
          sn.health,
          sn.last_ping_at,
          sn.created_at,
          z.name AS zone_name,
          z.type AS zone_type
        FROM sensor_nodes sn
        JOIN zones z ON z.id = sn.zone_id
        JOIN terminals t ON t.id = z.terminal_id
        WHERE t.airport_id = ${airportId}
          ${zoneFilter}
          ${statusFilter}
        ORDER BY sn.created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `;

      const countResult = await sql<{ count: string }[]>`
        SELECT COUNT(*)::text AS count
        FROM sensor_nodes sn
        JOIN zones z ON z.id = sn.zone_id
        JOIN terminals t ON t.id = z.terminal_id
        WHERE t.airport_id = ${airportId}
          ${zoneFilter}
          ${statusFilter}
      `;

      return reply.code(200).send({
        sensors,
        total: parseInt(countResult[0].count, 10),
        limit,
        offset,
      });
    } catch (err) {
      request.log.error(err, 'Error fetching sensors');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch sensors',
      });
    }
  });

  // ------------------------------------------------------------------
  // GET /api/v1/sensors/:id
  // ------------------------------------------------------------------
  fastify.get('/api/v1/sensors/:id', async (request, reply) => {
    const paramsParsed = SensorIdParamsSchema.safeParse(request.params);
    if (!paramsParsed.success) {
      return reply.code(400).send({
        error: 'Validation Error',
        details: paramsParsed.error.flatten().fieldErrors,
      });
    }

    const { id } = paramsParsed.data;
    const airportId = request.operator!.airport_id;

    try {
      const rows = await sql`
        SELECT
          sn.id,
          sn.zone_id,
          sn.label,
          sn.model,
          sn.fov_degrees,
          sn.range_meters,
          sn.health,
          sn.last_ping_at,
          sn.created_at,
          z.name AS zone_name,
          z.type AS zone_type,
          t.name AS terminal_name
        FROM sensor_nodes sn
        JOIN zones z ON z.id = sn.zone_id
        JOIN terminals t ON t.id = z.terminal_id
        WHERE sn.id = ${id}
          AND t.airport_id = ${airportId}
        LIMIT 1
      `;

      if (rows.length === 0) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Sensor not found',
        });
      }

      return reply.code(200).send(rows[0]);
    } catch (err) {
      request.log.error(err, 'Error fetching sensor');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch sensor',
      });
    }
  });

  // ------------------------------------------------------------------
  // PATCH /api/v1/sensors/:id
  // ------------------------------------------------------------------
  fastify.patch('/api/v1/sensors/:id', async (request, reply) => {
    const paramsParsed = SensorIdParamsSchema.safeParse(request.params);
    if (!paramsParsed.success) {
      return reply.code(400).send({
        error: 'Validation Error',
        details: paramsParsed.error.flatten().fieldErrors,
      });
    }

    const bodyParsed = PatchSensorBodySchema.safeParse(request.body);
    if (!bodyParsed.success) {
      return reply.code(400).send({
        error: 'Validation Error',
        details: bodyParsed.error.flatten().fieldErrors,
      });
    }

    const { id } = paramsParsed.data;
    const airportId = request.operator!.airport_id;
    const updates = bodyParsed.data;

    if (Object.keys(updates).length === 0) {
      return reply.code(400).send({
        error: 'Validation Error',
        message: 'At least one field must be provided',
      });
    }

    try {
      // Verify sensor belongs to operator's airport
      const existing = await sql`
        SELECT sn.id
        FROM sensor_nodes sn
        JOIN zones z ON z.id = sn.zone_id
        JOIN terminals t ON t.id = z.terminal_id
        WHERE sn.id = ${id} AND t.airport_id = ${airportId}
        LIMIT 1
      `;

      if (existing.length === 0) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Sensor not found',
        });
      }

      // Build SET clauses dynamically
      const setClauses: ReturnType<typeof sql>[] = [];
      if (updates.health !== undefined) setClauses.push(sql`health = ${updates.health}`);
      if (updates.label !== undefined) setClauses.push(sql`label = ${updates.label}`);
      if (updates.model !== undefined) setClauses.push(sql`model = ${updates.model}`);

      const setFragment = setClauses.reduce((acc, clause, i) => {
        if (i === 0) return clause;
        return sql`${acc}, ${clause}`;
      });

      const updated = await sql`
        UPDATE sensor_nodes
        SET ${setFragment}
        WHERE id = ${id}
        RETURNING *
      `;

      return reply.code(200).send(updated[0]);
    } catch (err) {
      request.log.error(err, 'Error updating sensor');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to update sensor',
      });
    }
  });

  // ------------------------------------------------------------------
  // GET /api/v1/sensors/:id/metrics
  // ------------------------------------------------------------------
  fastify.get('/api/v1/sensors/:id/metrics', async (request, reply) => {
    const paramsParsed = SensorIdParamsSchema.safeParse(request.params);
    if (!paramsParsed.success) {
      return reply.code(400).send({
        error: 'Validation Error',
        details: paramsParsed.error.flatten().fieldErrors,
      });
    }

    const queryParsed = SensorMetricsQuerySchema.safeParse(request.query);
    if (!queryParsed.success) {
      return reply.code(400).send({
        error: 'Validation Error',
        details: queryParsed.error.flatten().fieldErrors,
      });
    }

    const { id } = paramsParsed.data;
    const { from, to, limit } = queryParsed.data;
    const airportId = request.operator!.airport_id;

    try {
      // Verify sensor belongs to operator's airport
      const sensorCheck = await sql`
        SELECT sn.id
        FROM sensor_nodes sn
        JOIN zones z ON z.id = sn.zone_id
        JOIN terminals t ON t.id = z.terminal_id
        WHERE sn.id = ${id} AND t.airport_id = ${airportId}
        LIMIT 1
      `;

      if (sensorCheck.length === 0) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Sensor not found',
        });
      }

      const fromTs = from ? new Date(from) : new Date(Date.now() - 3600000); // default 1h
      const toTs = to ? new Date(to) : new Date();

      // Query time-series data from track_objects for this sensor
      const metrics = await sql`
        SELECT
          time_bucket('1 minute', time) AS bucket,
          COUNT(*) AS object_count,
          AVG(velocity_ms)::numeric(10,2) AS avg_velocity,
          COUNT(DISTINCT track_id) AS unique_tracks
        FROM track_objects
        WHERE sensor_id = ${id}
          AND time >= ${fromTs}
          AND time <= ${toTs}
        GROUP BY bucket
        ORDER BY bucket DESC
        LIMIT ${limit}
      `;

      return reply.code(200).send({
        sensor_id: id,
        from: fromTs.toISOString(),
        to: toTs.toISOString(),
        metrics,
      });
    } catch (err) {
      request.log.error(err, 'Error fetching sensor metrics');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch sensor metrics',
      });
    }
  });
}
