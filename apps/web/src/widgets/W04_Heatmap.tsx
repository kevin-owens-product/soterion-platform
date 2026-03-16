import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getZones, getSensors } from "@/lib/api";
import type { Zone } from "@/types";

/* ── helpers ─────────────────────────────────────────── */

function densityColor(pct: number): string {
  if (pct > 85) return "#ef4444";
  if (pct > 70) return "#f97316";
  if (pct > 50) return "#f59e0b";
  if (pct > 30) return "#84cc16";
  return "#22c55e";
}

function getDensityPct(zone: any): number {
  if (zone.currentDensityPct != null) return parseFloat(zone.currentDensityPct) || 0;
  if (zone.maxOccupancy > 0) return ((zone.occupancy ?? 0) / zone.maxOccupancy) * 100;
  return 0;
}

/* ── Legend ───────────────────────────────────────────── */

function Legend() {
  const stops = [
    { label: "0%", color: "#22c55e" },
    { label: "30%", color: "#84cc16" },
    { label: "50%", color: "#f59e0b" },
    { label: "70%", color: "#f97316" },
    { label: "100%", color: "#ef4444" },
  ];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 12px",
        borderTop: "1px solid #1a1a1a",
        flexShrink: 0,
      }}
    >
      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: "#525252" }}>
        DENSITY
      </span>
      <div
        style={{
          flex: 1,
          height: 6,
          borderRadius: 3,
          background: "linear-gradient(to right, #22c55e, #84cc16, #f59e0b, #f97316, #ef4444)",
        }}
      />
      <div style={{ display: "flex", gap: 8 }}>
        {stops.map((s) => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <div style={{ width: 6, height: 6, borderRadius: 2, background: s.color }} />
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: "#737373" }}>
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── component ───────────────────────────────────────── */

export function W04_Heatmap() {
  const zonesQ = useQuery({ queryKey: ["zones"], queryFn: getZones, refetchInterval: 5_000 });
  const sensorsQ = useQuery({ queryKey: ["sensors"], queryFn: getSensors, refetchInterval: 5_000 });

  const zones: Zone[] = useMemo(
    () => (Array.isArray(zonesQ.data) ? zonesQ.data : []),
    [zonesQ.data],
  );

  const sensorCountByZone = useMemo(() => {
    const arr = Array.isArray(sensorsQ.data) ? sensorsQ.data : [];
    const m = new Map<string, number>();
    for (const s of arr) {
      const z = s.zoneId ?? "unknown";
      m.set(z, (m.get(z) ?? 0) + 1);
    }
    return m;
  }, [sensorsQ.data]);

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
        <span
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 18,
            letterSpacing: "0.15em",
            color: "#f59e0b",
          }}
        >
          SPATIAL HEATMAP
        </span>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#525252" }}>
          REAL-TIME DENSITY
        </span>
      </div>

      {/* Grid */}
      <div style={{ flex: 1, padding: 12, overflow: "auto", minHeight: 0 }}>
        {zones.length === 0 ? (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#525252",
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11,
            }}
          >
            No data
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 8,
              width: "100%",
              height: "100%",
            }}
          >
            {zones.map((zone) => {
              const pct = Math.max(0, Math.min(100, getDensityPct(zone)));
              const color = densityColor(pct);
              const sensorCount = sensorCountByZone.get(zone.id) ?? 0;

              return (
                <div
                  key={zone.id}
                  style={{
                    position: "relative",
                    background: `${color}20`,
                    border: `1px solid ${color}30`,
                    borderRadius: 6,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "12px 8px",
                    transition: "background 0.8s ease",
                    minHeight: 80,
                  }}
                >
                  {/* Sensor count badge */}
                  <div
                    style={{
                      position: "absolute",
                      top: 6,
                      right: 6,
                      background: "#1a1a1a",
                      borderRadius: 4,
                      padding: "2px 5px",
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 8,
                      color: "#06b6d4",
                    }}
                  >
                    {sensorCount}S
                  </div>

                  {/* Zone name */}
                  <span
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 10,
                      color: "#ffffff",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      textAlign: "center",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      maxWidth: "100%",
                    }}
                  >
                    {zone.name ?? zone.label ?? zone.id}
                  </span>

                  {/* Density percentage */}
                  <span
                    style={{
                      fontFamily: "'Bebas Neue', sans-serif",
                      fontSize: 36,
                      lineHeight: 1,
                      color,
                      marginTop: 4,
                      transition: "color 0.8s ease",
                    }}
                  >
                    {Math.round(pct)}%
                  </span>

                  {/* Occupancy */}
                  <span
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 9,
                      color: "#737373",
                      marginTop: 2,
                    }}
                  >
                    {(zone as any).currentCount ?? zone.occupancy ?? 0}
                    {zone.maxOccupancy ? ` / ${zone.maxOccupancy}` : ""} pax
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Legend */}
      <Legend />
    </div>
  );
}
