import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

/**
 * Security headers middleware.
 * Adds standard security headers to every response per OWASP and FedRAMP SC-8 requirements.
 */
export async function registerSecurityHeaders(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('onSend', async (request: FastifyRequest, reply: FastifyReply) => {
    reply.header('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('Content-Security-Policy', "default-src 'self'");
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    reply.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    // X-Request-Id is already set by the requestId hook, but ensure it's present
    if (!reply.getHeader('X-Request-Id') && request.requestId) {
      reply.header('X-Request-Id', request.requestId);
    }
  });
}
