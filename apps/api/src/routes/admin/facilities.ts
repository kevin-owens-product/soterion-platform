import { FastifyInstance } from 'fastify';
import sql from '../../db/client.js';
import { authMiddleware } from '../../middleware/auth.js';
import { requireAdminRole } from '../../middleware/rbac.js';

export default async function adminFacilitiesRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('preHandler', authMiddleware);
  fastify.addHook('preHandler', requireAdminRole());

  // ------------------------------------------------------------------
  // GET /api/v1/admin/facilities - list all facilities (platform admin only)
  // ------------------------------------------------------------------
  fastify.get('/api/v1/admin/facilities', async (request, reply) => {
    try {
      const facilities = await sql`
        SELECT
          f.id, f.name, f.type, f.short_code, f.address,
          f.country_code, f.timezone, f.config, f.created_at,
          (SELECT COUNT(*)::int FROM operators o WHERE o.airport_id = f.id) AS operator_count,
          (SELECT COUNT(*)::int FROM sensor_nodes sn
           JOIN zones z ON z.id = sn.zone_id
           JOIN terminals t ON t.id = z.terminal_id
           WHERE t.airport_id = f.id) AS sensor_count
        FROM facilities f
        ORDER BY f.name ASC
      `;

      return reply.code(200).send({ facilities });
    } catch (err) {
      request.log.error(err, 'Error listing facilities');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to list facilities',
      });
    }
  });

  // ------------------------------------------------------------------
  // POST /api/v1/admin/facilities - create facility
  // ------------------------------------------------------------------
  fastify.post('/api/v1/admin/facilities', async (request, reply) => {
    const body = request.body as {
      name: string;
      type: string;
      short_code: string;
      address?: string;
      country_code?: string;
      timezone?: string;
      config?: Record<string, unknown>;
    };

    if (!body.name || !body.type || !body.short_code) {
      return reply.code(400).send({
        error: 'Validation Error',
        message: 'name, type, and short_code are required',
      });
    }

    try {
      const rows = await sql`
        INSERT INTO facilities (name, type, short_code, address, country_code, timezone, config)
        VALUES (
          ${body.name},
          ${body.type},
          ${body.short_code},
          ${body.address ?? null},
          ${body.country_code ?? null},
          ${body.timezone ?? 'UTC'},
          ${JSON.stringify(body.config ?? {})}::jsonb
        )
        RETURNING *
      `;

      return reply.code(201).send(rows[0]);
    } catch (err: any) {
      if (err?.code === '23505') {
        return reply.code(409).send({
          error: 'Conflict',
          message: 'A facility with this short_code already exists',
        });
      }
      request.log.error(err, 'Error creating facility');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to create facility',
      });
    }
  });

  // ------------------------------------------------------------------
  // PATCH /api/v1/admin/facilities/:id - update facility
  // ------------------------------------------------------------------
  fastify.patch('/api/v1/admin/facilities/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as {
      name?: string;
      type?: string;
      address?: string;
      country_code?: string;
      timezone?: string;
      config?: Record<string, unknown>;
    };

    try {
      const updates: string[] = [];
      const values: unknown[] = [];
      let idx = 1;

      if (body.name !== undefined) { updates.push(`name = $${idx++}`); values.push(body.name); }
      if (body.type !== undefined) { updates.push(`type = $${idx++}`); values.push(body.type); }
      if (body.address !== undefined) { updates.push(`address = $${idx++}`); values.push(body.address); }
      if (body.country_code !== undefined) { updates.push(`country_code = $${idx++}`); values.push(body.country_code); }
      if (body.timezone !== undefined) { updates.push(`timezone = $${idx++}`); values.push(body.timezone); }
      if (body.config !== undefined) { updates.push(`config = $${idx++}::jsonb`); values.push(JSON.stringify(body.config)); }

      if (updates.length === 0) {
        return reply.code(400).send({
          error: 'Validation Error',
          message: 'No fields to update',
        });
      }

      values.push(id);
      const query = `UPDATE facilities SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`;
      const rows = await sql.unsafe(query, values as any[]);

      if (rows.length === 0) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Facility not found',
        });
      }

      return reply.code(200).send(rows[0]);
    } catch (err) {
      request.log.error(err, 'Error updating facility');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to update facility',
      });
    }
  });

  // ------------------------------------------------------------------
  // DELETE /api/v1/admin/facilities/:id - deactivate facility (soft delete via config flag)
  // ------------------------------------------------------------------
  fastify.delete('/api/v1/admin/facilities/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const rows = await sql`
        UPDATE facilities
        SET config = config || '{"deactivated": true, "deactivated_at": "${sql.unsafe(new Date().toISOString())}"}'::jsonb
        WHERE id = ${id}
        RETURNING id, name, short_code
      `;

      if (rows.length === 0) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Facility not found',
        });
      }

      return reply.code(200).send({
        message: 'Facility deactivated',
        facility: rows[0],
      });
    } catch (err) {
      request.log.error(err, 'Error deactivating facility');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to deactivate facility',
      });
    }
  });
}
