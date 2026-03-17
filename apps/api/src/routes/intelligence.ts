import { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth.js';
import sql from '../db/client.js';

interface FlowAnomaly {
  type: 'WRONG_WAY_FLOW' | 'UNUSUAL_DWELL' | 'PERIMETER_PROBE';
  zones: string[];
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  detectedAt: string;
  confidence: number;
}

export default async function intelligenceRoutes(fastify: FastifyInstance): Promise<void> {
  // ==========================================================================
  // GET /api/v1/intelligence/flow-anomalies
  // Analyzes cross-zone track movement patterns to detect behavioral anomalies:
  //   - Wrong-way flow (density increasing in exit zones during entry hours)
  //   - Unusual dwell (zone density elevated for >10 min)
  //   - Perimeter probing (repeated brief entries to restricted zones)
  // ==========================================================================
  fastify.get('/api/v1/intelligence/flow-anomalies', {
    preHandler: authMiddleware,
  }, async (request, reply) => {
    const facilityId = request.operator!.airport_id;

    // Analyze zone_density trends for cross-zone anomalies
    const anomalies: FlowAnomaly[] = [];

    // Fetch all zones for the facility
    const zones = await sql`
      SELECT z.id, z.name, z.type
      FROM zones z
      JOIN terminals t ON t.id = z.terminal_id
      WHERE t.airport_id = ${facilityId}
      ORDER BY z.name
    `;

    if (zones.length === 0) {
      return reply.code(200).send({ anomalies: [], generated_at: new Date().toISOString() });
    }

    const now = new Date();
    const hourOfDay = now.getHours();

    for (const zone of zones) {
      // --- Wrong-Way Flow Detection ---
      // Look for exit-type zones with increasing density during entry hours (6-10am)
      if (
        (zone.type === 'baggage' || zone.type === 'curb') &&
        hourOfDay >= 6 && hourOfDay <= 10
      ) {
        const recentTrend = await sql`
          SELECT
            AVG(CASE WHEN time >= NOW() - INTERVAL '10 minutes' THEN density_pct END) AS recent_avg,
            AVG(CASE WHEN time < NOW() - INTERVAL '10 minutes' AND time >= NOW() - INTERVAL '30 minutes' THEN density_pct END) AS baseline_avg
          FROM zone_density
          WHERE zone_id = ${zone.id}
            AND time >= NOW() - INTERVAL '30 minutes'
        `;

        const recentAvg = parseFloat(recentTrend[0]?.recent_avg) || 0;
        const baselineAvg = parseFloat(recentTrend[0]?.baseline_avg) || 0;

        if (recentAvg > baselineAvg * 1.5 && recentAvg > 30) {
          const trackCount = await sql`
            SELECT COUNT(DISTINCT track_id) AS cnt
            FROM track_objects
            WHERE zone_id = ${zone.id}
              AND time >= NOW() - INTERVAL '10 minutes'
          `;
          anomalies.push({
            type: 'WRONG_WAY_FLOW',
            zones: [zone.name],
            severity: recentAvg > 60 ? 'HIGH' : 'MEDIUM',
            description: `Unusual reverse flow detected: ${trackCount[0]?.cnt ?? 0} tracks moving against expected direction in ${zone.name}`,
            detectedAt: now.toISOString(),
            confidence: Math.min(0.95, 0.6 + (recentAvg - baselineAvg) / 100),
          });
        }
      }

      // --- Unusual Dwell Detection ---
      // Zone density elevated above average for >10 minutes
      const dwellCheck = await sql`
        SELECT
          COUNT(*) AS elevated_count,
          AVG(density_pct) AS avg_density
        FROM zone_density
        WHERE zone_id = ${zone.id}
          AND time >= NOW() - INTERVAL '15 minutes'
          AND density_pct > (
            SELECT COALESCE(AVG(density_pct), 0) * 1.5
            FROM zone_density
            WHERE zone_id = ${zone.id}
              AND time >= NOW() - INTERVAL '24 hours'
          )
      `;

      const elevatedCount = parseInt(dwellCheck[0]?.elevated_count) || 0;
      const avgDensity = parseFloat(dwellCheck[0]?.avg_density) || 0;

      // zone_density is sampled every ~5s, so 120 samples = 10 minutes
      if (elevatedCount >= 120 && avgDensity > 40) {
        const historicalAvg = await sql`
          SELECT COALESCE(AVG(density_pct), 0) AS avg
          FROM zone_density
          WHERE zone_id = ${zone.id}
            AND time >= NOW() - INTERVAL '24 hours'
        `;
        const histAvg = parseFloat(historicalAvg[0]?.avg) || 0;

        anomalies.push({
          type: 'UNUSUAL_DWELL',
          zones: [zone.name],
          severity: avgDensity > 75 ? 'HIGH' : 'MEDIUM',
          description: `${zone.name} density elevated >10min above normal (${Math.round(avgDensity)}% vs ${Math.round(histAvg)}% avg)`,
          detectedAt: now.toISOString(),
          confidence: Math.min(0.98, 0.7 + elevatedCount / 1000),
        });
      }

      // --- Perimeter Probe Detection ---
      // Repeated brief entries (<30s dwell) to restricted zones
      if (zone.type === 'restricted') {
        const briefEntries = await sql`
          SELECT track_id, COUNT(*) AS entry_count
          FROM track_objects
          WHERE zone_id = ${zone.id}
            AND time >= NOW() - INTERVAL '1 hour'
            AND dwell_secs < 30
          GROUP BY track_id
          HAVING COUNT(*) >= 2
        `;

        if (briefEntries.length >= 2) {
          anomalies.push({
            type: 'PERIMETER_PROBE',
            zones: [zone.name],
            severity: 'CRITICAL',
            description: `${briefEntries.length} brief entries (<30s) to restricted zone in past hour from different tracks`,
            detectedAt: now.toISOString(),
            confidence: Math.min(0.97, 0.8 + briefEntries.length * 0.05),
          });
        }
      }
    }

    // Sort by severity: CRITICAL first
    const severityOrder: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    anomalies.sort((a, b) => (severityOrder[a.severity] ?? 4) - (severityOrder[b.severity] ?? 4));

    return reply.code(200).send({
      anomalies,
      generated_at: new Date().toISOString(),
    });
  });
}
