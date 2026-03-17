import { useMemo, useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { getZones, getSensors, getDensityHistory } from "@/lib/api";
import type { DensitySnapshot } from "@/lib/api";
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

function formatRelativeTime(isoTimestamp: string): string {
  const now = Date.now();
  const then = new Date(isoTimestamp).getTime();
  const diffMs = now - then;
  if (diffMs < 0) return "now";
  const totalMins = Math.round(diffMs / 60_000);
  if (totalMins < 1) return "now";
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m ago`;
  if (hours > 0) return `${hours}h ago`;
  return `${mins}m ago`;
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
  const historyQ = useQuery({
    queryKey: ["density-history"],
    queryFn: () => getDensityHistory(120),
    refetchInterval: 60_000,
  });

  const [playing, setPlaying] = useState(false);
  const [frameIndex, setFrameIndex] = useState(-1); // -1 means LIVE

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

  // Process history data into frames: array of { bucket, densityByZone }
  const frames = useMemo(() => {
    const snapshots: DensitySnapshot[] = historyQ.data?.snapshots ?? [];
    if (snapshots.length === 0) return [];

    // Group by bucket timestamp
    const bucketMap = new Map<string, Map<string, number>>();
    for (const snap of snapshots) {
      let zoneMap = bucketMap.get(snap.bucket);
      if (!zoneMap) {
        zoneMap = new Map<string, number>();
        bucketMap.set(snap.bucket, zoneMap);
      }
      zoneMap.set(snap.zoneId, snap.avgDensityPct);
    }

    // Sort chronologically
    const sorted = Array.from(bucketMap.entries())
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([bucket, densityByZone]) => ({ bucket, densityByZone }));

    return sorted;
  }, [historyQ.data]);

  // Playback interval
  useEffect(() => {
    if (!playing) return;
    const iv = setInterval(() => {
      setFrameIndex((prev) => {
        const next = prev + 1;
        if (next >= frames.length) {
          setPlaying(false);
          return -1; // back to LIVE
        }
        return next;
      });
    }, 500);
    return () => clearInterval(iv);
  }, [playing, frames.length]);

  // Current frame's density map (null when LIVE)
  const activeFrame = frameIndex >= 0 && frameIndex < frames.length
    ? frames[frameIndex]
    : undefined;
  const currentFrameDensity = activeFrame?.densityByZone ?? null;

  const timeLabel = activeFrame
    ? formatRelativeTime(activeFrame.bucket)
    : "LIVE";

  const handlePlayPause = useCallback(() => {
    if (playing) {
      setPlaying(false);
    } else {
      if (frameIndex < 0) setFrameIndex(0);
      setPlaying(true);
    }
  }, [playing, frameIndex]);

  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPlaying(false);
    setFrameIndex(Number(e.target.value));
  }, []);

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
          {frameIndex < 0 ? "REAL-TIME DENSITY" : "HISTORY PLAYBACK"}
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
              // When playing back history, use historical density; otherwise use live
              const livePct = getDensityPct(zone);
              const pct = currentFrameDensity
                ? Math.max(0, Math.min(100, currentFrameDensity.get(zone.id) ?? livePct))
                : Math.max(0, Math.min(100, livePct));
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

      {/* Transport bar */}
      {frames.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 16px 12px 16px",
            borderTop: "1px solid #1a1a1a",
            marginTop: 0,
            flexShrink: 0,
          }}
        >
          <button
            onClick={handlePlayPause}
            style={{
              background: "#1a1a1a",
              border: "1px solid #2a2a2a",
              borderRadius: 4,
              padding: "4px 12px",
              color: playing ? "#f59e0b" : "#d4d4d4",
              cursor: "pointer",
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 12,
              minWidth: 36,
              textAlign: "center",
            }}
          >
            {playing ? "\u23F8" : "\u25B6"}
          </button>
          <input
            type="range"
            min={0}
            max={Math.max(frames.length - 1, 0)}
            value={frameIndex < 0 ? frames.length - 1 : frameIndex}
            onChange={handleSliderChange}
            style={{ flex: 1, accentColor: "#f59e0b" }}
          />
          <span
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10,
              color: frameIndex < 0 ? "#22c55e" : "#737373",
              minWidth: 72,
              textAlign: "right",
            }}
          >
            {frameIndex < 0 ? "\u25CF LIVE" : timeLabel}
          </span>
        </div>
      )}

      {/* Legend */}
      <Legend />
    </div>
  );
}
