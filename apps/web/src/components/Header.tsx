import { useEffect, useRef, useState } from "react";
import { useAlertsStore } from "@/store/alertsStore";
import { useShiftStore } from "@/store/shiftStore";
import { useOperatorStore } from "@/store/operatorStore";
import { useFacilityStore } from "@/store/facilityStore";
import { FacilityTypeIndicator } from "@/components/FacilityTypeIndicator";
import { FacilitySwitcher } from "@/components/FacilitySwitcher";

function AnimatedScore({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  const prev = useRef(0);

  useEffect(() => {
    const start = prev.current;
    const diff = value - start;
    if (diff === 0) return;
    const duration = 600;
    const startTime = performance.now();

    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + diff * eased));
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        prev.current = value;
      }
    }
    requestAnimationFrame(animate);
  }, [value]);

  return (
    <span className="text-lg font-display text-soterion-accent tracking-wider tabular-nums">
      {display}
    </span>
  );
}

export function Header() {
  const unacknowledgedCount = useAlertsStore((s) => s.unacknowledgedCount);
  const currentShift = useShiftStore((s) => s.currentShift);
  const operator = useOperatorStore((s) => s.currentOperator);
  const facility = useFacilityStore((s) => s.facility);
  const logout = useOperatorStore((s) => s.logout);

  const hasCritical = useAlertsStore((s) =>
    s.alerts.some((a) => a.severity === "critical" && !a.acknowledgedBy),
  );

  // Shift time
  const shiftStart = currentShift?.shiftStart;
  const [shiftElapsed, setShiftElapsed] = useState("");

  useEffect(() => {
    if (!shiftStart) return;
    function update() {
      const start = new Date(shiftStart!).getTime();
      const diff = Date.now() - start;
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      setShiftElapsed(`${h}h ${m.toString().padStart(2, "0")}m`);
    }
    update();
    const iv = setInterval(update, 60_000);
    return () => clearInterval(iv);
  }, [shiftStart]);

  const initials = operator
    ? operator.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "OP";

  return (
    <header className="h-14 bg-soterion-surface border-b border-soterion-border flex items-center justify-between px-6">
      {/* Left: Facility info */}
      <div className="flex items-center gap-3">
        <FacilityTypeIndicator type={facility?.type} size="xs" showLabel={false} />
        <div className="flex flex-col">
          <span className="text-sm font-mono text-gray-300">
            {facility?.name ?? "Loading..."}
          </span>
          <span className="text-[8px] font-mono uppercase tracking-widest text-gray-600">
            {facility?.type
              ? facility.type.replace(/_/g, " ") + " Intelligence Platform"
              : "Intelligence Platform"}
          </span>
        </div>
        <FacilitySwitcher />
        {shiftElapsed && (
          <span className="text-[10px] font-mono text-[#525252] ml-2">
            Shift: {shiftElapsed}
          </span>
        )}
      </div>

      {/* Center: Shift score + critical indicator */}
      <div className="flex items-center gap-4">
        {hasCritical && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ef4444]/10 border border-[#ef4444]/30">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ef4444] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ef4444]" />
            </span>
            <span className="text-[10px] font-mono font-bold uppercase text-[#ef4444]">
              Critical
            </span>
          </div>
        )}

        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-soterion-surface-alt border border-soterion-border">
          <span className="text-[10px] font-mono uppercase tracking-wider text-gray-500">
            Shift Score
          </span>
          {currentShift && currentShift.score > 0 ? (
            <AnimatedScore value={currentShift.score} />
          ) : (
            <span className="text-lg font-display text-gray-600 tracking-wider">
              {"\u2014"}
            </span>
          )}
          {currentShift?.grade && (
            <span
              className={`text-xs font-mono font-bold ml-1 ${
                currentShift.grade === "S" || currentShift.grade === "A"
                  ? "text-[#22c55e]"
                  : currentShift.grade === "B"
                    ? "text-[#f59e0b]"
                    : "text-[#ef4444]"
              }`}
            >
              {currentShift.grade}
            </span>
          )}
        </div>
      </div>

      {/* Right: Alerts + profile */}
      <div className="flex items-center gap-4">
        {/* Alert bell */}
        <button className="relative p-2 rounded-md hover:bg-white/5 transition-colors">
          <svg
            className={`w-5 h-5 ${hasCritical ? "text-[#ef4444]" : "text-gray-400"}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
            />
          </svg>
          {unacknowledgedCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-4 h-4 rounded-full bg-soterion-critical text-[9px] font-bold text-white">
              {unacknowledgedCount > 9 ? "9+" : unacknowledgedCount}
            </span>
          )}
        </button>

        {/* Operator name + avatar */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-gray-400 hidden sm:inline">
            {operator?.name ?? ""}
          </span>
          <button
            onClick={logout}
            title="Sign out"
            className="w-8 h-8 rounded-full bg-soterion-accent/20 border border-soterion-accent/30 flex items-center justify-center hover:bg-soterion-accent/30 transition-colors"
          >
            <span className="text-xs font-bold text-soterion-accent">
              {initials}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
