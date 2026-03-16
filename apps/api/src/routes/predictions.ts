import { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth.js';
import sql from '../db/client.js';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

interface SurgePrediction {
  zone_id: string;
  zone_name: string;
  predicted_density_15m: number;
  predicted_density_30m: number;
  surge_risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  surge_eta_minutes: number | null;
  confidence: number;
  recommended_actions: string[];
  current_density_pct: number;
  current_count: number;
}

export default async function predictionRoutes(fastify: FastifyInstance): Promise<void> {
  // ==========================================================================
  // GET /api/v1/predictions/surge
  // Returns crowd surge predictions for all zones in the operator's facility.
  // ==========================================================================
  fastify.get('/api/v1/predictions/surge', {
    preHandler: authMiddleware,
  }, async (request, reply) => {
    const facilityId = request.operator!.airport_id;

    // Fetch all zones belonging to the operator's facility
    const zones = await sql`
      SELECT z.id, z.name
      FROM zones z
      JOIN terminals t ON t.id = z.terminal_id
      WHERE t.airport_id = ${facilityId}
      ORDER BY z.name
    `;

    if (zones.length === 0) {
      return reply.code(200).send({ predictions: [], generated_at: new Date().toISOString() });
    }

    const now = new Date();
    const hourOfDay = now.getHours();
    const dayOfWeek = (now.getDay() + 6) % 7; // JS Sunday=0 -> Python Monday=0

    const predictions: SurgePrediction[] = [];

    for (const zone of zones) {
      // Get latest density for this zone
      const latestDensity = await sql`
        SELECT count, density_pct
        FROM zone_density
        WHERE zone_id = ${zone.id}
        ORDER BY time DESC
        LIMIT 1
      `;

      // Get 24h historical average density
      const histAvg = await sql`
        SELECT COALESCE(AVG(density_pct), 0) AS avg_density
        FROM zone_density
        WHERE zone_id = ${zone.id}
          AND time >= NOW() - INTERVAL '24 hours'
      `;

      const currentDensityPct = latestDensity.length > 0
        ? parseFloat(latestDensity[0].density_pct) || 0
        : 0;
      const currentCount = latestDensity.length > 0
        ? latestDensity[0].count || 0
        : 0;
      const historicalAvgDensity = parseFloat(histAvg[0]?.avg_density) || 0;

      // Call ML service for prediction
      try {
        const mlResponse = await fetch(`${ML_SERVICE_URL}/predict/crowding`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            zone_id: zone.id,
            current_density_pct: currentDensityPct,
            current_count: currentCount,
            hour_of_day: hourOfDay,
            day_of_week: dayOfWeek,
            historical_avg_density: historicalAvgDensity,
          }),
          signal: AbortSignal.timeout(5000),
        });

        if (mlResponse.ok) {
          const mlData = await mlResponse.json();
          predictions.push({
            zone_id: zone.id,
            zone_name: zone.name,
            current_density_pct: currentDensityPct,
            current_count: currentCount,
            predicted_density_15m: mlData.predicted_density_15m,
            predicted_density_30m: mlData.predicted_density_30m,
            surge_risk: mlData.surge_risk,
            surge_eta_minutes: mlData.surge_eta_minutes,
            confidence: mlData.confidence,
            recommended_actions: mlData.recommended_actions,
          });
        } else {
          // ML service returned error -- fall back to local heuristic
          predictions.push(localFallbackPrediction(
            zone.id, zone.name, currentDensityPct, currentCount,
            hourOfDay, historicalAvgDensity,
          ));
        }
      } catch {
        // ML service unreachable -- use local fallback
        predictions.push(localFallbackPrediction(
          zone.id, zone.name, currentDensityPct, currentCount,
          hourOfDay, historicalAvgDensity,
        ));
      }
    }

    // Sort by risk severity (CRITICAL first)
    const riskOrder: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    predictions.sort((a, b) => (riskOrder[a.surge_risk] ?? 4) - (riskOrder[b.surge_risk] ?? 4));

    return reply.code(200).send({
      predictions,
      generated_at: new Date().toISOString(),
    });
  });
}

/**
 * Local fallback prediction when ML service is unavailable.
 * Mirrors the heuristic logic from the ML service.
 */
function localFallbackPrediction(
  zoneId: string,
  zoneName: string,
  density: number,
  count: number,
  hour: number,
  historicalAvg: number,
): SurgePrediction {
  const isPeakHour = (hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 19);
  const trendingUp = density > (historicalAvg + 15);

  let surgeRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
  let surgeEta: number | null = null;
  let confidence = 0.9;
  let actions: string[] = [];
  let predicted15m = density;
  let predicted30m = density;

  if (density > 85) {
    surgeRisk = 'CRITICAL';
    surgeEta = 0;
    confidence = 0.95;
    actions = ['Activate emergency flow protocol', 'Deploy crowd management team', 'Notify terminal operations'];
    predicted15m = Math.min(100, density + 3);
    predicted30m = Math.min(100, density + 1);
  } else if (density > 70 && trendingUp) {
    surgeRisk = 'HIGH';
    surgeEta = 10 + (85 - density) / 3;
    confidence = 0.82;
    actions = ['Open additional screening lanes', 'Redirect flow to alternate checkpoint', 'Alert shift supervisor'];
    predicted15m = Math.min(100, density + (density - historicalAvg) * 0.6);
    predicted30m = Math.min(100, density + (density - historicalAvg) * 1.0);
  } else if (density > 60 && isPeakHour) {
    surgeRisk = 'MEDIUM';
    surgeEta = 15 + (85 - density) / 2.5;
    confidence = 0.68;
    actions = ['Monitor closely', 'Pre-position staff at bottleneck zones'];
    predicted15m = Math.min(100, density + 5);
    predicted30m = Math.min(100, density + 10);
  } else {
    const drift = (historicalAvg - density) * 0.15;
    predicted15m = Math.max(0, Math.min(100, density + drift));
    predicted30m = Math.max(0, Math.min(100, density + drift * 2));
  }

  return {
    zone_id: zoneId,
    zone_name: zoneName,
    current_density_pct: density,
    current_count: count,
    predicted_density_15m: Math.round(predicted15m * 10) / 10,
    predicted_density_30m: Math.round(predicted30m * 10) / 10,
    surge_risk: surgeRisk,
    surge_eta_minutes: surgeEta !== null ? Math.round(surgeEta * 10) / 10 : null,
    confidence: Math.round(confidence * 100) / 100,
    recommended_actions: actions,
  };
}
