import { useLeaderboard } from "@/hooks/useGamification";
import { useAnimatedNumber } from "@/lib/animations";
import { useOperatorStore } from "@/store/operatorStore";
import type { LeaderboardEntry } from "@/types";

// ── Medal icons for top 3 ───────────────────────────────

const MEDAL_ICONS: Record<number, { icon: string; color: string }> = {
  1: { icon: "\uD83E\uDD47", color: "#fbbf24" }, // gold
  2: { icon: "\uD83E\uDD48", color: "#94a3b8" }, // silver
  3: { icon: "\uD83E\uDD49", color: "#d97706" }, // bronze
};

// ── Animated score cell ─────────────────────────────────

function AnimatedScore({ value }: { value: number }) {
  const animated = useAnimatedNumber(value, 1000);
  return (
    <span className="font-display text-xl text-soterion-accent leading-none tabular-nums">
      {animated.toLocaleString()}
    </span>
  );
}

// ── Delta indicator ─────────────────────────────────────

function DeltaIndicator({ delta }: { delta: number }) {
  if (delta > 0) {
    return (
      <span className="flex items-center gap-0.5 text-soterion-ok text-[10px] font-mono">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
          <path d="M5 2L8 6H2L5 2Z" />
        </svg>
        {delta}
      </span>
    );
  }
  if (delta < 0) {
    return (
      <span className="flex items-center gap-0.5 text-soterion-critical text-[10px] font-mono">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
          <path d="M5 8L2 4H8L5 8Z" />
        </svg>
        {Math.abs(delta)}
      </span>
    );
  }
  return (
    <span className="text-gray-500 text-[10px] font-mono">&mdash;</span>
  );
}

// ── Leaderboard row ─────────────────────────────────────

function LeaderboardRow({
  entry,
  isCurrentUser,
}: {
  entry: LeaderboardEntry;
  isCurrentUser: boolean;
}) {
  const medal = MEDAL_ICONS[entry.rank];

  return (
    <tr
      className={`
        border-b border-soterion-border/50 transition-colors
        ${
          isCurrentUser
            ? "bg-soterion-accent/5 border-l-2 border-l-soterion-accent shadow-[inset_0_0_20px_rgba(245,158,11,0.05)]"
            : "hover:bg-soterion-surface-alt/50"
        }
      `}
    >
      {/* Rank */}
      <td className="py-2.5 px-3 text-center w-12">
        {medal ? (
          <span className="text-base">{medal.icon}</span>
        ) : (
          <span className="font-mono text-xs text-gray-500">{entry.rank}</span>
        )}
      </td>

      {/* Operator */}
      <td className="py-2.5 px-3">
        <div>
          <p
            className={`text-sm font-medium ${
              isCurrentUser ? "text-soterion-accent" : "text-gray-200"
            }`}
          >
            {entry.name ?? entry.operatorName}
            {isCurrentUser && (
              <span className="text-[9px] font-mono text-soterion-accent/60 ml-1.5">
                YOU
              </span>
            )}
          </p>
        </div>
      </td>

      {/* Team */}
      <td className="py-2.5 px-3">
        <span className="text-[10px] font-mono text-gray-500 uppercase">
          {entry.team ?? "\u2014"}
        </span>
      </td>

      {/* Score */}
      <td className="py-2.5 px-3 text-right">
        <AnimatedScore value={entry.totalScore ?? (entry as any).score ?? 0} />
      </td>

      {/* Streak */}
      <td className="py-2.5 px-3 text-center">
        {(entry.streak ?? 0) > 0 ? (
          <span className="text-xs font-mono text-[#f97316]">
            {"\uD83D\uDD25"} {entry.streak}
          </span>
        ) : (
          <span className="text-xs font-mono text-gray-600">&mdash;</span>
        )}
      </td>

      {/* Badges */}
      <td className="py-2.5 px-3 text-center">
        <span className="text-xs font-mono text-[#8b5cf6]">
          {entry.badgeCount ?? "\u2014"}
        </span>
      </td>

      {/* Delta */}
      <td className="py-2.5 px-3 text-center">
        <DeltaIndicator delta={entry.deltaRank ?? 0} />
      </td>
    </tr>
  );
}

// ── Main Widget ─────────────────────────────────────────

export function W07_Leaderboard() {
  const { data: entries, isLoading, error } = useLeaderboard();
  const currentOperator = useOperatorStore((s) => s.currentOperator);

  if (isLoading) {
    return (
      <div className="w-full h-full rounded-lg border border-soterion-border bg-soterion-surface p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="h-4 w-40 bg-soterion-border rounded animate-pulse" />
          <div className="h-3 w-32 bg-soterion-border rounded animate-pulse" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-10 rounded bg-soterion-border/30 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center rounded-lg border border-soterion-border bg-soterion-surface">
        <p className="text-xs font-mono text-soterion-critical">
          Failed to load leaderboard
        </p>
      </div>
    );
  }

  const leaderboard = Array.isArray(entries) ? entries : [];

  return (
    <div className="w-full h-full rounded-lg border border-soterion-border bg-soterion-surface flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-soterion-border">
        <div className="flex items-center gap-3">
          <h2 className="font-display text-xl tracking-wider text-gray-100">
            OPERATOR LEADERBOARD
          </h2>
          <span className="text-[10px] font-mono text-soterion-accent px-2 py-0.5 rounded bg-soterion-accent/10 border border-soterion-accent/20">
            WEEKLY
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-soterion-ok animate-pulse" />
          <span className="text-[10px] font-mono text-gray-500">
            RESETS MONDAY 00:00
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-soterion-border bg-soterion-bg/50 sticky top-0">
              <th className="py-2 px-3 text-[9px] font-mono font-semibold text-gray-500 uppercase tracking-wider text-center w-12">
                #
              </th>
              <th className="py-2 px-3 text-[9px] font-mono font-semibold text-gray-500 uppercase tracking-wider text-left">
                Operator
              </th>
              <th className="py-2 px-3 text-[9px] font-mono font-semibold text-gray-500 uppercase tracking-wider text-left">
                Team
              </th>
              <th className="py-2 px-3 text-[9px] font-mono font-semibold text-gray-500 uppercase tracking-wider text-right">
                Score
              </th>
              <th className="py-2 px-3 text-[9px] font-mono font-semibold text-gray-500 uppercase tracking-wider text-center">
                Streak
              </th>
              <th className="py-2 px-3 text-[9px] font-mono font-semibold text-gray-500 uppercase tracking-wider text-center">
                Badges
              </th>
              <th className="py-2 px-3 text-[9px] font-mono font-semibold text-gray-500 uppercase tracking-wider text-center">
                Delta
              </th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((entry, index) => (
              <LeaderboardRow
                key={entry.operatorId ?? (entry as any).id ?? index}
                entry={entry}
                isCurrentUser={entry.operatorId === currentOperator?.id}
              />
            ))}
          </tbody>
        </table>

        {leaderboard.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <p className="text-xs font-mono text-gray-500">
              No leaderboard data this week
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
