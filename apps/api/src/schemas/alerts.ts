import { z } from 'zod';

export const AlertsQuerySchema = z.object({
  zone_id: z.string().uuid().optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  status: z.enum(['open', 'acknowledged', 'investigating', 'resolved', 'false_positive']).optional(),
  anomaly_type: z.enum([
    'crowd_surge', 'perimeter_breach', 'abandoned_object',
    'wrong_way', 'loitering', 'tailgating', 'density_spike',
  ]).optional(),
  from: z.coerce.number().optional().describe('Unix timestamp ms'),
  to: z.coerce.number().optional().describe('Unix timestamp ms'),
  limit: z.coerce.number().int().min(1).max(500).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
export type AlertsQuery = z.infer<typeof AlertsQuerySchema>;

export const AlertIdParamsSchema = z.object({
  id: z.string().uuid(),
});
export type AlertIdParams = z.infer<typeof AlertIdParamsSchema>;

export const AcknowledgeBodySchema = z.object({
  notes: z.string().max(2000).optional(),
});
export type AcknowledgeBody = z.infer<typeof AcknowledgeBodySchema>;

export const EscalateBodySchema = z.object({
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  reason: z.string().min(1).max(2000),
});
export type EscalateBody = z.infer<typeof EscalateBodySchema>;
