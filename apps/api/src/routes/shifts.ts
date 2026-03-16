import { FastifyInstance } from 'fastify';
import sql from '../db/client.js';
import { authMiddleware } from '../middleware/auth.js';

// ---------------------------------------------------------------------------
// Mock data returned in dev mode when DB queries return no data
// ---------------------------------------------------------------------------
const MOCK_HANDOFF = {
  shift: {
    operator: 'Admin User',
    start: new Date(Date.now() - 8 * 3600_000).toISOString().replace(/\.\d+Z$/, 'Z'),
    end: new Date().toISOString().replace(/\.\d+Z$/, 'Z'),
    score: 847,
  },
  summary: {
    total_incidents: 12,
    acknowledged: 10,
    escalated: 1,
    pending: 2,
    avg_response_secs: 14.8,
    peak_zone: 'Security Checkpoint A',
    peak_density_pct: 87,
  },
  pending_items: [
    { type: 'UNACKED_ALERT', detail: 'LOITERING at Baggage Claim - severity 3, 12 min ago' },
    { type: 'ELEVATED_DENSITY', detail: 'Arrivals Curb at 78% (above 70% threshold)' },
  ],
  watch_items: [
    'Security Checkpoint A density trending up - expect peak in 20 min',
    'Sensor S-008 OFFLINE since 14:30 - maintenance ticket pending',
    "Mission 'Maintain 95% SLA for 2 hours' at 80% - needs 20 more minutes",
  ],
  missions_status: [
    { title: 'Acknowledge 5 alerts before escalation', progress: 5, target: 5, completed: true },
    { title: 'Maintain 95% queue SLA', progress: 1, target: 2, completed: false },
  ],
  top_incidents: [
    { type: 'CROWD_SURGE', zone: 'Security Checkpoint A', severity: 4, time: '10:23', resolved: true },
    { type: 'INTRUSION', zone: 'Restricted Airside', severity: 5, time: '14:15', resolved: true },
    { type: 'LOITERING', zone: 'Baggage Claim', severity: 3, time: '15:42', resolved: false },
    { type: 'ABANDONED_OBJECT', zone: 'Departure Lounge', severity: 4, time: '11:07', resolved: true },
    { type: 'PERIMETER_BREACH', zone: 'Restricted Airside', severity: 5, time: '13:55', resolved: true },
  ],
};

export default async function shiftRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('preHandler', authMiddleware);

  // ------------------------------------------------------------------
  // GET /api/v1/shifts/handoff
  // ------------------------------------------------------------------
  fastify.get('/api/v1/shifts/handoff', async (request, reply) => {
    const airportId = request.operator!.airport_id;
    const operatorId = request.operator!.id;
    const operatorName = request.operator!.name ?? 'Operator';
    const isDev = process.env.NODE_ENV === 'development';
    const shiftHours = 8;
    const shiftEnd = new Date();
    const shiftStart = new Date(shiftEnd.getTime() - shiftHours * 3600_000);

    try {
      // 1. Total incidents during shift
      const incidentsRow = await sql`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE acknowledged = true)::int AS acknowledged,
          COUNT(*) FILTER (WHERE escalated = true)::int AS escalated,
          COUNT(*) FILTER (WHERE acknowledged = false)::int AS pending
        FROM anomaly_events
        WHERE airport_id = ${airportId}
          AND created_at >= ${shiftStart.toISOString()}
          AND created_at <= ${shiftEnd.toISOString()}
      `.then(r => r[0]).catch(() => null);

      // 2. Average response time
      const responseRow = await sql`
        SELECT COALESCE(
          AVG(EXTRACT(EPOCH FROM (acknowledged_at - created_at))), 0
        )::numeric(10,1) AS avg_secs
        FROM anomaly_events
        WHERE airport_id = ${airportId}
          AND acknowledged = true
          AND acknowledged_at IS NOT NULL
          AND created_at >= ${shiftStart.toISOString()}
      `.then(r => r[0]).catch(() => null);

      // 3. Peak zone density
      const peakRow = await sql`
        SELECT z.name AS zone_name, MAX(zd.density_pct)::numeric(10,1) AS peak_density
        FROM zone_density zd
        JOIN zones z ON z.id = zd.zone_id
        JOIN terminals t ON t.id = z.terminal_id
        WHERE t.airport_id = ${airportId}
          AND zd.time >= ${shiftStart.toISOString()}
        GROUP BY z.name
        ORDER BY peak_density DESC
        LIMIT 1
      `.then(r => r[0]).catch(() => null);

      // 4. Shift score
      const scoreRow = await sql`
        SELECT total_score
        FROM shift_scores
        WHERE operator_id = ${operatorId}
        ORDER BY shift_date DESC
        LIMIT 1
      `.then(r => r[0]).catch(() => null);

      // 5. Pending alerts (unacknowledged)
      const pendingAlerts = await sql`
        SELECT ae.type, z.name AS zone_name, ae.severity,
          EXTRACT(EPOCH FROM (NOW() - ae.created_at))::int AS age_secs
        FROM anomaly_events ae
        LEFT JOIN zones z ON z.id = ae.zone_id
        WHERE ae.airport_id = ${airportId}
          AND ae.acknowledged = false
          AND ae.created_at >= ${shiftStart.toISOString()}
        ORDER BY ae.severity DESC, ae.created_at DESC
        LIMIT 10
      `.catch(() => []);

      // 6. Elevated density zones
      const elevatedDensity = await sql`
        SELECT z.name AS zone_name, zd.density_pct::numeric(10,1) AS density_pct
        FROM zone_density zd
        JOIN zones z ON z.id = zd.zone_id
        JOIN terminals t ON t.id = z.terminal_id
        WHERE t.airport_id = ${airportId}
          AND zd.time >= NOW() - INTERVAL '5 minutes'
          AND zd.density_pct > 70
        ORDER BY zd.density_pct DESC
      `.catch(() => []);

      // 7. Offline sensors
      const offlineSensors = await sql`
        SELECT sn.label, sn.last_ping_at
        FROM sensor_nodes sn
        JOIN zones z ON z.id = sn.zone_id
        JOIN terminals t ON t.id = z.terminal_id
        WHERE t.airport_id = ${airportId}
          AND sn.health != 'ONLINE'
      `.catch(() => []);

      // 8. Mission progress
      const missions = await sql`
        SELECT m.title, mp.progress::int, m.target_value::int AS target, mp.completed
        FROM mission_progress mp
        JOIN missions m ON m.id = mp.mission_id
        WHERE mp.operator_id = ${operatorId}
          AND m.active = true
        ORDER BY mp.completed ASC, mp.progress DESC
      `.catch(() => []);

      // 9. Top incidents
      const topIncidents = await sql`
        SELECT ae.type, z.name AS zone_name, ae.severity,
          TO_CHAR(ae.created_at AT TIME ZONE 'UTC', 'HH24:MI') AS time,
          (ae.resolved_at IS NOT NULL) AS resolved
        FROM anomaly_events ae
        LEFT JOIN zones z ON z.id = ae.zone_id
        WHERE ae.airport_id = ${airportId}
          AND ae.created_at >= ${shiftStart.toISOString()}
        ORDER BY ae.severity DESC, ae.created_at DESC
        LIMIT 5
      `.catch(() => []);

      const total = incidentsRow?.total ?? 0;
      const acknowledged = incidentsRow?.acknowledged ?? 0;
      const escalated = incidentsRow?.escalated ?? 0;
      const pending = incidentsRow?.pending ?? 0;
      const avgResponseSecs = parseFloat(responseRow?.avg_secs) || 0;
      const peakZone = peakRow?.zone_name ?? 'N/A';
      const peakDensity = parseFloat(peakRow?.peak_density) || 0;
      const score = parseFloat(scoreRow?.total_score) || 0;

      const allZero = total === 0 && acknowledged === 0 && score === 0;
      if (isDev && allZero) {
        return reply.send(MOCK_HANDOFF);
      }

      // Build pending_items
      const pendingItems: { type: string; detail: string }[] = [];
      for (const a of pendingAlerts) {
        const ageMin = Math.round(a.age_secs / 60);
        pendingItems.push({
          type: 'UNACKED_ALERT',
          detail: `${a.type} at ${a.zone_name ?? 'Unknown'} - severity ${a.severity}, ${ageMin} min ago`,
        });
      }
      for (const d of elevatedDensity) {
        pendingItems.push({
          type: 'ELEVATED_DENSITY',
          detail: `${d.zone_name} at ${d.density_pct}% (above 70% threshold)`,
        });
      }

      // Build watch_items
      const watchItems: string[] = [];
      if (peakDensity > 70) {
        watchItems.push(`${peakZone} density trending up - monitor closely`);
      }
      for (const s of offlineSensors) {
        const since = s.last_ping_at
          ? new Date(s.last_ping_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
          : 'unknown';
        watchItems.push(`Sensor ${s.label} OFFLINE since ${since} - maintenance ticket pending`);
      }
      for (const m of missions) {
        if (!m.completed && m.progress > 0) {
          const remaining = m.target - m.progress;
          watchItems.push(`Mission '${m.title}' at ${Math.round((m.progress / m.target) * 100)}% - needs ${remaining} more`);
        }
      }

      const result = {
        shift: {
          operator: operatorName,
          start: shiftStart.toISOString(),
          end: shiftEnd.toISOString(),
          score: Math.round(score),
        },
        summary: {
          total_incidents: total,
          acknowledged,
          escalated,
          pending,
          avg_response_secs: avgResponseSecs,
          peak_zone: peakZone,
          peak_density_pct: Math.round(peakDensity),
        },
        pending_items: pendingItems,
        watch_items: watchItems,
        missions_status: missions.map((m: any) => ({
          title: m.title,
          progress: m.progress,
          target: m.target,
          completed: m.completed,
        })),
        top_incidents: topIncidents.map((i: any) => ({
          type: i.type,
          zone: i.zone_name ?? 'Unknown',
          severity: i.severity,
          time: i.time,
          resolved: i.resolved,
        })),
      };

      return reply.send(result);
    } catch (err) {
      fastify.log.error(err, 'Failed to generate shift handoff report');
      if (isDev) {
        return reply.send(MOCK_HANDOFF);
      }
      return reply.code(500).send({ error: 'Failed to generate shift handoff report' });
    }
  });
}
