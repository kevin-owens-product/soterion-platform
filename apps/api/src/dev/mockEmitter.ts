import sql from '../db/client.js';
import { redis } from '../lib/redis.js';

const AIRPORT_ID = 'a0000000-0000-4000-8000-000000000001';
const ZONE_IDS = [
  'c0000000-0000-4000-8000-000000000001',
  'c0000000-0000-4000-8000-000000000002',
  'c0000000-0000-4000-8000-000000000003',
  'c0000000-0000-4000-8000-000000000004',
  'c0000000-0000-4000-8000-000000000005',
];
const OPERATOR_IDS = [
  'e0000000-0000-4000-8000-000000000001',
  'e0000000-0000-4000-8000-000000000002',
  'e0000000-0000-4000-8000-000000000003',
];
const ANOMALY_TYPES = ['LOITERING', 'CROWD_SURGE', 'INTRUSION', 'ABANDONED_OBJECT', 'PERIMETER_BREACH'];

// Track current density per zone for smooth random walk
const currentDensity: Record<string, number> = {};
ZONE_IDS.forEach(id => { currentDensity[id] = 30 + Math.random() * 40; });

const timers: NodeJS.Timeout[] = [];

// Update zone density every 5 seconds
function emitZoneDensity() {
  const timer = setInterval(async () => {
    try {
      for (const zoneId of ZONE_IDS) {
        // Random walk: +/- 5%
        const delta = (Math.random() - 0.5) * 10;
        currentDensity[zoneId] = Math.max(5, Math.min(95, currentDensity[zoneId] + delta));
        const density = currentDensity[zoneId];
        const count = Math.round(density * 1.5);

        await sql`
          INSERT INTO zone_density (time, zone_id, count, density_pct, avg_dwell_secs)
          VALUES (NOW(), ${zoneId}::uuid, ${count}, ${Math.round(density * 10) / 10}, ${30 + Math.random() * 120})
        `;
      }
    } catch (err) {
      console.warn('[MockEmitter] Zone density error:', (err as Error).message);
    }
  }, 5000);
  timers.push(timer);
}

// Generate random anomaly event every 30-90 seconds
function emitAnomalyEvents() {
  const scheduleNext = () => {
    const delay = 30000 + Math.random() * 60000; // 30-90s
    const timer = setTimeout(async () => {
      try {
        const zoneId = ZONE_IDS[Math.floor(Math.random() * ZONE_IDS.length)];
        const type = ANOMALY_TYPES[Math.floor(Math.random() * ANOMALY_TYPES.length)];
        const severity = Math.floor(Math.random() * 4) + 1; // 1-4, occasionally 5
        const confidence = 0.7 + Math.random() * 0.28;

        const result = await sql`
          INSERT INTO anomaly_events (airport_id, zone_id, type, severity, confidence, acknowledged, escalated)
          VALUES (${AIRPORT_ID}::uuid, ${zoneId}::uuid, ${type}, ${severity > 4 ? 5 : severity}, ${Math.round(confidence * 100) / 100}, false, false)
          RETURNING id, type, severity, confidence, zone_id, created_at
        `;

        if (result.length > 0) {
          const event = result[0];
          // Publish to Redis for WebSocket subscribers
          try {
            await redis.publish(`alerts:${AIRPORT_ID}`, JSON.stringify({
              type: 'new_alert',
              payload: {
                id: event.id,
                type: event.type,
                severity: event.severity,
                confidence: event.confidence,
                zoneId: event.zone_id,
                createdAt: event.created_at,
                acknowledged: false,
              },
            }));
          } catch { /* Redis might not be connected */ }

          console.log(`[MockEmitter] New alert: ${type} sev=${severity} zone=${zoneId.slice(-1)} conf=${(confidence*100).toFixed(0)}%`);
        }
      } catch (err) {
        console.warn('[MockEmitter] Anomaly error:', (err as Error).message);
      }
      scheduleNext(); // Schedule next event
    }, delay);
    timers.push(timer);
  };
  scheduleNext();
}

// Update queue metrics every 10 seconds (for checkpoint zone only)
function emitQueueMetrics() {
  const checkpointZone = ZONE_IDS[0]; // Security Checkpoint A
  const timer = setInterval(async () => {
    try {
      const density = currentDensity[checkpointZone] || 50;
      const depth = Math.round(density / 3);
      const waitMins = Math.round(depth * 0.8 * 10) / 10;
      const throughput = 180 + Math.round(Math.random() * 60);
      const slaMet = waitMins < 15;

      await sql`
        INSERT INTO queue_metrics (time, zone_id, queue_depth, wait_time_mins, throughput_per_hr, sla_met)
        VALUES (NOW(), ${checkpointZone}::uuid, ${depth}, ${waitMins}, ${throughput}, ${slaMet})
      `;
    } catch (err) {
      console.warn('[MockEmitter] Queue metrics error:', (err as Error).message);
    }
  }, 10000);
  timers.push(timer);
}

// Simulate periodic crowd surges for the prediction system to detect.
// Every 5-10 minutes, pick a random zone and ramp its density up to 80-90%
// over ~2 minutes, hold for 3-4 minutes at peak, then gradually reduce.
function emitSurgeSimulation() {
  const scheduleSurge = () => {
    const delay = 300_000 + Math.random() * 300_000; // 5-10 minutes
    const timer = setTimeout(() => {
      const zoneId = ZONE_IDS[Math.floor(Math.random() * ZONE_IDS.length)];
      const peakDensity = 80 + Math.random() * 10; // 80-90%
      const baselineDensity = currentDensity[zoneId];

      console.log(`[MockEmitter] SURGE starting: zone=${zoneId.slice(-1)} target=${peakDensity.toFixed(0)}% from=${baselineDensity.toFixed(0)}%`);

      // Phase 1: Ramp up over ~2 minutes (24 steps at 5s each)
      const rampUpSteps = 24;
      const rampIncrement = (peakDensity - baselineDensity) / rampUpSteps;
      let step = 0;

      const rampUpTimer = setInterval(() => {
        step++;
        currentDensity[zoneId] = Math.min(95, baselineDensity + rampIncrement * step + (Math.random() - 0.5) * 2);
        if (step >= rampUpSteps) {
          clearInterval(rampUpTimer);
          console.log(`[MockEmitter] SURGE peak reached: zone=${zoneId.slice(-1)} density=${currentDensity[zoneId].toFixed(0)}%`);

          // Phase 2: Hold at peak for 3-4 minutes (36-48 steps at 5s)
          const holdSteps = 36 + Math.floor(Math.random() * 12);
          let holdStep = 0;

          const holdTimer = setInterval(() => {
            holdStep++;
            // Small fluctuations around peak
            currentDensity[zoneId] = Math.min(95, peakDensity + (Math.random() - 0.5) * 4);
            if (holdStep >= holdSteps) {
              clearInterval(holdTimer);
              console.log(`[MockEmitter] SURGE declining: zone=${zoneId.slice(-1)}`);

              // Phase 3: Gradual decline back to normal over ~3 minutes (36 steps)
              const declineSteps = 36;
              const currentPeak = currentDensity[zoneId];
              const targetBaseline = 30 + Math.random() * 20; // 30-50% normal
              const declineIncrement = (currentPeak - targetBaseline) / declineSteps;
              let declineStep = 0;

              const declineTimer = setInterval(() => {
                declineStep++;
                currentDensity[zoneId] = Math.max(5, currentPeak - declineIncrement * declineStep + (Math.random() - 0.5) * 3);
                if (declineStep >= declineSteps) {
                  clearInterval(declineTimer);
                  console.log(`[MockEmitter] SURGE resolved: zone=${zoneId.slice(-1)} density=${currentDensity[zoneId].toFixed(0)}%`);
                }
              }, 5000);
              timers.push(declineTimer as unknown as NodeJS.Timeout);
            }
          }, 5000);
          timers.push(holdTimer as unknown as NodeJS.Timeout);
        }
      }, 5000);
      timers.push(rampUpTimer as unknown as NodeJS.Timeout);

      // Schedule next surge
      scheduleSurge();
    }, delay);
    timers.push(timer);
  };

  // Start the first surge after a shorter initial delay (1-2 minutes) for demo impact
  const initialTimer = setTimeout(() => {
    scheduleSurge();
    // Also trigger an immediate first surge so the demo is immediately interesting
    const zoneId = ZONE_IDS[Math.floor(Math.random() * ZONE_IDS.length)];
    currentDensity[zoneId] = 72 + Math.random() * 8; // Start at 72-80% immediately
    console.log(`[MockEmitter] SURGE initial seed: zone=${zoneId.slice(-1)} density=${currentDensity[zoneId].toFixed(0)}%`);
  }, 60_000 + Math.random() * 60_000);
  timers.push(initialTimer);
}

export function startMockEmitter(): void {
  console.log('[MockEmitter] Starting live demo data generation (NODE_ENV=development)');
  emitZoneDensity();
  emitAnomalyEvents();
  emitQueueMetrics();
  emitSurgeSimulation();
  console.log('[MockEmitter] Active: zone density (5s), anomaly events (30-90s), queue metrics (10s), surge simulation (5-10m)');
}

export function stopMockEmitter(): void {
  timers.forEach(t => { clearTimeout(t); clearInterval(t); });
  timers.length = 0;
  console.log('[MockEmitter] Stopped');
}
