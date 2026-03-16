import { W07_Leaderboard } from "@/widgets/W07_Leaderboard";
import { BadgeGrid } from "@/components/BadgeGrid";
import { MissionTracker } from "@/components/MissionTracker";
import { StreakDisplay } from "@/components/StreakDisplay";
import { WidgetErrorBoundary } from "@/components/WidgetErrorBoundary";
import { useAnimatedRing, useAnimatedNumber, getAnimatedRingDefaults } from "@/lib/animations";
import { useShiftScore } from "@/hooks/useShiftScore";
import { useOperatorStore } from "@/store/operatorStore";
import { useGamificationEvents } from "@/hooks/useGamification";
import { useFacilityStore } from "@/store/facilityStore";

// ── Score Ring (for the right panel) ────────────────────

function ShiftScoreRing() {
  const currentOperator = useOperatorStore((s) => s.currentOperator);
  const { data: shiftScore } = useShiftScore(currentOperator?.id);

  // The API returns { score: { totalScore, securityScore, flowScore, ... }, date }
  // After normalization, shiftScore.score holds the totalScore number,
  // but sub-scores may be on the raw object. Access them from the raw data.
  const raw = shiftScore as any;
  const totalScore = raw?.totalScore ?? raw?.score ?? 0;
  const securityScore = raw?.securityScore ?? 0;
  const flowScore = raw?.flowScore ?? 0;
  const responseScore = raw?.responseScore ?? 0;
  const complianceScore = raw?.complianceScore ?? 0;
  const maxScore = 1000;
  const { gradeColor } = getAnimatedRingDefaults(totalScore, maxScore);

  const ring = useAnimatedRing({
    value: totalScore,
    max: maxScore,
    size: 140,
    strokeWidth: 10,
    color: gradeColor,
    duration: 1200,
  });

  const animatedScore = useAnimatedNumber(totalScore, 1200);

  const dimensions = [
    { label: "Security", value: securityScore, max: 200, color: "#ef4444" },
    { label: "Flow", value: flowScore, max: 200, color: "#f59e0b" },
    { label: "Response", value: responseScore, max: 200, color: "#22c55e" },
    { label: "Compliance", value: complianceScore, max: 200, color: "#06b6d4" },
  ];

  return (
    <div className="rounded-lg border border-soterion-border bg-soterion-surface p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-mono text-soterion-accent uppercase tracking-wider">
          Your Shift Score
        </h3>
        {shiftScore?.grade && (
          <span
            className="font-display text-lg leading-none"
            style={{ color: gradeColor }}
          >
            {shiftScore.grade}
          </span>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Main ring */}
        <div className="relative shrink-0">
          <svg {...ring.svgProps}>
            <circle {...ring.bgCircleProps} />
            <circle {...ring.progressCircleProps} />
          </svg>
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-3xl text-gray-100 leading-none">
              {animatedScore}
            </span>
            <span className="text-[9px] font-mono text-gray-500 mt-0.5">
              / {maxScore}
            </span>
          </div>
        </div>

        {/* Sub-scores 2x2 grid */}
        <div className="grid grid-cols-2 gap-2 flex-1">
          {dimensions.map((dim) => (
            <DimensionMini
              key={dim.label}
              label={dim.label}
              value={dim.value}
              max={dim.max}
              color={dim.color}
            />
          ))}
        </div>
      </div>

      {/* Streak display inline */}
      <div className="mt-3">
        <WidgetErrorBoundary name="Streak Display">
          <StreakDisplay />
        </WidgetErrorBoundary>
      </div>
    </div>
  );
}

// ── Mini dimension score card ───────────────────────────

function DimensionMini({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const animatedVal = useAnimatedNumber(Math.round(value), 800);

  return (
    <div className="rounded border border-soterion-border bg-soterion-bg/50 p-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[9px] font-mono text-gray-500 uppercase">
          {label}
        </span>
        <span
          className="text-xs font-display leading-none"
          style={{ color }}
        >
          {animatedVal}
        </span>
      </div>
      <div className="h-1 rounded-full bg-soterion-border overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// ── Main Leaderboard View ───────────────────────────────

export function Leaderboard() {
  const facilityId = useFacilityStore((s) => s.facility?.id);

  // Subscribe to real-time gamification events
  useGamificationEvents(facilityId);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl tracking-wider text-gray-100">
          LEADERBOARD
        </h1>
        <span className="text-xs font-mono text-gray-500">
          Operator performance & gamification
        </span>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-12 gap-4">
        {/* Left panel: Leaderboard (wide) */}
        <div
          className="col-span-8"
          style={{ minHeight: "600px" }}
        >
          <WidgetErrorBoundary name="Leaderboard">
            <W07_Leaderboard />
          </WidgetErrorBoundary>
        </div>

        {/* Right panel: Score + Badges + Missions */}
        <div className="col-span-4 space-y-4">
          {/* Shift Score with Ring */}
          <WidgetErrorBoundary name="Shift Score Ring">
            <ShiftScoreRing />
          </WidgetErrorBoundary>

          {/* Badge Grid */}
          <WidgetErrorBoundary name="Badge Grid">
            <BadgeGrid maxVisible={8} />
          </WidgetErrorBoundary>

          {/* Mission Tracker */}
          <WidgetErrorBoundary name="Mission Tracker">
            <MissionTracker maxVisible={3} />
          </WidgetErrorBoundary>
        </div>
      </div>
    </div>
  );
}
