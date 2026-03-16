import { FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcrypt';
import sql from '../db/client.js';

declare module 'fastify' {
  interface FastifyRequest {
    apiKey?: {
      id: string;
      label: string;
      facility_id: string;
      scopes: string[];
    };
  }
}

/**
 * API key authentication middleware.
 * Reads the X-API-Key header, hashes it, looks it up in the api_keys table,
 * verifies it is active / not expired / not revoked, and attaches context.
 */
export async function apiKeyMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const rawKey = request.headers['x-api-key'] as string | undefined;

  if (!rawKey) {
    return reply.code(401).send({
      error: 'Unauthorized',
      message: 'Missing X-API-Key header',
    });
  }

  // Dev-mode shortcut
  if (process.env.NODE_ENV === 'development' && rawKey === 'dev-api-key') {
    request.apiKey = {
      id: '00000000-0000-0000-0000-000000000001',
      label: 'Development Key',
      facility_id: '00000000-0000-0000-0000-000000000001',
      scopes: ['lidar:ingest', 'lidar:read', 'sensors:read'],
    };
    return;
  }

  try {
    // Extract the prefix (first 8 chars) to narrow the lookup
    const prefix = rawKey.substring(0, 8);

    const rows = await sql<{
      id: string;
      facility_id: string;
      label: string;
      key_hash: string;
      scopes: string[];
      expires_at: Date | null;
      revoked_at: Date | null;
    }[]>`
      SELECT id, facility_id, label, key_hash, scopes, expires_at, revoked_at
      FROM api_keys
      WHERE key_prefix = ${prefix}
        AND revoked_at IS NULL
    `;

    if (rows.length === 0) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Invalid API key',
      });
    }

    // Check bcrypt hash against each candidate (usually 1)
    let matched: typeof rows[0] | null = null;
    for (const row of rows) {
      const isMatch = await bcrypt.compare(rawKey, row.key_hash);
      if (isMatch) {
        matched = row;
        break;
      }
    }

    if (!matched) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Invalid API key',
      });
    }

    // Check expiry
    if (matched.expires_at && new Date(matched.expires_at) < new Date()) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'API key has expired',
      });
    }

    // Update last_used_at (fire-and-forget)
    sql`UPDATE api_keys SET last_used_at = NOW() WHERE id = ${matched.id}`.catch(() => {});

    request.apiKey = {
      id: matched.id,
      label: matched.label,
      facility_id: matched.facility_id,
      scopes: matched.scopes ?? [],
    };
  } catch (err) {
    request.log.error(err, 'API key verification error');
    return reply.code(500).send({
      error: 'Internal Server Error',
      message: 'API key verification error',
    });
  }
}

/**
 * Scope-checking helper. Returns a preHandler that ensures the API key has
 * the required scope.
 */
export function requireScope(scope: string) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (!request.apiKey) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'API key authentication required',
      });
    }
    if (!request.apiKey.scopes.includes(scope)) {
      return reply.code(403).send({
        error: 'Forbidden',
        message: `API key missing required scope: ${scope}`,
      });
    }
  };
}
