import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import sql from '../db/client.js';

/**
 * Audit logging middleware.
 *
 * Fastify onResponse hook that logs every authenticated request to the audit_log table.
 * Captures actor identity, action, resource, outcome, and state changes for mutations.
 *
 * Non-blocking: the audit log write happens after the response is sent using setImmediate,
 * so it does not add latency to the API response path.
 */

// Paths that should NOT be audited (health checks, static assets, etc.)
const SKIP_PATHS = new Set(['/health', '/health/deep', '/favicon.ico']);

// Methods that are considered mutations and should capture before/after state
const MUTATION_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

// Extract resource type from the route URL
function extractResourceType(url: string): string | null {
  // e.g. /api/v1/alerts/123/acknowledge -> "alert"
  // e.g. /api/v1/sensors/abc -> "sensor"
  const match = url.match(/\/api\/v1\/([^/]+)/);
  if (!match) return null;

  const plural = match[1];
  // Simple singularization
  if (plural.endsWith('ies')) return plural.slice(0, -3) + 'y';
  if (plural.endsWith('ses')) return plural.slice(0, -2);
  if (plural.endsWith('s')) return plural.slice(0, -1);
  return plural;
}

// Extract resource ID from request params
function extractResourceId(params: Record<string, unknown>): string | null {
  if (!params) return null;
  // Common param names for resource IDs
  const idKeys = ['id', 'sensorId', 'zoneId', 'terminalId', 'checkpointId', 'alertId'];
  for (const key of idKeys) {
    if (params[key] && typeof params[key] === 'string') {
      return params[key] as string;
    }
  }
  return null;
}

export async function registerAuditLogging(fastify: FastifyInstance): Promise<void> {
  // Store before_state for mutations (captured in preHandler before the route handler runs)
  fastify.addHook('preHandler', async (request: FastifyRequest) => {
    if (!MUTATION_METHODS.has(request.method)) return;
    if (SKIP_PATHS.has(request.url)) return;

    // Capture the request body as the "input state" for mutations
    // The actual before_state (existing record) would require a DB read,
    // which we skip to avoid latency. The request body serves as the mutation input.
    (request as any)._auditBeforeState = request.body ?? null;
  });

  // Write audit log after response is sent (non-blocking)
  fastify.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    // Skip non-authenticated requests and health checks
    if (SKIP_PATHS.has(request.routeOptions?.url ?? request.url)) return;

    const actor = (request as any).operator;
    const apiKeyCtx = (request as any).apiKey;

    // Only audit authenticated requests
    if (!actor && !apiKeyCtx) return;

    const statusCode = reply.statusCode;
    const outcome = statusCode >= 200 && statusCode < 400
      ? 'SUCCESS'
      : statusCode === 403
        ? 'DENIED'
        : 'FAILURE';

    const action = `${request.method} ${request.routeOptions?.url ?? request.url}`;
    const resourceType = extractResourceType(request.url);
    const resourceId = extractResourceId((request.params as Record<string, unknown>) ?? {});

    const actorId = actor?.id ?? apiKeyCtx?.id ?? null;
    const actorEmail = actor?.email ?? (apiKeyCtx ? `apikey:${apiKeyCtx.label}` : null);
    const facilityId = actor?.airport_id ?? apiKeyCtx?.facility_id ?? null;

    const beforeState = (request as any)._auditBeforeState ?? null;

    // Non-blocking write: use setImmediate so the response is not delayed
    setImmediate(() => {
      sql`
        INSERT INTO audit_log (
          actor_id,
          actor_email,
          actor_ip,
          actor_user_agent,
          facility_id,
          action,
          resource_type,
          resource_id,
          before_state,
          outcome,
          session_id,
          request_id
        ) VALUES (
          ${actorId},
          ${actorEmail},
          ${request.ip}::inet,
          ${request.headers['user-agent'] ?? null},
          ${facilityId},
          ${action},
          ${resourceType},
          ${resourceId},
          ${beforeState ? JSON.stringify(beforeState) : null}::jsonb,
          ${outcome},
          ${null},
          ${(request as any).requestId ?? null}
        )
      `.catch((err) => {
        // Never let audit log failures crash the server
        request.log.error({ err }, 'Failed to write audit log entry');
      });
    });
  });
}
