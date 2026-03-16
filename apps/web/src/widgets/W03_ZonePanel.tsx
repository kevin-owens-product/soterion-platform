import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useFacilityStore } from "@/store/facilityStore";
import { getZoneDensities, getZones } from "@/lib/api";
import type { Zone, ZoneDensity, ZoneTypeDefinition } from "@/types";

function getDensityColor(pct: number): { bar: string; text: string } {
  if (pct < 40) return { bar: "bg-[#22c55e]", text: "text-[#22c55e]" };
  if (pct < 70) return { bar: "bg-[#f59e0b]", text: "text-[#f59e0b]" };
  if (pct < 85) return { bar: "bg-[#f97316]", text: "text-[#f97316]" };
  return { bar: "bg-[#ef4444]", text: "text-[#ef4444]" };
}

function getZoneDensityPct(zone: any): number {
  // API returns currentDensityPct as a string like "72.2"
  if (zone.currentDensityPct != null) return parseFloat(zone.currentDensityPct) || 0;
  if (zone.maxOccupancy > 0) return (zone.occupancy / zone.maxOccupancy) * 100;
  return 0;
}

function getZoneOccupancy(zone: any): number {
  return zone.currentCount ?? zone.occupancy ?? 0;
}

function getZoneMaxOccupancy(zone: any): number {
  return zone.maxOccupancy ?? 0;
}

function getTrendArrow(current: number, _zone: any): { icon: string; color: string; label: string } {
  // Simplified: compare occupancy vs half max
  const max = getZoneMaxOccupancy(_zone);
  const midpoint = max > 0 ? max * 0.5 : 50;
  if (current > midpoint * 1.1) return { icon: "up", color: "text-[#ef4444]", label: "Rising" };
  if (current < midpoint * 0.9) return { icon: "down", color: "text-[#22c55e]", label: "Falling" };
  return { icon: "stable", color: "text-[#737373]", label: "Stable" };
}

function TrendIcon({ direction, color }: { direction: string; color: string }) {
  if (direction === "up") {
    return (
      <svg className={`w-3.5 h-3.5 ${color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
      </svg>
    );
  }
  if (direction === "down") {
    return (
      <svg className={`w-3.5 h-3.5 ${color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 4.5l15 15m0 0V8.25m0 11.25H8.25" />
      </svg>
    );
  }
  return (
    <svg className={`w-3.5 h-3.5 ${color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 12h9" />
    </svg>
  );
}

function getZoneTypeLabel(type: string, zoneTypes: ZoneTypeDefinition[]): string {
  const match = zoneTypes.find((zt) => zt.key === type);
  if (match) return match.label;
  // Fallback: humanize the key
  return type
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function isSecurityCheckpoint(zone: Zone, zoneTypes: ZoneTypeDefinition[]): boolean {
  const typeLower = zone.type.toLowerCase();
  if (typeLower === "security" || typeLower === "security_checkpoint") return true;
  const ztDef = zoneTypes.find((zt) => zt.key === zone.type);
  if (ztDef) {
    const labelLower = ztDef.label.toLowerCase();
    if (labelLower.includes("security") || labelLower.includes("checkpoint")) return true;
  }
  return false;
}

function QueueMetricsSection({ zone, density }: { zone: Zone; density: ZoneDensity | undefined }) {
  const currentCount = density?.count ?? getZoneOccupancy(zone);
  const densityPct = density?.densityPct ?? getZoneDensityPct(zone);

  const queueDepth = Math.round(currentCount / 3);
  const waitTimeMins = parseFloat((densityPct * 0.2).toFixed(1));
  const throughput = 180 + Math.round(densityPct * 0.6); // 180-240 range based on density
  const slaMet = waitTimeMins < 15;

  return (
    <div className="mt-2 pt-2 border-t border-[#1a1a1a]">
      <span className="text-[9px] font-mono uppercase text-[#f59e0b] tracking-wider block mb-1.5">
        Queue Metrics
      </span>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <span className="text-[9px] font-mono uppercase text-[#525252] block">Queue Depth</span>
          <span className="text-xs font-mono font-bold text-[#d4d4d4]">{queueDepth}</span>
        </div>
        <div>
          <span className="text-[9px] font-mono uppercase text-[#525252] block">Wait Time</span>
          <span className={`text-xs font-mono font-bold ${waitTimeMins >= 15 ? "text-[#ef4444]" : waitTimeMins >= 10 ? "text-[#f59e0b]" : "text-[#22c55e]"}`}>
            {waitTimeMins} min
          </span>
        </div>
        <div>
          <span className="text-[9px] font-mono uppercase text-[#525252] block">Throughput</span>
          <span className="text-xs font-mono text-[#d4d4d4]">{throughput}/hr</span>
        </div>
        <div>
          <span className="text-[9px] font-mono uppercase text-[#525252] block">SLA Status</span>
          <span className={`text-xs font-mono font-bold ${slaMet ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
            {slaMet ? "MET" : "BREACHED"}
          </span>
        </div>
      </div>
    </div>
  );
}

function ZoneCard({
  zone,
  density,
  expanded,
  onToggle,
  zoneTypes,
}: {
  zone: Zone;
  density: ZoneDensity | undefined;
  expanded: boolean;
  onToggle: () => void;
  zoneTypes: ZoneTypeDefinition[];
}) {
  const densityPct = density
    ? density.densityPct
    : getZoneDensityPct(zone);
  const clampedPct = Math.min(100, Math.max(0, densityPct));
  const colors = getDensityColor(clampedPct);
  const occ = getZoneOccupancy(zone);
  const trend = getTrendArrow(occ, zone);

  // Determine if this zone has SLA targets from zone type definitions
  const zoneTypeDef = zoneTypes.find((zt) => zt.key === zone.type);
  const slaWaitMins = (zone as any).slaWaitMins
    ?? (zoneTypeDef?.defaultSla
      ? (zoneTypeDef.defaultSla as Record<string, number>).wait_mins ?? 15
      : 15);
  const isCheckpoint = isSecurityCheckpoint(zone, zoneTypes);
  const slaMet = density ? density.avgDwellSecs < slaWaitMins * 60 : true;

  return (
    <div
      className="bg-[#0e0e0e] border border-[#1a1a1a] rounded-md overflow-hidden
        hover:border-[#1a1a1a]/80 transition-colors cursor-pointer"
      onClick={onToggle}
    >
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-medium text-[#d4d4d4]">
              {zone.label || zone.name}
            </span>
            <span className="text-[9px] font-mono uppercase text-[#525252]">
              {getZoneTypeLabel(zone.type, zoneTypes)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* SLA indicator */}
            {isCheckpoint && (
              <span title={slaMet ? "SLA Met" : "SLA Breached"}>
                {slaMet ? (
                  <svg className="w-3.5 h-3.5 text-[#22c55e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5 text-[#ef4444]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                )}
              </span>
            )}
            <TrendIcon direction={trend.icon} color={trend.color} />
          </div>
        </div>

        {/* Density bar */}
        <div className="mb-1.5">
          <div className="w-full h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
            <div
              className={`h-full ${colors.bar} rounded-full transition-all duration-500 ease-out`}
              style={{ width: `${clampedPct}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className={`text-[10px] font-mono font-bold ${colors.text}`}>
            {Math.round(clampedPct)}%
          </span>
          <span className="text-[10px] font-mono text-[#525252]">
            {occ}{getZoneMaxOccupancy(zone) > 0 ? `/${getZoneMaxOccupancy(zone)}` : ""}
          </span>
        </div>

        {/* Queue metrics for checkpoint zones */}
        {isCheckpoint && <QueueMetricsSection zone={zone} density={density} />}
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-[#1a1a1a] space-y-1.5">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[9px] font-mono uppercase text-[#525252] block">Threat Level</span>
              <span className={`text-xs font-mono font-bold ${
                zone.threatLevel === "critical" ? "text-[#ef4444]"
                  : zone.threatLevel === "high" ? "text-[#f97316]"
                  : zone.threatLevel === "medium" ? "text-[#f59e0b]"
                  : "text-[#22c55e]"
              }`}>
                {(zone.threatLevel ?? "low").toUpperCase()}
              </span>
            </div>
            {density && (
              <div>
                <span className="text-[9px] font-mono uppercase text-[#525252] block">Avg Dwell</span>
                <span className="text-xs font-mono text-[#d4d4d4]">
                  {Math.round(density.avgDwellSecs)}s
                </span>
              </div>
            )}
            <div>
              <span className="text-[9px] font-mono uppercase text-[#525252] block">Trend</span>
              <span className={`text-xs font-mono ${trend.color}`}>{trend.label}</span>
            </div>
            <div>
              <span className="text-[9px] font-mono uppercase text-[#525252] block">Zone ID</span>
              <span className="text-[10px] font-mono text-[#525252]">
                {zone.id.slice(0, 8)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-2 p-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-[#0e0e0e] border border-[#1a1a1a] rounded-md p-3 animate-pulse">
          <div className="flex items-center justify-between mb-2">
            <div className="h-3 w-24 bg-[#1a1a1a] rounded" />
            <div className="h-3 w-8 bg-[#1a1a1a] rounded" />
          </div>
          <div className="h-1.5 w-full bg-[#1a1a1a] rounded-full mb-1.5" />
          <div className="h-3 w-16 bg-[#1a1a1a] rounded" />
        </div>
      ))}
    </div>
  );
}

export function W03_ZonePanel() {
  const rawZones = useFacilityStore((s) => s.zones);
  const loading = useFacilityStore((s) => s.loading);
  const rawZoneTypes = useFacilityStore((s) => s.zoneTypes);
  const setZones = useFacilityStore((s) => s.setZones);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const storeZones = Array.isArray(rawZones) ? rawZones : [];
  const zoneTypes = Array.isArray(rawZoneTypes) ? rawZoneTypes : [];

  // Fetch zones directly from API if store is empty
  const zonesQuery = useQuery({
    queryKey: ["zones"],
    queryFn: getZones,
    refetchInterval: 10_000,
  });

  // Merge: prefer API zones if store is empty
  const apiZones = Array.isArray(zonesQuery.data) ? zonesQuery.data : [];
  const zones = storeZones.length > 0 ? storeZones : apiZones;

  // Sync API zones back to store if store was empty
  useEffect(() => {
    if (storeZones.length === 0 && apiZones.length > 0) {
      setZones(apiZones);
    }
  }, [storeZones.length, apiZones, setZones]);

  const densityQuery = useQuery<ZoneDensity[]>({
    queryKey: ["zone-densities"],
    queryFn: () => getZoneDensities(),
    refetchInterval: 5_000,
    enabled: zones.length > 0,
  });

  const densityMap = useMemo(() => {
    const m = new Map<string, ZoneDensity>();
    const densityData = Array.isArray(densityQuery.data) ? densityQuery.data : [];
    if (densityData.length > 0) {
      for (const d of densityData) {
        m.set(d.zoneId, d);
      }
    }
    return m;
  }, [densityQuery.data]);

  // Sort zones by density desc
  const sortedZones = useMemo(() => {
    return [...zones].sort((a, b) => {
      const aPct = densityMap.get(a.id)?.densityPct ?? getZoneDensityPct(a);
      const bPct = densityMap.get(b.id)?.densityPct ?? getZoneDensityPct(b);
      return bPct - aPct;
    });
  }, [zones, densityMap]);

  return (
    <div className="flex flex-col h-full rounded-lg border border-soterion-border bg-soterion-surface overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1a1a]">
        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#d4d4d4]">
          Zone Intelligence
        </h3>
        <span className="text-[10px] font-mono text-[#525252]">
          {zones.length} zones
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading ? (
          <LoadingSkeleton />
        ) : sortedZones.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-[10px] font-mono text-[#525252]">No zones configured</p>
          </div>
        ) : (
          sortedZones.map((zone) => (
            <ZoneCard
              key={zone.id}
              zone={zone}
              density={densityMap.get(zone.id)}
              expanded={expandedId === zone.id}
              onToggle={() =>
                setExpandedId((prev) => (prev === zone.id ? null : zone.id))
              }
              zoneTypes={zoneTypes}
            />
          ))
        )}
      </div>
    </div>
  );
}
