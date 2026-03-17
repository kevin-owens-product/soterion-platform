import { FastifyRequest, FastifyReply } from 'fastify';
import sql from '../db/client.js';
import { redis } from '../lib/redis.js';

// ---------------------------------------------------------------------------
// RBAC: Role-Based Access Control Middleware
// ---------------------------------------------------------------------------
// Loads role_permissions from DB into Redis on startup.
// Permission check middleware for every route.
// Permission format: "resource:action" e.g., "alerts:acknowledge"
// ---------------------------------------------------------------------------

const RBAC_CACHE_PREFIX = 'rbac:operator:';
const RBAC_CACHE_TTL = 300; // 5 minutes

/**
 * Load all role_permissions from DB into Redis on startup.
 * Maps: operator_id -> set of "resource:action" permissions.
 */
export async function loadRbacCache(): Promise<void> {
  try {
    const rows = await sql<{
      operator_id: string;
      resource: string;
      action: string;
    }[]>`
      SELECT or2.operator_id, p.resource, p.action
      FROM operator_roles or2
      JOIN role_permissions rp ON rp.role_id = or2.role_id
      JOIN permissions p ON p.id = rp.permission_id
    `;

    // Group by operator
    const operatorPerms = new Map<string, Set<string>>();
    for (const row of rows) {
      const perm = `${row.resource}:${row.action}`;
      if (!operatorPerms.has(row.operator_id)) {
        operatorPerms.set(row.operator_id, new Set());
      }
      operatorPerms.get(row.operator_id)!.add(perm);
    }

    // Store in Redis
    const pipeline = redis.pipeline();
    for (const [operatorId, perms] of operatorPerms) {
      const key = `${RBAC_CACHE_PREFIX}${operatorId}`;
      pipeline.del(key);
      if (perms.size > 0) {
        pipeline.sadd(key, ...perms);
        pipeline.expire(key, RBAC_CACHE_TTL);
      }
    }
    await pipeline.exec();
  } catch (err) {
    // Log but don't crash — permissions will be loaded on demand
    console.error('[RBAC] Failed to preload permission cache:', err);
  }
}

/**
 * Get permissions for an operator, checking Redis cache first then DB.
 */
async function getOperatorPermissions(operatorId: string): Promise<Set<string>> {
  const cacheKey = `${RBAC_CACHE_PREFIX}${operatorId}`;

  // Check Redis cache
  try {
    const cached = await redis.smembers(cacheKey);
    if (cached.length > 0) {
      return new Set(cached);
    }
  } catch {
    // Redis unavailable, fall through to DB
  }

  // Load from DB
  const rows = await sql<{
    resource: string;
    action: string;
  }[]>`
    SELECT p.resource, p.action
    FROM operator_roles or2
    JOIN role_permissions rp ON rp.role_id = or2.role_id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE or2.operator_id = ${operatorId}
  `;

  const perms = new Set(rows.map((r) => `${r.resource}:${r.action}`));

  // Cache in Redis
  try {
    if (perms.size > 0) {
      const pipeline = redis.pipeline();
      pipeline.del(cacheKey);
      pipeline.sadd(cacheKey, ...perms);
      pipeline.expire(cacheKey, RBAC_CACHE_TTL);
      await pipeline.exec();
    }
  } catch {
    // Cache write failure is non-fatal
  }

  return perms;
}

/**
 * Invalidate the RBAC cache for a specific operator.
 * Call this when roles are assigned or revoked.
 */
export async function invalidateRbacCache(operatorId: string): Promise<void> {
  try {
    await redis.del(`${RBAC_CACHE_PREFIX}${operatorId}`);
  } catch {
    // Non-fatal
  }
}

/**
 * Invalidate the RBAC cache for all operators with a given role.
 */
export async function invalidateRbacCacheForRole(roleId: string): Promise<void> {
  try {
    const rows = await sql<{ operator_id: string }[]>`
      SELECT operator_id FROM operator_roles WHERE role_id = ${roleId}
    `;
    const pipeline = redis.pipeline();
    for (const row of rows) {
      pipeline.del(`${RBAC_CACHE_PREFIX}${row.operator_id}`);
    }
    await pipeline.exec();
  } catch {
    // Non-fatal
  }
}

/**
 * Check if an operator has a specific permission.
 */
export async function hasPermission(
  operatorId: string,
  resource: string,
  action: string,
): Promise<boolean> {
  const perms = await getOperatorPermissions(operatorId);
  return perms.has(`${resource}:${action}`);
}

/**
 * Middleware factory: require specific permission(s) on a route.
 * Usage: { preHandler: [authMiddleware, requirePermission('alerts:acknowledge')] }
 */
export function requirePermission(...permissions: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    // In dev mode, skip permission checks entirely
    if (process.env.NODE_ENV === 'development') {
      request.log.warn(`RBAC BYPASSED: Skipping permission check for [${permissions.join(', ')}] (NODE_ENV=development)`);
      return;
    }

    const operator = request.operator;
    if (!operator) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    const operatorPerms = await getOperatorPermissions(operator.id);

    // Check if operator has ALL required permissions
    const missing = permissions.filter((p) => !operatorPerms.has(p));
    if (missing.length > 0) {
      return reply.code(403).send({
        error: 'Forbidden',
        message: `Missing required permission(s): ${missing.join(', ')}`,
        required: permissions,
        missing,
      });
    }
  };
}

/**
 * Middleware: require admin or platform_admin role.
 * Used as a guard for all /admin routes.
 */
export function requireAdminRole() {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    // In dev mode, skip admin role check entirely
    if (process.env.NODE_ENV === 'development') {
      request.log.warn('RBAC BYPASSED: Skipping admin role check (NODE_ENV=development)');
      return;
    }

    const operator = request.operator;
    if (!operator) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    // Check RBAC permissions first, then fall back to operator.role column
    const perms = await getOperatorPermissions(operator.id);
    const hasAdminPerm = perms.has('admin:read') || perms.has('admin:write') || perms.has('admin:access');
    const hasAdminRole = operator.role === 'admin' || operator.role === 'platform_admin';
    if (!hasAdminPerm && !hasAdminRole) {
      return reply.code(403).send({
        error: 'Forbidden',
        message: 'Admin access required.',
      });
    }
  };
}
