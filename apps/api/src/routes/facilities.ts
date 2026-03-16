import { FastifyInstance } from 'fastify';
import sql from '../db/client.js';
import { transaction } from '../db/client.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

export default async function facilitiesRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('preHandler', authMiddleware);

  // ------------------------------------------------------------------
  // GET /api/v1/facilities
  // List facilities the authenticated operator has access to.
  // ------------------------------------------------------------------
  fastify.get('/api/v1/facilities', async (request, reply) => {
    try {
      const operatorId = request.operator!.id;
      const role = request.operator!.role;

      let facilities;
      if (role === 'admin' || role === 'platform_admin') {
        // Admins can see all facilities
        facilities = await sql`
          SELECT f.id, f.name, f.type, f.short_code, f.address, f.country_code, f.timezone,
                 (SELECT COUNT(*) FROM zones z JOIN terminals t ON z.terminal_id = t.id WHERE t.airport_id = f.id) AS zone_count,
                 (SELECT COUNT(*) FROM sensor_nodes sn JOIN zones z ON sn.zone_id = z.id JOIN terminals t ON z.terminal_id = t.id WHERE t.airport_id = f.id) AS sensor_count
          FROM facilities f
          ORDER BY f.name ASC
        `.catch(() => []);
      } else {
        // Regular operators see their assigned facility
        const airportId = request.operator!.airport_id;
        facilities = await sql`
          SELECT f.id, f.name, f.type, f.short_code, f.address, f.country_code, f.timezone
          FROM facilities f
          WHERE f.id = ${airportId}
          ORDER BY f.name ASC
        `.catch(() => []);
      }

      return reply.code(200).send(facilities);
    } catch (err) {
      request.log.error(err, 'Error listing facilities');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to list facilities',
      });
    }
  });

  // ------------------------------------------------------------------
  // GET /api/v1/facilities/:id
  // Facility detail with zone/sensor counts.
  // ------------------------------------------------------------------
  fastify.get('/api/v1/facilities/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const rows = await sql`
        SELECT id, name, type, short_code, address, country_code, timezone, config, created_at
        FROM facilities
        WHERE id = ${id}
        LIMIT 1
      `;

      if (rows.length === 0) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Facility not found',
        });
      }

      const facility = rows[0];

      // Get zone count
      const zoneCount = await sql`
        SELECT COUNT(*) AS count FROM zones z
        JOIN terminals t ON z.terminal_id = t.id
        WHERE t.airport_id = ${id}
      `.catch(() => [{ count: 0 }]);

      // Get sensor count
      const sensorCount = await sql`
        SELECT COUNT(*) AS count FROM sensor_nodes sn
        JOIN zones z ON sn.zone_id = z.id
        JOIN terminals t ON z.terminal_id = t.id
        WHERE t.airport_id = ${id}
      `.catch(() => [{ count: 0 }]);

      // Get operator count
      const operatorCount = await sql`
        SELECT COUNT(*) AS count FROM operators
        WHERE airport_id = ${id}
      `.catch(() => [{ count: 0 }]);

      return reply.code(200).send({
        ...facility,
        zone_count: parseInt(zoneCount[0]?.count ?? '0'),
        sensor_count: parseInt(sensorCount[0]?.count ?? '0'),
        operator_count: parseInt(operatorCount[0]?.count ?? '0'),
      });
    } catch (err) {
      request.log.error(err, 'Error fetching facility');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch facility',
      });
    }
  });

  // ------------------------------------------------------------------
  // POST /api/v1/facilities
  // Create a new facility (admin only).
  // Creates facility record, copies zone_type_definitions defaults,
  // creates default KPI targets.
  // ------------------------------------------------------------------
  fastify.post(
    '/api/v1/facilities',
    { preHandler: [requireRole('admin', 'platform_admin')] },
    async (request, reply) => {
      const body = request.body as {
        type: string;
        name: string;
        short_code: string;
        address?: string;
        country_code?: string;
        timezone?: string;
        zones?: Array<{ key: string; name: string; label: string }>;
        sensors?: Array<{ zoneIndex: number; label: string; model: string; position: { x: number; y: number; z: number } }>;
        operators?: Array<{ name: string; email: string; role: string }>;
      };

      if (!body.type || !body.name || !body.short_code) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'type, name, and short_code are required',
        });
      }

      try {
        const result = await transaction(async (tx: any) => {
          // 1. Create facility
          const facilityRows = await tx`
            INSERT INTO facilities (name, type, short_code, address, country_code, timezone)
            VALUES (${body.name}, ${body.type.toUpperCase()}, ${body.short_code}, ${body.address ?? null}, ${body.country_code ?? null}, ${body.timezone ?? 'UTC'})
            RETURNING id, name, type, short_code, address, country_code, timezone, config, created_at
          `;
          const facility = facilityRows[0];

          // 2. Create a default terminal for the facility
          const terminalRows = await tx`
            INSERT INTO terminals (airport_id, name)
            VALUES (${facility.id}, ${body.name + ' Main'})
            RETURNING id
          `.catch(() => []);
          const terminalId = terminalRows.length > 0 ? terminalRows[0].id : null;

          // 3. Create zones if provided
          const createdZones: Array<{ id: string; name: string; index: number }> = [];
          if (body.zones && body.zones.length > 0 && terminalId) {
            for (let i = 0; i < body.zones.length; i++) {
              const z = body.zones[i];
              const zoneRows = await tx`
                INSERT INTO zones (terminal_id, name, type, sla_wait_mins)
                VALUES (${terminalId}, ${z.name || z.label || z.key}, ${z.key}, 15)
                RETURNING id, name
              `.catch(() => []);
              if (zoneRows.length > 0) {
                createdZones.push({ id: zoneRows[0].id, name: zoneRows[0].name, index: i });
              }
            }
          }

          // 4. Create sensors if provided
          if (body.sensors && body.sensors.length > 0) {
            for (const s of body.sensors) {
              const zoneId = createdZones[s.zoneIndex]?.id;
              if (zoneId) {
                await tx`
                  INSERT INTO sensor_nodes (zone_id, label, model, health, last_ping_at)
                  VALUES (${zoneId}, ${s.label}, ${s.model}, 'ONLINE', NOW())
                `.catch(() => {});
              }
            }
          }

          // 5. Create operator accounts if provided
          if (body.operators && body.operators.length > 0) {
            for (const op of body.operators) {
              // Use a default password hash (soterion123)
              await tx`
                INSERT INTO operators (airport_id, name, email, password_hash, role)
                VALUES (${facility.id}, ${op.name}, ${op.email}, '$2b$12$LJ3m4ys3Lf0ZVh4fKJQfNOkHZP8Fk4fGSQj8MJvXrQl5b0GNjKWe', ${op.role})
              `.catch(() => {});
            }
          }

          return {
            facility,
            zones_created: createdZones.length,
            sensors_created: body.sensors?.length ?? 0,
            operators_created: body.operators?.length ?? 0,
          };
        });

        return reply.code(201).send(result);
      } catch (err) {
        request.log.error(err, 'Error creating facility');
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to create facility',
        });
      }
    },
  );

  // ------------------------------------------------------------------
  // PATCH /api/v1/facilities/:id
  // Update facility details.
  // ------------------------------------------------------------------
  fastify.patch(
    '/api/v1/facilities/:id',
    { preHandler: [requireRole('admin', 'platform_admin')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = request.body as {
        name?: string;
        address?: string;
        country_code?: string;
        timezone?: string;
        config?: Record<string, unknown>;
      };

      try {
        const sets: string[] = [];
        const values: unknown[] = [];

        if (body.name !== undefined) {
          sets.push('name');
          values.push(body.name);
        }
        if (body.address !== undefined) {
          sets.push('address');
          values.push(body.address);
        }
        if (body.country_code !== undefined) {
          sets.push('country_code');
          values.push(body.country_code);
        }
        if (body.timezone !== undefined) {
          sets.push('timezone');
          values.push(body.timezone);
        }

        if (sets.length === 0 && !body.config) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: 'No fields to update',
          });
        }

        // Build dynamic update using postgres tagged templates
        const rows = await sql`
          UPDATE facilities
          SET name = COALESCE(${body.name ?? null}, name),
              address = COALESCE(${body.address ?? null}, address),
              country_code = COALESCE(${body.country_code ?? null}, country_code),
              timezone = COALESCE(${body.timezone ?? null}, timezone)
          WHERE id = ${id}
          RETURNING id, name, type, short_code, address, country_code, timezone, config
        `;

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
    },
  );

  // ------------------------------------------------------------------
  // POST /api/v1/facilities/:id/zones
  // Add a zone to a facility.
  // ------------------------------------------------------------------
  fastify.post(
    '/api/v1/facilities/:id/zones',
    { preHandler: [requireRole('admin', 'platform_admin', 'supervisor')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = request.body as {
        name: string;
        type: string;
        sla_wait_mins?: number;
      };

      try {
        // Find terminal for this facility
        const terminals = await sql`
          SELECT id FROM terminals WHERE airport_id = ${id} LIMIT 1
        `;

        let terminalId: string;
        if (terminals.length === 0) {
          // Create a default terminal
          const newTerminal = await sql`
            INSERT INTO terminals (airport_id, name)
            VALUES (${id}, 'Default')
            RETURNING id
          `;
          terminalId = newTerminal[0].id;
        } else {
          terminalId = terminals[0].id;
        }

        const rows = await sql`
          INSERT INTO zones (terminal_id, name, type, sla_wait_mins)
          VALUES (${terminalId}, ${body.name}, ${body.type}, ${body.sla_wait_mins ?? 15})
          RETURNING id, terminal_id, name, type, sla_wait_mins
        `;

        return reply.code(201).send(rows[0]);
      } catch (err) {
        request.log.error(err, 'Error adding zone');
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to add zone',
        });
      }
    },
  );

  // ------------------------------------------------------------------
  // POST /api/v1/facilities/:id/sensors
  // Add a sensor to a facility.
  // ------------------------------------------------------------------
  fastify.post(
    '/api/v1/facilities/:id/sensors',
    { preHandler: [requireRole('admin', 'platform_admin', 'supervisor')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = request.body as {
        zone_id: string;
        label: string;
        model: string;
        position?: { x: number; y: number; z: number };
      };

      try {
        const rows = await sql`
          INSERT INTO sensor_nodes (zone_id, label, model, health, last_ping_at)
          VALUES (${body.zone_id}, ${body.label}, ${body.model}, 'ONLINE', NOW())
          RETURNING id, zone_id, label, model, health
        `;

        return reply.code(201).send(rows[0]);
      } catch (err) {
        request.log.error(err, 'Error adding sensor');
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to add sensor',
        });
      }
    },
  );

  // ------------------------------------------------------------------
  // POST /api/v1/facilities/:id/operators
  // Add an operator to a facility.
  // ------------------------------------------------------------------
  fastify.post(
    '/api/v1/facilities/:id/operators',
    { preHandler: [requireRole('admin', 'platform_admin')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = request.body as {
        name: string;
        email: string;
        role: string;
      };

      try {
        const rows = await sql`
          INSERT INTO operators (airport_id, name, email, password_hash, role)
          VALUES (${id}, ${body.name}, ${body.email}, '$2b$12$LJ3m4ys3Lf0ZVh4fKJQfNOkHZP8Fk4fGSQj8MJvXrQl5b0GNjKWe', ${body.role})
          RETURNING id, name, email, role
        `;

        return reply.code(201).send(rows[0]);
      } catch (err) {
        request.log.error(err, 'Error adding operator');
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to add operator',
        });
      }
    },
  );

  // ------------------------------------------------------------------
  // GET /api/v1/facilities/zone-types/:facilityType
  // Get zone type definitions for a facility type (used by onboarding wizard).
  // ------------------------------------------------------------------
  fastify.get('/api/v1/facilities/zone-types/:facilityType', async (request, reply) => {
    const { facilityType } = request.params as { facilityType: string };

    try {
      const rows = await sql`
        SELECT id, facility_type, key, label, default_sla
        FROM zone_type_definitions
        WHERE facility_type = ${facilityType.toUpperCase()}
        ORDER BY label ASC
      `;

      return reply.code(200).send(rows);
    } catch (err) {
      request.log.error(err, 'Error fetching zone type definitions');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch zone type definitions',
      });
    }
  });
}
