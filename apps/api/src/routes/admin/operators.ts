import { FastifyInstance } from 'fastify';
import sql from '../../db/client.js';
import { authMiddleware } from '../../middleware/auth.js';
import { requireAdminRole, invalidateRbacCache } from '../../middleware/rbac.js';
import { validatePassword, hashPassword } from '../../lib/password.js';

export default async function adminOperatorsRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('preHandler', authMiddleware);
  fastify.addHook('preHandler', requireAdminRole());

  // ------------------------------------------------------------------
  // GET /api/v1/admin/operators - list all operators across facilities
  // ------------------------------------------------------------------
  fastify.get('/api/v1/admin/operators', async (request, reply) => {
    const query = request.query as { facility_id?: string; limit?: string; offset?: string };
    const limit = Math.min(parseInt(query.limit || '50', 10), 200);
    const offset = parseInt(query.offset || '0', 10);

    try {
      const facilityFilter = query.facility_id
        ? sql`AND o.airport_id = ${query.facility_id}`
        : sql``;

      const operators = await sql`
        SELECT
          o.id, o.name, o.email, o.role, o.team,
          o.airport_id AS facility_id, o.created_at,
          f.name AS facility_name,
          f.short_code AS facility_code,
          COALESCE(
            (SELECT json_agg(json_build_object('role_id', r.id, 'role_name', r.name))
             FROM operator_roles orr
             JOIN roles r ON r.id = orr.role_id
             WHERE orr.operator_id = o.id),
            '[]'::json
          ) AS roles
        FROM operators o
        LEFT JOIN facilities f ON f.id = o.airport_id
        WHERE 1=1 ${facilityFilter}
        ORDER BY o.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      const countResult = await sql<{ count: string }[]>`
        SELECT COUNT(*)::text AS count FROM operators o WHERE 1=1 ${facilityFilter}
      `;

      return reply.code(200).send({
        operators,
        total: parseInt(countResult[0].count, 10),
        limit,
        offset,
      });
    } catch (err) {
      request.log.error(err, 'Error listing operators');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to list operators',
      });
    }
  });

  // ------------------------------------------------------------------
  // POST /api/v1/admin/operators - create operator with password policy
  // ------------------------------------------------------------------
  fastify.post('/api/v1/admin/operators', async (request, reply) => {
    const body = request.body as {
      name: string;
      email: string;
      password: string;
      role: string;
      team?: string;
      facility_id: string;
    };

    if (!body.name || !body.email || !body.password || !body.role || !body.facility_id) {
      return reply.code(400).send({
        error: 'Validation Error',
        message: 'name, email, password, role, and facility_id are required',
      });
    }

    // Validate password policy
    const validation = await validatePassword(body.password);
    if (!validation.valid) {
      return reply.code(400).send({
        error: 'Password Policy Violation',
        message: 'Password does not meet security requirements',
        details: validation.errors,
      });
    }

    try {
      const passwordHash = await hashPassword(body.password);

      const rows = await sql`
        INSERT INTO operators (name, email, password_hash, role, team, airport_id)
        VALUES (
          ${body.name},
          ${body.email},
          ${passwordHash},
          ${body.role},
          ${body.team ?? null},
          ${body.facility_id}
        )
        RETURNING id, name, email, role, team, airport_id AS facility_id, created_at
      `;

      return reply.code(201).send(rows[0]);
    } catch (err: any) {
      if (err?.code === '23505') {
        return reply.code(409).send({
          error: 'Conflict',
          message: 'An operator with this email already exists',
        });
      }
      request.log.error(err, 'Error creating operator');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to create operator',
      });
    }
  });

  // ------------------------------------------------------------------
  // PATCH /api/v1/admin/operators/:id - update operator
  // ------------------------------------------------------------------
  fastify.patch('/api/v1/admin/operators/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as {
      name?: string;
      email?: string;
      role?: string;
      team?: string;
    };

    try {
      const updates: string[] = [];
      const values: unknown[] = [];
      let idx = 1;

      if (body.name !== undefined) { updates.push(`name = $${idx++}`); values.push(body.name); }
      if (body.email !== undefined) { updates.push(`email = $${idx++}`); values.push(body.email); }
      if (body.role !== undefined) { updates.push(`role = $${idx++}`); values.push(body.role); }
      if (body.team !== undefined) { updates.push(`team = $${idx++}`); values.push(body.team); }

      if (updates.length === 0) {
        return reply.code(400).send({
          error: 'Validation Error',
          message: 'No fields to update',
        });
      }

      values.push(id);
      const query = `UPDATE operators SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id, name, email, role, team, airport_id AS facility_id, created_at`;
      const rows = await sql.unsafe(query, values as any[]);

      if (rows.length === 0) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Operator not found',
        });
      }

      return reply.code(200).send(rows[0]);
    } catch (err) {
      request.log.error(err, 'Error updating operator');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to update operator',
      });
    }
  });

  // ------------------------------------------------------------------
  // POST /api/v1/admin/operators/:id/deactivate - soft-delete
  // ------------------------------------------------------------------
  fastify.post('/api/v1/admin/operators/:id/deactivate', async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      // Soft-delete by setting role to 'deactivated' and revoking sessions
      const rows = await sql`
        UPDATE operators
        SET role = 'deactivated'
        WHERE id = ${id}
        RETURNING id, name, email
      `;

      if (rows.length === 0) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Operator not found',
        });
      }

      // Revoke all active sessions
      await sql`
        UPDATE operator_sessions
        SET revoked_at = NOW(), revoke_reason = 'operator_deactivated'
        WHERE operator_id = ${id} AND revoked_at IS NULL
      `.catch(() => {});

      // Invalidate RBAC cache
      await invalidateRbacCache(id);

      return reply.code(200).send({
        message: 'Operator deactivated',
        operator: rows[0],
      });
    } catch (err) {
      request.log.error(err, 'Error deactivating operator');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to deactivate operator',
      });
    }
  });

  // ------------------------------------------------------------------
  // POST /api/v1/admin/operators/:id/roles - assign roles
  // ------------------------------------------------------------------
  fastify.post('/api/v1/admin/operators/:id/roles', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { role_ids: string[] };

    if (!body.role_ids || !Array.isArray(body.role_ids)) {
      return reply.code(400).send({
        error: 'Validation Error',
        message: 'role_ids array is required',
      });
    }

    const grantedBy = request.operator!.id;

    try {
      // Verify operator exists
      const operatorRows = await sql`SELECT id FROM operators WHERE id = ${id}`;
      if (operatorRows.length === 0) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Operator not found',
        });
      }

      // Remove existing roles and assign new ones in a transaction
      await sql.begin(async (tx: any) => {
        await tx`DELETE FROM operator_roles WHERE operator_id = ${id}`;

        for (const roleId of body.role_ids) {
          await tx`
            INSERT INTO operator_roles (operator_id, role_id, granted_by)
            VALUES (${id}, ${roleId}, ${grantedBy})
            ON CONFLICT (operator_id, role_id) DO NOTHING
          `;
        }
      });

      // Invalidate RBAC cache for this operator
      await invalidateRbacCache(id);

      // Return updated roles
      const roles = await sql`
        SELECT r.id, r.name, r.description, orr.granted_at
        FROM operator_roles orr
        JOIN roles r ON r.id = orr.role_id
        WHERE orr.operator_id = ${id}
      `;

      return reply.code(200).send({
        message: 'Roles updated',
        operator_id: id,
        roles,
      });
    } catch (err) {
      request.log.error(err, 'Error assigning roles');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to assign roles',
      });
    }
  });
}
