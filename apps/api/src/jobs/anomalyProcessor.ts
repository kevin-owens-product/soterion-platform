import { Worker, Job } from 'bullmq';
import sql from '../db/client.js';
import { publishAlert, type AlertPayload } from '../lib/redis.js';
import type { AnomalyJobPayload } from './queues.js';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

const connection = {
  host: new URL(REDIS_URL).hostname || 'localhost',
  port: parseInt(new URL(REDIS_URL).port || '6379', 10),
};

interface MLPrediction {
  track_id: string;
  anomaly_type: string;
  severity: number;
  confidence: number;
}

interface MLResponse {
  predictions: MLPrediction[];
}

export function startAnomalyProcessor(): Worker {
  const worker = new Worker<AnomalyJobPayload>(
    'anomaly-processing',
    async (job: Job<AnomalyJobPayload>) => {
      const { sensor_id, facility_id, zone_id, timestamp, track_objects } = job.data;

      console.log(`[AnomalyProcessor] Processing batch: sensor=${sensor_id}, tracks=${track_objects.length}`);

      // ---- Call ML service for anomaly prediction ----
      let predictions: MLPrediction[] = [];
      try {
        const mlResponse = await fetch(`${ML_SERVICE_URL}/predict/anomaly`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sensor_id,
            zone_id,
            timestamp,
            tracks: track_objects.map((t) => ({
              track_id: t.track_id,
              centroid: t.centroid,
              classification: t.classification,
              velocity_ms: t.velocity_ms,
              behavior_score: t.behavior_score,
              dwell_secs: t.dwell_secs,
            })),
          }),
          signal: AbortSignal.timeout(10_000), // 10s timeout
        });

        if (mlResponse.ok) {
          const data = (await mlResponse.json()) as MLResponse;
          predictions = data.predictions ?? [];
        } else {
          console.warn(`[AnomalyProcessor] ML service returned ${mlResponse.status}, skipping predictions`);
        }
      } catch (err) {
        // ML service errors should not fail the job - log and continue
        console.warn(`[AnomalyProcessor] ML service error (non-fatal):`, (err as Error).message);
      }

      // ---- Process predictions with confidence > 0.7 ----
      let anomaliesCreated = 0;
      const highConfidence = predictions.filter((p) => p.confidence > 0.7);

      for (const prediction of highConfidence) {
        try {
          // Look up the airport_id from the facility context
          // The facility_id from the job payload maps to airport_id in our schema
          const airportId = facility_id;

          // INSERT into anomaly_events table (idempotent: use track_id + timestamp as dedup)
          const inserted = await sql`
            INSERT INTO anomaly_events (
              airport_id, zone_id, type, severity, confidence, track_ids, created_at
            ) VALUES (
              ${airportId},
              ${zone_id},
              ${prediction.anomaly_type},
              ${prediction.severity},
              ${prediction.confidence},
              ${sql.array([prediction.track_id])}::uuid[],
              ${new Date(timestamp)}
            )
            RETURNING id, created_at
          `;

          if (inserted.length > 0) {
            anomaliesCreated++;

            // Publish alert to Redis channel for real-time WebSocket push
            const alert: AlertPayload = {
              event_id: inserted[0].id,
              zone_id,
              type: prediction.anomaly_type,
              severity: prediction.severity,
              confidence: prediction.confidence,
              track_ids: [prediction.track_id],
              created_at: new Date(inserted[0].created_at).toISOString(),
            };

            await publishAlert(facility_id, alert);
          }
        } catch (err) {
          console.error(`[AnomalyProcessor] Failed to insert anomaly event:`, (err as Error).message);
        }
      }

      // ---- Update sensor last_ping_at ----
      try {
        await sql`
          UPDATE sensor_nodes
          SET last_ping_at = ${new Date(timestamp)}
          WHERE id = ${sensor_id}
        `;
      } catch (err) {
        console.warn(`[AnomalyProcessor] Failed to update sensor last_ping_at:`, (err as Error).message);
      }

      console.log(`[AnomalyProcessor] Job ${job.id} complete: ${anomaliesCreated} anomalies from ${highConfidence.length} high-confidence predictions`);

      return {
        sensor_id,
        predictions_total: predictions.length,
        high_confidence: highConfidence.length,
        anomalies_created: anomaliesCreated,
      };
    },
    {
      connection,
      concurrency: 5,
    },
  );

  worker.on('completed', (job) => {
    console.log(`[AnomalyProcessor] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[AnomalyProcessor] Job ${job?.id} failed:`, err.message);
  });

  return worker;
}
