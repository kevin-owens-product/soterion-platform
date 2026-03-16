import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createSubscriber } from '../lib/redis.js';
import type { Redis } from 'ioredis';

const LiveParamsSchema = z.object({
  sensorId: z.string().uuid(),
});

const TokenQuerySchema = z.object({
  token: z.string().min(1),
});

export default async function liveWebSocket(fastify: FastifyInstance): Promise<void> {
  // ==========================================================================
  // /ws/live/:sensorId - Stream real-time point cloud deltas
  // ==========================================================================
  fastify.get('/ws/live/:sensorId', { websocket: true }, (socket, request) => {
    const paramsParsed = LiveParamsSchema.safeParse(request.params);
    if (!paramsParsed.success) {
      socket.send(JSON.stringify({ type: 'error', message: 'Invalid sensor ID' }));
      socket.close(1008, 'Invalid sensor ID');
      return;
    }

    // Authenticate via token query parameter
    const queryParsed = TokenQuerySchema.safeParse(request.query);
    if (!queryParsed.success) {
      socket.send(JSON.stringify({ type: 'error', message: 'Missing token query parameter' }));
      socket.close(1008, 'Authentication required');
      return;
    }

    const { sensorId } = paramsParsed.data;
    const channel = `sensor:${sensorId}:frames`;
    let subscriber: Redis | null = null;

    fastify.log.info(`[WS] Client connected for sensor stream: ${sensorId}`);

    // Send connection acknowledgment
    socket.send(JSON.stringify({
      type: 'connected',
      sensor_id: sensorId,
      channel,
      timestamp: new Date().toISOString(),
    }));

    // Subscribe to Redis channel for this sensor's frames
    const setupSubscription = async () => {
      try {
        subscriber = createSubscriber();
        await subscriber.subscribe(channel);

        subscriber.on('message', (ch: string, message: string) => {
          if (ch === channel && socket.readyState === 1) {
            socket.send(JSON.stringify({
              type: 'frame',
              data: JSON.parse(message),
            }));
          }
        });
      } catch (err) {
        fastify.log.error({ err }, `[WS] Failed to subscribe to Redis channel: ${channel}`);
      }
    };

    setupSubscription();

    // Handle client messages (e.g., ping/pong)
    socket.on('message', (raw: Buffer) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'ping') {
          socket.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        }
      } catch {
        socket.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
      }
    });

    // Cleanup on disconnect
    const cleanup = () => {
      if (subscriber) {
        subscriber.unsubscribe(channel).catch(() => {});
        subscriber.quit().catch(() => {});
        subscriber = null;
      }
      fastify.log.info(`[WS] Client disconnected from sensor stream: ${sensorId}`);
    };

    socket.on('close', cleanup);
    socket.on('error', (err: Error) => {
      fastify.log.error({ err }, `[WS] Error on sensor stream: ${sensorId}`);
      cleanup();
    });
  });

  // ==========================================================================
  // /ws/alerts - Stream new anomaly events for operator's facility
  // ==========================================================================
  fastify.get('/ws/alerts', { websocket: true }, (socket, request) => {
    // Authenticate via token query parameter
    const queryParsed = TokenQuerySchema.safeParse(request.query);
    if (!queryParsed.success) {
      socket.send(JSON.stringify({ type: 'error', message: 'Missing token query parameter' }));
      socket.close(1008, 'Authentication required');
      return;
    }

    // In production, decode token to get operator's facility_id.
    // For dev, use the operator attached by auth middleware or a default.
    const facilityId = (request as any).operator?.airport_id ?? '00000000-0000-0000-0000-000000000001';
    const channel = `alerts:${facilityId}`;
    let subscriber: Redis | null = null;
    let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

    fastify.log.info(`[WS] Alert client connected for facility: ${facilityId}`);

    // Send connection acknowledgment
    socket.send(JSON.stringify({
      type: 'connected',
      facility_id: facilityId,
      channel,
      timestamp: new Date().toISOString(),
    }));

    // Subscribe to Redis alerts channel
    const setupSubscription = async () => {
      try {
        subscriber = createSubscriber();
        await subscriber.subscribe(channel);

        subscriber.on('message', (ch: string, message: string) => {
          if (ch === channel && socket.readyState === 1) {
            socket.send(JSON.stringify({
              type: 'alert',
              data: JSON.parse(message),
            }));
          }
        });
      } catch (err) {
        fastify.log.error({ err }, `[WS] Failed to subscribe to alerts channel: ${channel}`);
      }
    };

    setupSubscription();

    // Heartbeat ping every 30 seconds to keep connection alive
    heartbeatInterval = setInterval(() => {
      if (socket.readyState === 1) {
        socket.send(JSON.stringify({ type: 'heartbeat', timestamp: Date.now() }));
      }
    }, 30_000);

    // Handle client messages
    socket.on('message', (raw: Buffer) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'ping') {
          socket.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        }
      } catch {
        socket.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
      }
    });

    // Cleanup on disconnect
    const cleanup = () => {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
      if (subscriber) {
        subscriber.unsubscribe(channel).catch(() => {});
        subscriber.quit().catch(() => {});
        subscriber = null;
      }
      fastify.log.info(`[WS] Alert client disconnected for facility: ${facilityId}`);
    };

    socket.on('close', cleanup);
    socket.on('error', (err: Error) => {
      fastify.log.error({ err }, `[WS] Error on alerts stream: ${facilityId}`);
      cleanup();
    });
  });
}
