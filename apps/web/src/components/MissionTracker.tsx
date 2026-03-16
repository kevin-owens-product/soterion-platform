import { useState, useEffect } from "react";
import { useMissionsWithProgress } from "@/hooks/useGamification";
import { useConfettiBurst } from "@/lib/animations";
import type { MissionWithProgress } from "@/types";

function formatTimeRemaining(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "EXPIRED";

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  return `${hours}h ${minutes}m`;
}

function MissionItem({ mission }: { mission: MissionWithProgress }) {
  const progressPct = mission.target > 0
    ? Math.min((mission.progress / mission.target) * 100, 100)
    : 0;

  const [confettiActive, triggerConfetti] = useConfettiBurst();
  const [wasCompleted, setWasCompleted] = useState(mission.completed);

  useEffect(() => {
    if (mission.completed && !wasCompleted) {
      triggerConfetti();
      setWasCompleted(true);
    }
  }, [mission.completed, wasCompleted, triggerConfetti]);

  const typeLabels: Record<string, string> = {
    daily: "DAILY",
    weekly: "WEEKLY",
    special: "SPECIAL",
  };

  return (
    <div
      className={`
        relative rounded-lg border p-3 transition-all duration-300
        ${
          mission.completed
            ? "border-soterion-ok/30 bg-soterion-ok/5"
            : "border-soterion-border bg-soterion-surface-alt"
        }
        ${confettiActive ? "ring-2 ring-soterion-ok/40 shadow-[0_0_20px_rgba(34,197,94,0.15)]" : ""}
      `}
    >
      {/* Top row: type badge + time remaining */}
      <div className="flex items-center justify-between mb-1.5">
        <span
          className="text-[9px] font-mono font-semibold tracking-wider px-1.5 py-0.5 rounded"
          style={{
            color: mission.color,
            backgroundColor: mission.color + "15",
          }}
        >
          {typeLabels[mission.type] ?? mission.type}
        </span>

        {!mission.completed && (
          <span className="text-[9px] font-mono text-gray-500">
            {formatTimeRemaining(mission.expiresAt)}
          </span>
        )}

        {mission.completed && (
          <span className="text-[9px] font-mono text-soterion-ok font-semibold">
            COMPLETE
          </span>
        )}
      </div>

      {/* Mission title */}
      <p className="text-xs font-medium text-gray-200 mb-0.5">
        {mission.title}
      </p>

      {/* Description */}
      <p className="text-[10px] text-gray-500 mb-2">
        {mission.description}
      </p>

      {/* Progress bar */}
      <div className="relative h-1.5 rounded-full bg-soterion-border overflow-hidden mb-1.5">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${progressPct}%`,
            backgroundColor: mission.completed ? "#22c55e" : mission.color,
          }}
        />
      </div>

      {/* Bottom row: progress text + reward */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono text-gray-400">
          {mission.progress}/{mission.target}
        </span>
        <span
          className="text-[10px] font-mono font-semibold"
          style={{ color: mission.color }}
        >
          {mission.rewardPreview}
        </span>
      </div>

      {/* Confetti particles (CSS-only approach) */}
      {confettiActive && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 rounded-full animate-ping"
              style={{
                left: `${10 + Math.random() * 80}%`,
                top: `${10 + Math.random() * 80}%`,
                backgroundColor: ["#f59e0b", "#22c55e", "#8b5cf6", "#06b6d4", "#f97316"][
                  i % 5
                ],
                animationDelay: `${i * 100}ms`,
                animationDuration: "1s",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface MissionTrackerProps {
  maxVisible?: number;
}

export function MissionTracker({ maxVisible }: MissionTrackerProps) {
  const { missions, isLoading } = useMissionsWithProgress();

  // Sort: incomplete first (by expiry), then completed
  const sorted = [...missions].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime();
  });

  const visible = maxVisible ? sorted.slice(0, maxVisible) : sorted;

  if (isLoading) {
    return (
      <div className="rounded-lg border border-soterion-border bg-soterion-surface p-4">
        <div className="h-3 w-24 bg-soterion-border rounded animate-pulse mb-3" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-20 rounded-lg bg-soterion-border/30 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (missions.length === 0) {
    return (
      <div className="rounded-lg border border-soterion-border bg-soterion-surface p-4">
        <h3 className="text-xs font-mono text-soterion-accent uppercase tracking-wider mb-3">
          Missions
        </h3>
        <p className="text-xs text-gray-500 text-center py-4 font-mono">
          No active missions
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-soterion-border bg-soterion-surface p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-mono text-soterion-accent uppercase tracking-wider">
          Active Missions
        </h3>
        <span className="text-[10px] font-mono text-gray-500">
          {missions.filter((m) => m.completed).length}/{missions.length} done
        </span>
      </div>

      <div className="space-y-2">
        {visible.map((mission) => (
          <MissionItem key={mission.id} mission={mission} />
        ))}
      </div>

      {maxVisible && sorted.length > maxVisible && (
        <p className="text-[10px] font-mono text-gray-500 text-center mt-2">
          +{sorted.length - maxVisible} more missions
        </p>
      )}
    </div>
  );
}
