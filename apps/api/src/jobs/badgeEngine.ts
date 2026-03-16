import { Worker, Job } from 'bullmq';
import sql from '../db/client.js';
import { publishBadgeUnlock, type BadgeUnlockPayload } from '../lib/redis.js';
import type { BadgeJobPayload } from './queues.js';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const connection = {
  host: new URL(REDIS_URL).hostname || 'localhost',
  port: parseInt(new URL(REDIS_URL).port || '6379', 10),
};

// --------------------------------------------------------------------------
// Badge criteria definitions
// Each badge has a key matching badge_definitions.key and a check function
// that queries the database to determine eligibility.
// --------------------------------------------------------------------------

interface BadgeCriteria {
  key: string;
  check: (operatorId: string, facilityId: string) => Promise<boolean>;
}

const BADGE_CRITERIA: BadgeCriteria[] = [
  {
    // FIRST_DETECT: has at least 1 acknowledged alert
    key: 'FIRST_DETECT',
    check: async (operatorId: string, facilityId: string): Promise<boolean> => {
      const result = await sql`
        SELECT COUNT(*) AS cnt
        FROM anomaly_events
        WHERE acknowledged_by = ${operatorId}
          AND airport_id = ${facilityId}
          AND acknowledged = true
      `;
      return parseInt(result[0].cnt) >= 1;
    },
  },
  {
    // SEVEN_DAY_STREAK: 7+ consecutive qualifying shifts (score > 750)
    key: 'SEVEN_DAY_STREAK',
    check: async (operatorId: string, _facilityId: string): Promise<boolean> => {
      const scores = await sql`
        SELECT total_score, shift_date
        FROM shift_scores
        WHERE operator_id = ${operatorId}
        ORDER BY shift_date DESC
        LIMIT 30
      `;

      let consecutive = 0;
      for (const row of scores) {
        if (parseFloat(row.total_score) > 750) {
          consecutive++;
        } else {
          break;
        }
      }
      return consecutive >= 7;
    },
  },
  {
    // FAST_RESPONDER: median acknowledge time < 60 seconds
    key: 'FAST_RESPONDER',
    check: async (operatorId: string, facilityId: string): Promise<boolean> => {
      const result = await sql`
        SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (
          ORDER BY EXTRACT(EPOCH FROM (acknowledged_at - created_at))
        ) AS median_ack_secs
        FROM anomaly_events
        WHERE acknowledged_by = ${operatorId}
          AND airport_id = ${facilityId}
          AND acknowledged = true
          AND acknowledged_at IS NOT NULL
      `;
      const median = parseFloat(result[0].median_ack_secs);
      // Only award if there are enough data points
      if (isNaN(median)) return false;
      return median < 60;
    },
  },
  {
    // ZERO_FALSE_POSITIVES: no false positives in last 30 days
    // We approximate "false positive" as events that were acknowledged but had confidence < 0.3
    key: 'ZERO_FALSE_POSITIVES',
    check: async (operatorId: string, facilityId: string): Promise<boolean> => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const result = await sql`
        SELECT COUNT(*) AS fp_count
        FROM anomaly_events
        WHERE acknowledged_by = ${operatorId}
          AND airport_id = ${facilityId}
          AND acknowledged = true
          AND confidence < 0.3
          AND created_at >= ${thirtyDaysAgo}
      `;
      // Also verify operator has acknowledged at least some alerts
      const totalResult = await sql`
        SELECT COUNT(*) AS total
        FROM anomaly_events
        WHERE acknowledged_by = ${operatorId}
          AND airport_id = ${facilityId}
          AND acknowledged = true
          AND created_at >= ${thirtyDaysAgo}
      `;
      const total = parseInt(totalResult[0].total);
      if (total < 5) return false; // need minimum activity
      return parseInt(result[0].fp_count) === 0;
    },
  },
  {
    // IRON_GRID: 100% sensor uptime for a full shift
    key: 'IRON_GRID',
    check: async (_operatorId: string, facilityId: string): Promise<boolean> => {
      const result = await sql`
        SELECT
          COUNT(*) AS total_sensors,
          COUNT(*) FILTER (WHERE health = 'ONLINE') AS online_sensors
        FROM sensor_nodes sn
        JOIN zones z ON z.id = sn.zone_id
        JOIN terminals t ON t.id = z.terminal_id
        WHERE t.airport_id = ${facilityId}
      `;
      const total = parseInt(result[0].total_sensors);
      const online = parseInt(result[0].online_sensors);
      return total > 0 && total === online;
    },
  },
  {
    // TOP_OF_WEEK: #1 on leaderboard this week
    key: 'TOP_OF_WEEK',
    check: async (operatorId: string, facilityId: string): Promise<boolean> => {
      // Find the start of the current week (Monday)
      const now = new Date();
      const dayOfWeek = now.getDay();
      const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - mondayOffset);
      weekStart.setHours(0, 0, 0, 0);

      const leaderboard = await sql`
        SELECT operator_id, SUM(total_score) AS weekly_total
        FROM shift_scores
        WHERE airport_id = ${facilityId}
          AND shift_date >= ${weekStart.toISOString().split('T')[0]}
        GROUP BY operator_id
        ORDER BY weekly_total DESC
        LIMIT 1
      `;

      if (leaderboard.length === 0) return false;
      return leaderboard[0].operator_id === operatorId;
    },
  },
];

// --------------------------------------------------------------------------
// Worker
// --------------------------------------------------------------------------

export function startBadgeEngine(): Worker {
  const worker = new Worker<BadgeJobPayload>(
    'badge-evaluation',
    async (job: Job<BadgeJobPayload>) => {
      const { operator_id, facility_id } = job.data;

      console.log(`[BadgeEngine] Evaluating badges for operator ${operator_id}`);

      const newlyEarned: string[] = [];

      for (const criteria of BADGE_CRITERIA) {
        try {
          // Check if badge already earned
          const existing = await sql`
            SELECT ob.id
            FROM operator_badges ob
            JOIN badge_definitions bd ON bd.id = ob.badge_id
            WHERE ob.operator_id = ${operator_id}
              AND bd.key = ${criteria.key}
          `;

          if (existing.length > 0) {
            continue; // Already earned, skip
          }

          // Check if criteria is met
          const earned = await criteria.check(operator_id, facility_id);
          if (!earned) continue;

          // Look up badge definition
          const badgeDef = await sql`
            SELECT id, key, name FROM badge_definitions WHERE key = ${criteria.key}
          `;

          if (badgeDef.length === 0) {
            console.warn(`[BadgeEngine] Badge definition not found for key: ${criteria.key}`);
            continue;
          }

          // INSERT into operator_badges
          await sql`
            INSERT INTO operator_badges (operator_id, badge_id, earned_at)
            VALUES (${operator_id}, ${badgeDef[0].id}, NOW())
            ON CONFLICT (operator_id, badge_id) DO NOTHING
          `;

          newlyEarned.push(criteria.key);

          // Publish badge unlock event via Redis pub/sub
          const unlockPayload: BadgeUnlockPayload = {
            operator_id,
            badge_key: badgeDef[0].key,
            badge_name: badgeDef[0].name,
            earned_at: new Date().toISOString(),
          };
          await publishBadgeUnlock(operator_id, unlockPayload);

          console.log(`[BadgeEngine] Badge earned: ${criteria.key} for operator ${operator_id}`);
        } catch (err) {
          console.error(`[BadgeEngine] Error checking badge ${criteria.key}:`, (err as Error).message);
        }
      }

      console.log(`[BadgeEngine] Job ${job.id} complete: ${newlyEarned.length} new badges`);

      return {
        operator_id,
        badges_evaluated: BADGE_CRITERIA.length,
        newly_earned: newlyEarned,
      };
    },
    {
      connection,
      concurrency: 2,
    },
  );

  worker.on('completed', (job) => {
    console.log(`[BadgeEngine] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[BadgeEngine] Job ${job?.id} failed:`, err.message);
  });

  return worker;
}
