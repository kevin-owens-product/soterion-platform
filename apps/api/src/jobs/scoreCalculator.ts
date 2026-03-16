import { Worker, Job } from 'bullmq';
import sql from '../db/client.js';
import { addBadgeJob, type ScoreJobPayload } from './queues.js';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const connection = {
  host: new URL(REDIS_URL).hostname || 'localhost',
  port: parseInt(new URL(REDIS_URL).port || '6379', 10),
};

// --------------------------------------------------------------------------
// Score formula from CLAUDE.md:
//
// total_score = (
//   security  * 0.30 +
//   flow      * 0.25 +
//   response  * 0.20 +
//   compliance * 0.15 +
//   uptime    * 0.10
// ) * streak_multiplier
//
// Each sub-score is on a 0-1000 scale.
// streak_multiplier = min(2.0, 1 + consecutive_qualifying_shifts * 0.05)
//   where qualifying = total_score > 750
// --------------------------------------------------------------------------

export function startScoreCalculator(): Worker {
  const worker = new Worker<ScoreJobPayload>(
    'score-calculation',
    async (job: Job<ScoreJobPayload>) => {
      const { operator_id, facility_id, shift_date, shift_start, shift_end } = job.data;

      console.log(`[ScoreCalculator] Calculating score: operator=${operator_id}, shift=${shift_date}`);

      const shiftStartDt = new Date(shift_start);
      const shiftEndDt = new Date(shift_end);

      // ================================================================
      // 1. SECURITY SCORE (threat_detection_rate, false_positive_rate)
      // ================================================================
      const alertStats = await sql`
        SELECT
          COUNT(*) FILTER (WHERE acknowledged = true) AS acknowledged_count,
          COUNT(*) AS total_alerts,
          COUNT(*) FILTER (WHERE severity >= 4 AND acknowledged = true) AS critical_acked,
          COUNT(*) FILTER (WHERE severity >= 4) AS critical_total
        FROM anomaly_events
        WHERE airport_id = ${facility_id}
          AND created_at >= ${shiftStartDt}
          AND created_at <= ${shiftEndDt}
      `;

      const stats = alertStats[0];
      const totalAlerts = parseInt(stats.total_alerts) || 0;
      const acknowledgedCount = parseInt(stats.acknowledged_count) || 0;
      const criticalTotal = parseInt(stats.critical_total) || 0;
      const criticalAcked = parseInt(stats.critical_acked) || 0;

      // threat_detection_rate: fraction of alerts acknowledged
      const threatDetectionRate = totalAlerts > 0 ? acknowledgedCount / totalAlerts : 1.0;
      // false_positive_rate: we approximate from escalated events that were resolved without action
      // For now, use a simplified version based on acknowledgement rate
      const falsePositiveRate = totalAlerts > 0 ? Math.max(0, 1 - threatDetectionRate) * 0.3 : 0;

      const securityScore = Math.round(
        (threatDetectionRate * 700 + (1 - falsePositiveRate) * 300)
      );

      // ================================================================
      // 2. FLOW SCORE (queue_sla_pct, throughput)
      // ================================================================
      const flowStats = await sql`
        SELECT
          COUNT(*) AS total_readings,
          COUNT(*) FILTER (WHERE sla_met = true) AS sla_met_count,
          AVG(throughput_per_hr) AS avg_throughput
        FROM queue_metrics qm
        JOIN zones z ON z.id = qm.zone_id
        JOIN terminals t ON t.id = z.terminal_id
        WHERE t.airport_id = ${facility_id}
          AND qm.time >= ${shiftStartDt}
          AND qm.time <= ${shiftEndDt}
      `;

      const flow = flowStats[0];
      const totalReadings = parseInt(flow.total_readings) || 0;
      const slaMetCount = parseInt(flow.sla_met_count) || 0;
      const queueSlaPct = totalReadings > 0 ? slaMetCount / totalReadings : 1.0;
      const avgThroughput = parseFloat(flow.avg_throughput) || 0;

      // Normalize throughput: assume 200/hr is excellent (1.0)
      const throughputNorm = Math.min(1.0, avgThroughput / 200);
      const flowScore = Math.round(queueSlaPct * 600 + throughputNorm * 400);

      // ================================================================
      // 3. RESPONSE SCORE (median and p95 acknowledge time)
      // ================================================================
      const responseStats = await sql`
        SELECT
          PERCENTILE_CONT(0.5) WITHIN GROUP (
            ORDER BY EXTRACT(EPOCH FROM (acknowledged_at - created_at))
          ) AS median_ack_secs,
          PERCENTILE_CONT(0.95) WITHIN GROUP (
            ORDER BY EXTRACT(EPOCH FROM (acknowledged_at - created_at))
          ) AS p95_ack_secs
        FROM anomaly_events
        WHERE airport_id = ${facility_id}
          AND created_at >= ${shiftStartDt}
          AND created_at <= ${shiftEndDt}
          AND acknowledged = true
          AND acknowledged_at IS NOT NULL
      `;

      const resp = responseStats[0];
      const medianAckSecs = parseFloat(resp.median_ack_secs) || 0;
      const p95AckSecs = parseFloat(resp.p95_ack_secs) || 0;

      // Scoring: 60s median = 1000, 300s = 0; p95: 120s = 1000, 600s = 0
      const medianNorm = Math.max(0, Math.min(1, 1 - (medianAckSecs - 60) / 240));
      const p95Norm = Math.max(0, Math.min(1, 1 - (p95AckSecs - 120) / 480));
      const responseScore = Math.round(medianNorm * 600 + p95Norm * 400);

      // ================================================================
      // 4. COMPLIANCE SCORE (required_actions_completed_pct)
      // ================================================================
      const complianceStats = await sql`
        SELECT
          COUNT(*) AS total_missions,
          COUNT(*) FILTER (WHERE completed = true) AS completed_missions
        FROM mission_progress mp
        JOIN missions m ON m.id = mp.mission_id
        WHERE mp.operator_id = ${operator_id}
          AND m.airport_id = ${facility_id}
          AND m.active = true
      `;

      const compliance = complianceStats[0];
      const totalMissions = parseInt(compliance.total_missions) || 0;
      const completedMissions = parseInt(compliance.completed_missions) || 0;
      const completionPct = totalMissions > 0 ? completedMissions / totalMissions : 1.0;
      const complianceScore = Math.round(completionPct * 1000);

      // ================================================================
      // 5. UPTIME SCORE (assigned_sensors_online_pct during shift)
      // ================================================================
      const uptimeStats = await sql`
        SELECT
          COUNT(*) AS total_sensors,
          COUNT(*) FILTER (WHERE health = 'ONLINE') AS online_sensors
        FROM sensor_nodes sn
        JOIN zones z ON z.id = sn.zone_id
        JOIN terminals t ON t.id = z.terminal_id
        WHERE t.airport_id = ${facility_id}
      `;

      const uptime = uptimeStats[0];
      const totalSensors = parseInt(uptime.total_sensors) || 0;
      const onlineSensors = parseInt(uptime.online_sensors) || 0;
      const uptimePct = totalSensors > 0 ? onlineSensors / totalSensors : 1.0;
      const uptimeScore = Math.round(uptimePct * 1000);

      // ================================================================
      // 6. STREAK MULTIPLIER
      // ================================================================
      const streakResult = await sql`
        SELECT total_score, shift_date
        FROM shift_scores
        WHERE operator_id = ${operator_id}
          AND shift_date < ${shift_date}
        ORDER BY shift_date DESC
        LIMIT 30
      `;

      let consecutiveQualifying = 0;
      for (const row of streakResult) {
        if (parseFloat(row.total_score) > 750) {
          consecutiveQualifying++;
        } else {
          break; // streak broken
        }
      }

      const streakMultiplier = Math.min(2.0, 1 + consecutiveQualifying * 0.05);

      // ================================================================
      // TOTAL SCORE
      // ================================================================
      const rawScore =
        securityScore * 0.30 +
        flowScore * 0.25 +
        responseScore * 0.20 +
        complianceScore * 0.15 +
        uptimeScore * 0.10;

      const totalScore = Math.round(rawScore * streakMultiplier);

      console.log(`[ScoreCalculator] Scores: security=${securityScore}, flow=${flowScore}, response=${responseScore}, compliance=${complianceScore}, uptime=${uptimeScore}, streak=${streakMultiplier.toFixed(2)}, total=${totalScore}`);

      // ================================================================
      // INSERT/UPDATE shift_scores
      // ================================================================
      await sql`
        INSERT INTO shift_scores (
          operator_id, airport_id, shift_date, shift_start, shift_end,
          total_score, security_score, flow_score, response_score,
          compliance_score, uptime_score, streak_multiplier
        ) VALUES (
          ${operator_id}, ${facility_id}, ${shift_date},
          ${shiftStartDt}, ${shiftEndDt},
          ${totalScore}, ${securityScore}, ${flowScore}, ${responseScore},
          ${complianceScore}, ${uptimeScore}, ${streakMultiplier}
        )
        ON CONFLICT (operator_id, shift_date)
        DO UPDATE SET
          total_score = EXCLUDED.total_score,
          security_score = EXCLUDED.security_score,
          flow_score = EXCLUDED.flow_score,
          response_score = EXCLUDED.response_score,
          compliance_score = EXCLUDED.compliance_score,
          uptime_score = EXCLUDED.uptime_score,
          streak_multiplier = EXCLUDED.streak_multiplier,
          shift_start = EXCLUDED.shift_start,
          shift_end = EXCLUDED.shift_end
      `;

      // ================================================================
      // Publish to badge-evaluation queue
      // ================================================================
      await addBadgeJob({
        operator_id,
        facility_id,
        shift_date,
        total_score: totalScore,
      });

      return {
        operator_id,
        shift_date,
        total_score: totalScore,
        security_score: securityScore,
        flow_score: flowScore,
        response_score: responseScore,
        compliance_score: complianceScore,
        uptime_score: uptimeScore,
        streak_multiplier: streakMultiplier,
      };
    },
    {
      connection,
      concurrency: 3,
    },
  );

  worker.on('completed', (job) => {
    console.log(`[ScoreCalculator] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[ScoreCalculator] Job ${job?.id} failed:`, err.message);
  });

  return worker;
}
