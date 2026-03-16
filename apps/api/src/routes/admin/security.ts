import { FastifyInstance } from 'fastify';
import sql from '../../db/client.js';
import { authMiddleware } from '../../middleware/auth.js';
import { requireAdminRole } from '../../middleware/rbac.js';

export default async function adminSecurityRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('preHandler', authMiddleware);
  fastify.addHook('preHandler', requireAdminRole());

  // ================================================================
  // SECURITY INCIDENTS
  // ================================================================

  // ------------------------------------------------------------------
  // GET /api/v1/admin/security/incidents - list incidents
  // ------------------------------------------------------------------
  fastify.get('/api/v1/admin/security/incidents', async (request, reply) => {
    const query = request.query as {
      facility_id?: string;
      severity?: string;
      status?: string;
      limit?: string;
      offset?: string;
    };

    const limit = Math.min(parseInt(query.limit || '50', 10), 200);
    const offset = parseInt(query.offset || '0', 10);

    try {
      const facilityFilter = query.facility_id
        ? sql`AND si.facility_id = ${query.facility_id}`
        : sql``;
      const severityFilter = query.severity
        ? sql`AND si.severity = ${query.severity.toUpperCase()}`
        : sql``;

      // Status is derived from lifecycle fields
      let statusFilter = sql``;
      if (query.status === 'detected') statusFilter = sql`AND si.reported_at IS NULL`;
      else if (query.status === 'reported') statusFilter = sql`AND si.reported_at IS NOT NULL AND si.contained_at IS NULL`;
      else if (query.status === 'contained') statusFilter = sql`AND si.contained_at IS NOT NULL AND si.resolved_at IS NULL`;
      else if (query.status === 'resolved') statusFilter = sql`AND si.resolved_at IS NOT NULL`;

      const incidents = await sql`
        SELECT
          si.*,
          o.name AS created_by_name,
          CASE
            WHEN si.resolved_at IS NOT NULL THEN 'resolved'
            WHEN si.contained_at IS NOT NULL THEN 'contained'
            WHEN si.reported_at IS NOT NULL THEN 'reported'
            ELSE 'detected'
          END AS status
        FROM security_incidents si
        LEFT JOIN operators o ON o.id = si.created_by
        WHERE 1=1
          ${facilityFilter}
          ${severityFilter}
          ${statusFilter}
        ORDER BY si.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      return reply.code(200).send({ incidents });
    } catch (err) {
      request.log.error(err, 'Error listing incidents');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to list security incidents',
      });
    }
  });

  // ------------------------------------------------------------------
  // GET /api/v1/admin/security/incidents/:id - get incident
  // ------------------------------------------------------------------
  fastify.get('/api/v1/admin/security/incidents/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const rows = await sql`
        SELECT si.*, o.name AS created_by_name
        FROM security_incidents si
        LEFT JOIN operators o ON o.id = si.created_by
        WHERE si.id = ${id}
        LIMIT 1
      `;

      if (rows.length === 0) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Security incident not found',
        });
      }

      return reply.code(200).send(rows[0]);
    } catch (err) {
      request.log.error(err, 'Error fetching incident');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch security incident',
      });
    }
  });

  // ------------------------------------------------------------------
  // POST /api/v1/admin/security/incidents - create incident
  // ------------------------------------------------------------------
  fastify.post('/api/v1/admin/security/incidents', async (request, reply) => {
    const body = request.body as {
      facility_id: string;
      title: string;
      severity: string;
      category?: string;
      description?: string;
      detected_at?: string;
    };

    if (!body.facility_id || !body.title || !body.severity) {
      return reply.code(400).send({
        error: 'Validation Error',
        message: 'facility_id, title, and severity are required',
      });
    }

    try {
      const rows = await sql`
        INSERT INTO security_incidents (
          facility_id, title, severity, category, description,
          detected_at, created_by
        ) VALUES (
          ${body.facility_id},
          ${body.title},
          ${body.severity.toUpperCase()},
          ${body.category ?? null},
          ${body.description ?? null},
          ${body.detected_at ? new Date(body.detected_at) : new Date()},
          ${request.operator!.id}
        )
        RETURNING *
      `;

      return reply.code(201).send(rows[0]);
    } catch (err) {
      request.log.error(err, 'Error creating incident');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to create security incident',
      });
    }
  });

  // ------------------------------------------------------------------
  // PATCH /api/v1/admin/security/incidents/:id - update lifecycle
  // ------------------------------------------------------------------
  fastify.patch('/api/v1/admin/security/incidents/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as {
      reported_at?: string;
      contained_at?: string;
      resolved_at?: string;
      root_cause?: string;
      remediation?: string;
      notified_parties?: string[];
    };

    try {
      const updates: string[] = [];
      const values: unknown[] = [];
      let idx = 1;

      if (body.reported_at !== undefined) { updates.push(`reported_at = $${idx++}`); values.push(new Date(body.reported_at)); }
      if (body.contained_at !== undefined) { updates.push(`contained_at = $${idx++}`); values.push(new Date(body.contained_at)); }
      if (body.resolved_at !== undefined) { updates.push(`resolved_at = $${idx++}`); values.push(new Date(body.resolved_at)); }
      if (body.root_cause !== undefined) { updates.push(`root_cause = $${idx++}`); values.push(body.root_cause); }
      if (body.remediation !== undefined) { updates.push(`remediation = $${idx++}`); values.push(body.remediation); }
      if (body.notified_parties !== undefined) { updates.push(`notified_parties = $${idx++}`); values.push(body.notified_parties); }

      if (updates.length === 0) {
        return reply.code(400).send({
          error: 'Validation Error',
          message: 'No fields to update',
        });
      }

      values.push(id);
      const query = `UPDATE security_incidents SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`;
      const rows = await sql.unsafe(query, values as any[]);

      if (rows.length === 0) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Security incident not found',
        });
      }

      return reply.code(200).send(rows[0]);
    } catch (err) {
      request.log.error(err, 'Error updating incident');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to update security incident',
      });
    }
  });

  // ================================================================
  // VULNERABILITY FINDINGS
  // ================================================================

  // ------------------------------------------------------------------
  // GET /api/v1/admin/security/vulnerabilities - list vulnerabilities
  // ------------------------------------------------------------------
  fastify.get('/api/v1/admin/security/vulnerabilities', async (request, reply) => {
    const query = request.query as {
      severity?: string;
      status?: string;
      limit?: string;
      offset?: string;
    };

    const limit = Math.min(parseInt(query.limit || '50', 10), 200);
    const offset = parseInt(query.offset || '0', 10);

    try {
      const severityFilter = query.severity
        ? sql`AND vf.severity = ${query.severity.toUpperCase()}`
        : sql``;
      const statusFilter = query.status
        ? sql`AND vf.status = ${query.status.toUpperCase()}`
        : sql``;

      const findings = await sql`
        SELECT
          vf.*,
          CASE
            WHEN vf.remediation_due IS NOT NULL AND vf.remediated_at IS NULL
            THEN EXTRACT(EPOCH FROM (vf.remediation_due - NOW())) / 86400
            ELSE NULL
          END AS days_until_due
        FROM vulnerability_findings vf
        WHERE 1=1
          ${severityFilter}
          ${statusFilter}
        ORDER BY
          CASE vf.severity
            WHEN 'CRITICAL' THEN 1
            WHEN 'HIGH' THEN 2
            WHEN 'MEDIUM' THEN 3
            WHEN 'LOW' THEN 4
            ELSE 5
          END,
          vf.discovered_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      return reply.code(200).send({ findings });
    } catch (err) {
      request.log.error(err, 'Error listing vulnerabilities');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to list vulnerability findings',
      });
    }
  });

  // ------------------------------------------------------------------
  // GET /api/v1/admin/security/vulnerabilities/:id - get finding
  // ------------------------------------------------------------------
  fastify.get('/api/v1/admin/security/vulnerabilities/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const rows = await sql`
        SELECT vf.*
        FROM vulnerability_findings vf
        WHERE vf.id = ${id}
        LIMIT 1
      `;

      if (rows.length === 0) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Vulnerability finding not found',
        });
      }

      return reply.code(200).send(rows[0]);
    } catch (err) {
      request.log.error(err, 'Error fetching vulnerability');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch vulnerability finding',
      });
    }
  });

  // ------------------------------------------------------------------
  // POST /api/v1/admin/security/vulnerabilities - create finding
  // ------------------------------------------------------------------
  fastify.post('/api/v1/admin/security/vulnerabilities', async (request, reply) => {
    const body = request.body as {
      source?: string;
      severity: string;
      cve_id?: string;
      title: string;
      description?: string;
      affected_component?: string;
      discovered_at?: string;
    };

    if (!body.title || !body.severity) {
      return reply.code(400).send({
        error: 'Validation Error',
        message: 'title and severity are required',
      });
    }

    // Calculate FedRAMP SLA remediation_due
    const severityUpper = body.severity.toUpperCase();
    const slaDays: Record<string, number> = {
      CRITICAL: 15,
      HIGH: 30,
      MEDIUM: 90,
      LOW: 180,
      INFORMATIONAL: 365,
    };
    const discoveredAt = body.discovered_at ? new Date(body.discovered_at) : new Date();
    const remediationDue = new Date(discoveredAt.getTime() + (slaDays[severityUpper] ?? 90) * 24 * 60 * 60 * 1000);

    try {
      const rows = await sql`
        INSERT INTO vulnerability_findings (
          source, severity, cve_id, title, description,
          affected_component, discovered_at, remediation_due, status
        ) VALUES (
          ${body.source ?? null},
          ${severityUpper},
          ${body.cve_id ?? null},
          ${body.title},
          ${body.description ?? null},
          ${body.affected_component ?? null},
          ${discoveredAt},
          ${remediationDue},
          'OPEN'
        )
        RETURNING *
      `;

      return reply.code(201).send(rows[0]);
    } catch (err) {
      request.log.error(err, 'Error creating vulnerability');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to create vulnerability finding',
      });
    }
  });

  // ------------------------------------------------------------------
  // PATCH /api/v1/admin/security/vulnerabilities/:id - update status
  // ------------------------------------------------------------------
  fastify.patch('/api/v1/admin/security/vulnerabilities/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as {
      status?: string;
      remediated_at?: string;
      risk_acceptance_reason?: string;
    };

    try {
      const updates: string[] = [];
      const values: unknown[] = [];
      let idx = 1;

      if (body.status !== undefined) { updates.push(`status = $${idx++}`); values.push(body.status.toUpperCase()); }
      if (body.remediated_at !== undefined) { updates.push(`remediated_at = $${idx++}`); values.push(new Date(body.remediated_at)); }
      if (body.risk_acceptance_reason !== undefined) { updates.push(`risk_acceptance_reason = $${idx++}`); values.push(body.risk_acceptance_reason); }

      if (updates.length === 0) {
        return reply.code(400).send({
          error: 'Validation Error',
          message: 'No fields to update',
        });
      }

      values.push(id);
      const query = `UPDATE vulnerability_findings SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`;
      const rows = await sql.unsafe(query, values as any[]);

      if (rows.length === 0) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Vulnerability finding not found',
        });
      }

      return reply.code(200).send(rows[0]);
    } catch (err) {
      request.log.error(err, 'Error updating vulnerability');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to update vulnerability finding',
      });
    }
  });

  // ================================================================
  // SECURITY DASHBOARD
  // ================================================================

  // ------------------------------------------------------------------
  // GET /api/v1/admin/security/dashboard - summary stats
  // ------------------------------------------------------------------
  fastify.get('/api/v1/admin/security/dashboard', async (request, reply) => {
    try {
      const [incidentStats, vulnStats] = await Promise.all([
        sql`
          SELECT
            COUNT(*) FILTER (WHERE resolved_at IS NULL)::int AS open_incidents,
            COUNT(*) FILTER (WHERE severity = 'CRITICAL' AND resolved_at IS NULL)::int AS critical_open,
            COUNT(*) FILTER (WHERE severity = 'HIGH' AND resolved_at IS NULL)::int AS high_open,
            COUNT(*) FILTER (WHERE severity = 'MEDIUM' AND resolved_at IS NULL)::int AS medium_open,
            COUNT(*) FILTER (WHERE severity = 'LOW' AND resolved_at IS NULL)::int AS low_open,
            COUNT(*) FILTER (WHERE resolved_at IS NOT NULL)::int AS resolved_total
          FROM security_incidents
        `,
        sql`
          SELECT
            COUNT(*) FILTER (WHERE status IN ('OPEN', 'IN_PROGRESS'))::int AS open_vulns,
            COUNT(*) FILTER (WHERE severity = 'CRITICAL' AND status IN ('OPEN', 'IN_PROGRESS'))::int AS critical_open,
            COUNT(*) FILTER (WHERE severity = 'HIGH' AND status IN ('OPEN', 'IN_PROGRESS'))::int AS high_open,
            COUNT(*) FILTER (
              WHERE remediation_due < NOW()
              AND status IN ('OPEN', 'IN_PROGRESS')
            )::int AS overdue_vulns,
            COUNT(*) FILTER (WHERE status = 'REMEDIATED')::int AS remediated_total
          FROM vulnerability_findings
        `,
      ]);

      return reply.code(200).send({
        incidents: incidentStats[0],
        vulnerabilities: vulnStats[0],
      });
    } catch (err) {
      request.log.error(err, 'Error fetching security dashboard');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch security dashboard',
      });
    }
  });
}
