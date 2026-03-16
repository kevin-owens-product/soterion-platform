import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAlerts } from "@/hooks/useAlerts";
import { escalateAlert, getZones } from "@/lib/api";
import { useFacilityStore } from "@/store/facilityStore";
import { useToastStore } from "@/store/toastStore";
import type { AnomalyEvent } from "@/types";

const severityConfig: Record<string, { color: string; bg: string; border: string; label: string }> = {
  critical: { color: "text-[#ef4444]", bg: "bg-[#ef4444]/10", border: "border-l-[#ef4444]", label: "CRITICAL" },
  high: { color: "text-[#f97316]", bg: "bg-[#f97316]/10", border: "border-l-[#f97316]", label: "HIGH" },
  medium: { color: "text-[#f59e0b]", bg: "bg-[#f59e0b]/10", border: "border-l-[#f59e0b]", label: "MEDIUM" },
  low: { color: "text-[#06b6d4]", bg: "bg-[#06b6d4]/10", border: "border-l-[#06b6d4]", label: "LOW" },
  info: { color: "text-[#737373]", bg: "bg-[#737373]/10", border: "border-l-[#737373]", label: "INFO" },
};

// Map numeric severity (1-5 from API) to string labels
const numericSeverityMap: Record<number, string> = {
  1: "info",
  2: "low",
  3: "medium",
  4: "high",
  5: "critical",
};

function normalizeSeverity(sev: string | number): string {
  if (typeof sev === "number") return numericSeverityMap[sev] ?? "low";
  return sev;
}

const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };

function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  if (isNaN(d.getTime())) return "--:--:--";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function formatAnomalyType(type: string): string {
  return type
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function AlertCard({
  alert,
  zoneName,
  onAcknowledge,
  onEscalate,
}: {
  alert: AnomalyEvent;
  zoneName: string;
  onAcknowledge: (id: string) => void;
  onEscalate: (id: string) => void;
}) {
  const sevKey = normalizeSeverity(alert.severity as string | number);
  const sev = severityConfig[sevKey] ?? severityConfig["low"]!;
  const isUnacked = !alert.acknowledgedBy && !(alert as any).acknowledged;
  const isCritical = sevKey === "critical" && isUnacked;

  return (
    <div
      className={`
        relative border-l-2 ${isUnacked ? sev.border : "border-l-[#1a1a1a]"}
        bg-[#0e0e0e] border border-[#1a1a1a] rounded-r-md p-3
        transition-all duration-200
        ${isUnacked ? "hover:bg-[#111111]" : "opacity-60"}
        ${isCritical ? "animate-pulse-subtle" : ""}
      `}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded ${sev.bg} ${sev.color}`}>
            {sev.label}
          </span>
          <span className="text-xs font-mono text-[#d4d4d4]">
            {formatAnomalyType(alert.type)}
          </span>
        </div>
        <span className="text-[10px] font-mono text-[#525252] shrink-0">
          {formatTimestamp(alert.timestamp ?? (alert as any).createdAt ?? "")}
        </span>
      </div>

      <div className="flex items-center gap-3 mb-2">
        <span className="text-[10px] font-mono text-[#737373]">
          Zone: <span className="text-[#d4d4d4]">{zoneName}</span>
        </span>
        <span className="text-[10px] font-mono text-[#737373]">
          Conf: <span className="text-[#d4d4d4]">{Math.round(alert.confidence * 100)}%</span>
        </span>
      </div>

      {alert.description && (
        <p className="text-[10px] font-mono text-[#525252] mb-2 line-clamp-2">
          {alert.description}
        </p>
      )}

      {isUnacked && (
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => onAcknowledge(alert.id)}
            className="px-2.5 py-1 text-[10px] font-mono font-medium uppercase tracking-wider
              bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20 rounded
              hover:bg-[#22c55e]/20 transition-colors"
          >
            ACK
          </button>
          <button
            onClick={() => onEscalate(alert.id)}
            className="px-2.5 py-1 text-[10px] font-mono font-medium uppercase tracking-wider
              bg-[#f97316]/10 text-[#f97316] border border-[#f97316]/20 rounded
              hover:bg-[#f97316]/20 transition-colors"
          >
            Escalate
          </button>
        </div>
      )}

      {!isUnacked && (
        <div className="flex items-center gap-1 pt-1">
          <svg className="w-3 h-3 text-[#22c55e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
          <span className="text-[10px] font-mono text-[#525252]">Acknowledged</span>
        </div>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-[#0e0e0e] border border-[#1a1a1a] rounded-md p-3 animate-pulse">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-4 w-16 bg-[#1a1a1a] rounded" />
            <div className="h-3 w-24 bg-[#1a1a1a] rounded" />
          </div>
          <div className="h-3 w-40 bg-[#1a1a1a] rounded mb-2" />
          <div className="h-3 w-32 bg-[#1a1a1a] rounded" />
        </div>
      ))}
    </div>
  );
}

export function W02_ThreatFeed({ compact = false }: { compact?: boolean }) {
  const { alerts, unacknowledged, acknowledge, isLoading } = useAlerts();
  const zones = useFacilityStore((s) => s.zones);
  const anomalyTypes = useFacilityStore((s) => s.anomalyTypes);
  const addToast = useToastStore((s) => s.addToast);
  const [filter, setFilter] = useState<"all" | "unacked">("all");

  const zonesArr = Array.isArray(zones) ? zones : [];
  const anomalyTypesArr = Array.isArray(anomalyTypes) ? anomalyTypes : [];

  // Fetch zones from API as fallback for zone name lookup
  const zonesQuery = useQuery({
    queryKey: ["zones"],
    queryFn: getZones,
    refetchInterval: 30_000,
  });
  const apiZonesArr = Array.isArray(zonesQuery.data) ? zonesQuery.data : [];
  const allZones = zonesArr.length > 0 ? zonesArr : apiZonesArr;

  const zoneMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const z of allZones) {
      m.set(z.id, z.label || z.name);
    }
    return m;
  }, [allZones]);

  const sorted = useMemo(() => {
    const source = filter === "unacked" ? unacknowledged : alerts;
    // Filter by facility-relevant anomaly types if configured
    const filtered = anomalyTypesArr.length > 0
      ? source.filter((a) => anomalyTypesArr.includes(a.type))
      : source;
    return [...filtered].sort((a, b) => {
      const sevA = normalizeSeverity(a.severity as string | number);
      const sevB = normalizeSeverity(b.severity as string | number);
      const sevDiff = (severityOrder[sevA] ?? 4) - (severityOrder[sevB] ?? 4);
      if (sevDiff !== 0) return sevDiff;
      const tsA = a.timestamp ?? (a as any).createdAt ?? "";
      const tsB = b.timestamp ?? (b as any).createdAt ?? "";
      return new Date(tsB).getTime() - new Date(tsA).getTime();
    });
  }, [alerts, unacknowledged, filter, anomalyTypesArr]);

  const handleEscalate = async (id: string) => {
    try {
      await escalateAlert(id);
      addToast({ type: "warning", title: "Alert escalated to supervisor" });
    } catch {
      addToast({ type: "error", title: "Failed to escalate alert" });
    }
  };

  const maxItems = compact ? 10 : 50;

  return (
    <div className="flex flex-col h-full rounded-lg border border-soterion-border bg-soterion-surface overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1a1a]">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#d4d4d4]">
            Threat Feed
          </h3>
          {unacknowledged.length > 0 && (
            <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase rounded bg-[#ef4444]/10 text-[#ef4444]">
              {unacknowledged.length} Unacked
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setFilter("all")}
            className={`px-2 py-1 text-[9px] font-mono uppercase rounded transition-colors ${
              filter === "all"
                ? "bg-[#f59e0b]/10 text-[#f59e0b]"
                : "text-[#525252] hover:text-[#737373]"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("unacked")}
            className={`px-2 py-1 text-[9px] font-mono uppercase rounded transition-colors ${
              filter === "unacked"
                ? "bg-[#ef4444]/10 text-[#ef4444]"
                : "text-[#525252] hover:text-[#737373]"
            }`}
          >
            Unacked
          </button>
        </div>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isLoading ? (
          <LoadingSkeleton />
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <svg className="w-8 h-8 text-[#1a1a1a] mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
            </svg>
            <p className="text-[10px] font-mono text-[#525252]">No active alerts</p>
          </div>
        ) : (
          sorted.slice(0, maxItems).map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              zoneName={zoneMap.get(alert.zoneId) ?? "Unknown Zone"}
              onAcknowledge={acknowledge}
              onEscalate={handleEscalate}
            />
          ))
        )}
      </div>
    </div>
  );
}
