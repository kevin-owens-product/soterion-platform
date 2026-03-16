import { useState, useMemo, useEffect } from "react";

/* ── types ───────────────────────────────────────────── */

type TimeRange = "1h" | "4h" | "8h" | "24h";

interface FunnelStage {
  name: string;
  count: number;
  color: string;
}

const STAGES: FunnelStage[] = [
  { name: "Curb", count: 1200, color: "#f59e0b" },
  { name: "Check-in", count: 980, color: "#06b6d4" },
  { name: "Security", count: 940, color: "#8b5cf6" },
  { name: "Gate", count: 870, color: "#22c55e" },
  { name: "Aircraft", count: 820, color: "#ef4444" },
];

/* ── component ───────────────────────────────────────── */

export function W08_FlowFunnel() {
  const [timeRange, setTimeRange] = useState<TimeRange>("4h");
  const [mounted, setMounted] = useState(false);
  const ranges: TimeRange[] = ["1h", "4h", "8h", "24h"];

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, []);

  const maxCount = useMemo(() => Math.max(...STAGES.map((s) => s.count), 1), []);

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
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid #1a1a1a",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div>
          <span
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 18,
              letterSpacing: "0.15em",
              color: "#f59e0b",
            }}
          >
            FLOW FUNNEL
          </span>
          <span
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 9,
              color: "#525252",
              marginLeft: 10,
            }}
          >
            PASSENGER JOURNEY
          </span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {ranges.map((r) => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 10,
                padding: "2px 8px",
                borderRadius: 4,
                border: `1px solid ${timeRange === r ? "#f59e0b" : "#1a1a1a"}`,
                background: timeRange === r ? "#f59e0b" : "transparent",
                color: timeRange === r ? "#080808" : "#737373",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Funnel bars */}
      <div
        style={{
          flex: 1,
          padding: "16px 16px 8px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 8,
          minHeight: 0,
        }}
      >
        {STAGES.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              color: "#525252",
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11,
            }}
          >
            No data
          </div>
        ) : (
          STAGES.map((stage, i) => {
            const widthPct = (stage.count / maxCount) * 100;
            const conversion =
              i === 0
                ? null
                : Math.round((stage.count / STAGES[i - 1]!.count) * 100);

            return (
              <div key={stage.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {/* Label */}
                <div
                  style={{
                    width: 72,
                    flexShrink: 0,
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 10,
                    color: "#d4d4d4",
                    textAlign: "right",
                    textTransform: "uppercase",
                  }}
                >
                  {stage.name}
                </div>

                {/* Bar container */}
                <div
                  style={{
                    flex: 1,
                    height: 28,
                    background: "#1a1a1a",
                    borderRadius: 4,
                    overflow: "hidden",
                    position: "relative",
                  }}
                >
                  {/* Trapezoid funnel bar */}
                  <div
                    style={{
                      height: "100%",
                      width: mounted ? `${widthPct}%` : "0%",
                      background: `linear-gradient(90deg, ${stage.color}cc, ${stage.color}88)`,
                      borderRadius: "4px 2px 2px 4px",
                      transition: "width 1s cubic-bezier(0.4, 0, 0.2, 1)",
                      clipPath: "polygon(0 0, 100% 8%, 100% 92%, 0 100%)",
                      display: "flex",
                      alignItems: "center",
                      paddingLeft: 8,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'Bebas Neue', sans-serif",
                        fontSize: 16,
                        color: "#ffffff",
                        textShadow: "0 1px 2px rgba(0,0,0,0.5)",
                      }}
                    >
                      {stage.count.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Conversion rate */}
                <div
                  style={{
                    width: 44,
                    flexShrink: 0,
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 9,
                    color: conversion != null ? "#06b6d4" : "#525252",
                    textAlign: "left",
                  }}
                >
                  {conversion != null ? `${conversion}%` : "---"}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom arrows showing flow direction */}
      <div
        style={{
          padding: "4px 16px 10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          flexShrink: 0,
        }}
      >
        {STAGES.map((stage, i) => (
          <div key={stage.name} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: stage.color,
              }}
            />
            <span
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 8,
                color: "#737373",
                textTransform: "uppercase",
              }}
            >
              {stage.name}
            </span>
            {i < STAGES.length - 1 && (
              <span style={{ color: "#525252", fontSize: 10 }}>→</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
