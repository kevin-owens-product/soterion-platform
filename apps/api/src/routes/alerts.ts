import { FastifyInstance } from 'fastify';
import sql from '../db/client.js';
import { authMiddleware } from '../middleware/auth.js';
import {
  AlertsQuerySchema,
  AlertIdParamsSchema,
  AcknowledgeBodySchema,
  EscalateBodySchema,
} from '../schemas/alerts.js';

export default async function alertRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('preHandler', authMiddleware);

  // ------------------------------------------------------------------
  // GET /api/v1/alerts
  // ------------------------------------------------------------------
  fastify.get('/api/v1/alerts', async (request, reply) => {
    const parsed = AlertsQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'Validation Error',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const { zone_id, severity, status, anomaly_type, from, to, limit, offset } = parsed.data;
    const airportId = request.operator!.airport_id;

    try {
      const zoneFilter = zone_id ? sql`AND ae.zone_id = ${zone_id}` : sql``;
      const severityFilter = severity
        ? sql`AND ae.severity = ${severityToInt(severity)}`
        : sql``;
      const statusFilter = status
        ? sql`AND ${statusToDbCondition(status)}`
        : sql``;
      const typeFilter = anomaly_type
        ? sql`AND ae.type = ${anomaly_type.toUpperCase()}`
        : sql``;
      const fromFilter = from
        ? sql`AND ae.created_at >= ${new Date(from)}`
        : sql``;
      const toFilter = to
        ? sql`AND ae.created_at <= ${new Date(to)}`
        : sql``;

      const alerts = await sql`
        SELECT
          ae.id,
          ae.zone_id,
          ae.type,
          ae.severity,
          ae.confidence,
          ae.track_ids,
          ae.acknowledged,
          ae.acknowledged_by,
          ae.acknowledged_at,
          ae.escalated,
          ae.resolved_at,
          ae.created_at,
          z.name AS zone_name
        FROM anomaly_events ae
        JOIN zones z ON z.id = ae.zone_id
        WHERE ae.airport_id = ${airportId}
          ${zoneFilter}
          ${severityFilter}
          ${statusFilter}
          ${typeFilter}
          ${fromFilter}
          ${toFilter}
        ORDER BY ae.created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `;

      const countResult = await sql<{ count: string }[]>`
        SELECT COUNT(*)::text AS count
        FROM anomaly_events ae
        WHERE ae.airport_id = ${airportId}
          ${zoneFilter}
          ${severityFilter}
          ${statusFilter}
          ${typeFilter}
          ${fromFilter}
          ${toFilter}
      `;

      return reply.code(200).send({
        alerts,
        total: parseInt(countResult[0].count, 10),
        limit,
        offset,
      });
    } catch (err) {
      request.log.error(err, 'Error fetching alerts');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch alerts',
      });
    }
  });

  // ------------------------------------------------------------------
  // GET /api/v1/alerts/stats
  // Must be registered BEFORE /api/v1/alerts/:id to avoid route collision
  // ------------------------------------------------------------------
  fastify.get('/api/v1/alerts/stats', async (request, reply) => {
    const airportId = request.operator!.airport_id;

    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const stats = await sql`
        SELECT
          COUNT(*) FILTER (WHERE NOT acknowledged AND resolved_at IS NULL)::int AS total_open,
          COUNT(*) FILTER (WHERE acknowledged AND resolved_at IS NULL)::int AS total_acknowledged,
          COUNT(*) FILTER (WHERE resolved_at IS NOT NULL AND resolved_at >= ${todayStart})::int AS total_resolved_today,
          COUNT(*) FILTER (WHERE severity = 5)::int AS severity_critical,
          COUNT(*) FILTER (WHERE severity = 4)::int AS severity_high,
          COUNT(*) FILTER (WHERE severity = 3)::int AS severity_medium,
          COUNT(*) FILTER (WHERE severity = 2)::int AS severity_low,
          COUNT(*) FILTER (WHERE severity = 1)::int AS severity_info,
          AVG(confidence)::numeric(4,3) AS avg_confidence,
          COUNT(*) FILTER (WHERE type = 'CROWD_SURGE')::int AS type_crowd_surge,
          COUNT(*) FILTER (WHERE type = 'INTRUSION')::int AS type_intrusion,
          COUNT(*) FILTER (WHERE type = 'ABANDONED_OBJECT')::int AS type_abandoned_object,
          COUNT(*) FILTER (WHERE type = 'LOITERING')::int AS type_loitering,
          COUNT(*) FILTER (WHERE type = 'PERIMETER_BREACH')::int AS type_perimeter_breach,
          COUNT(*) FILTER (WHERE type = 'DRONE_DETECTED')::int AS type_drone_detected
        FROM anomaly_events
        WHERE airport_id = ${airportId}
          AND created_at >= ${todayStart}
      `;

      const row = stats[0];

      return reply.code(200).send({
        total_open: row.total_open,
        total_acknowledged: row.total_acknowledged,
        total_resolved_today: row.total_resolved_today,
        avg_confidence: row.avg_confidence ? parseFloat(String(row.avg_confidence)) : null,
        by_severity: {
          critical: row.severity_critical,
          high: row.severity_high,
          medium: row.severity_medium,
          low: row.severity_low,
          info: row.severity_info,
        },
        by_type: {
          CROWD_SURGE: row.type_crowd_surge,
          INTRUSION: row.type_intrusion,
          ABANDONED_OBJECT: row.type_abandoned_object,
          LOITERING: row.type_loitering,
          PERIMETER_BREACH: row.type_perimeter_breach,
          DRONE_DETECTED: row.type_drone_detected,
        },
      });
    } catch (err) {
      request.log.error(err, 'Error fetching alert stats');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch alert statistics',
      });
    }
  });

  // ------------------------------------------------------------------
  // GET /api/v1/alerts/:id
  // ------------------------------------------------------------------
  fastify.get('/api/v1/alerts/:id', async (request, reply) => {
    const paramsParsed = AlertIdParamsSchema.safeParse(request.params);
    if (!paramsParsed.success) {
      return reply.code(400).send({
        error: 'Validation Error',
        details: paramsParsed.error.flatten().fieldErrors,
      });
    }

    const { id } = paramsParsed.data;
    const airportId = request.operator!.airport_id;

    try {
      const rows = await sql`
        SELECT
          ae.id,
          ae.zone_id,
          ae.sensor_node_id,
          ae.type,
          ae.severity,
          ae.confidence,
          ae.track_ids,
          ae.snapshot_s3,
          ae.acknowledged,
          ae.acknowledged_by,
          ae.acknowledged_at,
          ae.escalated,
          ae.resolved_at,
          ae.created_at,
          z.name AS zone_name,
          z.type AS zone_type
        FROM anomaly_events ae
        JOIN zones z ON z.id = ae.zone_id
        WHERE ae.id = ${id}
          AND ae.airport_id = ${airportId}
        LIMIT 1
      `;

      if (rows.length === 0) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Alert not found',
        });
      }

      return reply.code(200).send(rows[0]);
    } catch (err) {
      request.log.error(err, 'Error fetching alert');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch alert',
      });
    }
  });

  // ------------------------------------------------------------------
  // POST /api/v1/alerts/:id/acknowledge
  // ------------------------------------------------------------------
  fastify.post('/api/v1/alerts/:id/acknowledge', async (request, reply) => {
    const paramsParsed = AlertIdParamsSchema.safeParse(request.params);
    if (!paramsParsed.success) {
      return reply.code(400).send({
        error: 'Validation Error',
        details: paramsParsed.error.flatten().fieldErrors,
      });
    }

    const bodyParsed = AcknowledgeBodySchema.safeParse(request.body || {});
    if (!bodyParsed.success) {
      return reply.code(400).send({
        error: 'Validation Error',
        details: bodyParsed.error.flatten().fieldErrors,
      });
    }

    const { id } = paramsParsed.data;
    const airportId = request.operator!.airport_id;
    const operatorId = request.operator!.id;

    try {
      const updated = await sql`
        UPDATE anomaly_events
        SET
          acknowledged = TRUE,
          acknowledged_by = ${operatorId},
          acknowledged_at = NOW()
        WHERE id = ${id}
          AND airport_id = ${airportId}
        RETURNING
          id, acknowledged, acknowledged_by, acknowledged_at,
          type, severity, zone_id, created_at
      `;

      if (updated.length === 0) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Alert not found',
        });
      }

      return reply.code(200).send(updated[0]);
    } catch (err) {
      request.log.error(err, 'Error acknowledging alert');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to acknowledge alert',
      });
    }
  });

  // ------------------------------------------------------------------
  // POST /api/v1/alerts/:id/escalate
  // ------------------------------------------------------------------
  fastify.post('/api/v1/alerts/:id/escalate', async (request, reply) => {
    const paramsParsed = AlertIdParamsSchema.safeParse(request.params);
    if (!paramsParsed.success) {
      return reply.code(400).send({
        error: 'Validation Error',
        details: paramsParsed.error.flatten().fieldErrors,
      });
    }

    const bodyParsed = EscalateBodySchema.safeParse(request.body);
    if (!bodyParsed.success) {
      return reply.code(400).send({
        error: 'Validation Error',
        details: bodyParsed.error.flatten().fieldErrors,
      });
    }

    const { id } = paramsParsed.data;
    const { severity, reason } = bodyParsed.data;
    const airportId = request.operator!.airport_id;

    try {
      // Map text severity to integer (1-5)
      const severityInt = severityToInt(severity);

      const updated = await sql`
        UPDATE anomaly_events
        SET
          escalated = TRUE,
          severity = ${severityInt}
        WHERE id = ${id}
          AND airport_id = ${airportId}
        RETURNING
          id, type, severity, escalated, acknowledged,
          zone_id, created_at
      `;

      if (updated.length === 0) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Alert not found',
        });
      }

      return reply.code(200).send({
        ...updated[0],
        escalated_by: request.operator!.id,
        escalated_at: new Date().toISOString(),
        reason,
      });
    } catch (err) {
      request.log.error(err, 'Error escalating alert');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to escalate alert',
      });
    }
  });

  // GET /api/v1/alerts/:id/tracks - track positions for incident replay
  fastify.get('/api/v1/alerts/:id/tracks', {
    preHandler: authMiddleware,
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const airportId = request.operator!.airport_id;

    try {
      const alerts = await sql`
        SELECT id, track_ids, zone_id, created_at
        FROM anomaly_events
        WHERE id = ${id} AND airport_id = ${airportId}
        LIMIT 1
      `;

      if (alerts.length === 0) {
        return reply.code(404).send({ error: 'Not Found', message: 'Alert not found' });
      }

      const alert = alerts[0];
      const windowStart = new Date(new Date(alert.created_at).getTime() - 60_000);
      const windowEnd = new Date(new Date(alert.created_at).getTime() + 60_000);

      const tracks = await sql`
        SELECT
          track_id,
          classification,
          behavior_score,
          velocity_ms,
          centroid,
          dwell_secs,
          time
        FROM track_objects
        WHERE zone_id = ${alert.zone_id}
          AND time >= ${windowStart}
          AND time <= ${windowEnd}
        ORDER BY track_id, time ASC
      `;

      return reply.code(200).send({
        alert_id: id,
        zone_id: alert.zone_id,
        window: { start: windowStart.toISOString(), end: windowEnd.toISOString() },
        track_count: new Set(tracks.map((t: any) => t.track_id)).size,
        frames: tracks,
      });
    } catch (err) {
      request.log.error(err, 'Error fetching incident tracks');
      return reply.code(200).send({ alert_id: id, frames: [], track_count: 0 });
    }
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function severityToInt(severity: string): number {
  const map: Record<string, number> = {
    low: 1,
    medium: 3,
    high: 4,
    critical: 5,
  };
  return map[severity] ?? 3;
}

function statusToDbCondition(status: string) {
  switch (status) {
    case 'open':
      return sql`(ae.acknowledged = FALSE AND ae.resolved_at IS NULL)`;
    case 'acknowledged':
      return sql`(ae.acknowledged = TRUE AND ae.resolved_at IS NULL)`;
    case 'investigating':
      return sql`(ae.escalated = TRUE AND ae.resolved_at IS NULL)`;
    case 'resolved':
      return sql`(ae.resolved_at IS NOT NULL)`;
    case 'false_positive':
      // Treat resolved + not escalated as false positive (simplified)
      return sql`(ae.resolved_at IS NOT NULL AND ae.escalated = FALSE)`;
    default:
      return sql`TRUE`;
  }
}
