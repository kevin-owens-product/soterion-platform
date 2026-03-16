import { FastifyInstance } from 'fastify';
import sql from '../../db/client.js';
import { authMiddleware } from '../../middleware/auth.js';
import { requireAdminRole } from '../../middleware/rbac.js';
import { revokeSession } from '../../middleware/session.js';

export default async function adminSessionsRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('preHandler', authMiddleware);
  fastify.addHook('preHandler', requireAdminRole());

  // ------------------------------------------------------------------
  // GET /api/v1/admin/sessions - list active sessions
  // ------------------------------------------------------------------
  fastify.get('/api/v1/admin/sessions', async (request, reply) => {
    const query = request.query as {
      operator_id?: string;
      facility_id?: string;
      limit?: string;
      offset?: string;
    };

    const limit = Math.min(parseInt(query.limit || '50', 10), 200);
    const offset = parseInt(query.offset || '0', 10);

    try {
      const operatorFilter = query.operator_id
        ? sql`AND os.operator_id = ${query.operator_id}`
        : sql``;
      const facilityFilter = query.facility_id
        ? sql`AND os.facility_id = ${query.facility_id}`
        : sql``;

      const sessions = await sql`
        SELECT
          os.id, os.operator_id, os.facility_id,
          os.ip_address::text, os.user_agent,
          os.created_at, os.expires_at, os.revoked_at, os.revoke_reason,
          o.name AS operator_name, o.email AS operator_email,
          f.name AS facility_name
        FROM operator_sessions os
        JOIN operators o ON o.id = os.operator_id
        LEFT JOIN facilities f ON f.id = os.facility_id
        WHERE os.revoked_at IS NULL
          AND os.expires_at > NOW()
          ${operatorFilter}
          ${facilityFilter}
        ORDER BY os.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      return reply.code(200).send({ sessions });
    } catch (err) {
      request.log.error(err, 'Error listing sessions');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to list sessions',
      });
    }
  });

  // ------------------------------------------------------------------
  // POST /api/v1/admin/sessions/:id/revoke - force-revoke session
  // ------------------------------------------------------------------
  fastify.post('/api/v1/admin/sessions/:id/revoke', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { reason?: string } | undefined;

    try {
      const reason = body?.reason || `force_revoked_by_admin:${request.operator!.email}`;
      const revoked = await revokeSession(id, reason);

      if (!revoked) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Session not found or already revoked',
        });
      }

      return reply.code(200).send({
        message: 'Session revoked',
        session_id: id,
      });
    } catch (err) {
      request.log.error(err, 'Error revoking session');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to revoke session',
      });
    }
  });

  // ------------------------------------------------------------------
  // GET /api/v1/admin/sessions/stats - active session counts by facility
  // ------------------------------------------------------------------
  fastify.get('/api/v1/admin/sessions/stats', async (request, reply) => {
    try {
      const stats = await sql`
        SELECT
          os.facility_id,
          f.name AS facility_name,
          f.short_code AS facility_code,
          COUNT(*)::int AS active_sessions
        FROM operator_sessions os
        LEFT JOIN facilities f ON f.id = os.facility_id
        WHERE os.revoked_at IS NULL
          AND os.expires_at > NOW()
        GROUP BY os.facility_id, f.name, f.short_code
        ORDER BY active_sessions DESC
      `;

      const totalActive = stats.reduce((sum: number, s: any) => sum + s.active_sessions, 0);

      return reply.code(200).send({
        total_active: totalActive,
        by_facility: stats,
      });
    } catch (err) {
      request.log.error(err, 'Error fetching session stats');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch session statistics',
      });
    }
  });
}
