import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import sql from '../db/client.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const OperatorsQuerySchema = z.object({
  role: z.enum(['operator', 'supervisor', 'admin']).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export default async function operatorRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('preHandler', authMiddleware);

  // ------------------------------------------------------------------
  // GET /api/v1/operators/me
  // ------------------------------------------------------------------
  fastify.get('/api/v1/operators/me', async (request, reply) => {
    const operatorId = request.operator!.id;

    try {
      const rows = await sql`
        SELECT
          o.id,
          o.email,
          o.name,
          o.role,
          o.team,
          o.airport_id,
          o.created_at,
          a.name AS airport_name,
          a.iata_code AS airport_iata
        FROM operators o
        JOIN airports a ON a.id = o.airport_id
        WHERE o.id = ${operatorId}
        LIMIT 1
      `;

      if (rows.length === 0) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Operator not found',
        });
      }

      return reply.code(200).send(rows[0]);
    } catch (err) {
      request.log.error(err, 'Error fetching operator profile');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch operator profile',
      });
    }
  });

  // ------------------------------------------------------------------
  // GET /api/v1/operators (supervisor+ only)
  // ------------------------------------------------------------------
  fastify.get('/api/v1/operators', {
    preHandler: requireRole('supervisor', 'admin'),
  }, async (request, reply) => {
    const parsed = OperatorsQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'Validation Error',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const { role, limit, offset } = parsed.data;
    const airportId = request.operator!.airport_id;

    try {
      const roleFilter = role ? sql`AND o.role = ${role}` : sql``;

      const operators = await sql`
        SELECT
          o.id,
          o.email,
          o.name,
          o.role,
          o.team,
          o.airport_id,
          o.created_at
        FROM operators o
        WHERE o.airport_id = ${airportId}
          ${roleFilter}
        ORDER BY o.name ASC
        LIMIT ${limit}
        OFFSET ${offset}
      `;

      const countResult = await sql<{ count: string }[]>`
        SELECT COUNT(*)::text AS count
        FROM operators o
        WHERE o.airport_id = ${airportId}
          ${roleFilter}
      `;

      return reply.code(200).send({
        operators,
        total: parseInt(countResult[0].count, 10),
        limit,
        offset,
      });
    } catch (err) {
      request.log.error(err, 'Error fetching operators');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch operators',
      });
    }
  });
}
