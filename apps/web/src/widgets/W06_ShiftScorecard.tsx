import { useEffect, useState, useMemo } from "react";
import { useShiftStore } from "@/store/shiftStore";

interface DimensionDef {
  key: string;
  label: string;
  weight: number;
  color: string;
}

const DEFAULT_DIMENSIONS: DimensionDef[] = [
  { key: "security", label: "Security", weight: 0.3, color: "#ef4444" },
  { key: "flow", label: "Flow", weight: 0.25, color: "#f59e0b" },
  { key: "response", label: "Response", weight: 0.2, color: "#8b5cf6" },
  { key: "compliance", label: "Compliance", weight: 0.15, color: "#06b6d4" },
  { key: "uptime", label: "Uptime", weight: 0.1, color: "#22c55e" },
];

export function W06_ShiftScorecard() {
  const currentShift = useShiftStore((s) => s.currentShift);
  const [dimScores, setDimScores] = useState<Record<string, number>>({});
  const [totalScore, setTotalScore] = useState(0);

  // Generate demo data if no real data available
  useEffect(() => {
    if (currentShift?.score != null) {
      setTotalScore(currentShift.score);
    }

    const scores: Record<string, number> = {};
    for (const d of DEFAULT_DIMENSIONS) {
      scores[d.key] = 500 + Math.floor(Math.random() * 450);
    }
    setDimScores(scores);

    if (!currentShift?.score) {
      const total = Math.round(
        DEFAULT_DIMENSIONS.reduce((acc, d) => acc + (scores[d.key] ?? 0) * d.weight, 0),
      );
      setTotalScore(total);
    }
  }, [currentShift]);

  const scoreColor = useMemo(() => {
    if (totalScore >= 800) return "#22c55e";
    if (totalScore >= 600) return "#f59e0b";
    if (totalScore >= 400) return "#f97316";
    return "#ef4444";
  }, [totalScore]);

  return (
    <div
      style={{
        background: "#0e0e0e",
        border: "1px solid #1a1a1a",
        borderRadius: 8,
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        minHeight: 200,
      }}
    >
      {/* Header */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #1a1a1a" }}>
        <span
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 10,
            color: "#f59e0b",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
          }}
        >
          Shift Scorecard
        </span>
      </div>

      {/* Main Score */}
      <div style={{ padding: "16px", textAlign: "center" }}>
        <span
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 48,
            color: scoreColor,
            lineHeight: 1,
          }}
        >
          {totalScore}
        </span>
        <span
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11,
            color: "#525252",
            display: "block",
            marginTop: 2,
          }}
        >
          / 1000
        </span>
      </div>

      {/* Dimension Bars */}
      <div style={{ flex: 1, padding: "0 16px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
        {DEFAULT_DIMENSIONS.map((dim) => {
          const score = dimScores[dim.key] ?? 0;
          const pct = (score / 1000) * 100;
          return (
            <div key={dim.key}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 3,
                }}
              >
                <span
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 9,
                    color: "#737373",
                    textTransform: "uppercase",
                  }}
                >
                  {dim.label} ({Math.round(dim.weight * 100)}%)
                </span>
                <span
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 10,
                    color: dim.color,
                    fontWeight: "bold",
                  }}
                >
                  {score}
                </span>
              </div>
              <div
                style={{
                  height: 4,
                  background: "#1a1a1a",
                  borderRadius: 2,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${Math.min(pct, 100)}%`,
                    background: dim.color,
                    borderRadius: 2,
                    transition: "width 0.5s ease",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Streak */}
      <div
        style={{
          padding: "8px 16px",
          borderTop: "1px solid #1a1a1a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
        }}
      >
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#d4d4d4" }}>
          7 day streak
        </span>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#f59e0b" }}>
          x1.35 multiplier
        </span>
      </div>
    </div>
  );
}
