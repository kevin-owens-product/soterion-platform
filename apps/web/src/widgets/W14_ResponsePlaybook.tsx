import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPlaybooks, getAlerts, type Playbook, type PlaybookStep } from "@/lib/api";
import type { AnomalyEvent } from "@/types";

function formatEta(secs: number): string {
  if (secs === 0) return "Immediate";
  if (secs < 60) return `${secs}s`;
  if (secs < 3600) return `${Math.round(secs / 60)}m`;
  return `${(secs / 3600).toFixed(1)}h`;
}

function formatCountdown(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ── Escalation Countdown Timer ──────────────────────────

function EscalationTimer({
  escalationAfterSecs,
  escalationTo,
  startedAt,
}: {
  escalationAfterSecs: number;
  escalationTo: string;
  startedAt: string;
}) {
  const [remaining, setRemaining] = useState<number>(() => {
    const elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
    return Math.max(0, escalationAfterSecs - elapsed);
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
      setRemaining(Math.max(0, escalationAfterSecs - elapsed));
    }, 1000);
    return () => clearInterval(interval);
  }, [escalationAfterSecs, startedAt]);

  const isExpired = remaining <= 0;
  const isUrgent = remaining > 0 && remaining <= 60;

  return (
    <div
      className={`rounded border px-3 py-2 ${
        isExpired
          ? "border-[#ef4444]/40 bg-[#ef4444]/10"
          : isUrgent
            ? "border-[#f97316]/40 bg-[#f97316]/10"
            : "border-[#1a1a1a] bg-[#0e0e0e]"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg
            className={`w-3.5 h-3.5 ${
              isExpired ? "text-[#ef4444]" : isUrgent ? "text-[#f97316] animate-pulse" : "text-[#525252]"
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            />
          </svg>
          <span className="text-[9px] font-mono text-[#737373] uppercase tracking-wider">
            Escalation to {escalationTo}
          </span>
        </div>
        <span
          className={`text-sm font-mono font-bold ${
            isExpired ? "text-[#ef4444]" : isUrgent ? "text-[#f97316]" : "text-[#d4d4d4]"
          }`}
        >
          {isExpired ? "ESCALATED" : formatCountdown(remaining)}
        </span>
      </div>
    </div>
  );
}

// ── Step Timeline ───────────────────────────────────────

function StepItem({
  step,
  checked,
  onToggle,
}: {
  step: PlaybookStep;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-start gap-3 group">
      {/* Checkbox */}
      <button
        onClick={onToggle}
        className={`mt-0.5 shrink-0 w-4 h-4 rounded border transition-colors ${
          checked
            ? "bg-[#22c55e] border-[#22c55e]"
            : "border-[#525252] hover:border-[#737373]"
        }`}
      >
        {checked && (
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        )}
      </button>

      {/* Vertical line connector */}
      <div className="flex flex-col items-center shrink-0">
        {/* Auto/Manual icon */}
        {step.auto ? (
          <svg
            className="w-4 h-4 text-[#f59e0b]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-label="Automated step"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
          </svg>
        ) : (
          <svg
            className="w-4 h-4 text-[#06b6d4]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-label="Manual step"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.05 4.575a1.575 1.575 0 1 0-3.15 0v3.15M10.05 4.575a1.575 1.575 0 0 1 3.15 0v5.698M10.05 4.575V7.55m3.15-2.975V11.25m0 0a1.575 1.575 0 0 1 3.15 0v1.102m-3.15-1.102V4.575m3.15 7.777a1.575 1.575 0 0 1 3.15 0v.927M6.9 7.725a1.575 1.575 0 0 0-3.15 0v8.65a6.3 6.3 0 0 0 6.3 6.3h2.39a5.318 5.318 0 0 0 3.763-1.559l3.562-3.563a1.575 1.575 0 0 0 .003-2.228 1.574 1.574 0 0 0-1.228-.503h-.19"
            />
          </svg>
        )}
      </div>

      {/* Content */}
      <div className={`flex-1 pb-3 ${checked ? "opacity-50" : ""}`}>
        <div className="flex items-center justify-between">
          <span
            className={`text-[10px] font-mono ${
              checked ? "text-[#525252] line-through" : "text-[#d4d4d4]"
            }`}
          >
            {step.action}
          </span>
          <span className="text-[9px] font-mono text-[#525252] shrink-0 ml-2">
            {formatEta(step.etaSecs)}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[8px] font-mono text-[#525252] uppercase">
            Step {step.order}
          </span>
          <span
            className={`text-[8px] font-mono uppercase ${
              step.auto ? "text-[#f59e0b]" : "text-[#06b6d4]"
            }`}
          >
            {step.auto ? "AUTO" : "MANUAL"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Active Playbook Panel ───────────────────────────────

function ActivePlaybookPanel({
  playbook,
  alert,
}: {
  playbook: Playbook;
  alert: AnomalyEvent;
}) {
  const [checkedSteps, setCheckedSteps] = useState<Set<number>>(() => new Set());

  const toggleStep = (order: number) => {
    setCheckedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(order)) {
        next.delete(order);
      } else {
        next.add(order);
      }
      return next;
    });
  };

  const completedCount = checkedSteps.size;
  const totalSteps = playbook.steps.length;
  const progressPct = totalSteps > 0 ? (completedCount / totalSteps) * 100 : 0;

  const alertTime = alert.timestamp ?? (alert as any).createdAt ?? new Date().toISOString();

  return (
    <div className="space-y-3">
      {/* Playbook name + progress */}
      <div className="px-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono font-bold text-[#d4d4d4]">
            {playbook.name}
          </span>
          <span className="text-[9px] font-mono text-[#525252]">
            {completedCount}/{totalSteps} steps
          </span>
        </div>
        <div className="h-1 w-full bg-[#1a1a1a] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#22c55e] rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Escalation timer */}
      <div className="px-3">
        <EscalationTimer
          escalationAfterSecs={playbook.escalationAfterSecs}
          escalationTo={playbook.escalationTo}
          startedAt={alertTime}
        />
      </div>

      {/* Steps timeline */}
      <div className="px-3 space-y-0">
        {playbook.steps.map((step) => (
          <StepItem
            key={step.order}
            step={step}
            checked={checkedSteps.has(step.order)}
            onToggle={() => toggleStep(step.order)}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="px-3 pt-1 border-t border-[#1a1a1a]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <svg
              className="w-3 h-3 text-[#f59e0b]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
            </svg>
            <span className="text-[8px] font-mono text-[#525252]">Automated</span>
          </div>
          <div className="flex items-center gap-1">
            <svg
              className="w-3 h-3 text-[#06b6d4]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.05 4.575a1.575 1.575 0 1 0-3.15 0v3.15M10.05 4.575a1.575 1.575 0 0 1 3.15 0v5.698M10.05 4.575V7.55m3.15-2.975V11.25m0 0a1.575 1.575 0 0 1 3.15 0v1.102m-3.15-1.102V4.575m3.15 7.777a1.575 1.575 0 0 1 3.15 0v.927M6.9 7.725a1.575 1.575 0 0 0-3.15 0v8.65a6.3 6.3 0 0 0 6.3 6.3h2.39a5.318 5.318 0 0 0 3.763-1.559l3.562-3.563a1.575 1.575 0 0 0 .003-2.228 1.574 1.574 0 0 0-1.228-.503h-.19"
              />
            </svg>
            <span className="text-[8px] font-mono text-[#525252]">Manual</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── No Active Incident ──────────────────────────────────

function NoActiveIncident() {
  return (
    <div className="flex flex-col items-center justify-center h-40 text-center px-4">
      <svg
        className="w-10 h-10 text-[#1a1a1a] mb-3"
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
      <p className="text-[11px] font-mono text-[#525252]">
        No active incidents requiring response
      </p>
      <p className="text-[9px] font-mono text-[#3f3f3f] mt-1">
        Playbooks will activate automatically when alerts trigger
      </p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="p-3 space-y-3">
      <div className="h-4 w-40 bg-[#1a1a1a] rounded animate-pulse" />
      <div className="h-1 w-full bg-[#1a1a1a] rounded-full animate-pulse" />
      <div className="h-10 w-full bg-[#1a1a1a] rounded animate-pulse" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 animate-pulse">
          <div className="w-4 h-4 bg-[#1a1a1a] rounded shrink-0" />
          <div className="w-4 h-4 bg-[#1a1a1a] rounded shrink-0" />
          <div className="flex-1">
            <div className="h-3 w-full bg-[#1a1a1a] rounded mb-1" />
            <div className="h-2 w-16 bg-[#1a1a1a] rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Widget ─────────────────────────────────────────

export function W14_ResponsePlaybook() {
  const { data: playbooks, isLoading: playbooksLoading } = useQuery({
    queryKey: ["playbooks"],
    queryFn: getPlaybooks,
    refetchInterval: 60_000,
  });

  const { data: alerts, isLoading: alertsLoading } = useQuery({
    queryKey: ["alerts-for-playbook"],
    queryFn: () => getAlerts({ acknowledged: false }),
    refetchInterval: 10_000,
  });

  const isLoading = playbooksLoading || alertsLoading;

  // Find the highest-severity unacknowledged alert that has a matching playbook
  const activeMatch = useMemo(() => {
    if (!playbooks || !alerts) return null;

    const playbookArr = Array.isArray(playbooks) ? playbooks : [];
    const alertArr = Array.isArray(alerts) ? alerts : [];

    // Sort alerts by severity descending
    const sorted = [...alertArr].sort((a, b) => {
      const sevA = typeof a.severity === "number" ? a.severity : 0;
      const sevB = typeof b.severity === "number" ? b.severity : 0;
      return sevB - sevA;
    });

    for (const alert of sorted) {
      const matchingPlaybook = playbookArr.find((p) => {
        const alertType = alert.type?.toUpperCase();
        return p.trigger === alertType;
      });
      if (matchingPlaybook) {
        return { playbook: matchingPlaybook, alert };
      }
    }

    return null;
  }, [playbooks, alerts]);

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
              d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15a2.25 2.25 0 0 1 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z"
            />
          </svg>
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#d4d4d4]">
            Response Playbook
          </h3>
        </div>
        {activeMatch && (
          <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase rounded bg-[#ef4444]/10 text-[#ef4444] animate-pulse">
            ACTIVE
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto py-3">
        {isLoading ? (
          <LoadingSkeleton />
        ) : activeMatch ? (
          <ActivePlaybookPanel
            playbook={activeMatch.playbook}
            alert={activeMatch.alert}
          />
        ) : (
          <NoActiveIncident />
        )}
      </div>
    </div>
  );
}
