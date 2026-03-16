import { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth.js';
import { requireAdminRole } from '../middleware/rbac.js';
import { randomUUID } from 'node:crypto';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface IntegrationConfig {
  webhook_url?: string;
  routing_key?: string;
  recipients?: string[];
}

interface AlertIntegration {
  id: string;
  type: 'slack' | 'pagerduty' | 'email';
  name: string;
  config: IntegrationConfig;
  enabled: boolean;
  trigger_severity: number;
  last_fired_at: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// In-memory store (dev mode) with seed data
// ---------------------------------------------------------------------------

const integrations: AlertIntegration[] = [
  {
    id: randomUUID(),
    type: 'slack',
    name: 'Security Ops Channel',
    config: { webhook_url: 'https://hooks.slack.com/services/T00000/B00000/XXXXXXX' },
    enabled: true,
    trigger_severity: 3,
    last_fired_at: new Date(Date.now() - 1_800_000).toISOString(),
    created_at: new Date(Date.now() - 86_400_000 * 14).toISOString(),
  },
  {
    id: randomUUID(),
    type: 'pagerduty',
    name: 'On-Call Rotation',
    config: { routing_key: 'R034ABCD5678EF' },
    enabled: true,
    trigger_severity: 4,
    last_fired_at: null,
    created_at: new Date(Date.now() - 86_400_000 * 7).toISOString(),
  },
  {
    id: randomUUID(),
    type: 'email',
    name: 'Ops Team Email',
    config: { recipients: ['ops@airport.com', 'security-lead@airport.com'] },
    enabled: false,
    trigger_severity: 5,
    last_fired_at: null,
    created_at: new Date(Date.now() - 86_400_000 * 3).toISOString(),
  },
];

// ---------------------------------------------------------------------------
// Notification senders (dev mode: console.log only)
// ---------------------------------------------------------------------------

function sendSlackNotification(config: IntegrationConfig, message: string): void {
  if (process.env.NODE_ENV === 'production' && config.webhook_url) {
    // In production, make a real HTTP POST to the Slack webhook
    fetch(config.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message }),
    }).catch((err) => console.error('[Slack] Failed to send notification:', err));
  } else {
    console.log(`[DEV][Slack] Would send to ${config.webhook_url}: ${message}`);
  }
}

function sendPagerDutyNotification(config: IntegrationConfig, message: string): void {
  if (process.env.NODE_ENV === 'production' && config.routing_key) {
    fetch('https://events.pagerduty.com/v2/enqueue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        routing_key: config.routing_key,
        event_action: 'trigger',
        payload: {
          summary: message,
          severity: 'critical',
          source: 'soterion-platform',
        },
      }),
    }).catch((err) => console.error('[PagerDuty] Failed to send notification:', err));
  } else {
    console.log(`[DEV][PagerDuty] Would send via routing key ${config.routing_key}: ${message}`);
  }
}

function sendEmailNotification(config: IntegrationConfig, message: string): void {
  if (process.env.NODE_ENV === 'production' && config.recipients?.length) {
    // In production, use a mail service (SES, SendGrid, etc.)
    console.log(`[Email] Would send to ${config.recipients.join(', ')}: ${message}`);
  } else {
    console.log(`[DEV][Email] Would send to ${config.recipients?.join(', ')}: ${message}`);
  }
}

function sendTestNotification(integration: AlertIntegration): { success: boolean; message: string } {
  const testMessage = `[Soterion Test] Integration "${integration.name}" is working correctly. Timestamp: ${new Date().toISOString()}`;

  switch (integration.type) {
    case 'slack':
      sendSlackNotification(integration.config, testMessage);
      break;
    case 'pagerduty':
      sendPagerDutyNotification(integration.config, testMessage);
      break;
    case 'email':
      sendEmailNotification(integration.config, testMessage);
      break;
  }

  return { success: true, message: `Test notification sent via ${integration.type}` };
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

export default async function integrationRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('preHandler', authMiddleware);
  fastify.addHook('preHandler', requireAdminRole());

  // GET /api/v1/admin/integrations
  fastify.get('/api/v1/admin/integrations', async (_request, reply) => {
    return reply.code(200).send({ integrations });
  });

  // POST /api/v1/admin/integrations
  fastify.post('/api/v1/admin/integrations', async (request, reply) => {
    const body = request.body as {
      type: 'slack' | 'pagerduty' | 'email';
      name: string;
      config: IntegrationConfig;
      enabled?: boolean;
      trigger_severity?: number;
    };

    if (!body?.type || !body?.name || !body?.config) {
      return reply.code(400).send({
        error: 'Validation Error',
        message: 'type, name, and config are required',
      });
    }

    if (!['slack', 'pagerduty', 'email'].includes(body.type)) {
      return reply.code(400).send({
        error: 'Validation Error',
        message: 'type must be one of: slack, pagerduty, email',
      });
    }

    const severity = body.trigger_severity ?? 3;
    if (severity < 1 || severity > 5) {
      return reply.code(400).send({
        error: 'Validation Error',
        message: 'trigger_severity must be between 1 and 5',
      });
    }

    const newIntegration: AlertIntegration = {
      id: randomUUID(),
      type: body.type,
      name: body.name,
      config: body.config,
      enabled: body.enabled ?? true,
      trigger_severity: severity,
      last_fired_at: null,
      created_at: new Date().toISOString(),
    };

    integrations.push(newIntegration);
    return reply.code(201).send(newIntegration);
  });

  // PATCH /api/v1/admin/integrations/:id
  fastify.patch('/api/v1/admin/integrations/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Partial<{
      name: string;
      config: IntegrationConfig;
      enabled: boolean;
      trigger_severity: number;
    }>;

    const integration = integrations.find((i) => i.id === id);
    if (!integration) {
      return reply.code(404).send({ error: 'Not Found', message: 'Integration not found' });
    }

    if (body.name !== undefined) integration.name = body.name;
    if (body.config !== undefined) integration.config = body.config;
    if (body.enabled !== undefined) integration.enabled = body.enabled;
    if (body.trigger_severity !== undefined) {
      if (body.trigger_severity < 1 || body.trigger_severity > 5) {
        return reply.code(400).send({
          error: 'Validation Error',
          message: 'trigger_severity must be between 1 and 5',
        });
      }
      integration.trigger_severity = body.trigger_severity;
    }

    return reply.code(200).send(integration);
  });

  // DELETE /api/v1/admin/integrations/:id
  fastify.delete('/api/v1/admin/integrations/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const idx = integrations.findIndex((i) => i.id === id);
    if (idx === -1) {
      return reply.code(404).send({ error: 'Not Found', message: 'Integration not found' });
    }

    integrations.splice(idx, 1);
    return reply.code(200).send({ message: 'Integration deleted', id });
  });

  // POST /api/v1/admin/integrations/:id/test
  fastify.post('/api/v1/admin/integrations/:id/test', async (request, reply) => {
    const { id } = request.params as { id: string };
    const integration = integrations.find((i) => i.id === id);
    if (!integration) {
      return reply.code(404).send({ error: 'Not Found', message: 'Integration not found' });
    }

    const result = sendTestNotification(integration);
    return reply.code(200).send(result);
  });
}
