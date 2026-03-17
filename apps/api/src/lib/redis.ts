import { Redis } from 'ioredis';

export const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// --------------------------------------------------------------------------
// Parse Redis URL into BullMQ-compatible connection options.
// Handles password and TLS (rediss://) for Render-hosted Redis.
// --------------------------------------------------------------------------
export function parseBullMQConnection(url: string = REDIS_URL) {
  const parsed = new URL(url);
  const opts: Record<string, unknown> = {
    host: parsed.hostname || 'localhost',
    port: parseInt(parsed.port || '6379', 10),
    maxRetriesPerRequest: null,
  };
  if (parsed.password) {
    opts.password = decodeURIComponent(parsed.password);
  }
  if (parsed.username && parsed.username !== 'default') {
    opts.username = decodeURIComponent(parsed.username);
  }
  if (parsed.protocol === 'rediss:') {
    opts.tls = {};
  }
  return opts;
}

// --------------------------------------------------------------------------
// Main client for general get/set/publish operations
// --------------------------------------------------------------------------
export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
});

// --------------------------------------------------------------------------
// Publisher client (dedicated connection for pub/sub publishing)
// --------------------------------------------------------------------------
export const publisher = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
});

// --------------------------------------------------------------------------
// Subscriber client factory
// Redis requires a dedicated connection per subscriber because once a
// connection enters subscribe mode it cannot issue other commands.
// --------------------------------------------------------------------------
export function createSubscriber(): Redis {
  return new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}

// --------------------------------------------------------------------------
// Create a generic Redis connection (for BullMQ, etc.)
// --------------------------------------------------------------------------
export function createRedisConnection(): Redis {
  return new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}

// --------------------------------------------------------------------------
// Pub/Sub helpers
// --------------------------------------------------------------------------

export interface AlertPayload {
  event_id: string;
  zone_id: string;
  type: string;
  severity: number;
  confidence: number;
  track_ids: string[];
  created_at: string;
}

export interface BadgeUnlockPayload {
  operator_id: string;
  badge_key: string;
  badge_name: string;
  earned_at: string;
}

export interface SensorFrame {
  sensor_id: string;
  frame_id: number;
  timestamp: number;
  objects: Array<{
    track_id: string;
    centroid: { x: number; y: number; z: number };
    classification: string;
    velocity_ms: number;
    behavior_score: number;
  }>;
}

export async function publishAlert(facilityId: string, alert: AlertPayload): Promise<void> {
  const channel = `alerts:${facilityId}`;
  await publisher.publish(channel, JSON.stringify(alert));
}

export async function publishBadgeUnlock(operatorId: string, badge: BadgeUnlockPayload): Promise<void> {
  const channel = `badges:${operatorId}`;
  await publisher.publish(channel, JSON.stringify(badge));
}

export async function publishSensorFrame(sensorId: string, frame: SensorFrame): Promise<void> {
  const channel = `sensor:${sensorId}:frames`;
  await publisher.publish(channel, JSON.stringify(frame));
}

// --------------------------------------------------------------------------
// Disconnect helpers
// --------------------------------------------------------------------------
export async function disconnectRedis(): Promise<void> {
  await Promise.all([
    redis.quit().catch(() => {}),
    publisher.quit().catch(() => {}),
  ]);
}
