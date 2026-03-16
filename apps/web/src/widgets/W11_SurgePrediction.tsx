import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSurgePredictions, type SurgePrediction } from "@/lib/api";

const RISK_CONFIG: Record<
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

function RiskBadge({ risk }: { risk: string }) {
  const cfg = RISK_CONFIG[risk] ?? RISK_CONFIG.LOW;
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
      {risk}
    </span>
  );
}

function EtaCountdown({ minutes }: { minutes: number | null }) {
  if (minutes === null) return null;
  if (minutes === 0) {
    return (
      <span className="text-[10px] font-mono font-bold text-[#ef4444] animate-pulse">
        NOW
      </span>
    );
  }
  return (
    <span className="text-[10px] font-mono font-bold text-[#f97316]">
      ETA {Math.round(minutes)}m
    </span>
  );
}

function DensityBar({
  current,
  predicted15,
  predicted30,
}: {
  current: number;
  predicted15: number;
  predicted30: number;
}) {
  const barColor =
    current > 85
      ? "bg-[#ef4444]"
      : current > 70
        ? "bg-[#f97316]"
        : current > 60
          ? "bg-[#f59e0b]"
          : "bg-[#22c55e]";

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className="text-[9px] font-mono text-[#525252] w-8">Now</span>
        <div className="flex-1 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
          <div
            className={`h-full ${barColor} rounded-full transition-all duration-700`}
            style={{ width: `${Math.min(100, current)}%` }}
          />
        </div>
        <span className="text-[10px] font-mono text-[#d4d4d4] w-10 text-right">
          {Math.round(current)}%
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[9px] font-mono text-[#525252] w-8">+15m</span>
        <div className="flex-1 h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#525252] rounded-full transition-all duration-700"
            style={{ width: `${Math.min(100, predicted15)}%` }}
          />
        </div>
        <span className="text-[9px] font-mono text-[#737373] w-10 text-right">
          {Math.round(predicted15)}%
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[9px] font-mono text-[#525252] w-8">+30m</span>
        <div className="flex-1 h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#525252]/60 rounded-full transition-all duration-700"
            style={{ width: `${Math.min(100, predicted30)}%` }}
          />
        </div>
        <span className="text-[9px] font-mono text-[#737373] w-10 text-right">
          {Math.round(predicted30)}%
        </span>
      </div>
    </div>
  );
}

function ActionsPanel({ actions }: { actions: string[] }) {
  const [expanded, setExpanded] = useState(false);

  if (actions.length === 0) return null;

  return (
    <div className="mt-2">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setExpanded(!expanded);
        }}
        className="text-[9px] font-mono uppercase tracking-wider text-[#f59e0b] hover:text-[#fbbf24] transition-colors flex items-center gap-1"
      >
        <svg
          className={`w-3 h-3 transition-transform ${expanded ? "rotate-90" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m9 5 7 7-7 7" />
        </svg>
        {actions.length} Recommended Action{actions.length !== 1 ? "s" : ""}
      </button>
      {expanded && (
        <ul className="mt-1.5 space-y-1 pl-4">
          {actions.map((action, i) => (
            <li
              key={i}
              className="text-[10px] font-mono text-[#d4d4d4] flex items-start gap-1.5"
            >
              <span className="text-[#f59e0b] mt-0.5 shrink-0">&#x2022;</span>
              {action}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PredictionCard({ prediction }: { prediction: SurgePrediction }) {
  const risk = prediction.surgeRisk;
  const cfg = RISK_CONFIG[risk] ?? RISK_CONFIG.LOW;

  return (
    <div
      className={`rounded-md border p-3 transition-all duration-300 ${cfg.bg} ${cfg.border} ${
        cfg.pulse ? "animate-pulse-slow" : ""
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-medium text-[#d4d4d4]">
            {prediction.zoneName}
          </span>
          <RiskBadge risk={risk} />
        </div>
        <div className="flex items-center gap-2">
          <EtaCountdown minutes={prediction.surgeEtaMinutes} />
          <span className="text-[9px] font-mono text-[#525252]">
            {Math.round(prediction.confidence * 100)}%
          </span>
        </div>
      </div>

      <DensityBar
        current={prediction.currentDensityPct}
        predicted15={prediction.predictedDensity_15m}
        predicted30={prediction.predictedDensity_30m}
      />

      <ActionsPanel actions={prediction.recommendedActions} />
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
          <div className="space-y-1">
            <div className="h-1.5 w-full bg-[#1a1a1a] rounded-full" />
            <div className="h-1 w-4/5 bg-[#1a1a1a] rounded-full" />
            <div className="h-1 w-3/5 bg-[#1a1a1a] rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function SurgeSummaryBanner({ predictions }: { predictions: SurgePrediction[] }) {
  const critical = predictions.filter((p) => p.surgeRisk === "CRITICAL").length;
  const high = predictions.filter((p) => p.surgeRisk === "HIGH").length;
  const medium = predictions.filter((p) => p.surgeRisk === "MEDIUM").length;

  if (critical === 0 && high === 0 && medium === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#1a1a1a]">
        <span className="relative flex h-2 w-2">
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#22c55e]" />
        </span>
        <span className="text-[10px] font-mono text-[#22c55e]">
          All zones nominal -- no surge risk detected
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

export function W11_SurgePrediction() {
  const { data: predictions, isLoading } = useQuery({
    queryKey: ["surge-predictions"],
    queryFn: getSurgePredictions,
    refetchInterval: 30_000,
  });

  const items = Array.isArray(predictions) ? predictions : [];

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
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#d4d4d4]">
            Surge Prediction
          </h3>
        </div>
        <span className="text-[9px] font-mono text-[#525252]">
          {items.length} zones | 30s refresh
        </span>
      </div>

      {/* Summary banner */}
      {!isLoading && items.length > 0 && (
        <SurgeSummaryBanner predictions={items} />
      )}

      {/* Prediction cards */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isLoading ? (
          <LoadingSkeleton />
        ) : items.length === 0 ? (
          <div className="flex items-center justify-center h-20">
            <p className="text-[10px] font-mono text-[#525252]">
              No zone data available
            </p>
          </div>
        ) : (
          items.map((p) => <PredictionCard key={p.zoneId} prediction={p} />)
        )}
      </div>
    </div>
  );
}
