import { FastifyInstance } from 'fastify';
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcrypt';
import sql from '../../db/client.js';
import { authMiddleware } from '../../middleware/auth.js';
import { requireAdminRole } from '../../middleware/rbac.js';

const BCRYPT_ROUNDS = 12;

export default async function adminApiKeysRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('preHandler', authMiddleware);
  fastify.addHook('preHandler', requireAdminRole());

  // ------------------------------------------------------------------
  // GET /api/v1/admin/api-keys - list API keys (show prefix only)
  // ------------------------------------------------------------------
  fastify.get('/api/v1/admin/api-keys', async (request, reply) => {
    const query = request.query as { facility_id?: string };
    const facilityId = query.facility_id || request.operator!.airport_id;

    try {
      const keys = await sql`
        SELECT
          ak.id, ak.facility_id, ak.label, ak.key_prefix,
          ak.scopes, ak.last_used_at, ak.expires_at, ak.revoked_at,
          ak.created_by, ak.created_at,
          o.name AS created_by_name
        FROM api_keys ak
        LEFT JOIN operators o ON o.id = ak.created_by
        WHERE ak.facility_id = ${facilityId}
        ORDER BY ak.created_at DESC
      `;

      return reply.code(200).send({ api_keys: keys });
    } catch (err) {
      request.log.error(err, 'Error listing API keys');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to list API keys',
      });
    }
  });

  // ------------------------------------------------------------------
  // POST /api/v1/admin/api-keys - create new API key
  // ------------------------------------------------------------------
  fastify.post('/api/v1/admin/api-keys', async (request, reply) => {
    const body = request.body as {
      label: string;
      scopes: string[];
      facility_id?: string;
      expires_in_days?: number;
    };

    if (!body.label || !body.scopes || !Array.isArray(body.scopes)) {
      return reply.code(400).send({
        error: 'Validation Error',
        message: 'label and scopes array are required',
      });
    }

    const facilityId = body.facility_id || request.operator!.airport_id;
    const createdBy = request.operator!.id;

    try {
      // Generate random API key: sk_live_ prefix + 40 random hex chars
      const randomPart = randomBytes(20).toString('hex');
      const plaintextKey = `sk_live_${randomPart}`;
      const keyPrefix = plaintextKey.substring(0, 8); // "sk_live_"

      // Hash the key with bcrypt — never store plaintext
      const keyHash = await bcrypt.hash(plaintextKey, BCRYPT_ROUNDS);

      // Calculate expiry
      const expiresAt = body.expires_in_days
        ? new Date(Date.now() + body.expires_in_days * 24 * 60 * 60 * 1000)
        : null;

      const rows = await sql`
        INSERT INTO api_keys (
          facility_id, label, key_hash, key_prefix, scopes,
          expires_at, created_by
        ) VALUES (
          ${facilityId},
          ${body.label},
          ${keyHash},
          ${keyPrefix},
          ${body.scopes},
          ${expiresAt},
          ${createdBy}
        )
        RETURNING id, facility_id, label, key_prefix, scopes, expires_at, created_at
      `;

      // Return the plaintext key ONCE — it will never be shown again
      return reply.code(201).send({
        ...rows[0],
        key: plaintextKey,
        warning: 'Store this API key securely. It will not be displayed again.',
      });
    } catch (err) {
      request.log.error(err, 'Error creating API key');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to create API key',
      });
    }
  });

  // ------------------------------------------------------------------
  // DELETE /api/v1/admin/api-keys/:id - revoke key
  // ------------------------------------------------------------------
  fastify.delete('/api/v1/admin/api-keys/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const rows = await sql`
        UPDATE api_keys
        SET revoked_at = NOW()
        WHERE id = ${id}
          AND revoked_at IS NULL
        RETURNING id, label, key_prefix
      `;

      if (rows.length === 0) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'API key not found or already revoked',
        });
      }

      return reply.code(200).send({
        message: 'API key revoked',
        api_key: rows[0],
      });
    } catch (err) {
      request.log.error(err, 'Error revoking API key');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to revoke API key',
      });
    }
  });

  // ------------------------------------------------------------------
  // POST /api/v1/admin/api-keys/:id/rotate - revoke old, create new
  // ------------------------------------------------------------------
  fastify.post('/api/v1/admin/api-keys/:id/rotate', async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      // Get existing key details
      const existing = await sql<{
        id: string;
        facility_id: string;
        label: string;
        scopes: string[];
        expires_at: Date | null;
      }[]>`
        SELECT id, facility_id, label, scopes, expires_at
        FROM api_keys
        WHERE id = ${id}
          AND revoked_at IS NULL
        LIMIT 1
      `;

      if (existing.length === 0) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'API key not found or already revoked',
        });
      }

      const old = existing[0];

      // Revoke old key
      await sql`
        UPDATE api_keys
        SET revoked_at = NOW()
        WHERE id = ${id}
      `;

      // Create new key with same settings
      const randomPart = randomBytes(20).toString('hex');
      const plaintextKey = `sk_live_${randomPart}`;
      const keyPrefix = plaintextKey.substring(0, 8);
      const keyHash = await bcrypt.hash(plaintextKey, BCRYPT_ROUNDS);

      const rows = await sql`
        INSERT INTO api_keys (
          facility_id, label, key_hash, key_prefix, scopes,
          expires_at, created_by
        ) VALUES (
          ${old.facility_id},
          ${old.label},
          ${keyHash},
          ${keyPrefix},
          ${old.scopes},
          ${old.expires_at},
          ${request.operator!.id}
        )
        RETURNING id, facility_id, label, key_prefix, scopes, expires_at, created_at
      `;

      return reply.code(201).send({
        ...rows[0],
        key: plaintextKey,
        rotated_from: id,
        warning: 'Store this API key securely. It will not be displayed again.',
      });
    } catch (err) {
      request.log.error(err, 'Error rotating API key');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to rotate API key',
      });
    }
  });
}
