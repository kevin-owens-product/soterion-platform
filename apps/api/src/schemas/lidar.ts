import { z } from 'zod';

// --------------------------------------------------------------------------
// Point cloud position
// --------------------------------------------------------------------------
const PointSchema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});

// --------------------------------------------------------------------------
// Tracked object from edge LiDAR node
// --------------------------------------------------------------------------
const TrackObjectSchema = z.object({
  track_id: z.string().uuid(),
  centroid: PointSchema,
  classification: z.enum(['PERSON', 'VEHICLE', 'OBJECT', 'UNKNOWN']),
  velocity_ms: z.number().min(0),
  behavior_score: z.number().min(0).max(100),
  dwell_secs: z.number().int().min(0),
});

// --------------------------------------------------------------------------
// POST /lidar/ingest payload
// --------------------------------------------------------------------------
export const IngestPayloadSchema = z.object({
  sensor_id: z.string().uuid(),
  facility_id: z.string().uuid(),
  timestamp: z.number().describe('Unix timestamp ms'),
  points: z.array(PointSchema).optional().default([]),
  track_objects: z.array(TrackObjectSchema).min(0).max(500),
});
export type IngestPayload = z.infer<typeof IngestPayloadSchema>;

// --------------------------------------------------------------------------
// GET /lidar/streams query
// --------------------------------------------------------------------------
export const StreamsQuerySchema = z.object({
  zone_id: z.string().uuid().optional(),
  status: z.enum(['online', 'offline', 'degraded', 'maintenance']).optional(),
});
export type StreamsQuery = z.infer<typeof StreamsQuerySchema>;

// --------------------------------------------------------------------------
// GET /lidar/tracks query
// --------------------------------------------------------------------------
export const TracksQuerySchema = z.object({
  zone_id: z.string().uuid().optional(),
  sensor_id: z.string().uuid().optional(),
  object_class: z.enum(['person', 'luggage', 'cart', 'wheelchair', 'vehicle', 'unknown']).optional(),
  active_only: z.coerce.boolean().default(true),
  limit: z.coerce.number().int().min(1).max(1000).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});
export type TracksQuery = z.infer<typeof TracksQuerySchema>;

// --------------------------------------------------------------------------
// GET /lidar/zones/:zoneId/density
// --------------------------------------------------------------------------
export const DensityParamsSchema = z.object({
  zoneId: z.string().uuid(),
});
export type DensityParams = z.infer<typeof DensityParamsSchema>;

export const DensityQuerySchema = z.object({
  facility_id: z.string().uuid().optional(),
  from: z.coerce.number().optional().describe('Unix timestamp ms'),
  to: z.coerce.number().optional().describe('Unix timestamp ms'),
  resolution: z.enum(['1m', '5m', '15m', '1h']).default('5m'),
});
export type DensityQuery = z.infer<typeof DensityQuerySchema>;

// --------------------------------------------------------------------------
// GET /lidar/heatmap/:terminalId
// --------------------------------------------------------------------------
export const HeatmapParamsSchema = z.object({
  terminalId: z.string().uuid(),
});
export type HeatmapParams = z.infer<typeof HeatmapParamsSchema>;

// --------------------------------------------------------------------------
// GET /lidar/queue/:checkpointId
// --------------------------------------------------------------------------
export const QueueParamsSchema = z.object({
  checkpointId: z.string().uuid(),
});
export type QueueParams = z.infer<typeof QueueParamsSchema>;
