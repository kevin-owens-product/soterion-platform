import { Worker, Job } from 'bullmq';
import sql from '../db/client.js';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const connection = {
  host: new URL(REDIS_URL).hostname || 'localhost',
  port: parseInt(new URL(REDIS_URL).port || '6379', 10),
};

// --------------------------------------------------------------------------
// Density Aggregation Worker
//
// Runs as a repeatable BullMQ job every 5 seconds.
// For each zone: COUNT tracks from track_objects in the last 5-second window.
// Calculate density_pct based on zone area capacity.
// INSERT into zone_density table.
// Update queue_metrics for checkpoint zones.
// --------------------------------------------------------------------------

const WINDOW_SECONDS = 5;
const DEFAULT_ZONE_CAPACITY = 100; // default max persons per zone

export function startDensityAggregator(): Worker {
  const worker = new Worker(
    'density-aggregation',
    async (_job: Job) => {
      const now = new Date();
      const windowStart = new Date(now.getTime() - WINDOW_SECONDS * 1000);

      // ---- Aggregate track counts per zone in the last 5s window ----
      const zoneCounts = await sql`
        SELECT
          t.zone_id,
          COUNT(DISTINCT t.track_id) AS track_count,
          AVG(t.dwell_secs) AS avg_dwell_secs,
          z.type AS zone_type,
          z.sla_wait_mins
        FROM track_objects t
        JOIN zones z ON z.id = t.zone_id
        WHERE t.time >= ${windowStart}
          AND t.time <= ${now}
        GROUP BY t.zone_id, z.type, z.sla_wait_mins
      `;

      if (zoneCounts.length === 0) {
        return { zones_processed: 0 };
      }

      // ---- Insert density snapshots ----
      for (const zc of zoneCounts) {
        const trackCount = parseInt(zc.track_count);
        const avgDwell = parseFloat(zc.avg_dwell_secs) || 0;
        const densityPct = Math.min(100, (trackCount / DEFAULT_ZONE_CAPACITY) * 100);

        await sql`
          INSERT INTO zone_density (time, zone_id, count, density_pct, avg_dwell_secs)
          VALUES (${now}, ${zc.zone_id}, ${trackCount}, ${densityPct}, ${avgDwell})
        `;

        // ---- Update queue_metrics for checkpoint/security zones ----
        if (zc.zone_type === 'security') {
          const slaWaitMins = parseInt(zc.sla_wait_mins) || 15;

          // Estimate wait time from dwell and queue depth
          // Simple model: wait_time = avg_dwell * (queue_depth / service_points)
          // Assume 3 service points per checkpoint
          const servicePoints = 3;
          const estimatedWaitMins = (avgDwell * trackCount) / (servicePoints * 60);

          // Throughput: tracks processed per hour extrapolated from 5s window
          const throughputPerHr = Math.round((trackCount / WINDOW_SECONDS) * 3600);

          const slaMet = estimatedWaitMins <= slaWaitMins;

          await sql`
            INSERT INTO queue_metrics (time, zone_id, queue_depth, wait_time_mins, throughput_per_hr, sla_met)
            VALUES (${now}, ${zc.zone_id}, ${trackCount}, ${estimatedWaitMins}, ${throughputPerHr}, ${slaMet})
          `;
        }
      }

      return { zones_processed: zoneCounts.length, timestamp: now.toISOString() };
    },
    {
      connection,
      concurrency: 1, // Single instance since this is a global aggregation
    },
  );

  worker.on('completed', (job) => {
    // Only log periodically to avoid noise (every 12th run = every minute)
    if (job.attemptsMade === 0 && parseInt(job.id?.split(':').pop() ?? '0') % 12 === 0) {
      console.log(`[DensityAggregator] Aggregation cycle completed`);
    }
  });

  worker.on('failed', (job, err) => {
    console.error(`[DensityAggregator] Job ${job?.id} failed:`, err.message);
  });

  return worker;
}
