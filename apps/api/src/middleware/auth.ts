import { FastifyRequest, FastifyReply } from 'fastify';
import sql from '../db/client.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: string;
  airport_id: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    operator?: AuthenticatedUser;
  }
}

/**
 * JWT authentication middleware.
 * Verifies the Bearer token, decodes claims, and attaches the full operator
 * object to `request.operator`. Rejects expired or invalid tokens.
 */
export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      // In dev mode, allow requests without an Authorization header
      if (process.env.NODE_ENV === 'development') {
        request.log.warn('AUTH BYPASSED: No Authorization header, using dev fallback operator (NODE_ENV=development)');
        try {
          const devRows = await sql<{
            id: string;
            email: string;
            name: string;
            role: string;
            airport_id: string;
          }[]>`
            SELECT id, email, name, role, airport_id
            FROM operators
            WHERE role = 'admin'
            ORDER BY created_at ASC
            LIMIT 1
          `;
          if (devRows.length > 0) {
            request.operator = devRows[0];
            return;
          }
        } catch {
          // DB query failed, fall through to hardcoded fallback
        }
        request.operator = {
          id: '00000000-0000-0000-0000-000000000001',
          email: 'dev@soterion.io',
          name: 'Dev User',
          role: 'admin',
          airport_id: '00000000-0000-0000-0000-000000000001',
        };
        return;
      }
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header',
      });
    }

    const token = authHeader.slice(7);

    try {
      const decoded = await request.jwtVerify<{
        sub: string;
        email: string;
        role: string;
        airport_id: string;
      }>();

      // Fetch fresh operator data from DB to ensure account is still active
      const rows = await sql<{
        id: string;
        email: string;
        name: string;
        role: string;
        airport_id: string;
      }[]>`
        SELECT id, email, name, role, airport_id
        FROM operators
        WHERE id = ${decoded.sub}
        LIMIT 1
      `;

      if (rows.length === 0) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Operator account not found',
        });
      }

      request.operator = rows[0];
    } catch {
      // Dev-mode fallback: accept any token when NODE_ENV=development
      if (process.env.NODE_ENV === 'development') {
        request.log.warn('AUTH BYPASSED: JWT verification failed, using dev fallback operator (NODE_ENV=development)');

        // Try to load the first admin operator from the DB for a realistic dev experience
        try {
          const devRows = await sql<{
            id: string;
            email: string;
            name: string;
            role: string;
            airport_id: string;
          }[]>`
            SELECT id, email, name, role, airport_id
            FROM operators
            WHERE role = 'admin'
            ORDER BY created_at ASC
            LIMIT 1
          `;

          if (devRows.length > 0) {
            request.operator = devRows[0];
            return;
          }
        } catch {
          // DB query failed, fall through to hardcoded fallback
        }

        // Hardcoded fallback if no admin operator exists in DB
        request.operator = {
          id: '00000000-0000-0000-0000-000000000001',
          email: 'dev@soterion.io',
          name: 'Dev User',
          role: 'admin',
          airport_id: '00000000-0000-0000-0000-000000000001',
        };
        return;
      }
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      });
    }
  } catch (err) {
    request.log.error(err, 'Authentication error');
    return reply.code(500).send({
      error: 'Internal Server Error',
      message: 'Authentication error',
    });
  }
}

/**
 * Role-gating helper. Returns a preHandler that checks the operator's role.
 * Usage: `{ preHandler: [authMiddleware, requireRole('supervisor', 'admin')] }`
 */
export function requireRole(...roles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    // In dev mode, skip role checks entirely
    if (process.env.NODE_ENV === 'development') {
      request.log.warn(`ROLE CHECK BYPASSED: Skipping role check for [${roles.join(', ')}] (NODE_ENV=development)`);
      return;
    }

    if (!request.operator) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }
    if (!roles.includes(request.operator.role)) {
      return reply.code(403).send({
        error: 'Forbidden',
        message: `Requires one of: ${roles.join(', ')}`,
      });
    }
  };
}
