import { FastifyInstance } from 'fastify';
import sql from '../db/client.js';
import { authMiddleware } from '../middleware/auth.js';

export default async function facilityRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('preHandler', authMiddleware);

  // ------------------------------------------------------------------
  // GET /api/v1/facility/config
  // Returns the full FacilityConfig for the authenticated operator's facility.
  // Queries: facilities, zone_type_definitions, kpi_definitions,
  //          compliance_frameworks, ml_model_registry.
  // ------------------------------------------------------------------
  fastify.get('/api/v1/facility/config', async (request, reply) => {
    const airportId = request.operator!.airport_id;

    try {
      // 1. Get facility record
      //    The operator's airport_id may point to either the airports table
      //    or the facilities table. Try facilities first, fall back to airports.
      let facility: {
        id: string;
        name: string;
        type: string;
        short_code: string;
        timezone: string;
        config: unknown;
      } | null = null;

      const facilityRows = await sql<{
        id: string;
        name: string;
        type: string;
        short_code: string;
        timezone: string;
        config: unknown;
      }[]>`
        SELECT id, name, type, short_code, timezone, config
        FROM facilities
        WHERE id = ${airportId}
        LIMIT 1
      `.catch(() => []);

      if (facilityRows.length > 0) {
        facility = facilityRows[0];
      } else {
        // Fall back: look up airport and synthesize a facility-like record
        const airportRows = await sql<{
          id: string;
          name: string;
          iata_code: string;
        }[]>`
          SELECT id, name, iata_code
          FROM airports
          WHERE id = ${airportId}
          LIMIT 1
        `;

        if (airportRows.length === 0) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'Facility not found for this operator',
          });
        }

        const airport = airportRows[0];
        facility = {
          id: airport.id,
          name: airport.name,
          type: 'AIRPORT',
          short_code: airport.iata_code,
          timezone: 'UTC',
          config: {},
        };
      }

      const facilityType = facility!.type;

      // 2. Zone type definitions for this facility type
      const zoneTypes = await sql`
        SELECT id, key, label, default_sla
        FROM zone_type_definitions
        WHERE facility_type = ${facilityType}
        ORDER BY label ASC
      `.catch(() => []);

      // 3. KPI definitions for this facility type
      const kpiDefinitions = await sql`
        SELECT id, key, label, unit, direction, default_target
        FROM kpi_definitions
        WHERE facility_type = ${facilityType}
        ORDER BY label ASC
      `.catch(() => []);

      // 4. Compliance frameworks for this facility type
      const complianceFrameworks = await sql`
        SELECT id, framework_key, label, rules
        FROM compliance_frameworks
        WHERE facility_type = ${facilityType}
        ORDER BY label ASC
      `.catch(() => []);

      // 5. Active ML models for this facility type
      const mlModels = await sql`
        SELECT model_key, version, onnx_s3_key, deployed_at
        FROM ml_model_registry
        WHERE facility_type = ${facilityType}
          AND active = TRUE
        ORDER BY deployed_at DESC
      `.catch(() => []);

      // Build activeMLModels map: modelKey -> version
      const activeMLModels: Record<string, string> = {};
      for (const m of mlModels) {
        if (!activeMLModels[m.model_key]) {
          activeMLModels[m.model_key] = m.version;
        }
      }

      return reply.code(200).send({
        facilityType,
        facility: {
          id: facility!.id,
          name: facility!.name,
          short_code: facility!.short_code,
          timezone: facility!.timezone,
          config: facility!.config,
        },
        zoneTypes,
        kpiDefinitions,
        complianceFrameworks,
        activeMLModels,
      });
    } catch (err) {
      request.log.error(err, 'Error fetching facility config');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch facility configuration',
      });
    }
  });
}
