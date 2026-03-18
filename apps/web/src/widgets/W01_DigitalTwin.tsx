import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getZones, getSensors, getTrackPaths } from "@/lib/api";
import type { TrackPath } from "@/lib/api";
import type { Zone, SensorNode } from "@/types";

/* ── helpers ─────────────────────────────────────────── */

function densityColor(pct: number): string {
  if (pct > 85) return "#ef4444";
  if (pct > 70) return "#f97316";
  if (pct > 50) return "#f59e0b";
  if (pct > 30) return "#22c55e";
  return "#22c55e";
}

function statusColor(s: string): string {
  if (s === "online") return "#22c55e";
  if (s === "degraded") return "#f59e0b";
  return "#ef4444";
}

const TRACK_CLASS_COLORS: Record<string, string> = {
  PERSON: "#06b6d4",
  VEHICLE: "#f59e0b",
  OBJECT: "#737373",
  UNKNOWN: "#525252",
};

/* Terminal layout positions — 5 canonical airport zones */
const ZONE_LAYOUT: Record<string, { row: number; col: number; colSpan: number; rowSpan: number }> = {
  security: { row: 1, col: 1, colSpan: 3, rowSpan: 1 },
  gate:     { row: 1, col: 4, colSpan: 2, rowSpan: 2 },
  baggage:  { row: 2, col: 1, colSpan: 2, rowSpan: 1 },
  curb:     { row: 3, col: 1, colSpan: 5, rowSpan: 1 },
  lounge:   { row: 2, col: 3, colSpan: 1, rowSpan: 1 },
};

const ZONE_ORDER = ["security", "gate", "baggage", "curb", "lounge"];

function layoutFor(zone: Zone, idx: number) {
  const key = zone.type?.toLowerCase() ?? "";
  if (ZONE_LAYOUT[key]) return ZONE_LAYOUT[key];
  // Fallback: assign to grid positions in order
  const fallbacks = [
    { row: 1, col: 1, colSpan: 3, rowSpan: 1 },
    { row: 1, col: 4, colSpan: 2, rowSpan: 2 },
    { row: 2, col: 1, colSpan: 2, rowSpan: 1 },
    { row: 3, col: 1, colSpan: 5, rowSpan: 1 },
    { row: 2, col: 3, colSpan: 1, rowSpan: 1 },
  ];
  return fallbacks[idx % fallbacks.length]!;
}

/** Normalize all track points into 0-100 SVG coordinate space */
function normalizeTrackPoints(tracks: TrackPath[]): TrackPath[] {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const t of tracks) {
    for (const p of t.points) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
  }
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  // Add small padding (5%) so tracks don't touch edges
  const pad = 5;
  const scale = 100 - pad * 2;

  return tracks.map((t) => ({
    ...t,
    points: t.points.map((p) => ({
      ...p,
      x: pad + ((p.x - minX) / rangeX) * scale,
      y: pad + ((p.y - minY) / rangeY) * scale,
    })),
  }));
}

/* ── component ───────────────────────────────────────── */

export function W01_DigitalTwin() {
  const [showTracks, setShowTracks] = useState(true);

  const zonesQ = useQuery({ queryKey: ["zones"], queryFn: getZones, refetchInterval: 5_000 });
  const sensorsQ = useQuery({ queryKey: ["sensors"], queryFn: getSensors, refetchInterval: 5_000 });
  const tracksQ = useQuery({
    queryKey: ["track-paths"],
    queryFn: () => getTrackPaths(undefined, 10),
    refetchInterval: 10_000,
  });

  const zones: Zone[] = useMemo(() => {
    const arr = Array.isArray(zonesQ.data) ? zonesQ.data : [];
    // Sort to match canonical terminal flow order
    return [...arr].sort((a, b) => {
      const ai = ZONE_ORDER.indexOf(a.type?.toLowerCase() ?? "");
      const bi = ZONE_ORDER.indexOf(b.type?.toLowerCase() ?? "");
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
  }, [zonesQ.data]);

  const sensors: SensorNode[] = useMemo(() => {
    return Array.isArray(sensorsQ.data) ? sensorsQ.data : [];
  }, [sensorsQ.data]);

  const sensorsByZone = useMemo(() => {
    const m = new Map<string, SensorNode[]>();
    for (const s of sensors) {
      const key = s.zoneId ?? "unknown";
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(s);
    }
    return m;
  }, [sensors]);

  const onlineCount = useMemo(
    () => sensors.filter((s) => s.status === "online" || s.status === "degraded").length,
    [sensors],
  );

  const trackData = tracksQ.data?.tracks;
  const normalizedTracks = useMemo(() => {
    if (!trackData || trackData.length === 0) return [];
    return normalizeTrackPoints(trackData);
  }, [trackData]);

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
      {/* ── Header ── */}
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
          FACILITY DIGITAL TWIN
        </span>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          {/* Track toggle pill */}
          <button
            onClick={() => setShowTracks((v) => !v)}
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 9,
              letterSpacing: "0.05em",
              padding: "2px 8px",
              borderRadius: 9999,
              border: `1px solid ${showTracks ? "#06b6d4" : "#525252"}`,
              background: showTracks ? "#06b6d420" : "transparent",
              color: showTracks ? "#06b6d4" : "#525252",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            TRACKS
          </button>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#737373" }}>
            ZONES{" "}
            <span style={{ color: "#d4d4d4", fontFamily: "'Bebas Neue', sans-serif", fontSize: 14 }}>
              {zones.length}
            </span>
          </span>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#737373" }}>
            SENSORS{" "}
            <span style={{ color: "#06b6d4", fontFamily: "'Bebas Neue', sans-serif", fontSize: 14 }}>
              {onlineCount}/{sensors.length}
            </span>
          </span>
        </div>
      </div>

      {/* ── Floor Plan Grid ── */}
      <div style={{ flex: 1, padding: 12, overflow: "auto", minHeight: 0, position: "relative" }}>
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
              gridTemplateColumns: "repeat(5, 1fr)",
              gridTemplateRows: "repeat(3, 1fr)",
              gap: 6,
              width: "100%",
              height: "100%",
              minHeight: 180,
              position: "relative",
            }}
          >
            {zones.map((zone, idx) => {
              const lay = layoutFor(zone, idx);
              const densityPct =
                (zone as any).currentDensityPct != null
                  ? parseFloat((zone as any).currentDensityPct)
                  : zone.maxOccupancy > 0
                    ? ((zone.occupancy ?? 0) / zone.maxOccupancy) * 100
                    : 0;
              const clampedPct = Math.max(0, Math.min(100, densityPct));
              const occ = (zone as any).currentCount ?? zone.occupancy ?? 0;
              const color = densityColor(clampedPct);
              const zoneSensors = sensorsByZone.get(zone.id) ?? [];

              return (
                <div
                  key={zone.id}
                  style={{
                    gridColumn: `${lay.col} / span ${lay.colSpan}`,
                    gridRow: `${lay.row} / span ${lay.rowSpan}`,
                    background: `${color}12`,
                    border: `1px solid ${color}40`,
                    borderRadius: 6,
                    padding: "8px 10px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    position: "relative",
                    overflow: "hidden",
                    transition: "background 0.6s ease",
                  }}
                >
                  {/* Zone name */}
                  <div
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 10,
                      color: "#d4d4d4",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {zone.name ?? zone.label ?? zone.id}
                  </div>

                  {/* Density + Occupancy row */}
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 4 }}>
                    <span
                      style={{
                        fontFamily: "'Bebas Neue', sans-serif",
                        fontSize: 28,
                        lineHeight: 1,
                        color,
                        transition: "color 0.6s ease",
                      }}
                    >
                      {Math.round(clampedPct)}%
                    </span>
                    <span
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: 9,
                        color: "#737373",
                      }}
                    >
                      {occ}{zone.maxOccupancy ? `/${zone.maxOccupancy}` : ""} pax
                    </span>
                  </div>

                  {/* Density bar */}
                  <div
                    style={{
                      height: 3,
                      background: "#1a1a1a",
                      borderRadius: 2,
                      marginTop: 6,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${clampedPct}%`,
                        background: color,
                        borderRadius: 2,
                        transition: "width 0.8s ease, background 0.6s ease",
                      }}
                    />
                  </div>

                  {/* Sensor dots */}
                  {zoneSensors.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 4,
                        marginTop: 6,
                      }}
                    >
                      {zoneSensors.map((s) => (
                        <div
                          key={s.id}
                          title={`${(s as any).label ?? s.id} — ${s.status}`}
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: "50%",
                            background: statusColor(s.status),
                            boxShadow: `0 0 4px ${statusColor(s.status)}80`,
                            transition: "background 0.4s ease",
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* ── Track Path SVG Overlay ── */}
            {showTracks && normalizedTracks.length > 0 && (
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  pointerEvents: "none",
                  zIndex: 2,
                }}
              >
                {normalizedTracks.map((track) => {
                  const isHighRisk = track.maxBehaviorScore > 70;
                  const strokeColor = isHighRisk
                    ? "#ef4444"
                    : TRACK_CLASS_COLORS[track.classification] ?? "#525252";
                  const strokeWidth = isHighRisk ? 2 : 1;
                  const opacity = isHighRisk ? 0.85 : 0.5;
                  const pointsStr = track.points.map((p) => `${p.x},${p.y}`).join(" ");
                  const lastPt = track.points[track.points.length - 1];

                  return (
                    <g key={track.trackId}>
                      <polyline
                        points={pointsStr}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={strokeWidth}
                        opacity={opacity}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                      />
                      {lastPt && (
                        <circle
                          cx={lastPt.x}
                          cy={lastPt.y}
                          r={isHighRisk ? 1.8 : 1.2}
                          fill={strokeColor}
                          opacity={isHighRisk ? 1 : 0.7}
                        />
                      )}
                    </g>
                  );
                })}
              </svg>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
