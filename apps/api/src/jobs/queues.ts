import { Queue } from 'bullmq';
import { parseBullMQConnection } from '../lib/redis.js';

const defaultConnection = parseBullMQConnection();

// --------------------------------------------------------------------------
// Queue: anomaly-processing
// Receives batches of track_objects from POST /lidar/ingest.
// Worker calls ML service for anomaly detection.
// --------------------------------------------------------------------------
export const anomalyQueue = new Queue('anomaly-processing', {
  connection: defaultConnection,
  defaultJobOptions: {
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
  },
});

// --------------------------------------------------------------------------
// Queue: score-calculation
// Computes shift scores for operators at end of shift or on demand.
// --------------------------------------------------------------------------
export const scoreQueue = new Queue('score-calculation', {
  connection: defaultConnection,
  defaultJobOptions: {
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 2000 },
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  },
});

// --------------------------------------------------------------------------
// Queue: badge-evaluation
// Evaluates badge criteria after score calculation or qualifying events.
// --------------------------------------------------------------------------
export const badgeQueue = new Queue('badge-evaluation', {
  connection: defaultConnection,
  defaultJobOptions: {
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 1000 },
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  },
});

// --------------------------------------------------------------------------
// Queue: density-aggregation
// Repeatable job that aggregates zone density every 5 seconds.
// --------------------------------------------------------------------------
export const densityQueue = new Queue('density-aggregation', {
  connection: defaultConnection,
  defaultJobOptions: {
    removeOnComplete: { count: 200 },
    removeOnFail: { count: 500 },
    attempts: 2,
    backoff: { type: 'fixed', delay: 1000 },
  },
});

// --------------------------------------------------------------------------
// Helper: add jobs to queues
// --------------------------------------------------------------------------

export interface AnomalyJobPayload {
  sensor_id: string;
  facility_id: string;
  zone_id: string;
  timestamp: number;
  track_objects: Array<{
    track_id: string;
    centroid: { x: number; y: number; z: number };
    classification: string;
    velocity_ms: number;
    behavior_score: number;
    dwell_secs: number;
  }>;
}

export async function addAnomalyJob(payload: AnomalyJobPayload): Promise<string> {
  const job = await anomalyQueue.add('process-batch', payload, {
    jobId: `anomaly-${payload.sensor_id}-${payload.timestamp}`,
  });
  return job.id ?? 'unknown';
}

export interface ScoreJobPayload {
  operator_id: string;
  facility_id: string;
  shift_date: string;
  shift_start: string;
  shift_end: string;
}

export async function addScoreJob(payload: ScoreJobPayload): Promise<string> {
  const job = await scoreQueue.add('calculate-score', payload, {
    jobId: `score-${payload.operator_id}-${payload.shift_date}`,
  });
  return job.id ?? 'unknown';
}

export interface BadgeJobPayload {
  operator_id: string;
  facility_id: string;
  shift_date: string;
  total_score: number;
}

export async function addBadgeJob(payload: BadgeJobPayload): Promise<string> {
  const job = await badgeQueue.add('evaluate-badges', payload, {
    jobId: `badge-${payload.operator_id}-${payload.shift_date}`,
  });
  return job.id ?? 'unknown';
}

// --------------------------------------------------------------------------
// Setup repeatable density aggregation job
// --------------------------------------------------------------------------
export async function setupRepeatableJobs(): Promise<void> {
  await densityQueue.add(
    'aggregate-density',
    {},
    {
      repeat: { every: 5000 },  // every 5 seconds
      jobId: 'density-aggregation-repeatable',
    },
  );
}

// --------------------------------------------------------------------------
// Close all queues (graceful shutdown)
// --------------------------------------------------------------------------
export async function closeQueues(): Promise<void> {
  await Promise.all([
    anomalyQueue.close(),
    scoreQueue.close(),
    badgeQueue.close(),
    densityQueue.close(),
  ]);
}
