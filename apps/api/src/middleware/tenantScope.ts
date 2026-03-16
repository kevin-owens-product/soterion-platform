import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import sql from '../db/client.js';

declare module 'fastify' {
  interface FastifyRequest {
    facilityId?: string;
  }
}

// Paths that do not require tenant scoping (public, health, auth)
const SKIP_PATHS = new Set([
  '/health',
  '/health/deep',
  '/api/v1/auth/login',
  '/api/v1/auth/refresh',
]);

/**
 * Multi-tenant enforcement middleware.
 *
 * Ensures that every authenticated request has a facility_id attached to the
 * request context. This prevents cross-tenant data access.
 *
 * For JWT-authenticated requests, the facility_id comes from the operator's airport_id.
 * For API key-authenticated requests, the facility_id comes from the API key's facility_id.
 *
 * Rejects any authenticated request where the facility_id cannot be determined.
 */
export async function registerTenantScope(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    const routeUrl = request.routeOptions?.url ?? request.url;

    // Skip paths that don't need tenant scoping
    if (SKIP_PATHS.has(routeUrl)) return;

    const operator = (request as any).operator;
    const apiKey = (request as any).apiKey;

    // If not authenticated, let the auth middleware handle rejection
    if (!operator && !apiKey) return;

    // Extract facility_id from the authenticated context
    const facilityId = operator?.airport_id ?? apiKey?.facility_id ?? null;

    if (!facilityId) {
      // In dev mode, fall back to the first facility in the DB
      if (process.env.NODE_ENV === 'development') {
        try {
          const fallbackRows = await sql<{ id: string }[]>`
            SELECT id FROM facilities ORDER BY created_at ASC LIMIT 1
          `;
          if (fallbackRows.length > 0) {
            request.log.warn(
              { fallbackFacilityId: fallbackRows[0].id },
              'TENANT SCOPE BYPASSED: No facility_id found, using first facility from DB (NODE_ENV=development)',
            );
            request.facilityId = fallbackRows[0].id;
            return;
          }

          // Try airports table as fallback if facilities table doesn't exist or is empty
          const airportRows = await sql<{ id: string }[]>`
            SELECT id FROM airports ORDER BY created_at ASC LIMIT 1
          `;
          if (airportRows.length > 0) {
            request.log.warn(
              { fallbackAirportId: airportRows[0].id },
              'TENANT SCOPE BYPASSED: No facility_id found, using first airport from DB (NODE_ENV=development)',
            );
            request.facilityId = airportRows[0].id;
            return;
          }
        } catch {
          // DB query failed, fall through to rejection
          request.log.warn('TENANT SCOPE: Dev fallback DB query failed');
        }
      }

      request.log.warn(
        { operator: operator?.id, apiKey: apiKey?.id },
        'Authenticated request without facility_id — rejecting',
      );
      return reply.code(403).send({
        error: 'Forbidden',
        message: 'No facility context found for this account. Contact your administrator.',
      });
    }

    // Attach facility_id to the request for downstream use
    request.facilityId = facilityId;
  });
}

/**
 * Helper: wraps a SQL query to ensure it is scoped to a specific facility.
 *
 * Usage:
 *   const rows = await scopedQuery(
 *     sql`SELECT * FROM anomaly_events WHERE airport_id = ${facilityId}`,
 *     facilityId
 *   );
 *
 * This is a documentation/enforcement pattern. The actual scoping is done
 * by including the facilityId in every query WHERE clause. This helper
 * validates that a facilityId is present and throws if not.
 */
export function assertFacilityId(facilityId: string | undefined): string {
  if (!facilityId) {
    throw new Error('Tenant scoping error: facilityId is required but was not provided');
  }
  return facilityId;
}

/**
 * Validate that a given resource belongs to the expected facility.
 * Use this when accessing a resource by ID to prevent cross-tenant access.
 *
 * @param table - The table name to check
 * @param resourceId - The resource UUID
 * @param facilityId - The expected facility_id
 * @param facilityColumn - The column name containing the facility reference (default: 'airport_id')
 * @returns true if the resource belongs to the facility, false otherwise
 */
export async function validateResourceOwnership(
  table: string,
  resourceId: string,
  facilityId: string,
  facilityColumn: string = 'airport_id',
): Promise<boolean> {
  const rows = await sql.unsafe(
    `SELECT 1 FROM ${table} WHERE id = $1 AND ${facilityColumn} = $2 LIMIT 1`,
    [resourceId, facilityId],
  );
  return rows.length > 0;
}
