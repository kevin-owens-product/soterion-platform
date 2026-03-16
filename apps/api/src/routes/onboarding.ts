import { FastifyInstance } from 'fastify';

// ---------------------------------------------------------------------------
// Mock onboarding state (in-memory for dev mode)
// ---------------------------------------------------------------------------
const onboardingState: Record<string, {
  facilityId: string;
  operatorId: string;
  apiKey: string;
  facilityName: string;
  facilityType: string;
  contactName: string;
  contactEmail: string;
  createdAt: string;
  steps: {
    step: string;
    completed: boolean;
    completedAt: string | null;
  }[];
}> = {};

export default async function onboardingRoutes(fastify: FastifyInstance) {
  // POST /api/v1/onboarding/signup — Self-service tenant signup
  fastify.post<{
    Body: {
      facilityName: string;
      facilityType: string;
      contactName: string;
      contactEmail: string;
      password: string;
    };
  }>('/api/v1/onboarding/signup', async (request, reply) => {
    const { facilityName, facilityType, contactName, contactEmail } = request.body as any;

    if (!facilityName || !facilityType || !contactName || !contactEmail) {
      return reply.code(400).send({ error: 'Missing required fields: facilityName, facilityType, contactName, contactEmail, password' });
    }

    // Generate mock IDs
    const facilityId = `f-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const operatorId = `op-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const apiKey = `sk_sandbox_${Math.random().toString(36).slice(2, 18)}${Math.random().toString(36).slice(2, 18)}`;

    const now = new Date().toISOString();

    onboardingState[facilityId] = {
      facilityId,
      operatorId,
      apiKey,
      facilityName,
      facilityType,
      contactName,
      contactEmail,
      createdAt: now,
      steps: [
        { step: 'account_created', completed: true, completedAt: now },
        { step: 'zones_configured', completed: false, completedAt: null },
        { step: 'sensors_registered', completed: false, completedAt: null },
        { step: 'first_ingest_received', completed: false, completedAt: null },
        { step: 'first_alert_generated', completed: false, completedAt: null },
      ],
    };

    return reply.code(201).send({
      facilityId,
      operatorId,
      apiKey,
      loginUrl: `/login?email=${encodeURIComponent(contactEmail)}`,
    });
  });

  // GET /api/v1/onboarding/status/:facilityId — Onboarding progress
  fastify.get<{ Params: { facilityId: string } }>(
    '/api/v1/onboarding/status/:facilityId',
    async (request, reply) => {
      const { facilityId } = request.params;
      const state = onboardingState[facilityId];

      if (!state) {
        // Return a default for demo purposes
        return reply.send({
          steps: [
            { step: 'account_created', completed: true, completedAt: '2026-03-16T10:00:00Z' },
            { step: 'zones_configured', completed: true, completedAt: '2026-03-16T10:05:00Z' },
            { step: 'sensors_registered', completed: false, completedAt: null },
            { step: 'first_ingest_received', completed: false, completedAt: null },
            { step: 'first_alert_generated', completed: false, completedAt: null },
          ],
          completion_pct: 40,
        });
      }

      const completedCount = state.steps.filter((s) => s.completed).length;
      const completionPct = Math.round((completedCount / state.steps.length) * 100);

      return reply.send({
        steps: state.steps,
        completion_pct: completionPct,
      });
    },
  );
}
