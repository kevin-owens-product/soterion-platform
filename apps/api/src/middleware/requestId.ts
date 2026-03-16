import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { randomUUID } from 'node:crypto';

declare module 'fastify' {
  interface FastifyRequest {
    requestId: string;
  }
}

/**
 * Request ID hook.
 * Generates a UUID for every incoming request, attaches it to request.requestId,
 * and includes it in the response as X-Request-Id for correlation.
 */
export async function registerRequestId(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    // Use an existing X-Request-Id header if provided (e.g. from a load balancer), otherwise generate one
    const existingId = request.headers['x-request-id'] as string | undefined;
    const requestId = existingId || randomUUID();

    // Attach to request object
    request.requestId = requestId;

    // Set response header
    reply.header('X-Request-Id', requestId);
  });
}
