import { useMemo, useState } from "react";
import { useSensorStatus } from "@/hooks/useSensorStatus";
import { useFacilityStore } from "@/store/facilityStore";
import type { SensorNode } from "@/types";

const statusConfig: Record<string, { dot: string; bg: string; label: string }> = {
  online: { dot: "bg-[#22c55e]", bg: "bg-[#22c55e]/5", label: "ONLINE" },
  degraded: { dot: "bg-[#f59e0b]", bg: "bg-[#f59e0b]/5", label: "DEGRADED" },
  offline: { dot: "bg-[#ef4444]", bg: "bg-[#ef4444]/5", label: "OFFLINE" },
  maintenance: { dot: "bg-[#06b6d4]", bg: "bg-[#06b6d4]/5", label: "MAINT" },
};

function formatPing(ts: string): string {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60_000) return "< 1m ago";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return "Offline";
}

function calculateUptime(sensor: SensorNode): number {
  // Simplified: online = 99.9, degraded = 95, offline = 0
  if (sensor.status === "online") return 99.9;
  if (sensor.status === "degraded") return 95.0;
  if (sensor.status === "maintenance") return 0;
  return 0;
}

function SensorCard({
  sensor,
  zoneName,
  expanded,
  onToggle,
}: {
  sensor: SensorNode;
  zoneName: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const cfg = statusConfig[sensor.status] ?? statusConfig["offline"]!;
  const uptime = calculateUptime(sensor);
  const isProblematic = sensor.status === "degraded" || sensor.status === "offline";

  return (
    <div
      className={`
        bg-[#0e0e0e] border rounded-md overflow-hidden cursor-pointer transition-colors
        ${isProblematic ? "border-[#1a1a1a] ring-1 ring-inset" : "border-[#1a1a1a]"}
        ${sensor.status === "offline" ? "ring-[#ef4444]/20" : ""}
        ${sensor.status === "degraded" ? "ring-[#f59e0b]/20" : ""}
        hover:border-[#1a1a1a]/80
      `}
      onClick={onToggle}
    >
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2 shrink-0">
              {sensor.status === "online" && (
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${cfg.dot} opacity-75`} />
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${cfg.dot}`} />
            </span>
            <span className="text-xs font-mono font-medium text-[#d4d4d4]">
              {sensor.model ? `${sensor.model}` : `Sensor`}
            </span>
          </div>
          <span className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded ${cfg.bg} ${
            sensor.status === "online" ? "text-[#22c55e]"
              : sensor.status === "degraded" ? "text-[#f59e0b]"
              : sensor.status === "offline" ? "text-[#ef4444]"
              : "text-[#06b6d4]"
          }`}>
            {cfg.label}
          </span>
        </div>

        <div className="flex items-center gap-3 text-[10px] font-mono text-[#737373]">
          <span>Zone: <span className="text-[#d4d4d4]">{zoneName}</span></span>
        </div>

        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] font-mono text-[#525252]">
            Uptime: <span className={`font-bold ${uptime >= 99 ? "text-[#22c55e]" : uptime >= 90 ? "text-[#f59e0b]" : "text-[#ef4444]"}`}>
              {uptime.toFixed(1)}%
            </span>
          </span>
          <span className="text-[10px] font-mono text-[#525252]">
            {formatPing(sensor.lastHeartbeat)}
          </span>
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-[#1a1a1a]">
          <div className="grid grid-cols-2 gap-y-1.5 gap-x-4">
            <div>
              <span className="text-[9px] font-mono uppercase text-[#525252] block">FPS</span>
              <span className="text-xs font-mono text-[#d4d4d4]">{sensor.fps}</span>
            </div>
            <div>
              <span className="text-[9px] font-mono uppercase text-[#525252] block">PPS</span>
              <span className="text-xs font-mono text-[#d4d4d4]">
                {sensor.pointsPerSecond > 1000
                  ? `${(sensor.pointsPerSecond / 1000).toFixed(1)}K`
                  : sensor.pointsPerSecond}
              </span>
            </div>
            <div>
              <span className="text-[9px] font-mono uppercase text-[#525252] block">Firmware</span>
              <span className="text-[10px] font-mono text-[#d4d4d4]">{sensor.firmware}</span>
            </div>
            <div>
              <span className="text-[9px] font-mono uppercase text-[#525252] block">ID</span>
              <span className="text-[10px] font-mono text-[#525252]">{sensor.id.slice(0, 8)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryBar({
  online,
  degraded,
  offline,
  total,
}: {
  online: number;
  degraded: number;
  offline: number;
  total: number;
}) {
  return (
    <div className="flex items-center gap-4 px-4 py-2.5 border-b border-[#1a1a1a]">
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-[#22c55e]" />
        <span className="text-[10px] font-mono text-[#d4d4d4]">
          <span className="font-bold">{online}</span> Online
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-[#f59e0b]" />
        <span className="text-[10px] font-mono text-[#d4d4d4]">
          <span className="font-bold">{degraded}</span> Degraded
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-[#ef4444]" />
        <span className="text-[10px] font-mono text-[#d4d4d4]">
          <span className="font-bold">{offline}</span> Offline
        </span>
      </div>
      <div className="ml-auto text-[10px] font-mono text-[#525252]">
        {total} total
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 p-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="bg-[#0e0e0e] border border-[#1a1a1a] rounded-md p-3 animate-pulse">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-2 w-2 bg-[#1a1a1a] rounded-full" />
            <div className="h-3 w-20 bg-[#1a1a1a] rounded" />
          </div>
          <div className="h-3 w-28 bg-[#1a1a1a] rounded mb-2" />
          <div className="h-3 w-16 bg-[#1a1a1a] rounded" />
        </div>
      ))}
    </div>
  );
}

export function W05_SensorGrid() {
  const { sensors, onlineCount, degradedCount, offlineCount, isLoading } = useSensorStatus();
  const rawZones = useFacilityStore((s) => s.zones);
  const zones = Array.isArray(rawZones) ? rawZones : [];
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const zoneMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const z of zones) {
      m.set(z.id, z.label || z.name);
    }
    return m;
  }, [zones]);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return sensors;
    return sensors.filter((s) => s.status === statusFilter);
  }, [sensors, statusFilter]);

  // Sort: offline first, then degraded, then online
  const sorted = useMemo(() => {
    const order: Record<string, number> = { offline: 0, degraded: 1, maintenance: 2, online: 3 };
    return [...filtered].sort(
      (a, b) => (order[a.status] ?? 4) - (order[b.status] ?? 4),
    );
  }, [filtered]);

  return (
    <div className="flex flex-col h-full rounded-lg border border-soterion-border bg-soterion-surface overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1a1a]">
        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#d4d4d4]">
          Sensor Network
        </h3>
        <div className="flex items-center gap-1">
          {["all", "online", "degraded", "offline"].map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-2 py-1 text-[9px] font-mono uppercase rounded transition-colors ${
                statusFilter === f
                  ? "bg-[#f59e0b]/10 text-[#f59e0b]"
                  : "text-[#525252] hover:text-[#737373]"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <SummaryBar
        online={onlineCount}
        degraded={degradedCount}
        offline={offlineCount}
        total={sensors.length}
      />

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <LoadingSkeleton />
        ) : sorted.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-[10px] font-mono text-[#525252]">No sensors found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 p-3">
            {sorted.map((sensor) => (
              <SensorCard
                key={sensor.id}
                sensor={sensor}
                zoneName={zoneMap.get(sensor.zoneId) ?? "Unknown"}
                expanded={expandedId === sensor.id}
                onToggle={() =>
                  setExpandedId((prev) => (prev === sensor.id ? null : sensor.id))
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
