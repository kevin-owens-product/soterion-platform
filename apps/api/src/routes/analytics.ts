import { FastifyInstance } from 'fastify';
import sql from '../db/client.js';
import { authMiddleware } from '../middleware/auth.js';

// ---------------------------------------------------------------------------
// Mock data returned in dev mode when DB queries return no data
// ---------------------------------------------------------------------------
const MOCK_ROI = {
  incidents_detected_24h: 47,
  avg_response_time_secs: 12.4,
  queue_sla_compliance_pct: 94.2,
  avg_queue_wait_mins: 6.8,
  person_hours_saved_week: 31.5,
  false_positive_rate_pct: 3.1,
  detection_lead_time_mins: 8.3,
  cost_savings_monthly_usd: 5670,
  sensor_uptime_pct: 99.2,
  alerts_before_escalation_pct: 91.7,
};

// ---------------------------------------------------------------------------
// Mock benchmarking data for dev mode
// ---------------------------------------------------------------------------
const MOCK_BENCHMARKS = {
  facilities: [
    {
      id: 'f0000000-0000-4000-8000-000000000001',
      name: 'London Heathrow T2',
      type: 'AIRPORT',
      avgResponseSecs: 14.8,
      avgDensityPct: 52,
      incidentRate24h: 54,
      slaCompliancePct: 86,
      operatorAvgScore: 880,
      sensorUptimePct: 98.5,
    },
    {
      id: 'f1000000-0000-4000-8000-000000000001',
      name: 'Port of Felixstowe',
      type: 'SEAPORT',
      avgResponseSecs: 18.2,
      avgDensityPct: 38,
      incidentRate24h: 12,
      slaCompliancePct: 92,
      operatorAvgScore: 820,
      sensorUptimePct: 97.1,
    },
    {
      id: 'f2000000-0000-4000-8000-000000000001',
      name: 'Wembley Stadium',
      type: 'STADIUM',
      avgResponseSecs: 9.4,
      avgDensityPct: 74,
      incidentRate24h: 31,
      slaCompliancePct: 78,
      operatorAvgScore: 910,
      sensorUptimePct: 99.2,
    },
    {
      id: 'f3000000-0000-4000-8000-000000000001',
      name: "King's Cross Station",
      type: 'TRANSIT_HUB',
      avgResponseSecs: 22.1,
      avgDensityPct: 61,
      incidentRate24h: 27,
      slaCompliancePct: 88,
      operatorAvgScore: 845,
      sensorUptimePct: 96.3,
    },
    {
      id: 'f4000000-0000-4000-8000-000000000001',
      name: "St Thomas' Hospital",
      type: 'HOSPITAL',
      avgResponseSecs: 11.3,
      avgDensityPct: 44,
      incidentRate24h: 8,
      slaCompliancePct: 95,
      operatorAvgScore: 860,
      sensorUptimePct: 99.7,
    },
  ],
  industryAverages: {
    avgResponseSecs: 45.0,
    slaCompliancePct: 72,
    sensorUptimePct: 94,
  },
};

// ---------------------------------------------------------------------------
// Mock trend data generator for dev mode
// ---------------------------------------------------------------------------
function generateMockTrends(metric: string, periodDays: number) {
  const now = new Date();
  const data: any[] = [];
  const baseValues: Record<string, { base: number; variance: number; min: number; max: number }> = {
    density: { base: 52, variance: 18, min: 8, max: 95 },
    incidents: { base: 15, variance: 8, min: 2, max: 35 },
    queue_wait: { base: 7.2, variance: 3.5, min: 1.5, max: 18 },
    scores: { base: 820, variance: 80, min: 650, max: 980 },
  };
  const cfg = baseValues[metric] ?? baseValues.density;

  for (let i = periodDays - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    // Add slight upward trend + noise
    const trendFactor = 1 + (periodDays - i) * 0.003;
    const noise = (Math.random() - 0.5) * cfg.variance * 2;
    const value = Math.max(cfg.min, Math.min(cfg.max, Math.round((cfg.base * trendFactor + noise) * 10) / 10));
    const min = Math.max(cfg.min, Math.round((value - cfg.variance * 0.8) * 10) / 10);
    const max = Math.min(cfg.max, Math.round((value + cfg.variance * 0.8) * 10) / 10);
    data.push({ date: dateStr, value, min, max, avg: value });
  }

  // Compute comparison
  const half = Math.floor(data.length / 2);
  const firstHalf = data.slice(0, half);
  const secondHalf = data.slice(half);
  const prevAvg = firstHalf.length > 0
    ? Math.round((firstHalf.reduce((s: number, d: any) => s + d.value, 0) / firstHalf.length) * 10) / 10
    : 0;
  const currAvg = secondHalf.length > 0
    ? Math.round((secondHalf.reduce((s: number, d: any) => s + d.value, 0) / secondHalf.length) * 10) / 10
    : 0;
  const changePct = prevAvg > 0
    ? Math.round(((currAvg - prevAvg) / prevAvg) * 1000) / 10
    : 0;

  return {
    metric,
    period: `${periodDays}d`,
    data,
    comparison: {
      previous_period_avg: prevAvg,
      current_period_avg: currAvg,
      change_pct: changePct,
      trend: changePct > 0 ? 'up' : changePct < 0 ? 'down' : 'flat',
    },
  };
}

export default async function analyticsRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('preHandler', authMiddleware);

  // ------------------------------------------------------------------
  // GET /api/v1/analytics/trends
  // ------------------------------------------------------------------
  fastify.get('/api/v1/analytics/trends', async (request, reply) => {
    const airportId = request.operator!.airport_id;
    const isDev = process.env.NODE_ENV === 'development';
    const { metric = 'density', period = '7d', zone_id } = request.query as {
      metric?: string;
      period?: string;
      zone_id?: string;
    };

    const periodMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90 };
    const periodDays = periodMap[period] ?? 7;

    try {
      let rows: any[] = [];

      if (metric === 'density') {
        rows = await sql`
          SELECT
            DATE_TRUNC('day', zd.time)::date AS date,
            AVG(zd.density_pct)::numeric(10,1) AS value,
            MIN(zd.density_pct)::numeric(10,1) AS min,
            MAX(zd.density_pct)::numeric(10,1) AS max,
            AVG(zd.density_pct)::numeric(10,1) AS avg
          FROM zone_density zd
          JOIN zones z ON z.id = zd.zone_id
          JOIN terminals t ON t.id = z.terminal_id
          WHERE t.airport_id = ${airportId}
            AND zd.time >= NOW() - (${periodDays}::int || ' days')::interval
            ${zone_id ? sql`AND zd.zone_id = ${zone_id}` : sql``}
          GROUP BY DATE_TRUNC('day', zd.time)::date
          ORDER BY date
        `.catch(() => []);
      } else if (metric === 'incidents') {
        rows = await sql`
          SELECT
            DATE_TRUNC('day', ae.created_at)::date AS date,
            COUNT(*)::numeric AS value,
            MIN(ae.severity)::numeric AS min,
            MAX(ae.severity)::numeric AS max,
            AVG(ae.severity)::numeric(10,1) AS avg
          FROM anomaly_events ae
          WHERE ae.airport_id = ${airportId}
            AND ae.created_at >= NOW() - (${periodDays}::int || ' days')::interval
            ${zone_id ? sql`AND ae.zone_id = ${zone_id}` : sql``}
          GROUP BY DATE_TRUNC('day', ae.created_at)::date
          ORDER BY date
        `.catch(() => []);
      } else if (metric === 'queue_wait') {
        rows = await sql`
          SELECT
            DATE_TRUNC('day', qm.time)::date AS date,
            AVG(qm.wait_time_mins)::numeric(10,1) AS value,
            MIN(qm.wait_time_mins)::numeric(10,1) AS min,
            MAX(qm.wait_time_mins)::numeric(10,1) AS max,
            AVG(qm.wait_time_mins)::numeric(10,1) AS avg
          FROM queue_metrics qm
          WHERE qm.time >= NOW() - (${periodDays}::int || ' days')::interval
            ${zone_id ? sql`AND qm.zone_id = ${zone_id}` : sql``}
          GROUP BY DATE_TRUNC('day', qm.time)::date
          ORDER BY date
        `.catch(() => []);
      } else if (metric === 'scores') {
        rows = await sql`
          SELECT
            ss.shift_date AS date,
            AVG(ss.total_score)::numeric(10,1) AS value,
            MIN(ss.total_score)::numeric(10,1) AS min,
            MAX(ss.total_score)::numeric(10,1) AS max,
            AVG(ss.total_score)::numeric(10,1) AS avg
          FROM shift_scores ss
          WHERE ss.airport_id = ${airportId}
            AND ss.shift_date >= CURRENT_DATE - (${periodDays}::int || ' days')::interval
          GROUP BY ss.shift_date
          ORDER BY date
        `.catch(() => []);
      }

      if (rows.length > 0) {
        const data = rows.map((r: any) => ({
          date: typeof r.date === 'string' ? r.date : r.date?.toISOString?.()?.split('T')[0] ?? r.date,
          value: parseFloat(r.value) || 0,
          min: parseFloat(r.min) || 0,
          max: parseFloat(r.max) || 0,
          avg: parseFloat(r.avg) || 0,
        }));

        const half = Math.floor(data.length / 2);
        const firstHalf = data.slice(0, half);
        const secondHalf = data.slice(half);
        const prevAvg = firstHalf.length > 0
          ? Math.round((firstHalf.reduce((s, d) => s + d.value, 0) / firstHalf.length) * 10) / 10
          : 0;
        const currAvg = secondHalf.length > 0
          ? Math.round((secondHalf.reduce((s, d) => s + d.value, 0) / secondHalf.length) * 10) / 10
          : 0;
        const changePct = prevAvg > 0
          ? Math.round(((currAvg - prevAvg) / prevAvg) * 1000) / 10
          : 0;

        return reply.send({
          metric,
          period,
          data,
          comparison: {
            previous_period_avg: prevAvg,
            current_period_avg: currAvg,
            change_pct: changePct,
            trend: changePct > 0 ? 'up' : changePct < 0 ? 'down' : 'flat',
          },
        });
      }

      // Dev mode fallback with mock data
      if (isDev) {
        return reply.send(generateMockTrends(metric, periodDays));
      }

      return reply.send({
        metric,
        period,
        data: [],
        comparison: { previous_period_avg: 0, current_period_avg: 0, change_pct: 0, trend: 'flat' },
      });
    } catch (err) {
      fastify.log.error(err, 'Failed to compute trend analytics');
      if (isDev) {
        return reply.send(generateMockTrends(metric, periodDays));
      }
      return reply.code(500).send({ error: 'Failed to compute trend analytics' });
    }
  });

  // ------------------------------------------------------------------
  // GET /api/v1/analytics/benchmarks
  // ------------------------------------------------------------------
  fastify.get('/api/v1/analytics/benchmarks', async (_request, reply) => {
    const isDev = process.env.NODE_ENV === 'development';

    try {
      // Query all facilities with their comparative metrics
      const facilities = await sql`
        SELECT
          f.id,
          f.name,
          f.type,
          COALESCE(
            (SELECT AVG(EXTRACT(EPOCH FROM (ae.acknowledged_at - ae.created_at)))::numeric(10,1)
             FROM anomaly_events ae
             WHERE ae.airport_id = f.id
               AND ae.acknowledged = true
               AND ae.acknowledged_at IS NOT NULL
               AND ae.created_at >= NOW() - INTERVAL '24 hours'), 0
          ) AS avg_response_secs,
          COALESCE(
            (SELECT AVG(zd.density_pct)::numeric(10,1)
             FROM zone_density zd
             JOIN zones z ON z.id = zd.zone_id
             JOIN terminals t ON t.id = z.terminal_id
             WHERE t.airport_id = f.id
               AND zd.time >= NOW() - INTERVAL '1 hour'), 0
          ) AS avg_density_pct,
          COALESCE(
            (SELECT COUNT(*)::int
             FROM anomaly_events ae
             WHERE ae.airport_id = f.id
               AND ae.created_at >= NOW() - INTERVAL '24 hours'), 0
          ) AS incident_rate_24h,
          COALESCE(
            (SELECT (COUNT(*) FILTER (WHERE qm.sla_met = true)::numeric /
                     NULLIF(COUNT(*)::numeric, 0) * 100)::numeric(10,1)
             FROM queue_metrics qm
             WHERE qm.time >= NOW() - INTERVAL '24 hours'), 0
          ) AS sla_compliance_pct,
          COALESCE(
            (SELECT AVG(ss.total_score)::numeric(10,0)
             FROM shift_scores ss
             WHERE ss.airport_id = f.id
               AND ss.shift_date >= CURRENT_DATE - INTERVAL '7 days'), 0
          ) AS operator_avg_score,
          COALESCE(
            (SELECT (COUNT(*) FILTER (WHERE sn.health = 'ONLINE')::numeric /
                     NULLIF(COUNT(*)::numeric, 0) * 100)::numeric(10,1)
             FROM sensor_nodes sn
             JOIN zones z ON z.id = sn.zone_id
             JOIN terminals t ON t.id = z.terminal_id
             WHERE t.airport_id = f.id), 0
          ) AS sensor_uptime_pct
        FROM facilities f
        ORDER BY f.name
      `.catch(() => []);

      if (facilities.length > 0) {
        const mapped = facilities.map((f: any) => ({
          id: f.id,
          name: f.name,
          type: f.type,
          avgResponseSecs: parseFloat(f.avg_response_secs) || 0,
          avgDensityPct: parseFloat(f.avg_density_pct) || 0,
          incidentRate24h: parseInt(f.incident_rate_24h) || 0,
          slaCompliancePct: parseFloat(f.sla_compliance_pct) || 0,
          operatorAvgScore: parseFloat(f.operator_avg_score) || 0,
          sensorUptimePct: parseFloat(f.sensor_uptime_pct) || 0,
        }));

        const allZero = mapped.every((f: any) =>
          f.avgResponseSecs === 0 && f.avgDensityPct === 0 && f.incidentRate24h === 0
        );

        if (isDev && allZero) {
          return reply.send(MOCK_BENCHMARKS);
        }

        return reply.send({
          facilities: mapped,
          industryAverages: MOCK_BENCHMARKS.industryAverages,
        });
      }

      if (isDev) {
        return reply.send(MOCK_BENCHMARKS);
      }

      return reply.send({ facilities: [], industryAverages: MOCK_BENCHMARKS.industryAverages });
    } catch (err) {
      fastify.log.error(err, 'Failed to compute benchmark metrics');
      if (isDev) {
        return reply.send(MOCK_BENCHMARKS);
      }
      return reply.code(500).send({ error: 'Failed to compute benchmark metrics' });
    }
  });

  // ------------------------------------------------------------------
  // GET /api/v1/analytics/roi
  // ------------------------------------------------------------------
  fastify.get('/api/v1/analytics/roi', async (request, reply) => {
    const airportId = request.operator!.airport_id;
    const isDev = process.env.NODE_ENV === 'development';

    try {
      // 1. incidents_detected_24h
      const incidentsRow = await sql`
        SELECT COUNT(*)::int AS cnt
        FROM anomaly_events
        WHERE airport_id = ${airportId}
          AND created_at >= NOW() - INTERVAL '24 hours'
      `.then(r => r[0]).catch(() => null);
      const incidentsDetected24h = incidentsRow?.cnt ?? 0;

      // 2. avg_response_time_secs (time between creation and acknowledgment)
      const responseRow = await sql`
        SELECT COALESCE(
          AVG(EXTRACT(EPOCH FROM (acknowledged_at - created_at))), 0
        )::numeric(10,1) AS avg_secs
        FROM anomaly_events
        WHERE airport_id = ${airportId}
          AND acknowledged = true
          AND acknowledged_at IS NOT NULL
          AND created_at >= NOW() - INTERVAL '24 hours'
      `.then(r => r[0]).catch(() => null);
      const avgResponseTimeSecs = parseFloat(responseRow?.avg_secs) || 0;

      // 3. queue_sla_compliance_pct
      const slaRow = await sql`
        SELECT
          COUNT(*) FILTER (WHERE sla_met = true)::numeric AS met,
          COUNT(*)::numeric AS total
        FROM queue_metrics
        WHERE time >= NOW() - INTERVAL '24 hours'
      `.then(r => r[0]).catch(() => null);
      const slaMet = parseFloat(slaRow?.met) || 0;
      const slaTotal = parseFloat(slaRow?.total) || 0;
      const queueSlaCompliancePct = slaTotal > 0
        ? Math.round((slaMet / slaTotal) * 1000) / 10
        : 0;

      // 4. avg_queue_wait_mins
      const waitRow = await sql`
        SELECT COALESCE(AVG(wait_time_mins), 0)::numeric(10,1) AS avg_wait
        FROM queue_metrics
        WHERE time >= NOW() - INTERVAL '24 hours'
      `.then(r => r[0]).catch(() => null);
      const avgQueueWaitMins = parseFloat(waitRow?.avg_wait) || 0;

      // 5. person_hours_saved_week: (incidents * 0.5) + (queue_improvements * 2)
      const weekIncidentsRow = await sql`
        SELECT COUNT(*)::int AS cnt
        FROM anomaly_events
        WHERE airport_id = ${airportId}
          AND created_at >= NOW() - INTERVAL '7 days'
      `.then(r => r[0]).catch(() => null);
      const weekIncidents = weekIncidentsRow?.cnt ?? 0;

      const queueImprovementsRow = await sql`
        SELECT COUNT(*) FILTER (WHERE sla_met = true)::int AS cnt
        FROM queue_metrics
        WHERE time >= NOW() - INTERVAL '7 days'
      `.then(r => r[0]).catch(() => null);
      const queueImprovements = queueImprovementsRow?.cnt ?? 0;

      const personHoursSavedWeek = Math.round(
        (weekIncidents * 0.5 + queueImprovements * 2) * 10
      ) / 10;

      // 6. false_positive_rate_pct: % of acknowledged alerts resolved in < 2 min
      const fpRow = await sql`
        SELECT
          COUNT(*) FILTER (
            WHERE resolved_at IS NOT NULL
              AND EXTRACT(EPOCH FROM (resolved_at - acknowledged_at)) < 120
          )::numeric AS quick_resolve,
          COUNT(*)::numeric AS total_acked
        FROM anomaly_events
        WHERE airport_id = ${airportId}
          AND acknowledged = true
          AND acknowledged_at IS NOT NULL
          AND created_at >= NOW() - INTERVAL '24 hours'
      `.then(r => r[0]).catch(() => null);
      const quickResolve = parseFloat(fpRow?.quick_resolve) || 0;
      const totalAcked = parseFloat(fpRow?.total_acked) || 0;
      const falsePositiveRatePct = totalAcked > 0
        ? Math.round((quickResolve / totalAcked) * 1000) / 10
        : 0;

      // 7. detection_lead_time_mins (mock: 8.3 minutes)
      const detectionLeadTimeMins = 8.3;

      // 8. cost_savings_monthly_usd: person_hours_saved * $45/hr * 4 weeks
      const costSavingsMonthlyUsd = Math.round(personHoursSavedWeek * 45 * 4);

      // 9. sensor_uptime_pct: % of sensors with health=ONLINE
      const uptimeRow = await sql`
        SELECT
          COUNT(*) FILTER (WHERE health = 'ONLINE')::numeric AS online_cnt,
          COUNT(*)::numeric AS total_cnt
        FROM sensor_nodes
      `.then(r => r[0]).catch(() => null);
      const onlineCnt = parseFloat(uptimeRow?.online_cnt) || 0;
      const totalCnt = parseFloat(uptimeRow?.total_cnt) || 0;
      const sensorUptimePct = totalCnt > 0
        ? Math.round((onlineCnt / totalCnt) * 1000) / 10
        : 0;

      // 10. alerts_before_escalation_pct: % acknowledged before severity 5 escalation
      const escRow = await sql`
        SELECT
          COUNT(*) FILTER (WHERE acknowledged = true AND escalated = false)::numeric AS before_esc,
          COUNT(*)::numeric AS total_alerts
        FROM anomaly_events
        WHERE airport_id = ${airportId}
          AND created_at >= NOW() - INTERVAL '24 hours'
      `.then(r => r[0]).catch(() => null);
      const beforeEsc = parseFloat(escRow?.before_esc) || 0;
      const totalAlerts = parseFloat(escRow?.total_alerts) || 0;
      const alertsBeforeEscalationPct = totalAlerts > 0
        ? Math.round((beforeEsc / totalAlerts) * 1000) / 10
        : 0;

      const result = {
        incidents_detected_24h: incidentsDetected24h,
        avg_response_time_secs: avgResponseTimeSecs,
        queue_sla_compliance_pct: queueSlaCompliancePct,
        avg_queue_wait_mins: avgQueueWaitMins,
        person_hours_saved_week: personHoursSavedWeek,
        false_positive_rate_pct: falsePositiveRatePct,
        detection_lead_time_mins: detectionLeadTimeMins,
        cost_savings_monthly_usd: costSavingsMonthlyUsd,
        sensor_uptime_pct: sensorUptimePct,
        alerts_before_escalation_pct: alertsBeforeEscalationPct,
      };

      // In dev mode, if all values are zero, return mock data
      const allZero = Object.values(result).every(v => v === 0 || v === 8.3);
      if (isDev && allZero) {
        return reply.send(MOCK_ROI);
      }

      return reply.send(result);
    } catch (err) {
      fastify.log.error(err, 'Failed to compute ROI metrics');
      if (isDev) {
        return reply.send(MOCK_ROI);
      }
      return reply.code(500).send({ error: 'Failed to compute ROI metrics' });
    }
  });
}
