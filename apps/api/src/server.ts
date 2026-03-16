import dotenv from 'dotenv';
import { resolve } from 'node:path';
dotenv.config({ path: resolve(process.cwd(), '../../.env') });
dotenv.config(); // also load local .env if present

import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import sensible from '@fastify/sensible';
import websocket from '@fastify/websocket';

// Database + Redis
import { healthCheck as dbHealthCheck, disconnect } from './db/client.js';
import { redis, disconnectRedis } from './lib/redis.js';

// Middleware (registered in order: requestId → securityHeaders → rateLimit → auth → tenantScope → audit)
import { registerRequestId } from './middleware/requestId.js';
import { registerSecurityHeaders } from './middleware/securityHeaders.js';
import { registerRateLimiting } from './middleware/rateLimit.js';
import { registerTenantScope } from './middleware/tenantScope.js';
import { registerAuditLogging } from './middleware/audit.js';

// BullMQ queues and workers
import { closeQueues, setupRepeatableJobs } from './jobs/queues.js';
import { startAnomalyProcessor } from './jobs/anomalyProcessor.js';
import { startScoreCalculator } from './jobs/scoreCalculator.js';
import { startBadgeEngine } from './jobs/badgeEngine.js';
import { startDensityAggregator } from './jobs/densityAggregator.js';

// Route modules
import authRoutes from './routes/auth.js';
import lidarRoutes from './routes/lidar.js';
import alertRoutes from './routes/alerts.js';
import zoneRoutes from './routes/zones.js';
import sensorRoutes from './routes/sensors.js';
import operatorRoutes from './routes/operators.js';
import scoreRoutes from './routes/scores.js';
import facilityRoutes from './routes/facility.js';
import facilitiesRoutes from './routes/facilities.js';
import analyticsRoutes from './routes/analytics.js';
import predictionRoutes from './routes/predictions.js';
import intelligenceRoutes from './routes/intelligence.js';
import playbookRoutes from './routes/playbooks.js';
import shiftRoutes from './routes/shifts.js';

// Admin route modules (Phase 9)
import adminFacilitiesRoutes from './routes/admin/facilities.js';
import adminOperatorsRoutes from './routes/admin/operators.js';
import adminAuditLogRoutes from './routes/admin/auditLog.js';
import adminApiKeysRoutes from './routes/admin/apiKeys.js';
import adminSessionsRoutes from './routes/admin/sessions.js';
import adminSecurityRoutes from './routes/admin/security.js';
import adminComplianceRoutes from './routes/admin/compliance.js';
import adminRetentionRoutes from './routes/admin/retention.js';
import reportRoutes from './routes/reports.js';
import trainingRoutes from './routes/training.js';
import onboardingRoutes from './routes/onboarding.js';
import integrationRoutes from './routes/integrations.js';
import alertRuleRoutes from './routes/alertRules.js';

// RBAC + Session middleware (Phase 9)
import { loadRbacCache } from './middleware/rbac.js';
import { validateSession } from './middleware/session.js';

// Retention purge job (Phase 9)
import { startRetentionPurgeWorker, scheduleRetentionPurge } from './jobs/retentionPurge.js';

// WebSocket handler
import liveWebSocket from './ws/live.js';

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';
const JWT_SECRET = process.env.JWT_SECRET || 'soterion-dev-secret-change-in-production';

async function buildServer() {
  const fastify = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      transport: process.env.NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
    },
  });

  // --- Register plugins ---

  await fastify.register(cors, {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  await fastify.register(jwt, {
    secret: JWT_SECRET,
    sign: { expiresIn: '1h' },
  });

  await fastify.register(sensible);

  await fastify.register(websocket);

  // --- Register middleware in order ---

  // 1. Request ID (every request gets a UUID for tracing)
  await fastify.register(registerRequestId);

  // 2. Security headers (HSTS, CSP, X-Frame-Options, etc.)
  await fastify.register(registerSecurityHeaders);

  // 3. Rate limiting (before auth to protect auth endpoints)
  await fastify.register(registerRateLimiting);

  // 4. Auth middleware is applied per-route (JWT via authMiddleware, API key via apiKeyMiddleware)
  //    Registered in individual route files, not globally.

  // 5. Tenant scoping (attach facility_id, enforce tenant isolation)
  await fastify.register(registerTenantScope);

  // 6. Session validation on every authenticated request (Phase 9)
  fastify.addHook('preHandler', validateSession);

  // 7. Audit logging (after auth so actor is known; non-blocking write after response)
  await fastify.register(registerAuditLogging);

  // --- Health checks ---

  // GET /health - basic liveness probe
  fastify.get('/health', async (_request, reply) => {
    return reply.code(200).send({
      status: 'ok',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // GET /health/deep - readiness probe checking DB + Redis
  fastify.get('/health/deep', async (_request, reply) => {
    const results: Record<string, { status: string; latency_ms?: number; error?: string }> = {};

    // Check database
    const dbStart = Date.now();
    try {
      const dbOk = await dbHealthCheck();
      results.database = {
        status: dbOk ? 'ok' : 'degraded',
        latency_ms: Date.now() - dbStart,
      };
    } catch (err) {
      results.database = {
        status: 'error',
        latency_ms: Date.now() - dbStart,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }

    // Check Redis
    const redisStart = Date.now();
    try {
      const pong = await redis.ping();
      results.redis = {
        status: pong === 'PONG' ? 'ok' : 'degraded',
        latency_ms: Date.now() - redisStart,
      };
    } catch (err) {
      results.redis = {
        status: 'error',
        latency_ms: Date.now() - redisStart,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }

    const allOk = Object.values(results).every((r) => r.status === 'ok');
    const statusCode = allOk ? 200 : 503;

    return reply.code(statusCode).send({
      status: allOk ? 'ok' : 'degraded',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: results,
    });
  });

  // --- Register route modules ---

  await fastify.register(authRoutes);
  await fastify.register(lidarRoutes);
  await fastify.register(alertRoutes);
  await fastify.register(zoneRoutes);
  await fastify.register(sensorRoutes);
  await fastify.register(operatorRoutes);
  await fastify.register(scoreRoutes);
  await fastify.register(facilityRoutes);
  await fastify.register(facilitiesRoutes);
  await fastify.register(analyticsRoutes);
  await fastify.register(predictionRoutes);
  await fastify.register(intelligenceRoutes);
  await fastify.register(playbookRoutes);
  await fastify.register(shiftRoutes);
  await fastify.register(liveWebSocket);

  // --- Register admin route modules (Phase 9) ---
  await fastify.register(adminFacilitiesRoutes);
  await fastify.register(adminOperatorsRoutes);
  await fastify.register(adminAuditLogRoutes);
  await fastify.register(adminApiKeysRoutes);
  await fastify.register(adminSessionsRoutes);
  await fastify.register(adminSecurityRoutes);
  await fastify.register(adminComplianceRoutes);
  await fastify.register(adminRetentionRoutes);
  await fastify.register(integrationRoutes);
  await fastify.register(alertRuleRoutes);

  // --- Register report routes (Compliance Report Generator) ---
  await fastify.register(reportRoutes);

  // --- Register ML training + onboarding routes ---
  await fastify.register(trainingRoutes);
  await fastify.register(onboardingRoutes);

  return fastify;
}

async function start() {
  const fastify = await buildServer();

  // --- Start BullMQ workers ---

  const anomalyWorker = startAnomalyProcessor();
  const scoreWorker = startScoreCalculator();
  const badgeWorker = startBadgeEngine();
  const densityWorker = startDensityAggregator();
  const retentionWorker = startRetentionPurgeWorker();

  // Setup repeatable jobs
  await setupRepeatableJobs();
  await scheduleRetentionPurge();

  // Load RBAC permissions into Redis cache (Phase 9)
  if (process.env.NODE_ENV === 'development') {
    fastify.log.warn('DEV MODE: RBAC cache preload skipped — RBAC checks are bypassed in development');
  } else {
    await loadRbacCache().catch((err) => {
      fastify.log.warn({ err }, 'Failed to preload RBAC cache (non-fatal, will load on demand)');
    });
  }

  fastify.log.info('BullMQ workers started: anomaly-processing, score-calculation, badge-evaluation, density-aggregation, retention-purge');

  // Dev mock data emitter
  if (process.env.NODE_ENV === 'development') {
    import('./dev/mockEmitter.js').then(({ startMockEmitter }) => {
      startMockEmitter();
    }).catch(() => {
      fastify.log.warn('Mock emitter not available');
    });
  }

  // --- Graceful shutdown ---

  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
  for (const signal of signals) {
    process.on(signal, async () => {
      fastify.log.info(`Received ${signal}, shutting down gracefully...`);

      try {
        if (process.env.NODE_ENV === 'development') {
          import('./dev/mockEmitter.js').then(({ stopMockEmitter }) => stopMockEmitter()).catch(() => {});
        }
        await fastify.close();
        await Promise.all([
          anomalyWorker.close(),
          scoreWorker.close(),
          badgeWorker.close(),
          densityWorker.close(),
          retentionWorker.close(),
        ]);
        await closeQueues();
        await disconnect();
        await disconnectRedis();
        fastify.log.info('Server shut down successfully');
        process.exit(0);
      } catch (err) {
        fastify.log.error(err, 'Error during shutdown');
        process.exit(1);
      }
    });
  }

  // --- Start listening ---

  try {
    await fastify.listen({ port: PORT, host: HOST });
    fastify.log.info(`Soterion API server listening on ${HOST}:${PORT}`);
    if (process.env.NODE_ENV === 'development') {
      fastify.log.warn('=== DEV MODE ACTIVE: Auth, RBAC, session validation, and tenant scoping have relaxed enforcement ===');
    }
    fastify.log.info('Available routes:');
    fastify.log.info('  GET  /health');
    fastify.log.info('  GET  /health/deep');
    fastify.log.info('  POST /api/v1/auth/login');
    fastify.log.info('  POST /api/v1/auth/refresh');
    fastify.log.info('  POST /api/v1/lidar/ingest');
    fastify.log.info('  GET  /api/v1/lidar/streams');
    fastify.log.info('  GET  /api/v1/lidar/tracks');
    fastify.log.info('  GET  /api/v1/lidar/zones/:zoneId/density');
    fastify.log.info('  GET  /api/v1/lidar/heatmap/:terminalId');
    fastify.log.info('  GET  /api/v1/lidar/queue/:checkpointId');
    fastify.log.info('  GET  /api/v1/alerts');
    fastify.log.info('  GET  /api/v1/alerts/:id');
    fastify.log.info('  POST /api/v1/alerts/:id/acknowledge');
    fastify.log.info('  POST /api/v1/alerts/:id/escalate');
    fastify.log.info('  GET  /api/v1/alerts/stats');
    fastify.log.info('  GET  /api/v1/zones');
    fastify.log.info('  GET  /api/v1/zones/:id');
    fastify.log.info('  GET  /api/v1/terminals');
    fastify.log.info('  GET  /api/v1/terminals/:id/flow');
    fastify.log.info('  GET  /api/v1/sensors');
    fastify.log.info('  GET  /api/v1/sensors/:id');
    fastify.log.info('  PATCH /api/v1/sensors/:id');
    fastify.log.info('  GET  /api/v1/sensors/:id/metrics');
    fastify.log.info('  GET  /api/v1/operators/me');
    fastify.log.info('  GET  /api/v1/operators');
    fastify.log.info('  GET  /api/v1/scores/shift');
    fastify.log.info('  GET  /api/v1/scores/history');
    fastify.log.info('  GET  /api/v1/leaderboard');
    fastify.log.info('  GET  /api/v1/badges');
    fastify.log.info('  GET  /api/v1/badges/mine');
    fastify.log.info('  GET  /api/v1/missions');
    fastify.log.info('  GET  /api/v1/missions/progress');
    fastify.log.info('  GET  /api/v1/facility/config');
    fastify.log.info('  GET  /api/v1/predictions/surge');
    fastify.log.info('  WS   /ws/live/:sensorId');
    fastify.log.info('  WS   /ws/alerts');
    fastify.log.info('  --- Analytics ---');
    fastify.log.info('  GET  /api/v1/analytics/roi');
    fastify.log.info('  GET  /api/v1/analytics/trends');
    fastify.log.info('  --- Shifts ---');
    fastify.log.info('  GET  /api/v1/shifts/handoff');
    fastify.log.info('  --- Facilities (Phase 8 Multi-Vertical) ---');
    fastify.log.info('  GET    /api/v1/facilities');
    fastify.log.info('  GET    /api/v1/facilities/:id');
    fastify.log.info('  POST   /api/v1/facilities');
    fastify.log.info('  PATCH  /api/v1/facilities/:id');
    fastify.log.info('  POST   /api/v1/facilities/:id/zones');
    fastify.log.info('  POST   /api/v1/facilities/:id/sensors');
    fastify.log.info('  POST   /api/v1/facilities/:id/operators');
    fastify.log.info('  GET    /api/v1/facilities/zone-types/:facilityType');
    fastify.log.info('  --- Admin Routes (Phase 9) ---');
    fastify.log.info('  GET    /api/v1/admin/facilities');
    fastify.log.info('  POST   /api/v1/admin/facilities');
    fastify.log.info('  PATCH  /api/v1/admin/facilities/:id');
    fastify.log.info('  DELETE /api/v1/admin/facilities/:id');
    fastify.log.info('  GET    /api/v1/admin/operators');
    fastify.log.info('  POST   /api/v1/admin/operators');
    fastify.log.info('  PATCH  /api/v1/admin/operators/:id');
    fastify.log.info('  POST   /api/v1/admin/operators/:id/deactivate');
    fastify.log.info('  POST   /api/v1/admin/operators/:id/roles');
    fastify.log.info('  GET    /api/v1/admin/audit-log');
    fastify.log.info('  GET    /api/v1/admin/audit-log/export');
    fastify.log.info('  GET    /api/v1/admin/api-keys');
    fastify.log.info('  POST   /api/v1/admin/api-keys');
    fastify.log.info('  DELETE /api/v1/admin/api-keys/:id');
    fastify.log.info('  POST   /api/v1/admin/api-keys/:id/rotate');
    fastify.log.info('  GET    /api/v1/admin/sessions');
    fastify.log.info('  POST   /api/v1/admin/sessions/:id/revoke');
    fastify.log.info('  GET    /api/v1/admin/sessions/stats');
    fastify.log.info('  GET    /api/v1/admin/security/incidents');
    fastify.log.info('  POST   /api/v1/admin/security/incidents');
    fastify.log.info('  PATCH  /api/v1/admin/security/incidents/:id');
    fastify.log.info('  GET    /api/v1/admin/security/vulnerabilities');
    fastify.log.info('  POST   /api/v1/admin/security/vulnerabilities');
    fastify.log.info('  PATCH  /api/v1/admin/security/vulnerabilities/:id');
    fastify.log.info('  GET    /api/v1/admin/security/dashboard');
    fastify.log.info('  GET    /api/v1/admin/compliance/soc2');
    fastify.log.info('  GET    /api/v1/admin/compliance/fedramp');
    fastify.log.info('  GET    /api/v1/admin/compliance/gdpr/requests');
    fastify.log.info('  POST   /api/v1/admin/compliance/gdpr/requests');
    fastify.log.info('  GET    /api/v1/admin/retention');
    fastify.log.info('  POST   /api/v1/admin/retention');
    fastify.log.info('  GET    /api/v1/admin/retention/status');
    fastify.log.info('  --- Alerting Integrations ---');
    fastify.log.info('  GET    /api/v1/admin/integrations');
    fastify.log.info('  POST   /api/v1/admin/integrations');
    fastify.log.info('  PATCH  /api/v1/admin/integrations/:id');
    fastify.log.info('  DELETE /api/v1/admin/integrations/:id');
    fastify.log.info('  POST   /api/v1/admin/integrations/:id/test');
    fastify.log.info('  --- Custom Alert Rules ---');
    fastify.log.info('  GET    /api/v1/admin/alert-rules');
    fastify.log.info('  POST   /api/v1/admin/alert-rules');
    fastify.log.info('  PATCH  /api/v1/admin/alert-rules/:id');
    fastify.log.info('  DELETE /api/v1/admin/alert-rules/:id');
    fastify.log.info('  POST   /api/v1/admin/alert-rules/:id/toggle');
    fastify.log.info('  --- Cross-Zone Intelligence ---');
    fastify.log.info('  GET    /api/v1/intelligence/flow-anomalies');
    fastify.log.info('  --- Incident Response Playbooks ---');
    fastify.log.info('  GET    /api/v1/playbooks');
    fastify.log.info('  --- Reports (Compliance Report Generator) ---');
    fastify.log.info('  GET    /api/v1/reports/compliance');
    fastify.log.info('  --- ML Model Training Pipeline ---');
    fastify.log.info('  GET    /api/v1/admin/models');
    fastify.log.info('  POST   /api/v1/admin/models/:id/retrain');
    fastify.log.info('  GET    /api/v1/admin/models/:id/metrics');
    fastify.log.info('  --- Self-Service Onboarding ---');
    fastify.log.info('  POST   /api/v1/onboarding/signup');
    fastify.log.info('  GET    /api/v1/onboarding/status/:facilityId');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
