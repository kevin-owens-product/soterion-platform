import { Worker, Queue } from 'bullmq';
import sql from '../db/client.js';
import { parseBullMQConnection } from '../lib/redis.js';

const defaultConnection = parseBullMQConnection();

// ---------------------------------------------------------------------------
// Retention Purge Queue
// ---------------------------------------------------------------------------
// BullMQ cron job running nightly at 02:00 UTC.
// Queries retention_policies where auto_purge = true.
// For each policy: DELETE expired records and update last_purged_at.
// Logs purge results to audit_log.
// ---------------------------------------------------------------------------

export const retentionQueue = new Queue('retention-purge', {
  connection: defaultConnection,
  defaultJobOptions: {
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  },
});

// Allowed tables and their time columns (whitelist to prevent SQL injection)
const TABLE_TIME_COLUMNS: Record<string, string> = {
  track_objects: 'time',
  zone_density: 'time',
  queue_metrics: 'time',
  anomaly_events: 'created_at',
  operator_sessions: 'created_at',
  // audit_log: intentionally excluded — append-only, purge to cold storage instead
};

/**
 * Start the retention purge worker.
 */
export function startRetentionPurgeWorker(): Worker {
  const worker = new Worker(
    'retention-purge',
    async (job) => {
      job.log('Starting retention purge job');

      // Get all auto-purge policies
      const policies = await sql<{
        id: string;
        facility_id: string;
        data_type: string;
        retention_days: number;
      }[]>`
        SELECT id, facility_id, data_type, retention_days
        FROM retention_policies
        WHERE auto_purge = TRUE
      `;

      job.log(`Found ${policies.length} auto-purge policies`);

      const results: Array<{
        policy_id: string;
        data_type: string;
        deleted_count: number;
        error?: string;
      }> = [];

      for (const policy of policies) {
        const timeCol = TABLE_TIME_COLUMNS[policy.data_type];

        if (!timeCol) {
          job.log(`Skipping ${policy.data_type}: not in allowed table list`);
          results.push({
            policy_id: policy.id,
            data_type: policy.data_type,
            deleted_count: 0,
            error: 'Table not in allowed purge list',
          });
          continue;
        }

        const cutoff = new Date(Date.now() - policy.retention_days * 24 * 60 * 60 * 1000);

        try {
          // Check if table has a facility-scoping column
          const hasFacilityCol = ['anomaly_events'].includes(policy.data_type);
          let deleteQuery: string;
          let deleteParams: unknown[];

          if (hasFacilityCol) {
            deleteQuery = `DELETE FROM ${policy.data_type} WHERE ${timeCol} < $1 AND airport_id = $2`;
            deleteParams = [cutoff, policy.facility_id];
          } else {
            // For time-series tables without facility scoping, purge globally
            deleteQuery = `DELETE FROM ${policy.data_type} WHERE ${timeCol} < $1`;
            deleteParams = [cutoff];
          }

          const result = await sql.unsafe(deleteQuery, deleteParams as any[]);
          const deletedCount = result.count ?? 0;

          job.log(`Purged ${deletedCount} records from ${policy.data_type} (cutoff: ${cutoff.toISOString()})`);

          // Update last_purged_at
          await sql`
            UPDATE retention_policies
            SET last_purged_at = NOW()
            WHERE id = ${policy.id}
          `;

          results.push({
            policy_id: policy.id,
            data_type: policy.data_type,
            deleted_count: deletedCount,
          });

          // Log to audit_log
          await sql`
            INSERT INTO audit_log (
              actor_id, actor_email, actor_ip,
              action, resource_type, resource_id,
              after_state, outcome
            ) VALUES (
              NULL,
              'system:retention-purge',
              '127.0.0.1'::inet,
              'retention.purge',
              ${policy.data_type},
              ${policy.id}::uuid,
              ${JSON.stringify({
                retention_days: policy.retention_days,
                cutoff: cutoff.toISOString(),
                deleted_count: deletedCount,
              })}::jsonb,
              'SUCCESS'
            )
          `.catch((err) => {
            job.log(`Failed to write audit log for purge: ${err.message}`);
          });
        } catch (err: any) {
          job.log(`Error purging ${policy.data_type}: ${err.message}`);
          results.push({
            policy_id: policy.id,
            data_type: policy.data_type,
            deleted_count: 0,
            error: err.message,
          });
        }
      }

      return { purged: results.length, results };
    },
    { connection: defaultConnection },
  );

  worker.on('completed', (job, result) => {
    console.log(`[RetentionPurge] Job ${job.id} completed:`, result);
  });

  worker.on('failed', (job, err) => {
    console.error(`[RetentionPurge] Job ${job?.id} failed:`, err.message);
  });

  return worker;
}

/**
 * Schedule the nightly retention purge job.
 * Runs at 02:00 UTC every day.
 */
export async function scheduleRetentionPurge(): Promise<void> {
  await retentionQueue.add(
    'nightly-purge',
    {},
    {
      repeat: {
        pattern: '0 2 * * *', // 02:00 UTC daily
      },
      jobId: 'retention-purge-nightly',
    },
  );
}
