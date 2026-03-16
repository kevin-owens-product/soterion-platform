import { useEffect, useState } from "react";
import { W01_DigitalTwin } from "@/widgets/W01_DigitalTwin";
import { W02_ThreatFeed } from "@/widgets/W02_ThreatFeed";
import { W03_ZonePanel } from "@/widgets/W03_ZonePanel";
import { W04_Heatmap } from "@/widgets/W04_Heatmap";
import { W06_ShiftScorecard } from "@/widgets/W06_ShiftScorecard";
import { W08_FlowFunnel } from "@/widgets/W08_FlowFunnel";
import { W11_SurgePrediction } from "@/widgets/W11_SurgePrediction";
import { W12_ROICalculator } from "@/widgets/W12_ROICalculator";
import { WidgetErrorBoundary } from "@/components/WidgetErrorBoundary";
import { useMissions } from "@/hooks/useMissions";
import { useAlertsStore } from "@/store/alertsStore";
import { useFacilityStore } from "@/store/facilityStore";

function MissionsPanel() {
  const { activeMissions, completedCount, isLoading } = useMissions();

  return (
    <div className="rounded-lg border border-soterion-border bg-soterion-surface overflow-hidden h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1a1a]">
        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#d4d4d4]">
          Active Missions
        </h3>
        <span className="text-[10px] font-mono text-[#22c55e]">
          {completedCount} done
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-[#0e0e0e] border border-[#1a1a1a] rounded-md p-3 animate-pulse">
                <div className="h-3 w-32 bg-[#1a1a1a] rounded mb-2" />
                <div className="h-2 w-full bg-[#1a1a1a] rounded" />
              </div>
            ))}
          </div>
        ) : activeMissions.length === 0 ? (
          <div className="flex items-center justify-center h-20">
            <p className="text-[10px] font-mono text-[#525252]">All missions complete</p>
          </div>
        ) : (
          activeMissions.slice(0, 5).map((m) => {
            const pct = m.target > 0 ? (m.progress / m.target) * 100 : 0;
            return (
              <div key={m.id} className="bg-[#0e0e0e] border border-[#1a1a1a] rounded-md p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono text-[#d4d4d4]">{m.title}</span>
                  <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded ${
                    m.type === "daily" ? "bg-[#06b6d4]/10 text-[#06b6d4]"
                    : m.type === "weekly" ? "bg-[#f59e0b]/10 text-[#f59e0b]"
                    : "bg-[#f97316]/10 text-[#f97316]"
                  }`}>
                    {m.type}
                  </span>
                </div>
                <p className="text-[10px] font-mono text-[#525252] mb-2">{m.description}</p>
                <div className="w-full h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#f59e0b] rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[9px] font-mono text-[#525252]">
                    {m.progress}/{m.target}
                  </span>
                  <span className="text-[9px] font-mono text-[#f59e0b]">
                    +{m.xpReward} XP
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function OpsHeader() {
  const facility = useFacilityStore((s) => s.facility);
  const unacknowledgedCount = useAlertsStore((s) => s.unacknowledgedCount);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = now.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const dateStr = now.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="flex items-center justify-between px-4 py-3 rounded-lg border border-soterion-border bg-soterion-surface mb-4">
      <div className="flex items-center gap-4">
        <h1 className="font-display text-2xl tracking-wider text-gray-100">
          OPS CENTER
        </h1>
        <div className="h-6 w-px bg-[#1a1a1a]" />
        <span className="text-xs font-mono text-gray-400">
          {facility?.name ?? "London Heathrow T2"}
        </span>
      </div>
      <div className="flex items-center gap-4">
        {unacknowledgedCount > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#ef4444]/10 border border-[#ef4444]/30">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ef4444] opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#ef4444]" />
            </span>
            <span className="text-[10px] font-mono font-bold text-[#ef4444]">
              {unacknowledgedCount} ALERT{unacknowledgedCount !== 1 ? "S" : ""}
            </span>
          </div>
        )}
        <div className="text-right">
          <span className="text-sm font-mono text-soterion-accent tabular-nums block leading-none">
            {timeStr}
          </span>
          <span className="text-[9px] font-mono text-[#525252]">{dateStr}</span>
        </div>
      </div>
    </div>
  );
}

export function OpsCenter() {
  return (
    <div>
      <OpsHeader />

      {/* Widget grid: 12-column CSS grid */}
      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: "repeat(12, 1fr)",
          gridAutoRows: "minmax(0, auto)",
        }}
      >
        {/* Row 1: W-01 Digital Twin (wide) + W-02 Threat Feed (sidebar) */}
        <div className="col-span-8" style={{ minHeight: "360px" }}>
          <WidgetErrorBoundary name="Digital Twin">
            <W01_DigitalTwin />
          </WidgetErrorBoundary>
        </div>
        <div className="col-span-4" style={{ minHeight: "360px" }}>
          <WidgetErrorBoundary name="Threat Feed">
            <W02_ThreatFeed compact />
          </WidgetErrorBoundary>
        </div>

        {/* Row 2: W-11 Surge Prediction (prominent banner) + W-03 Zone Panel */}
        <div className="col-span-5" style={{ minHeight: "320px" }}>
          <WidgetErrorBoundary name="Surge Prediction">
            <W11_SurgePrediction />
          </WidgetErrorBoundary>
        </div>
        <div className="col-span-3" style={{ minHeight: "320px" }}>
          <WidgetErrorBoundary name="Zone Panel">
            <W03_ZonePanel />
          </WidgetErrorBoundary>
        </div>
        <div className="col-span-4" style={{ minHeight: "320px" }}>
          <WidgetErrorBoundary name="Heatmap">
            <W04_Heatmap />
          </WidgetErrorBoundary>
        </div>

        {/* Row 3: W-06 Shift Scorecard + W-08 Flow Funnel + Missions */}
        <div className="col-span-4" style={{ minHeight: "260px" }}>
          <WidgetErrorBoundary name="Shift Scorecard">
            <W06_ShiftScorecard />
          </WidgetErrorBoundary>
        </div>
        <div className="col-span-4" style={{ minHeight: "260px" }}>
          <WidgetErrorBoundary name="Flow Funnel">
            <W08_FlowFunnel />
          </WidgetErrorBoundary>
        </div>
        <div className="col-span-4" style={{ minHeight: "260px" }}>
          <WidgetErrorBoundary name="Missions">
            <MissionsPanel />
          </WidgetErrorBoundary>
        </div>
      </div>

      {/* ROI Calculator - collapsible at bottom */}
      <div className="mt-4">
        <WidgetErrorBoundary name="ROI Calculator">
          <W12_ROICalculator collapsible />
        </WidgetErrorBoundary>
      </div>
    </div>
  );
}
