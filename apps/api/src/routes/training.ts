import { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth.js';

// ---------------------------------------------------------------------------
// Mock ML model registry data
// ---------------------------------------------------------------------------
const MOCK_MODELS = [
  {
    id: 'm0000000-0000-4000-8000-000000000001',
    facility_type: 'AIRPORT',
    model_key: 'anomaly_v2',
    version: '2.1.0',
    status: 'active',
    accuracy: 0.94,
    trained_at: '2026-03-01T00:00:00Z',
    samples_used: 12450,
    next_training_due: '2026-04-01T00:00:00Z',
    progress: null,
  },
  {
    id: 'm0000000-0000-4000-8000-000000000002',
    facility_type: 'AIRPORT',
    model_key: 'crowd_v1',
    version: '1.3.0',
    status: 'active',
    accuracy: 0.91,
    trained_at: '2026-02-15T00:00:00Z',
    samples_used: 8200,
    next_training_due: '2026-05-15T00:00:00Z',
    progress: null,
  },
  {
    id: 'm0000000-0000-4000-8000-000000000003',
    facility_type: 'SEAPORT',
    model_key: 'anomaly_v1',
    version: '1.0.0',
    status: 'training',
    accuracy: null,
    trained_at: null,
    samples_used: 3400,
    next_training_due: null,
    progress: 67,
  },
  {
    id: 'm0000000-0000-4000-8000-000000000004',
    facility_type: 'STADIUM',
    model_key: 'crowd_crush_v1',
    version: '1.1.0',
    status: 'active',
    accuracy: 0.89,
    trained_at: '2026-02-20T00:00:00Z',
    samples_used: 5600,
    next_training_due: '2026-05-20T00:00:00Z',
    progress: null,
  },
  {
    id: 'm0000000-0000-4000-8000-000000000005',
    facility_type: 'HOSPITAL',
    model_key: 'fall_risk_v1',
    version: '0.9.0',
    status: 'queued',
    accuracy: null,
    trained_at: null,
    samples_used: 1200,
    next_training_due: null,
    progress: null,
  },
];

// ---------------------------------------------------------------------------
// Mock metrics per model
// ---------------------------------------------------------------------------
const MOCK_METRICS: Record<string, object> = {
  'm0000000-0000-4000-8000-000000000001': {
    accuracy_history: [
      { version: '1.0', accuracy: 0.82, date: '2026-01-01' },
      { version: '1.5', accuracy: 0.87, date: '2026-02-01' },
      { version: '2.0', accuracy: 0.92, date: '2026-03-01' },
      { version: '2.1', accuracy: 0.94, date: '2026-03-15' },
    ],
    confusion_matrix: {
      true_positive: 2340,
      false_positive: 78,
      true_negative: 9200,
      false_negative: 142,
    },
    top_misclassifications: [
      { predicted: 'LOITERING', actual: 'NORMAL', count: 34 },
      { predicted: 'NORMAL', actual: 'CROWD_SURGE', count: 12 },
      { predicted: 'INTRUSION', actual: 'LOITERING', count: 9 },
      { predicted: 'ABANDONED_OBJECT', actual: 'NORMAL', count: 7 },
    ],
  },
  'm0000000-0000-4000-8000-000000000002': {
    accuracy_history: [
      { version: '1.0', accuracy: 0.78, date: '2025-11-01' },
      { version: '1.1', accuracy: 0.83, date: '2025-12-15' },
      { version: '1.2', accuracy: 0.88, date: '2026-01-20' },
      { version: '1.3', accuracy: 0.91, date: '2026-02-15' },
    ],
    confusion_matrix: {
      true_positive: 1890,
      false_positive: 112,
      true_negative: 6400,
      false_negative: 198,
    },
    top_misclassifications: [
      { predicted: 'CROWD_SURGE', actual: 'NORMAL', count: 45 },
      { predicted: 'NORMAL', actual: 'CROWD_SURGE', count: 22 },
      { predicted: 'CROWD_SURGE', actual: 'LOITERING', count: 11 },
    ],
  },
  'm0000000-0000-4000-8000-000000000003': {
    accuracy_history: [
      { version: '0.5', accuracy: 0.65, date: '2026-01-15' },
      { version: '0.8', accuracy: 0.74, date: '2026-02-10' },
    ],
    confusion_matrix: {
      true_positive: 780,
      false_positive: 156,
      true_negative: 2100,
      false_negative: 364,
    },
    top_misclassifications: [
      { predicted: 'VEHICLE_OVERSPEED', actual: 'NORMAL', count: 67 },
      { predicted: 'NORMAL', actual: 'UNAUTHORISED_VEHICLE', count: 31 },
    ],
  },
  'm0000000-0000-4000-8000-000000000004': {
    accuracy_history: [
      { version: '1.0', accuracy: 0.85, date: '2026-01-10' },
      { version: '1.1', accuracy: 0.89, date: '2026-02-20' },
    ],
    confusion_matrix: {
      true_positive: 1120,
      false_positive: 89,
      true_negative: 4200,
      false_negative: 191,
    },
    top_misclassifications: [
      { predicted: 'CROWD_CRUSH_RISK', actual: 'NORMAL', count: 38 },
      { predicted: 'NORMAL', actual: 'EXIT_BLOCKAGE', count: 14 },
    ],
  },
  'm0000000-0000-4000-8000-000000000005': {
    accuracy_history: [
      { version: '0.5', accuracy: 0.61, date: '2026-02-01' },
      { version: '0.9', accuracy: 0.72, date: '2026-03-01' },
    ],
    confusion_matrix: {
      true_positive: 340,
      false_positive: 98,
      true_negative: 780,
      false_negative: 182,
    },
    top_misclassifications: [
      { predicted: 'PATIENT_FALL_RISK', actual: 'NORMAL', count: 52 },
      { predicted: 'NORMAL', actual: 'PATIENT_FALL_RISK', count: 28 },
    ],
  },
};

// Track in-progress retraining jobs
const activeJobs: Record<string, { jobId: string; status: string; estimatedMinutes: number; startedAt: string }> = {};

export default async function trainingRoutes(fastify: FastifyInstance) {
  // GET /api/v1/admin/models — List all ML models
  fastify.get('/api/v1/admin/models', { preHandler: [authMiddleware] }, async (_request, reply) => {
    return reply.send({ models: MOCK_MODELS });
  });

  // POST /api/v1/admin/models/:id/retrain — Trigger model retraining
  fastify.post<{ Params: { id: string } }>(
    '/api/v1/admin/models/:id/retrain',
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const { id } = request.params;
      const model = MOCK_MODELS.find((m) => m.id === id);
      if (!model) {
        return reply.code(404).send({ error: 'Model not found' });
      }

      const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const estimatedMinutes = Math.floor(Math.random() * 60) + 15;

      activeJobs[id] = {
        jobId,
        status: 'queued',
        estimatedMinutes,
        startedAt: new Date().toISOString(),
      };

      return reply.send({
        jobId,
        estimatedMinutes,
        status: 'queued',
      });
    },
  );

  // GET /api/v1/admin/models/:id/metrics — Get training metrics for a model
  fastify.get<{ Params: { id: string } }>(
    '/api/v1/admin/models/:id/metrics',
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const { id } = request.params;
      const metrics = MOCK_METRICS[id];
      if (!metrics) {
        return reply.code(404).send({ error: 'Model not found or no metrics available' });
      }

      return reply.send(metrics);
    },
  );
}
