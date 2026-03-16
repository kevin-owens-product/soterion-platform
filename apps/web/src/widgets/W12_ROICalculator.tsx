import { useState, useEffect, useCallback } from "react";
import { getROIMetrics, type ROIMetrics } from "@/lib/api";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(n: number, decimals = 1): string {
  return n.toFixed(decimals);
}

function fmtUsd(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function MetricCard({
  label,
  value,
  suffix,
  detail,
  color = "#f59e0b",
}: {
  label: string;
  value: string;
  suffix?: string;
  detail?: string;
  color?: string;
}) {
  return (
    <div className="rounded-lg border border-[#1a1a1a] bg-[#080808] p-4 flex flex-col justify-between">
      <span className="font-mono text-[9px] text-[#525252] tracking-widest uppercase block mb-2">
        {label}
      </span>
      <div className="flex items-baseline gap-1">
        <span className="font-display text-2xl leading-none" style={{ color }}>
          {value}
        </span>
        {suffix && (
          <span className="font-mono text-xs text-[#737373]">{suffix}</span>
        )}
      </div>
      {detail && (
        <span className="font-mono text-[9px] text-[#525252] mt-1 block">{detail}</span>
      )}
    </div>
  );
}

function ComparisonBar({
  label,
  soterionValue,
  manualValue,
  unit,
}: {
  label: string;
  soterionValue: number;
  manualValue: number;
  unit: string;
}) {
  const maxVal = Math.max(soterionValue, manualValue);
  const soterionPct = maxVal > 0 ? (soterionValue / maxVal) * 100 : 0;
  const manualPct = maxVal > 0 ? (manualValue / maxVal) * 100 : 0;

  return (
    <div className="space-y-1.5">
      <span className="font-mono text-[9px] text-[#525252] tracking-widest uppercase">{label}</span>
      <div className="flex items-center gap-3">
        <span className="font-mono text-[10px] text-[#f59e0b] w-16 shrink-0">SOTERION</span>
        <div className="flex-1 h-4 bg-[#1a1a1a] rounded-full overflow-hidden relative">
          <div
            className="h-full bg-[#f59e0b] rounded-full transition-all duration-700"
            style={{ width: `${soterionPct}%` }}
          />
        </div>
        <span className="font-mono text-xs text-[#d4d4d4] w-20 text-right">
          {fmt(soterionValue)} {unit}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-mono text-[10px] text-[#525252] w-16 shrink-0">MANUAL</span>
        <div className="flex-1 h-4 bg-[#1a1a1a] rounded-full overflow-hidden relative">
          <div
            className="h-full bg-[#525252] rounded-full transition-all duration-700"
            style={{ width: `${manualPct}%` }}
          />
        </div>
        <span className="font-mono text-xs text-[#737373] w-20 text-right">
          {fmt(manualValue)} {unit}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Widget
// ---------------------------------------------------------------------------

export function W12_ROICalculator({ collapsible = false }: { collapsible?: boolean }) {
  const [metrics, setMetrics] = useState<ROIMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(collapsible);

  const fetchMetrics = useCallback(async () => {
    try {
      const data = await getROIMetrics();
      setMetrics(data);
    } catch {
      // keep previous data on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 60_000);
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  const annualSavings = (metrics?.costSavingsMonthlyUsd ?? 0) * 12;
  // Assume ~$50k implementation cost for payback calculation
  const implCost = 50_000;
  const paybackMonths = metrics?.costSavingsMonthlyUsd
    ? Math.ceil(implCost / metrics.costSavingsMonthlyUsd)
    : 0;

  // Soterion detection time vs manual (avg_response + detection_lead)
  const soterionDetectionMins = metrics
    ? (metrics.avgResponseTimeSecs / 60)
    : 0;
  const manualDetectionMins = metrics
    ? soterionDetectionMins + metrics.detectionLeadTimeMins
    : 0;

  if (collapsible) {
    return (
      <div className="rounded-lg border border-[#1a1a1a] bg-[#0e0e0e] overflow-hidden">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#111] transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] text-[#f59e0b] tracking-widest uppercase">
              ROI Calculator
            </span>
            {metrics && !collapsed && (
              <span className="font-mono text-xs text-[#22c55e]">
                Saving {fmtUsd(metrics.costSavingsMonthlyUsd)}/mo
              </span>
            )}
          </div>
          <svg
            className={`w-4 h-4 text-[#525252] transition-transform ${collapsed ? "" : "rotate-180"}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {!collapsed && (
          <div className="px-4 pb-4">
            <ROIContent
              metrics={metrics}
              loading={loading}
              annualSavings={annualSavings}
              paybackMonths={paybackMonths}
              soterionDetectionMins={soterionDetectionMins}
              manualDetectionMins={manualDetectionMins}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[#1a1a1a] bg-[#0e0e0e] p-4 space-y-5">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] text-[#f59e0b] tracking-widest uppercase">
          ROI Calculator
        </span>
        <span className="text-[9px] font-mono text-[#525252]">
          Live metrics - refreshes every 60s
        </span>
      </div>
      <ROIContent
        metrics={metrics}
        loading={loading}
        annualSavings={annualSavings}
        paybackMonths={paybackMonths}
        soterionDetectionMins={soterionDetectionMins}
        manualDetectionMins={manualDetectionMins}
      />
    </div>
  );
}

function ROIContent({
  metrics,
  loading,
  annualSavings,
  paybackMonths,
  soterionDetectionMins,
  manualDetectionMins,
}: {
  metrics: ROIMetrics | null;
  loading: boolean;
  annualSavings: number;
  paybackMonths: number;
  soterionDetectionMins: number;
  manualDetectionMins: number;
}) {
  if (loading || !metrics) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-pulse font-mono text-sm text-[#525252]">
          Computing ROI metrics...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Headline number */}
      <div className="text-center py-3 rounded-lg border border-[#f59e0b]/20 bg-[#f59e0b]/5">
        <span className="font-mono text-[10px] text-[#f59e0b] tracking-widest uppercase block mb-1">
          Estimated Monthly Savings
        </span>
        <span className="font-display text-5xl text-[#f59e0b]">
          {fmtUsd(metrics.costSavingsMonthlyUsd)}
        </span>
      </div>

      {/* 2x3 Metrics Grid */}
      <div className="grid grid-cols-3 gap-3">
        <MetricCard
          label="Incidents Detected (24h)"
          value={String(metrics.incidentsDetected24h)}
          detail={metrics.incidentsDetected24h > 40 ? "Above avg" : "Normal range"}
          color="#f59e0b"
        />
        <MetricCard
          label="Avg Response Time"
          value={fmt(metrics.avgResponseTimeSecs)}
          suffix="sec"
          detail={metrics.avgResponseTimeSecs < 15 ? "Below 15s target" : "Above 15s target"}
          color={metrics.avgResponseTimeSecs < 15 ? "#22c55e" : "#f97316"}
        />
        <MetricCard
          label="Queue SLA Compliance"
          value={fmt(metrics.queueSlaCompliancePct)}
          suffix="%"
          detail={metrics.queueSlaCompliancePct >= 90 ? "Target met" : "Below 90% target"}
          color={metrics.queueSlaCompliancePct >= 90 ? "#22c55e" : "#ef4444"}
        />
        <MetricCard
          label="Person Hours Saved (week)"
          value={fmt(metrics.personHoursSavedWeek)}
          suffix="hrs"
          color="#f59e0b"
        />
        <MetricCard
          label="Detection Lead Time"
          value={fmt(metrics.detectionLeadTimeMins)}
          suffix="min"
          detail="Ahead of manual detection"
          color="#06b6d4"
        />
        <MetricCard
          label="Sensor Uptime"
          value={fmt(metrics.sensorUptimePct)}
          suffix="%"
          detail={metrics.sensorUptimePct >= 99 ? "Excellent" : "Needs attention"}
          color={metrics.sensorUptimePct >= 99 ? "#22c55e" : "#f97316"}
        />
      </div>

      {/* Comparison Bar: Soterion vs Manual */}
      <div className="rounded-lg border border-[#1a1a1a] bg-[#080808] p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="font-mono text-[10px] text-[#f59e0b] tracking-widest uppercase">
            Soterion vs Manual
          </span>
          <span className="text-[9px] font-mono text-[#525252]">Detection Speed Comparison</span>
        </div>
        <ComparisonBar
          label="Detection Time"
          soterionValue={soterionDetectionMins}
          manualValue={manualDetectionMins}
          unit="min"
        />
        <div className="mt-3 flex items-center gap-2">
          <svg className="w-4 h-4 text-[#22c55e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          <span className="font-mono text-xs text-[#22c55e]">
            {fmt(metrics.detectionLeadTimeMins)} min faster detection
          </span>
          <span className="font-mono text-[9px] text-[#525252] ml-1">
            ({fmt(metrics.alertsBeforeEscalationPct)}% resolved before escalation)
          </span>
        </div>
      </div>

      {/* ROI Projection */}
      <div className="rounded-lg border border-[#f59e0b]/20 bg-[#f59e0b]/5 p-4">
        <span className="font-mono text-[10px] text-[#f59e0b] tracking-widest uppercase block mb-3">
          ROI Projection
        </span>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <span className="font-display text-3xl text-[#d4d4d4] block">
              {fmtUsd(metrics.costSavingsMonthlyUsd)}
            </span>
            <span className="font-mono text-[9px] text-[#525252]">Monthly Savings</span>
          </div>
          <div className="text-center">
            <span className="font-display text-3xl text-[#22c55e] block">
              {fmtUsd(annualSavings)}
            </span>
            <span className="font-mono text-[9px] text-[#525252]">Annual Projection</span>
          </div>
          <div className="text-center">
            <span className="font-display text-3xl text-[#06b6d4] block">
              {paybackMonths}
            </span>
            <span className="font-mono text-[9px] text-[#525252]">Months to Payback</span>
          </div>
        </div>
        <div className="mt-3 text-[9px] font-mono text-[#525252] text-center">
          Based on {fmt(metrics.personHoursSavedWeek)} person-hours saved/week at $45/hr
          &middot; {fmt(metrics.falsePositiveRatePct)}% false positive rate
        </div>
      </div>
    </div>
  );
}
