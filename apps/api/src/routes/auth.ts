import { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import sql from '../db/client.js';
import { LoginBodySchema, RefreshBodySchema } from '../schemas/auth.js';

export default async function authRoutes(fastify: FastifyInstance): Promise<void> {
  // ------------------------------------------------------------------
  // POST /api/v1/auth/login
  // ------------------------------------------------------------------
  fastify.post('/api/v1/auth/login', async (request, reply) => {
    const parsed = LoginBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'Validation Error',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const { email, password } = parsed.data;

    try {
      // Look up operator by email, joining facilities to get facility_id
      const rows = await sql<{
        id: string;
        email: string;
        name: string;
        password_hash: string;
        role: string;
        airport_id: string;
        facility_id: string | null;
      }[]>`
        SELECT o.id, o.email, o.name, o.password_hash, o.role, o.airport_id,
               f.id AS facility_id
        FROM operators o
        LEFT JOIN airports a ON a.id = o.airport_id
        LEFT JOIN facilities f ON f.short_code = a.iata_code
        WHERE o.email = ${email}
        LIMIT 1
      `;

      if (rows.length === 0) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Invalid email or password',
        });
      }

      const operator = rows[0];

      // Verify bcrypt password hash
      const validPassword = await bcrypt.compare(password, operator.password_hash);
      if (!validPassword) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Invalid email or password',
        });
      }

      // Generate JWT access token
      const jti = uuidv4();
      const accessToken = fastify.jwt.sign(
        {
          sub: operator.id,
          email: operator.email,
          role: operator.role,
          airport_id: operator.airport_id,
          facility_id: operator.facility_id,
          jti,
        },
        { expiresIn: '1h' },
      );

      // Generate refresh token (opaque UUID stored in operator_sessions)
      const refreshToken = uuidv4();
      const refreshExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

      // Store session (facility_id from facilities table join, falls back gracefully)
      if (operator.facility_id) {
        await sql`
          INSERT INTO operator_sessions (operator_id, facility_id, jwt_jti, ip_address, user_agent, expires_at)
          VALUES (
            ${operator.id},
            ${operator.facility_id},
            ${refreshToken},
            ${request.ip}::inet,
            ${request.headers['user-agent'] ?? null},
            ${refreshExpiresAt}
          )
        `.catch((err) => {
          request.log.warn({ err }, 'Could not store session');
        });
      }

      // Update last login
      await sql`
        UPDATE operators SET created_at = created_at WHERE id = ${operator.id}
      `.catch(() => {});

      return reply.code(200).send({
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: 3600,
        token_type: 'Bearer' as const,
        operator: {
          id: operator.id,
          email: operator.email,
          name: operator.name,
          role: operator.role,
          airport_id: operator.airport_id,
        },
      });
    } catch (err) {
      request.log.error(err, 'Login error');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Login failed',
      });
    }
  });

  // ------------------------------------------------------------------
  // POST /api/v1/auth/refresh
  // ------------------------------------------------------------------
  fastify.post('/api/v1/auth/refresh', async (request, reply) => {
    const parsed = RefreshBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'Validation Error',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const { refresh_token } = parsed.data;

    try {
      // Look up the refresh session
      const sessions = await sql<{
        id: string;
        operator_id: string;
        facility_id: string;
        expires_at: Date;
        revoked_at: Date | null;
      }[]>`
        SELECT id, operator_id, facility_id, expires_at, revoked_at
        FROM operator_sessions
        WHERE jwt_jti = ${refresh_token}
        LIMIT 1
      `;

      if (sessions.length === 0) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Invalid refresh token',
        });
      }

      const session = sessions[0];

      if (session.revoked_at) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Refresh token has been revoked',
        });
      }

      if (new Date(session.expires_at) < new Date()) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Refresh token has expired',
        });
      }

      // Get operator with facility_id
      const operators = await sql<{
        id: string;
        email: string;
        name: string;
        role: string;
        airport_id: string;
        facility_id: string | null;
      }[]>`
        SELECT o.id, o.email, o.name, o.role, o.airport_id,
               f.id AS facility_id
        FROM operators o
        LEFT JOIN airports a ON a.id = o.airport_id
        LEFT JOIN facilities f ON f.short_code = a.iata_code
        WHERE o.id = ${session.operator_id}
        LIMIT 1
      `;

      if (operators.length === 0) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Operator not found',
        });
      }

      const operator = operators[0];

      // Revoke old refresh token (rotation)
      await sql`
        UPDATE operator_sessions
        SET revoked_at = NOW(), revoke_reason = 'token_rotation'
        WHERE id = ${session.id}
      `;

      // Issue new access token
      const newJti = uuidv4();
      const accessToken = fastify.jwt.sign(
        {
          sub: operator.id,
          email: operator.email,
          role: operator.role,
          airport_id: operator.airport_id,
          facility_id: operator.facility_id,
          jti: newJti,
        },
        { expiresIn: '1h' },
      );

      // Issue new refresh token
      const newRefreshToken = uuidv4();
      const refreshExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      if (operator.facility_id) {
        await sql`
          INSERT INTO operator_sessions (operator_id, facility_id, jwt_jti, ip_address, user_agent, expires_at)
          VALUES (
            ${operator.id},
            ${operator.facility_id},
            ${newRefreshToken},
            ${request.ip}::inet,
            ${request.headers['user-agent'] ?? null},
            ${refreshExpiresAt}
          )
        `;
      }

      return reply.code(200).send({
        access_token: accessToken,
        refresh_token: newRefreshToken,
        expires_in: 3600,
        token_type: 'Bearer' as const,
      });
    } catch (err) {
      request.log.error(err, 'Token refresh error');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Token refresh failed',
      });
    }
  });
}
