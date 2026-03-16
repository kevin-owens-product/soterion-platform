import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import sql from '../db/client.js';
import { authMiddleware } from '../middleware/auth.js';

const ShiftQuerySchema = z.object({
  date: z.string().optional().describe('YYYY-MM-DD, defaults to today'),
});

const HistoryQuerySchema = z.object({
  from: z.string().optional().describe('ISO date YYYY-MM-DD'),
  to: z.string().optional().describe('ISO date YYYY-MM-DD'),
  limit: z.coerce.number().int().min(1).max(100).default(30),
  offset: z.coerce.number().int().min(0).default(0),
});

const LeaderboardQuerySchema = z.object({
  period: z.enum(['daily', 'weekly', 'monthly', 'all_time']).default('weekly'),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export default async function scoreRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('preHandler', authMiddleware);

  // ------------------------------------------------------------------
  // GET /api/v1/scores/shift - current operator's shift score for today
  // ------------------------------------------------------------------
  fastify.get('/api/v1/scores/shift', async (request, reply) => {
    const parsed = ShiftQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'Validation Error',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const operatorId = request.operator!.id;
    const airportId = request.operator!.airport_id;
    const date = parsed.data.date ?? new Date().toISOString().slice(0, 10);

    try {
      const rows = await sql`
        SELECT
          id, operator_id, shift_date, shift_start, shift_end,
          total_score, security_score, flow_score, response_score,
          compliance_score, uptime_score, streak_multiplier, created_at
        FROM shift_scores
        WHERE operator_id = ${operatorId}
          AND airport_id = ${airportId}
          AND shift_date = ${date}
        LIMIT 1
      `;

      if (rows.length === 0) {
        return reply.code(200).send({ score: null, date });
      }

      return reply.code(200).send({ score: rows[0], date });
    } catch (err) {
      request.log.error(err, 'Error fetching shift score');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch shift score',
      });
    }
  });

  // ------------------------------------------------------------------
  // GET /api/v1/scores/history - operator's shift score history
  // ------------------------------------------------------------------
  fastify.get('/api/v1/scores/history', async (request, reply) => {
    const parsed = HistoryQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'Validation Error',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const { from, to, limit, offset } = parsed.data;
    const operatorId = request.operator!.id;
    const airportId = request.operator!.airport_id;

    try {
      const fromFilter = from ? sql`AND shift_date >= ${from}` : sql``;
      const toFilter = to ? sql`AND shift_date <= ${to}` : sql``;

      const scores = await sql`
        SELECT
          id, shift_date, shift_start, shift_end,
          total_score, security_score, flow_score, response_score,
          compliance_score, uptime_score, streak_multiplier, created_at
        FROM shift_scores
        WHERE operator_id = ${operatorId}
          AND airport_id = ${airportId}
          ${fromFilter}
          ${toFilter}
        ORDER BY shift_date DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `;

      const countResult = await sql<{ count: string }[]>`
        SELECT COUNT(*)::text AS count
        FROM shift_scores
        WHERE operator_id = ${operatorId}
          AND airport_id = ${airportId}
          ${fromFilter}
          ${toFilter}
      `;

      return reply.code(200).send({
        scores,
        total: parseInt(countResult[0].count, 10),
        limit,
        offset,
      });
    } catch (err) {
      request.log.error(err, 'Error fetching score history');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch score history',
      });
    }
  });

  // ------------------------------------------------------------------
  // GET /api/v1/leaderboard - weekly aggregate, ranked
  // ------------------------------------------------------------------
  fastify.get('/api/v1/leaderboard', async (request, reply) => {
    const parsed = LeaderboardQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'Validation Error',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const { period, limit } = parsed.data;
    const airportId = request.operator!.airport_id;

    try {
      const dateFilter = periodToDateFilter(period);

      const leaderboard = await sql`
        SELECT
          o.id AS operator_id,
          o.name,
          o.email,
          o.team,
          SUM(ss.total_score)::int AS total_score,
          COUNT(ss.id)::int AS shifts_count,
          AVG(ss.total_score)::numeric(6,1) AS avg_score,
          MAX(ss.streak_multiplier)::numeric(3,2) AS streak_multiplier,
          RANK() OVER (ORDER BY SUM(ss.total_score) DESC)::int AS rank,
          (SELECT COUNT(*)::int FROM operator_badges ob WHERE ob.operator_id = o.id) AS badge_count
        FROM shift_scores ss
        JOIN operators o ON o.id = ss.operator_id
        WHERE ss.airport_id = ${airportId}
          AND ss.shift_date >= ${dateFilter}
        GROUP BY o.id, o.name, o.email, o.team
        ORDER BY total_score DESC
        LIMIT ${limit}
      `;

      return reply.code(200).send({
        period,
        leaderboard,
      });
    } catch (err) {
      request.log.error(err, 'Error fetching leaderboard');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch leaderboard',
      });
    }
  });

  // ------------------------------------------------------------------
  // GET /api/v1/badges - all badge definitions
  // ------------------------------------------------------------------
  fastify.get('/api/v1/badges', async (_request, reply) => {
    try {
      const badges = await sql`
        SELECT id, key, name, description, icon, category
        FROM badge_definitions
        ORDER BY name ASC
      `;

      return reply.code(200).send({ badges });
    } catch (err) {
      _request.log.error(err, 'Error fetching badges');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch badges',
      });
    }
  });

  // ------------------------------------------------------------------
  // GET /api/v1/badges/mine - operator's earned badges
  // ------------------------------------------------------------------
  fastify.get('/api/v1/badges/mine', async (request, reply) => {
    const operatorId = request.operator!.id;

    try {
      const badges = await sql`
        SELECT
          ob.id,
          ob.badge_id,
          ob.earned_at,
          bd.key,
          bd.name,
          bd.description,
          bd.icon,
          bd.category
        FROM operator_badges ob
        JOIN badge_definitions bd ON bd.id = ob.badge_id
        WHERE ob.operator_id = ${operatorId}
        ORDER BY ob.earned_at DESC
      `;

      return reply.code(200).send({
        operator_id: operatorId,
        badges,
        total: badges.length,
      });
    } catch (err) {
      request.log.error(err, 'Error fetching operator badges');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch operator badges',
      });
    }
  });

  // ------------------------------------------------------------------
  // GET /api/v1/missions - active missions for airport
  // ------------------------------------------------------------------
  fastify.get('/api/v1/missions', async (request, reply) => {
    const airportId = request.operator!.airport_id;

    try {
      const missions = await sql`
        SELECT
          id, title, description, metric_key, target_value,
          reward_type, reward_value, resets_at, active
        FROM missions
        WHERE airport_id = ${airportId}
          AND active = TRUE
        ORDER BY title ASC
      `;

      return reply.code(200).send({ missions });
    } catch (err) {
      request.log.error(err, 'Error fetching missions');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch missions',
      });
    }
  });

  // ------------------------------------------------------------------
  // GET /api/v1/missions/progress - operator's mission progress
  // ------------------------------------------------------------------
  fastify.get('/api/v1/missions/progress', async (request, reply) => {
    const operatorId = request.operator!.id;
    const airportId = request.operator!.airport_id;

    try {
      const progress = await sql`
        SELECT
          mp.id,
          mp.mission_id,
          mp.progress,
          mp.completed,
          mp.completed_at,
          mp.updated_at,
          m.title,
          m.description,
          m.metric_key,
          m.target_value,
          m.reward_type,
          m.reward_value
        FROM mission_progress mp
        JOIN missions m ON m.id = mp.mission_id
        WHERE mp.operator_id = ${operatorId}
          AND m.airport_id = ${airportId}
          AND m.active = TRUE
        ORDER BY mp.updated_at DESC
      `;

      return reply.code(200).send({
        operator_id: operatorId,
        progress,
      });
    } catch (err) {
      request.log.error(err, 'Error fetching mission progress');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch mission progress',
      });
    }
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function periodToDateFilter(period: string): string {
  const now = new Date();
  switch (period) {
    case 'daily':
      return now.toISOString().slice(0, 10);
    case 'weekly': {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return weekAgo.toISOString().slice(0, 10);
    }
    case 'monthly': {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return monthAgo.toISOString().slice(0, 10);
    }
    case 'all_time':
      return '1970-01-01';
    default:
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  }
}
