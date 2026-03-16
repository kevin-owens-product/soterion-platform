import { FastifyInstance } from 'fastify';
import sql from '../../db/client.js';
import { authMiddleware } from '../../middleware/auth.js';
import { requireAdminRole } from '../../middleware/rbac.js';

export default async function adminRetentionRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('preHandler', authMiddleware);
  fastify.addHook('preHandler', requireAdminRole());

  // ------------------------------------------------------------------
  // GET /api/v1/admin/retention - list retention policies per facility
  // ------------------------------------------------------------------
  fastify.get('/api/v1/admin/retention', async (request, reply) => {
    const query = request.query as { facility_id?: string };

    try {
      const facilityFilter = query.facility_id
        ? sql`WHERE rp.facility_id = ${query.facility_id}`
        : sql``;

      const policies = await sql`
        SELECT
          rp.*,
          f.name AS facility_name,
          f.short_code AS facility_code
        FROM retention_policies rp
        LEFT JOIN facilities f ON f.id = rp.facility_id
        ${facilityFilter}
        ORDER BY rp.facility_id, rp.data_type
      `;

      return reply.code(200).send({ policies });
    } catch (err) {
      request.log.error(err, 'Error listing retention policies');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to list retention policies',
      });
    }
  });

  // ------------------------------------------------------------------
  // POST /api/v1/admin/retention - create/update retention policy
  // ------------------------------------------------------------------
  fastify.post('/api/v1/admin/retention', async (request, reply) => {
    const body = request.body as {
      facility_id: string;
      data_type: string;
      retention_days: number;
      legal_basis?: string;
      auto_purge?: boolean;
    };

    if (!body.facility_id || !body.data_type || !body.retention_days) {
      return reply.code(400).send({
        error: 'Validation Error',
        message: 'facility_id, data_type, and retention_days are required',
      });
    }

    try {
      // Upsert: update if exists for same facility + data_type, else insert
      const rows = await sql`
        INSERT INTO retention_policies (
          facility_id, data_type, retention_days, legal_basis, auto_purge
        ) VALUES (
          ${body.facility_id},
          ${body.data_type},
          ${body.retention_days},
          ${body.legal_basis ?? null},
          ${body.auto_purge ?? false}
        )
        ON CONFLICT (id) DO NOTHING
        RETURNING *
      `;

      // If no conflict-based upsert possible (no unique constraint on facility+data_type),
      // check for existing and update
      if (rows.length === 0) {
        const existing = await sql`
          SELECT id FROM retention_policies
          WHERE facility_id = ${body.facility_id}
            AND data_type = ${body.data_type}
          LIMIT 1
        `;

        if (existing.length > 0) {
          const updated = await sql`
            UPDATE retention_policies
            SET retention_days = ${body.retention_days},
                legal_basis = ${body.legal_basis ?? null},
                auto_purge = ${body.auto_purge ?? false}
            WHERE id = ${existing[0].id}
            RETURNING *
          `;
          return reply.code(200).send(updated[0]);
        }
      }

      return reply.code(201).send(rows[0]);
    } catch (err) {
      request.log.error(err, 'Error creating retention policy');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to create/update retention policy',
      });
    }
  });

  // ------------------------------------------------------------------
  // GET /api/v1/admin/retention/status - tables approaching limits
  // ------------------------------------------------------------------
  fastify.get('/api/v1/admin/retention/status', async (request, reply) => {
    try {
      const policies = await sql`
        SELECT
          rp.id, rp.facility_id, rp.data_type,
          rp.retention_days, rp.auto_purge, rp.last_purged_at,
          f.name AS facility_name
        FROM retention_policies rp
        LEFT JOIN facilities f ON f.id = rp.facility_id
        WHERE rp.auto_purge = TRUE
        ORDER BY rp.last_purged_at ASC NULLS FIRST
      `;

      // For each policy, check if there are records older than retention period
      const status = [];
      for (const policy of policies) {
        const tableName = policy.data_type;
        // Only check known safe table names to prevent SQL injection
        const allowedTables = [
          'track_objects', 'zone_density', 'queue_metrics',
          'anomaly_events', 'audit_log', 'operator_sessions',
        ];

        if (allowedTables.includes(tableName)) {
          try {
            const cutoff = new Date(Date.now() - policy.retention_days * 24 * 60 * 60 * 1000);
            const timeCol = tableName === 'track_objects' || tableName === 'zone_density' || tableName === 'queue_metrics'
              ? 'time'
              : tableName === 'audit_log'
                ? 'event_time'
                : 'created_at';

            const countResult = await sql.unsafe(
              `SELECT COUNT(*)::int AS expired_count FROM ${tableName} WHERE ${timeCol} < $1`,
              [cutoff],
            );

            status.push({
              ...policy,
              expired_record_count: countResult[0]?.expired_count ?? 0,
              cutoff_date: cutoff.toISOString(),
            });
          } catch {
            status.push({
              ...policy,
              expired_record_count: null,
              error: 'Could not query table',
            });
          }
        } else {
          status.push({
            ...policy,
            expired_record_count: null,
            note: 'Table not in allowed list for status check',
          });
        }
      }

      return reply.code(200).send({ retention_status: status });
    } catch (err) {
      request.log.error(err, 'Error fetching retention status');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch retention status',
      });
    }
  });
}
