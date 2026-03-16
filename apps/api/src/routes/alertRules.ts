import { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth.js';
import { requireAdminRole } from '../middleware/rbac.js';
import { randomUUID } from 'node:crypto';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RuleConditions {
  zone_type?: string;
  density_above?: number;
  time_window?: { start: string; end: string };
  days?: string[];
}

interface RuleAction {
  alert_type: string;
  severity: number;
  message: string;
}

interface AlertRule {
  id: string;
  name: string;
  enabled: boolean;
  conditions: RuleConditions;
  action: RuleAction;
  cooldown_mins: number;
  last_triggered_at: string | null;
  created_by: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// In-memory store with pre-configured demo rules
// ---------------------------------------------------------------------------

const alertRules: AlertRule[] = [
  {
    id: 'rule-' + randomUUID().slice(0, 8),
    name: 'Morning Rush Crowd Alert',
    enabled: true,
    conditions: {
      zone_type: 'security',
      density_above: 80,
      time_window: { start: '06:00', end: '09:00' },
      days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    },
    action: {
      alert_type: 'CROWD_SURGE',
      severity: 4,
      message: 'Morning rush crowd threshold exceeded at security checkpoint',
    },
    cooldown_mins: 15,
    last_triggered_at: null,
    created_by: 'admin@soterion.io',
    created_at: new Date(Date.now() - 86_400_000 * 30).toISOString(),
  },
  {
    id: 'rule-' + randomUUID().slice(0, 8),
    name: 'After Hours Restricted Zone',
    enabled: true,
    conditions: {
      zone_type: 'restricted',
      density_above: 1,
      time_window: { start: '22:00', end: '05:00' },
    },
    action: {
      alert_type: 'INTRUSION',
      severity: 5,
      message: 'Activity detected in restricted zone during after hours',
    },
    cooldown_mins: 5,
    last_triggered_at: null,
    created_by: 'admin@soterion.io',
    created_at: new Date(Date.now() - 86_400_000 * 25).toISOString(),
  },
  {
    id: 'rule-' + randomUUID().slice(0, 8),
    name: 'Gate Area Loitering',
    enabled: true,
    conditions: {
      zone_type: 'gate',
      density_above: 60,
      time_window: { start: '00:00', end: '23:59' },
    },
    action: {
      alert_type: 'LOITERING',
      severity: 3,
      message: 'Unusual dwell patterns detected at gate area',
    },
    cooldown_mins: 30,
    last_triggered_at: new Date(Date.now() - 3_600_000).toISOString(),
    created_by: 'admin@soterion.io',
    created_at: new Date(Date.now() - 86_400_000 * 10).toISOString(),
  },
  {
    id: 'rule-' + randomUUID().slice(0, 8),
    name: 'Baggage Area Abandoned Object',
    enabled: false,
    conditions: {
      zone_type: 'baggage',
      density_above: 5,
      time_window: { start: '04:00', end: '23:00' },
      days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    },
    action: {
      alert_type: 'ABANDONED_OBJECT',
      severity: 4,
      message: 'Potential abandoned object detected in baggage claim area',
    },
    cooldown_mins: 10,
    last_triggered_at: null,
    created_by: 'admin@soterion.io',
    created_at: new Date(Date.now() - 86_400_000 * 5).toISOString(),
  },
];

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

export default async function alertRuleRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('preHandler', authMiddleware);
  fastify.addHook('preHandler', requireAdminRole());

  // GET /api/v1/admin/alert-rules
  fastify.get('/api/v1/admin/alert-rules', async (_request, reply) => {
    return reply.code(200).send({ rules: alertRules });
  });

  // POST /api/v1/admin/alert-rules
  fastify.post('/api/v1/admin/alert-rules', async (request, reply) => {
    const body = request.body as {
      name: string;
      conditions: RuleConditions;
      action: RuleAction;
      cooldown_mins?: number;
      enabled?: boolean;
    };

    if (!body?.name || !body?.conditions || !body?.action) {
      return reply.code(400).send({
        error: 'Validation Error',
        message: 'name, conditions, and action are required',
      });
    }

    if (!body.action.alert_type || !body.action.severity || !body.action.message) {
      return reply.code(400).send({
        error: 'Validation Error',
        message: 'action must include alert_type, severity, and message',
      });
    }

    if (body.action.severity < 1 || body.action.severity > 5) {
      return reply.code(400).send({
        error: 'Validation Error',
        message: 'action.severity must be between 1 and 5',
      });
    }

    const newRule: AlertRule = {
      id: 'rule-' + randomUUID().slice(0, 8),
      name: body.name,
      enabled: body.enabled ?? true,
      conditions: body.conditions,
      action: body.action,
      cooldown_mins: body.cooldown_mins ?? 15,
      last_triggered_at: null,
      created_by: request.operator?.email || 'unknown',
      created_at: new Date().toISOString(),
    };

    alertRules.push(newRule);
    return reply.code(201).send(newRule);
  });

  // PATCH /api/v1/admin/alert-rules/:id
  fastify.patch('/api/v1/admin/alert-rules/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Partial<{
      name: string;
      conditions: RuleConditions;
      action: RuleAction;
      cooldown_mins: number;
      enabled: boolean;
    }>;

    const rule = alertRules.find((r) => r.id === id);
    if (!rule) {
      return reply.code(404).send({ error: 'Not Found', message: 'Alert rule not found' });
    }

    if (body.name !== undefined) rule.name = body.name;
    if (body.conditions !== undefined) rule.conditions = body.conditions;
    if (body.action !== undefined) rule.action = body.action;
    if (body.cooldown_mins !== undefined) rule.cooldown_mins = body.cooldown_mins;
    if (body.enabled !== undefined) rule.enabled = body.enabled;

    return reply.code(200).send(rule);
  });

  // DELETE /api/v1/admin/alert-rules/:id
  fastify.delete('/api/v1/admin/alert-rules/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const idx = alertRules.findIndex((r) => r.id === id);
    if (idx === -1) {
      return reply.code(404).send({ error: 'Not Found', message: 'Alert rule not found' });
    }

    alertRules.splice(idx, 1);
    return reply.code(200).send({ message: 'Alert rule deleted', id });
  });

  // POST /api/v1/admin/alert-rules/:id/toggle
  fastify.post('/api/v1/admin/alert-rules/:id/toggle', async (request, reply) => {
    const { id } = request.params as { id: string };
    const rule = alertRules.find((r) => r.id === id);
    if (!rule) {
      return reply.code(404).send({ error: 'Not Found', message: 'Alert rule not found' });
    }

    rule.enabled = !rule.enabled;
    return reply.code(200).send(rule);
  });
}
