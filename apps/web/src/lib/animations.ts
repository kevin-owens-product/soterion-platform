import { useEffect, useRef, useState, useCallback } from "react";

// ── Easing ──────────────────────────────────────────────

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

// ── AnimatedNumber Hook ─────────────────────────────────

export function useAnimatedNumber(
  target: number,
  duration = 1200,
): number {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const fromRef = useRef<number>(0);

  useEffect(() => {
    fromRef.current = display;
    startRef.current = 0;

    const animate = (timestamp: number) => {
      if (!startRef.current) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);
      const current = fromRef.current + (target - fromRef.current) * eased;

      setDisplay(Math.round(current));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);

  return display;
}

// ── AnimatedRing Hook ───────────────────────────────────

interface RingProps {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  bgColor?: string;
  duration?: number;
}

interface RingResult {
  svgProps: {
    width: number;
    height: number;
    viewBox: string;
  };
  bgCircleProps: {
    cx: number;
    cy: number;
    r: number;
    fill: string;
    stroke: string;
    strokeWidth: number;
  };
  progressCircleProps: {
    cx: number;
    cy: number;
    r: number;
    fill: string;
    stroke: string;
    strokeWidth: number;
    strokeDasharray: string;
    strokeDashoffset: number;
    strokeLinecap: "round";
    transform: string;
    style: { transition: string };
  };
  percentage: number;
  animatedValue: number;
}

export function useAnimatedRing({
  value,
  max,
  size = 120,
  strokeWidth = 8,
  color = "#f59e0b",
  bgColor = "#1a1a1a",
  duration = 1000,
}: RingProps): RingResult {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = max > 0 ? Math.min(value / max, 1) : 0;

  const [offset, setOffset] = useState(circumference);
  const animatedValue = useAnimatedNumber(value, duration);

  useEffect(() => {
    // Small delay to trigger CSS transition
    const timer = setTimeout(() => {
      setOffset(circumference - percentage * circumference);
    }, 50);
    return () => clearTimeout(timer);
  }, [circumference, percentage]);

  const center = size / 2;

  return {
    svgProps: {
      width: size,
      height: size,
      viewBox: `0 0 ${size} ${size}`,
    },
    bgCircleProps: {
      cx: center,
      cy: center,
      r: radius,
      fill: "none",
      stroke: bgColor,
      strokeWidth,
    },
    progressCircleProps: {
      cx: center,
      cy: center,
      r: radius,
      fill: "none",
      stroke: color,
      strokeWidth,
      strokeDasharray: `${circumference} ${circumference}`,
      strokeDashoffset: offset,
      strokeLinecap: "round" as const,
      transform: `rotate(-90 ${center} ${center})`,
      style: { transition: `stroke-dashoffset ${duration}ms ease-out` },
    },
    percentage,
    animatedValue,
  };
}

// ── AnimatedRing Component (convenience) ────────────────

export interface AnimatedRingComponentProps {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
  sublabel?: string;
}

// Exported as a factory so the caller can use it as a React component
// Usage: <AnimatedRing value={850} max={1000} label="850" />
// (We export the hook above for more control, but provide this for convenience)
export function getAnimatedRingDefaults(
  value: number,
  max: number,
): { percentage: number; grade: string; gradeColor: string } {
  const percentage = max > 0 ? Math.min(value / max, 1) : 0;
  let grade = "F";
  let gradeColor = "#ef4444";

  if (percentage >= 0.95) {
    grade = "S";
    gradeColor = "#f59e0b";
  } else if (percentage >= 0.85) {
    grade = "A";
    gradeColor = "#22c55e";
  } else if (percentage >= 0.75) {
    grade = "B";
    gradeColor = "#06b6d4";
  } else if (percentage >= 0.6) {
    grade = "C";
    gradeColor = "#f59e0b";
  } else if (percentage >= 0.4) {
    grade = "D";
    gradeColor = "#f97316";
  }

  return { percentage, grade, gradeColor };
}

// ── Confetti burst (lightweight CSS-only approach) ──────

export function useConfettiBurst(): [boolean, () => void] {
  const [active, setActive] = useState(false);

  const trigger = useCallback(() => {
    setActive(true);
    setTimeout(() => setActive(false), 1500);
  }, []);

  return [active, trigger];
}
