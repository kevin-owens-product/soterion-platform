import { FastifyInstance } from 'fastify';
import sql from '../../db/client.js';
import { authMiddleware } from '../../middleware/auth.js';
import { requireAdminRole } from '../../middleware/rbac.js';

export default async function adminAuditLogRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('preHandler', authMiddleware);
  fastify.addHook('preHandler', requireAdminRole());

  // ------------------------------------------------------------------
  // GET /api/v1/admin/audit-log - query with filters and cursor pagination
  // ------------------------------------------------------------------
  fastify.get('/api/v1/admin/audit-log', async (request, reply) => {
    const query = request.query as {
      actor_id?: string;
      actor_email?: string;
      action?: string;
      resource_type?: string;
      outcome?: string;
      facility_id?: string;
      from?: string;
      to?: string;
      cursor?: string;  // ISO timestamp for cursor-based pagination
      limit?: string;
    };

    const limit = Math.min(parseInt(query.limit || '50', 10), 200);

    try {
      const actorIdFilter = query.actor_id
        ? sql`AND al.actor_id = ${query.actor_id}`
        : sql``;
      const actorEmailFilter = query.actor_email
        ? sql`AND al.actor_email ILIKE ${'%' + query.actor_email + '%'}`
        : sql``;
      const actionFilter = query.action
        ? sql`AND al.action ILIKE ${'%' + query.action + '%'}`
        : sql``;
      const resourceFilter = query.resource_type
        ? sql`AND al.resource_type = ${query.resource_type}`
        : sql``;
      const outcomeFilter = query.outcome
        ? sql`AND al.outcome = ${query.outcome}`
        : sql``;
      const facilityFilter = query.facility_id
        ? sql`AND al.facility_id = ${query.facility_id}`
        : sql``;
      const fromFilter = query.from
        ? sql`AND al.event_time >= ${new Date(query.from)}`
        : sql``;
      const toFilter = query.to
        ? sql`AND al.event_time <= ${new Date(query.to)}`
        : sql``;
      const cursorFilter = query.cursor
        ? sql`AND al.event_time < ${new Date(query.cursor)}`
        : sql``;

      const entries = await sql`
        SELECT
          al.id, al.event_time, al.actor_id, al.actor_email,
          al.actor_ip, al.actor_user_agent, al.facility_id,
          al.action, al.resource_type, al.resource_id,
          al.before_state, al.after_state, al.outcome,
          al.session_id, al.request_id
        FROM audit_log al
        WHERE 1=1
          ${actorIdFilter}
          ${actorEmailFilter}
          ${actionFilter}
          ${resourceFilter}
          ${outcomeFilter}
          ${facilityFilter}
          ${fromFilter}
          ${toFilter}
          ${cursorFilter}
        ORDER BY al.event_time DESC
        LIMIT ${limit + 1}
      `;

      // Determine next cursor
      const hasMore = entries.length > limit;
      const results = hasMore ? entries.slice(0, limit) : entries;
      const nextCursor = hasMore && results.length > 0
        ? results[results.length - 1].event_time
        : null;

      return reply.code(200).send({
        entries: results,
        next_cursor: nextCursor ? new Date(nextCursor).toISOString() : null,
        has_more: hasMore,
      });
    } catch (err) {
      request.log.error(err, 'Error querying audit log');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to query audit log',
      });
    }
  });

  // ------------------------------------------------------------------
  // GET /api/v1/admin/audit-log/export - CSV export of filtered audit log
  // ------------------------------------------------------------------
  fastify.get('/api/v1/admin/audit-log/export', async (request, reply) => {
    const query = request.query as {
      actor_id?: string;
      action?: string;
      resource_type?: string;
      outcome?: string;
      facility_id?: string;
      from?: string;
      to?: string;
    };

    try {
      const actorIdFilter = query.actor_id
        ? sql`AND al.actor_id = ${query.actor_id}`
        : sql``;
      const actionFilter = query.action
        ? sql`AND al.action ILIKE ${'%' + query.action + '%'}`
        : sql``;
      const resourceFilter = query.resource_type
        ? sql`AND al.resource_type = ${query.resource_type}`
        : sql``;
      const outcomeFilter = query.outcome
        ? sql`AND al.outcome = ${query.outcome}`
        : sql``;
      const facilityFilter = query.facility_id
        ? sql`AND al.facility_id = ${query.facility_id}`
        : sql``;
      const fromFilter = query.from
        ? sql`AND al.event_time >= ${new Date(query.from)}`
        : sql``;
      const toFilter = query.to
        ? sql`AND al.event_time <= ${new Date(query.to)}`
        : sql``;

      const entries = await sql`
        SELECT
          al.id, al.event_time, al.actor_id, al.actor_email,
          al.actor_ip::text, al.facility_id,
          al.action, al.resource_type, al.resource_id,
          al.outcome, al.session_id, al.request_id
        FROM audit_log al
        WHERE 1=1
          ${actorIdFilter}
          ${actionFilter}
          ${resourceFilter}
          ${outcomeFilter}
          ${facilityFilter}
          ${fromFilter}
          ${toFilter}
        ORDER BY al.event_time DESC
        LIMIT 10000
      `;

      // Build CSV
      const headers = [
        'id', 'event_time', 'actor_id', 'actor_email', 'actor_ip',
        'facility_id', 'action', 'resource_type', 'resource_id',
        'outcome', 'session_id', 'request_id',
      ];

      let csv = headers.join(',') + '\n';
      for (const entry of entries) {
        const row = headers.map((h) => {
          const val = (entry as any)[h];
          if (val === null || val === undefined) return '';
          const str = String(val);
          // Escape CSV values
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        });
        csv += row.join(',') + '\n';
      }

      return reply
        .code(200)
        .header('Content-Type', 'text/csv')
        .header('Content-Disposition', `attachment; filename="audit-log-${new Date().toISOString().split('T')[0]}.csv"`)
        .send(csv);
    } catch (err) {
      request.log.error(err, 'Error exporting audit log');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to export audit log',
      });
    }
  });

  // NOTE: No UPDATE or DELETE endpoints — audit log is append-only by design
}
