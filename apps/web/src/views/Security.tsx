import { useMemo } from "react";
import { W10_IncidentReplay } from "@/widgets/W10_IncidentReplay";
import { W02_ThreatFeed } from "@/widgets/W02_ThreatFeed";
import { W13_CrossZoneIntel } from "@/widgets/W13_CrossZoneIntel";
import { W14_ResponsePlaybook } from "@/widgets/W14_ResponsePlaybook";
import { WidgetErrorBoundary } from "@/components/WidgetErrorBoundary";
import { useQuery } from "@tanstack/react-query";
import { getAlertStats } from "@/lib/api";
import type { AlertStats } from "@/types";

// ── Alert Stats Panel ────────────────────────────────────

function AlertStatsPanel() {
  const { data: apiStats, isLoading } = useQuery<AlertStats>({
    queryKey: ["alert-stats"],
    queryFn: getAlertStats,
    refetchInterval: 10_000,
  });

  const stats = {
    total: (apiStats?.totalOpen ?? 0) + (apiStats?.totalAcknowledged ?? 0),
    unacked: apiStats?.totalOpen ?? 0,
    critical: apiStats?.bySeverity?.critical ?? 0,
    high: apiStats?.bySeverity?.high ?? 0,
    medium: apiStats?.bySeverity?.medium ?? 0,
    low: apiStats?.bySeverity?.low ?? 0,
    resolved: apiStats?.totalResolvedToday ?? 0,
  } as { total: number; unacked: number; critical: number; high: number; medium: number; low: number; resolved: number };

  return (
    <div className="w-full h-full rounded-lg border border-soterion-border bg-soterion-surface p-3 flex flex-col">
      <span className="font-mono text-[10px] text-soterion-accent tracking-widest uppercase mb-3">
        Alert Statistics
      </span>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-2 flex-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded border border-soterion-border bg-soterion-bg px-2 py-1.5 animate-pulse">
              <div className="h-2 w-10 bg-[#1a1a1a] rounded mb-1" />
              <div className="h-5 w-6 bg-[#1a1a1a] rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 flex-1">
          <StatCard label="Total (24h)" value={stats.total} color="#d4d4d4" />
          <StatCard label="Unacked" value={stats.unacked} color="#ef4444" />
          <StatCard label="Critical" value={stats.critical} color="#ef4444" />
          <StatCard label="High" value={stats.high} color="#f97316" />
          <StatCard label="Medium" value={stats.medium} color="#f59e0b" />
          <StatCard label="Low" value={stats.low} color="#22c55e" />
        </div>
      )}

      <div className="mt-2 pt-2 border-t border-soterion-border">
        <div className="flex justify-between">
          <span className="font-mono text-[9px] text-gray-600">Resolved</span>
          <span className="font-mono text-[10px] text-soterion-ok">{stats.resolved}</span>
        </div>
        <div className="h-1.5 w-full bg-soterion-bg rounded-full overflow-hidden mt-1">
          <div
            className="h-full bg-soterion-ok rounded-full transition-all duration-500"
            style={{
              width: stats.total > 0 ? `${(stats.resolved / (stats.total + stats.resolved)) * 100}%` : "0%",
            }}
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded border border-soterion-border bg-soterion-bg px-2 py-1.5">
      <span className="font-mono text-[8px] text-gray-600 block">{label}</span>
      <span className="font-display text-xl leading-none" style={{ color }}>
        {value}
      </span>
    </div>
  );
}

// ── Response Time Panel ──────────────────────────────────

function ResponseTimePanel() {
  const metrics = useMemo(
    () => ({
      medianAckMs: 12400 + Math.floor(Math.random() * 5000),
      p95AckMs: 45000 + Math.floor(Math.random() * 15000),
      avgEscalationMs: 180000 + Math.floor(Math.random() * 60000),
      slaMetPct: 85 + Math.floor(Math.random() * 14),
    }),
    [],
  );

  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  return (
    <div className="w-full h-full rounded-lg border border-soterion-border bg-soterion-surface p-3 flex flex-col">
      <span className="font-mono text-[10px] text-soterion-accent tracking-widest uppercase mb-3">
        Response Metrics
      </span>

      <div className="space-y-3 flex-1">
        <ResponseMetric
          label="Median Ack Time"
          value={formatTime(metrics.medianAckMs)}
          target="< 15s"
          met={metrics.medianAckMs < 15000}
        />
        <ResponseMetric
          label="P95 Ack Time"
          value={formatTime(metrics.p95AckMs)}
          target="< 60s"
          met={metrics.p95AckMs < 60000}
        />
        <ResponseMetric
          label="Avg Escalation"
          value={formatTime(metrics.avgEscalationMs)}
          target="< 5m"
          met={metrics.avgEscalationMs < 300000}
        />
        <div className="pt-2 border-t border-soterion-border">
          <div className="flex justify-between mb-1">
            <span className="font-mono text-[9px] text-gray-600">SLA Compliance</span>
            <span
              className="font-mono text-[10px]"
              style={{ color: metrics.slaMetPct >= 95 ? "#22c55e" : metrics.slaMetPct >= 80 ? "#f59e0b" : "#ef4444" }}
            >
              {metrics.slaMetPct}%
            </span>
          </div>
          <div className="h-1.5 w-full bg-soterion-bg rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${metrics.slaMetPct}%`,
                backgroundColor:
                  metrics.slaMetPct >= 95 ? "#22c55e" : metrics.slaMetPct >= 80 ? "#f59e0b" : "#ef4444",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ResponseMetric({
  label,
  value,
  target,
  met,
}: {
  label: string;
  value: string;
  target: string;
  met: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <span className="font-mono text-[9px] text-gray-600 block">{label}</span>
        <span className="font-display text-lg leading-none text-gray-200">{value}</span>
      </div>
      <div className="text-right">
        <span className="font-mono text-[8px] text-gray-700 block">Target: {target}</span>
        <span
          className="font-mono text-[9px]"
          style={{ color: met ? "#22c55e" : "#ef4444" }}
        >
          {met ? "MET" : "MISS"}
        </span>
      </div>
    </div>
  );
}

// ── Security View ────────────────────────────────────────

export function Security() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl tracking-wider text-gray-100">
          SECURITY
        </h1>
        <span className="text-xs font-mono text-gray-500">
          Threat monitoring & incident management
        </span>
      </div>

      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: "repeat(12, 1fr)",
        }}
      >
        {/* W-10 Incident Replay - large, top area, 8 cols */}
        <div className="col-span-8" style={{ minHeight: "420px" }}>
          <WidgetErrorBoundary name="Incident Replay">
            <W10_IncidentReplay />
          </WidgetErrorBoundary>
        </div>

        {/* Right column: Alert Stats + Response Metrics */}
        <div className="col-span-4 flex flex-col gap-4">
          <div className="flex-1" style={{ minHeight: "200px" }}>
            <WidgetErrorBoundary name="Alert Statistics">
              <AlertStatsPanel />
            </WidgetErrorBoundary>
          </div>
          <div className="flex-1" style={{ minHeight: "200px" }}>
            <WidgetErrorBoundary name="Response Metrics">
              <ResponseTimePanel />
            </WidgetErrorBoundary>
          </div>
        </div>

        {/* W-13 Cross-Zone Intelligence + W-14 Response Playbook */}
        <div className="col-span-6" style={{ minHeight: "320px" }}>
          <WidgetErrorBoundary name="Cross-Zone Intelligence">
            <W13_CrossZoneIntel />
          </WidgetErrorBoundary>
        </div>
        <div className="col-span-6" style={{ minHeight: "320px" }}>
          <WidgetErrorBoundary name="Response Playbook">
            <W14_ResponsePlaybook />
          </WidgetErrorBoundary>
        </div>

        {/* W-02 Threat Feed - bottom, full width */}
        <div className="col-span-12" style={{ minHeight: "280px" }}>
          <WidgetErrorBoundary name="Threat Feed">
            <W02_ThreatFeed />
          </WidgetErrorBoundary>
        </div>
      </div>
    </div>
  );
}
