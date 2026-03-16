import { useEffect, useState } from "react";
import { useStreak } from "@/hooks/useGamification";
import { useAnimatedNumber } from "@/lib/animations";

export function StreakDisplay() {
  const {
    currentStreak,
    multiplier,
    qualifyingThreshold,
    recentDays,
    isLoading,
  } = useStreak();

  const animatedStreak = useAnimatedNumber(currentStreak, 800);
  const [milestone, setMilestone] = useState(false);

  // Trigger animation on 7-day milestones
  useEffect(() => {
    if (currentStreak > 0 && currentStreak % 7 === 0) {
      setMilestone(true);
      const t = setTimeout(() => setMilestone(false), 2000);
      return () => clearTimeout(t);
    }
  }, [currentStreak]);

  if (isLoading) {
    return (
      <div className="rounded-lg border border-soterion-border bg-soterion-surface p-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-soterion-border/30 animate-pulse" />
          <div className="flex-1">
            <div className="h-3 w-16 bg-soterion-border rounded animate-pulse mb-1" />
            <div className="h-2 w-24 bg-soterion-border rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div
      className={`
        rounded-lg border bg-soterion-surface p-3 transition-all duration-500
        ${milestone ? "border-[#f97316]/50 shadow-[0_0_20px_rgba(249,115,22,0.15)]" : "border-soterion-border"}
      `}
    >
      {/* Header row: flame + streak count + multiplier */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {/* Flame icon */}
          <div
            className={`
              flex items-center justify-center w-8 h-8 rounded-lg
              bg-[#f97316]/10 text-lg
              ${milestone ? "animate-bounce" : ""}
            `}
          >
            {currentStreak > 0 ? "\uD83D\uDD25" : "\u26A0\uFE0F"}
          </div>

          {/* Streak count */}
          <div>
            <div className="flex items-baseline gap-1">
              <span className="font-display text-xl text-[#f97316] leading-none">
                {animatedStreak}
              </span>
              <span className="text-[10px] font-mono text-gray-500 uppercase">
                day streak
              </span>
            </div>
          </div>
        </div>

        {/* Multiplier */}
        <div className="text-right">
          <span className="font-display text-lg text-soterion-accent leading-none">
            {multiplier.toFixed(2)}x
          </span>
          <p className="text-[9px] font-mono text-gray-500">MULTIPLIER</p>
        </div>
      </div>

      {/* Mini calendar - last 7 days */}
      <div className="flex gap-1">
        {recentDays.map((day, i) => {
          const dateObj = new Date(day.date);
          const dayOfWeek = dateObj.getDay();
          const isToday = i === recentDays.length - 1;

          let bgColor = "#1a1a1a"; // gray = unknown/future
          let borderColor = "transparent";

          if (day.qualifying === true) {
            bgColor = "#22c55e20";
            borderColor = "#22c55e40";
          } else if (day.qualifying === false) {
            bgColor = "#ef444420";
            borderColor = "#ef444440";
          }

          return (
            <div
              key={day.date}
              className={`
                flex-1 flex flex-col items-center rounded py-1 border
                transition-all duration-200
                ${isToday ? "ring-1 ring-soterion-accent/30" : ""}
              `}
              style={{ backgroundColor: bgColor, borderColor }}
              title={`${day.date}: ${day.score ?? "N/A"} pts`}
            >
              <span className="text-[8px] font-mono text-gray-500 leading-none">
                {dayLabels[dayOfWeek]}
              </span>
              <span
                className={`
                  text-[9px] font-mono leading-none mt-0.5
                  ${
                    day.qualifying === true
                      ? "text-soterion-ok"
                      : day.qualifying === false
                        ? "text-soterion-critical"
                        : "text-gray-600"
                  }
                `}
              >
                {day.qualifying === true
                  ? "\u2713"
                  : day.qualifying === false
                    ? "\u2717"
                    : "\u2022"}
              </span>
            </div>
          );
        })}
      </div>

      {/* Qualifying threshold note */}
      <p className="text-[8px] font-mono text-gray-600 text-center mt-1.5">
        Score &gt; {qualifyingThreshold} to maintain streak
      </p>
    </div>
  );
}
