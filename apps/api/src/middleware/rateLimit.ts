import { FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';

/**
 * Rate limiting configuration.
 *
 * Three tiers:
 *   - General API:      100 requests/min per IP  (configurable via RATE_LIMIT_GENERAL_MAX)
 *   - LiDAR ingest:    1000 requests/min per API key (configurable via RATE_LIMIT_INGEST_MAX)
 *   - Auth endpoints:     5 attempts per 15 min per IP (brute force protection)
 *
 * All limits return 429 with Retry-After header.
 * Rate limit exceeded events are logged for audit purposes.
 */
export async function registerRateLimiting(fastify: FastifyInstance): Promise<void> {
  // --- General API rate limit (global) ---
  const generalMax = parseInt(process.env.RATE_LIMIT_GENERAL_MAX || '100', 10);
  const generalWindow = process.env.RATE_LIMIT_GENERAL_WINDOW || '1 minute';

  await fastify.register(rateLimit, {
    global: true,
    max: generalMax,
    timeWindow: generalWindow,
    allowList: ['127.0.0.1', '::1'],
    keyGenerator: (request) => request.ip,
    errorResponseBuilder: (_request, context) => {
      return {
        statusCode: 429,
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Maximum ${context.max} requests per ${context.after}. Please retry after ${context.after}.`,
        retryAfter: context.after,
      };
    },
    onExceeded: (request) => {
      request.log.warn(
        {
          ip: request.ip,
          url: request.url,
          method: request.method,
          event: 'rate_limit.exceeded',
          tier: 'general',
        },
        'General rate limit exceeded',
      );
    },
  });

  // --- LiDAR ingest rate limit (route-specific, keyed by API key) ---
  const ingestMax = parseInt(process.env.RATE_LIMIT_INGEST_MAX || '1000', 10);
  const ingestWindow = process.env.RATE_LIMIT_INGEST_WINDOW || '1 minute';

  fastify.after(() => {
    // Route-specific rate limits applied via route config
    fastify.addHook('onRoute', (routeOptions) => {
      if (routeOptions.url === '/api/v1/lidar/ingest' && routeOptions.method === 'POST') {
        const existingConfig = routeOptions.config || {};
        routeOptions.config = {
          ...existingConfig,
          rateLimit: {
            max: ingestMax,
            timeWindow: ingestWindow,
            keyGenerator: (request: any) => {
              // Key by API key header for ingest endpoint
              return (request.headers['x-api-key'] as string) || request.ip;
            },
            onExceeded: (request: any) => {
              request.log.warn(
                {
                  ip: request.ip,
                  apiKey: request.headers['x-api-key'] ? '***redacted***' : undefined,
                  url: request.url,
                  event: 'rate_limit.exceeded',
                  tier: 'ingest',
                },
                'LiDAR ingest rate limit exceeded',
              );
            },
          },
        };
      }
    });

    // Auth endpoint rate limits (brute force protection)
    const authMax = parseInt(process.env.AUTH_RATE_LIMIT_MAX || '5', 10);
    const authWindowMins = parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MINS || '15', 10);

    fastify.addHook('onRoute', (routeOptions) => {
      const authPaths = ['/api/v1/auth/login', '/api/v1/auth/refresh'];
      if (authPaths.includes(routeOptions.url) && routeOptions.method === 'POST') {
        const existingConfig = routeOptions.config || {};
        routeOptions.config = {
          ...existingConfig,
          rateLimit: {
            max: authMax,
            timeWindow: `${authWindowMins} minutes`,
            keyGenerator: (request: any) => request.ip,
            errorResponseBuilder: (_request: any, context: any) => {
              return {
                statusCode: 429,
                error: 'Too Many Requests',
                message: `Too many authentication attempts. Please try again after ${context.after}.`,
                retryAfter: context.after,
              };
            },
            onExceeded: (request: any) => {
              request.log.warn(
                {
                  ip: request.ip,
                  url: request.url,
                  event: 'rate_limit.exceeded',
                  tier: 'auth',
                },
                'Auth rate limit exceeded — possible brute force attempt',
              );
            },
          },
        };
      }
    });
  });
}
