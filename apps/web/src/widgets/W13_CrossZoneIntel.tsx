import { useQuery } from "@tanstack/react-query";
import { getFlowAnomalies, type FlowAnomaly } from "@/lib/api";

const SEVERITY_CONFIG: Record<
  string,
  { bg: string; border: string; text: string; badge: string; pulse: boolean }
> = {
  CRITICAL: {
    bg: "bg-[#ef4444]/10",
    border: "border-[#ef4444]/40",
    text: "text-[#ef4444]",
    badge: "bg-[#ef4444] text-white",
    pulse: true,
  },
  HIGH: {
    bg: "bg-[#f97316]/10",
    border: "border-[#f97316]/40",
    text: "text-[#f97316]",
    badge: "bg-[#f97316] text-white",
    pulse: false,
  },
  MEDIUM: {
    bg: "bg-[#f59e0b]/10",
    border: "border-[#f59e0b]/30",
    text: "text-[#f59e0b]",
    badge: "bg-[#f59e0b]/20 text-[#f59e0b]",
    pulse: false,
  },
  LOW: {
    bg: "bg-[#0e0e0e]",
    border: "border-[#1a1a1a]",
    text: "text-[#22c55e]",
    badge: "bg-[#22c55e]/15 text-[#22c55e]",
    pulse: false,
  },
};

const TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  WRONG_WAY_FLOW: {
    label: "Wrong-Way Flow",
    icon: "M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5",
  },
  UNUSUAL_DWELL: {
    label: "Unusual Dwell",
    icon: "M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  },
  PERIMETER_PROBE: {
    label: "Perimeter Probe",
    icon: "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z",
  },
};

function SeverityBadge({ severity }: { severity: string }) {
  const cfg = SEVERITY_CONFIG[severity] ?? SEVERITY_CONFIG.LOW;; if (!cfg) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${cfg.badge}`}
    >
      {cfg.pulse && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current" />
        </span>
      )}
      {severity}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  const info = TYPE_LABELS[type] ?? { label: type, icon: "" };
  return (
    <div className="flex items-center gap-1.5">
      {info.icon && (
        <svg
          className="w-3.5 h-3.5 text-[#f59e0b]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d={info.icon} />
        </svg>
      )}
      <span className="text-[10px] font-mono font-bold text-[#d4d4d4] uppercase tracking-wider">
        {info.label}
      </span>
    </div>
  );
}

function formatTime(ts: string): string {
  const d = new Date(ts);
  if (isNaN(d.getTime())) return "--:--";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function AnomalyCard({ anomaly }: { anomaly: FlowAnomaly }) {
  const sevCfg = SEVERITY_CONFIG[anomaly.severity] ?? SEVERITY_CONFIG.LOW;; if (!sevCfg) return null;

  return (
    <div
      className={`rounded-md border p-3 transition-all duration-300 ${sevCfg.bg} ${sevCfg.border} ${
        sevCfg.pulse ? "animate-pulse-slow" : ""
      }`}
    >
      {/* Top row: type + severity */}
      <div className="flex items-center justify-between mb-2">
        <TypeBadge type={anomaly.type} />
        <SeverityBadge severity={anomaly.severity} />
      </div>

      {/* Zones */}
      <div className="flex flex-wrap gap-1 mb-2">
        {anomaly.zones.map((zone) => (
          <span
            key={zone}
            className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#1a1a1a] text-[#d4d4d4] border border-[#252525]"
          >
            {zone}
          </span>
        ))}
      </div>

      {/* Description */}
      <p className="text-[10px] font-mono text-[#737373] leading-relaxed mb-2">
        {anomaly.description}
      </p>

      {/* Footer: confidence + time */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono text-[#525252]">
            Confidence:{" "}
            <span className={sevCfg.text}>
              {Math.round(anomaly.confidence * 100)}%
            </span>
          </span>
        </div>
        <span className="text-[9px] font-mono text-[#525252]">
          {formatTime(anomaly.detectedAt)}
        </span>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-2 p-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="bg-[#0e0e0e] border border-[#1a1a1a] rounded-md p-3 animate-pulse"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="h-3 w-28 bg-[#1a1a1a] rounded" />
            <div className="h-4 w-16 bg-[#1a1a1a] rounded" />
          </div>
          <div className="h-2 w-20 bg-[#1a1a1a] rounded mb-2" />
          <div className="h-3 w-full bg-[#1a1a1a] rounded mb-1" />
          <div className="h-3 w-3/4 bg-[#1a1a1a] rounded" />
        </div>
      ))}
    </div>
  );
}

function SummaryBanner({ anomalies }: { anomalies: FlowAnomaly[] }) {
  const critical = anomalies.filter((a) => a.severity === "CRITICAL").length;
  const high = anomalies.filter((a) => a.severity === "HIGH").length;
  const medium = anomalies.filter((a) => a.severity === "MEDIUM").length;

  if (critical === 0 && high === 0 && medium === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#1a1a1a]">
        <span className="relative flex h-2 w-2">
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#22c55e]" />
        </span>
        <span className="text-[10px] font-mono text-[#22c55e]">
          No cross-zone anomalies detected
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-3 py-2 border-b border-[#1a1a1a]">
      {critical > 0 && (
        <div className="flex items-center gap-1">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ef4444] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ef4444]" />
          </span>
          <span className="text-[10px] font-mono font-bold text-[#ef4444]">
            {critical} CRITICAL
          </span>
        </div>
      )}
      {high > 0 && (
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-[#f97316]" />
          <span className="text-[10px] font-mono font-bold text-[#f97316]">
            {high} HIGH
          </span>
        </div>
      )}
      {medium > 0 && (
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-[#f59e0b]" />
          <span className="text-[10px] font-mono text-[#f59e0b]">
            {medium} MEDIUM
          </span>
        </div>
      )}
    </div>
  );
}

export function W13_CrossZoneIntel() {
  const { data: anomalies, isLoading } = useQuery({
    queryKey: ["flow-anomalies"],
    queryFn: getFlowAnomalies,
    refetchInterval: 30_000,
  });

  const items = Array.isArray(anomalies) ? anomalies : [];

  return (
    <div className="flex flex-col h-full rounded-lg border border-soterion-border bg-soterion-surface overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1a1a]">
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-[#f59e0b]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
            />
          </svg>
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#d4d4d4]">
            Cross-Zone Intelligence
          </h3>
        </div>
        <span className="text-[9px] font-mono text-[#525252]">
          {items.length} anomal{items.length === 1 ? "y" : "ies"} | 30s refresh
        </span>
      </div>

      {/* Summary banner */}
      {!isLoading && <SummaryBanner anomalies={items} />}

      {/* Anomaly cards */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isLoading ? (
          <LoadingSkeleton />
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-20">
            <svg
              className="w-8 h-8 text-[#1a1a1a] mb-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
              />
            </svg>
            <p className="text-[10px] font-mono text-[#525252]">
              No cross-zone anomalies detected
            </p>
          </div>
        ) : (
          items.map((a, i) => <AnomalyCard key={`${a.type}-${i}`} anomaly={a} />)
        )}
      </div>
    </div>
  );
}
