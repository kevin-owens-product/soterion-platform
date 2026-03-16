import { useState } from "react";
import { useBadges } from "@/hooks/useGamification";
import type { Badge } from "@/types";

function BadgeCard({ badge }: { badge: Badge }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className={`
          flex flex-col items-center justify-center rounded-lg border p-3
          transition-all duration-200 cursor-default
          ${
            badge.earned
              ? "border-soterion-accent/30 bg-soterion-surface-alt shadow-[0_0_12px_rgba(245,158,11,0.08)]"
              : "border-soterion-border bg-soterion-surface opacity-35"
          }
        `}
      >
        {/* Badge icon */}
        <div
          className={`
            text-2xl mb-1.5 transition-transform duration-200
            ${badge.earned ? "grayscale-0" : "grayscale"}
            ${hovered && badge.earned ? "scale-110" : "scale-100"}
          `}
        >
          {badge.icon}
        </div>

        {/* Badge name */}
        <p
          className={`
            text-[10px] font-mono text-center leading-tight truncate w-full
            ${badge.earned ? "text-gray-200" : "text-gray-600"}
          `}
        >
          {badge.name}
        </p>

        {/* Lock icon for unearned */}
        {!badge.earned && (
          <div className="absolute top-1.5 right-1.5">
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-gray-600"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
        )}

        {/* Category dot */}
        <div
          className={`
            absolute top-1.5 left-1.5 w-1.5 h-1.5 rounded-full
            ${badge.category === "universal" ? "bg-soterion-accent" : "bg-[#8b5cf6]"}
            ${badge.earned ? "opacity-60" : "opacity-20"}
          `}
        />
      </div>

      {/* Tooltip on hover */}
      {hovered && (
        <div
          className="
            absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2
            px-3 py-2 rounded-md border border-soterion-border bg-soterion-bg
            shadow-lg shadow-black/60 w-48 pointer-events-none
          "
        >
          <p className="text-xs font-medium text-gray-100">{badge.name}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{badge.description}</p>
          {badge.earned && badge.earnedAt && (
            <p className="text-[10px] text-soterion-accent mt-1 font-mono">
              Earned {new Date(badge.earnedAt).toLocaleDateString()}
            </p>
          )}
          {!badge.earned && (
            <p className="text-[10px] text-gray-500 mt-1 font-mono italic">
              Locked
            </p>
          )}
          <div
            className="absolute top-full left-1/2 -translate-x-1/2 -mt-px
              border-4 border-transparent border-t-soterion-border"
          />
        </div>
      )}
    </div>
  );
}

interface BadgeGridProps {
  maxVisible?: number;
  showTitle?: boolean;
}

export function BadgeGrid({ maxVisible, showTitle = true }: BadgeGridProps) {
  const { badges, isLoading, earnedCount, totalCount } = useBadges();
  const [showAll, setShowAll] = useState(false);

  const visibleBadges =
    maxVisible && !showAll ? badges.slice(0, maxVisible) : badges;

  if (isLoading) {
    return (
      <div className="rounded-lg border border-soterion-border bg-soterion-surface p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-3 w-16 bg-soterion-border rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-16 rounded-lg bg-soterion-border/30 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-soterion-border bg-soterion-surface p-4">
      {showTitle && (
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-mono text-soterion-accent uppercase tracking-wider">
              Badges
            </h3>
            <span className="text-[10px] font-mono text-gray-500">
              {earnedCount}/{totalCount}
            </span>
          </div>
          {/* Category legend */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-soterion-accent opacity-60" />
              <span className="text-[9px] font-mono text-gray-500">Universal</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6] opacity-60" />
              <span className="text-[9px] font-mono text-gray-500">Vertical</span>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-2">
        {visibleBadges.map((badge) => (
          <BadgeCard key={badge.id} badge={badge} />
        ))}
      </div>

      {maxVisible && badges.length > maxVisible && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-2 w-full text-center text-[10px] font-mono text-gray-500 hover:text-soterion-accent transition-colors"
        >
          {showAll ? "SHOW LESS" : `+${badges.length - maxVisible} MORE`}
        </button>
      )}
    </div>
  );
}
