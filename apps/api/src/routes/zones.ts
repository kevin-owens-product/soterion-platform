import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import sql from '../db/client.js';
import { authMiddleware } from '../middleware/auth.js';

const ZoneIdParamsSchema = z.object({
  id: z.string().uuid(),
});

const TerminalIdParamsSchema = z.object({
  id: z.string().uuid(),
});

const ZonesQuerySchema = z.object({
  terminal_id: z.string().uuid().optional(),
  zone_type: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const TerminalsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const FlowQuerySchema = z.object({
  from: z.coerce.number().optional().describe('Unix timestamp ms'),
  to: z.coerce.number().optional().describe('Unix timestamp ms'),
});

export default async function zoneRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('preHandler', authMiddleware);

  // ------------------------------------------------------------------
  // GET /api/v1/zones
  // ------------------------------------------------------------------
  fastify.get('/api/v1/zones', async (request, reply) => {
    const parsed = ZonesQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'Validation Error',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const { terminal_id, zone_type, limit, offset } = parsed.data;
    const airportId = request.operator!.airport_id;

    try {
      const terminalFilter = terminal_id ? sql`AND z.terminal_id = ${terminal_id}` : sql``;
      const typeFilter = zone_type ? sql`AND z.type = ${zone_type}` : sql``;

      const zones = await sql`
        SELECT
          z.id,
          z.terminal_id,
          z.name,
          z.type,
          z.sla_wait_mins,
          t.name AS terminal_name,
          COALESCE((
            SELECT count
            FROM zone_density zd
            WHERE zd.zone_id = z.id
            ORDER BY zd.time DESC
            LIMIT 1
          ), 0) AS current_count,
          COALESCE((
            SELECT density_pct
            FROM zone_density zd
            WHERE zd.zone_id = z.id
            ORDER BY zd.time DESC
            LIMIT 1
          ), 0) AS current_density_pct,
          (
            SELECT COUNT(*)::int
            FROM sensor_nodes sn
            WHERE sn.zone_id = z.id
          ) AS sensor_count
        FROM zones z
        JOIN terminals t ON t.id = z.terminal_id
        WHERE t.airport_id = ${airportId}
          ${terminalFilter}
          ${typeFilter}
        ORDER BY z.name ASC
        LIMIT ${limit}
        OFFSET ${offset}
      `;

      const countResult = await sql<{ count: string }[]>`
        SELECT COUNT(*)::text AS count
        FROM zones z
        JOIN terminals t ON t.id = z.terminal_id
        WHERE t.airport_id = ${airportId}
          ${terminalFilter}
          ${typeFilter}
      `;

      return reply.code(200).send({
        zones,
        total: parseInt(countResult[0].count, 10),
        limit,
        offset,
      });
    } catch (err) {
      request.log.error(err, 'Error fetching zones');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch zones',
      });
    }
  });

  // ------------------------------------------------------------------
  // GET /api/v1/zones/:id
  // ------------------------------------------------------------------
  fastify.get('/api/v1/zones/:id', async (request, reply) => {
    const paramsParsed = ZoneIdParamsSchema.safeParse(request.params);
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
          z.id,
          z.terminal_id,
          z.name,
          z.type,
          z.sla_wait_mins,
          z.created_at,
          t.name AS terminal_name
        FROM zones z
        JOIN terminals t ON t.id = z.terminal_id
        WHERE z.id = ${id}
          AND t.airport_id = ${airportId}
        LIMIT 1
      `;

      if (rows.length === 0) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Zone not found',
        });
      }

      const zone = rows[0];

      // Get sensors in this zone
      const sensors = await sql`
        SELECT id, label, model, health, last_ping_at
        FROM sensor_nodes
        WHERE zone_id = ${id}
        ORDER BY label ASC
      `;

      // Get latest density
      const density = await sql`
        SELECT count, density_pct, avg_dwell_secs, time
        FROM zone_density
        WHERE zone_id = ${id}
        ORDER BY time DESC
        LIMIT 1
      `;

      return reply.code(200).send({
        ...zone,
        sensors,
        current_density: density.length > 0 ? density[0] : null,
      });
    } catch (err) {
      request.log.error(err, 'Error fetching zone');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch zone',
      });
    }
  });

  // ------------------------------------------------------------------
  // GET /api/v1/terminals
  // ------------------------------------------------------------------
  fastify.get('/api/v1/terminals', async (request, reply) => {
    const parsed = TerminalsQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'Validation Error',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const { limit, offset } = parsed.data;
    const airportId = request.operator!.airport_id;

    try {
      const terminals = await sql`
        SELECT
          t.id,
          t.name,
          t.floor_plan,
          (
            SELECT COUNT(*)::int
            FROM zones z
            WHERE z.terminal_id = t.id
          ) AS zone_count
        FROM terminals t
        WHERE t.airport_id = ${airportId}
        ORDER BY t.name ASC
        LIMIT ${limit}
        OFFSET ${offset}
      `;

      const countResult = await sql<{ count: string }[]>`
        SELECT COUNT(*)::text AS count
        FROM terminals
        WHERE airport_id = ${airportId}
      `;

      return reply.code(200).send({
        terminals,
        total: parseInt(countResult[0].count, 10),
        limit,
        offset,
      });
    } catch (err) {
      request.log.error(err, 'Error fetching terminals');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch terminals',
      });
    }
  });

  // ------------------------------------------------------------------
  // GET /api/v1/terminals/:id/flow
  // ------------------------------------------------------------------
  fastify.get('/api/v1/terminals/:id/flow', async (request, reply) => {
    const paramsParsed = TerminalIdParamsSchema.safeParse(request.params);
    if (!paramsParsed.success) {
      return reply.code(400).send({
        error: 'Validation Error',
        details: paramsParsed.error.flatten().fieldErrors,
      });
    }

    const queryParsed = FlowQuerySchema.safeParse(request.query);
    if (!queryParsed.success) {
      return reply.code(400).send({
        error: 'Validation Error',
        details: queryParsed.error.flatten().fieldErrors,
      });
    }

    const { id } = paramsParsed.data;
    const { from, to } = queryParsed.data;
    const airportId = request.operator!.airport_id;

    try {
      // Verify terminal belongs to the airport
      const termCheck = await sql`
        SELECT id FROM terminals
        WHERE id = ${id} AND airport_id = ${airportId}
        LIMIT 1
      `;

      if (termCheck.length === 0) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Terminal not found',
        });
      }

      const fromTs = from ? new Date(from) : new Date(Date.now() - 3600000);
      const toTs = to ? new Date(to) : new Date();

      // Passenger flow funnel: count unique tracks per zone type
      const flow = await sql`
        SELECT
          z.type AS zone_type,
          z.name AS zone_name,
          z.id AS zone_id,
          COUNT(DISTINCT t.track_id) AS unique_tracks,
          AVG(t.dwell_secs)::numeric(10,1) AS avg_dwell_secs
        FROM track_objects t
        JOIN zones z ON z.id = t.zone_id
        WHERE z.terminal_id = ${id}
          AND t.time >= ${fromTs}
          AND t.time <= ${toTs}
        GROUP BY z.id, z.type, z.name
        ORDER BY z.type, z.name
      `;

      return reply.code(200).send({
        terminal_id: id,
        from: fromTs.toISOString(),
        to: toTs.toISOString(),
        flow,
      });
    } catch (err) {
      request.log.error(err, 'Error fetching terminal flow');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch terminal flow data',
      });
    }
  });
}
