import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAlerts, getIncidentTracks } from "@/lib/api";
import type { AnomalyEvent } from "@/types";
import type { IncidentFrame } from "@/lib/api";

/* ── helpers ─────────────────────────────────────────── */

function severityColor(sev: string): string {
  switch (sev) {
    case "critical": return "#ef4444";
    case "high": return "#f97316";
    case "medium": return "#f59e0b";
    default: return "#22c55e";
  }
}

function formatTime(ts: string | undefined | null): string {
  if (!ts) return "--:--";
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return "--:--";
  }
}

function formatDate(ts: string | undefined | null): string {
  if (!ts) return "---";
  try {
    const d = new Date(ts);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "---";
  }
}

/** Bucket an ISO timestamp to the nearest second */
function bucketToSecond(iso: string): string {
  try {
    const d = new Date(iso);
    d.setMilliseconds(0);
    return d.toISOString();
  } catch {
    return iso;
  }
}

/* ── types ───────────────────────────────────────────── */

interface FrameGroup {
  time: string;
  tracks: IncidentFrame[];
}

interface TrailData {
  points: { x: number; y: number }[];
  color: string;
}

/* ── component ───────────────────────────────────────── */

export function W10_IncidentReplay() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const alertsQ = useQuery({
    queryKey: ["alerts-replay"],
    queryFn: () => getAlerts(),
    refetchInterval: 10_000,
  });

  const tracksQ = useQuery({
    queryKey: ["incident-tracks", selectedId],
    queryFn: () => getIncidentTracks(selectedId!),
    enabled: !!selectedId,
  });

  const alerts: AnomalyEvent[] = useMemo(() => {
    const arr = Array.isArray(alertsQ.data) ? alertsQ.data : [];
    return arr.slice(0, 10);
  }, [alertsQ.data]);

  const selected = useMemo(
    () => alerts.find((a) => a.id === selectedId) ?? null,
    [alerts, selectedId],
  );

  /* ── Process frames into chronological groups ── */
  const frameGroups: FrameGroup[] = useMemo(() => {
    const frames = tracksQ.data?.frames;
    if (!frames || frames.length === 0) return [];

    const bucketMap = new Map<string, IncidentFrame[]>();
    for (const frame of frames) {
      const key = bucketToSecond(frame.time);
      const existing = bucketMap.get(key);
      if (existing) {
        existing.push(frame);
      } else {
        bucketMap.set(key, [frame]);
      }
    }

    return Array.from(bucketMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([time, tracks]) => ({ time, tracks }));
  }, [tracksQ.data]);

  const totalFrames = frameGroups.length;

  /* ── Compute coordinate bounds for SVG mapping ── */
  const bounds = useMemo(() => {
    const frames = tracksQ.data?.frames;
    if (!frames || frames.length === 0) {
      return { minX: 0, maxX: 1, minY: 0, maxY: 1 };
    }
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const f of frames) {
      if (f.centroid.x < minX) minX = f.centroid.x;
      if (f.centroid.x > maxX) maxX = f.centroid.x;
      if (f.centroid.y < minY) minY = f.centroid.y;
      if (f.centroid.y > maxY) maxY = f.centroid.y;
    }
    // Prevent zero-range
    if (maxX === minX) { minX -= 1; maxX += 1; }
    if (maxY === minY) { minY -= 1; maxY += 1; }
    return { minX, maxX, minY, maxY };
  }, [tracksQ.data]);

  const mapX = useCallback(
    (x: number) => 10 + ((x - bounds.minX) / (bounds.maxX - bounds.minX)) * 180,
    [bounds],
  );
  const mapY = useCallback(
    (y: number) => 10 + ((y - bounds.minY) / (bounds.maxY - bounds.minY)) * 100,
    [bounds],
  );

  /* ── Current frame tracks ── */
  const currentFrameTracks: IncidentFrame[] = useMemo(() => {
    if (totalFrames === 0) return [];
    const idx = Math.min(playbackIndex, totalFrames - 1);
    return frameGroups[idx]?.tracks ?? [];
  }, [frameGroups, playbackIndex, totalFrames]);

  /* ── Trail lines: collect points per trackId up to current playback index ── */
  const trailsByTrack: TrailData[] = useMemo(() => {
    if (totalFrames === 0) return [];
    const idx = Math.min(playbackIndex, totalFrames - 1);
    const trailMap = new Map<string, { points: { x: number; y: number }[]; classification: string; maxBehavior: number }>();

    for (let i = 0; i <= idx; i++) {
      const group = frameGroups[i];
      if (!group) continue;
      for (const track of group.tracks) {
        const existing = trailMap.get(track.trackId);
        if (existing) {
          existing.points.push({ x: track.centroid.x, y: track.centroid.y });
          if (track.behaviorScore > existing.maxBehavior) {
            existing.maxBehavior = track.behaviorScore;
          }
        } else {
          trailMap.set(track.trackId, {
            points: [{ x: track.centroid.x, y: track.centroid.y }],
            classification: track.classification,
            maxBehavior: track.behaviorScore,
          });
        }
      }
    }

    return Array.from(trailMap.values()).map((t) => ({
      points: t.points,
      color: t.maxBehavior > 70 ? "#ef4444" : t.classification === "PERSON" ? "#06b6d4" : "#f59e0b",
    }));
  }, [frameGroups, playbackIndex, totalFrames]);

  /* ── Frame label ── */
  const frameLabel = useMemo(() => {
    if (totalFrames === 0) return "No track data";
    const idx = Math.min(playbackIndex, totalFrames - 1);
    const group = frameGroups[idx];
    if (!group) return "---";
    return formatTime(group.time);
  }, [frameGroups, playbackIndex, totalFrames]);

  /* ── Reset playback when selectedId changes ── */
  useEffect(() => {
    setPlaybackIndex(0);
    setPlaying(false);
  }, [selectedId]);

  /* ── Playback interval ── */
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (playing && totalFrames > 0) {
      intervalRef.current = setInterval(() => {
        setPlaybackIndex((prev) => {
          if (prev >= totalFrames - 1) {
            setPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 200);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [playing, totalFrames]);

  /* ── Transport control handlers ── */
  const handleSkipBack = useCallback(() => {
    setPlaybackIndex(0);
    setPlaying(false);
  }, []);

  const handlePlayPause = useCallback(() => {
    if (!playing && playbackIndex >= totalFrames - 1 && totalFrames > 0) {
      // If at end, restart from beginning
      setPlaybackIndex(0);
    }
    setPlaying((p) => !p);
  }, [playing, playbackIndex, totalFrames]);

  const handleSkipForward = useCallback(() => {
    if (totalFrames > 0) {
      setPlaybackIndex(totalFrames - 1);
    }
    setPlaying(false);
  }, [totalFrames]);

  /* 24h timeline positioning */
  function timelinePos(ts: string | undefined | null): number {
    if (!ts) return 50;
    try {
      const d = new Date(ts);
      const mins = d.getHours() * 60 + d.getMinutes();
      return (mins / 1440) * 100;
    } catch {
      return 50;
    }
  }

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
          INCIDENT REPLAY
        </span>
        <span
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 10,
            color: "#525252",
          }}
        >
          {alerts.length} INCIDENTS
        </span>
      </div>

      {/* Main content area */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
        {/* Left: Incident list */}
        <div
          style={{
            width: "42%",
            borderRight: "1px solid #1a1a1a",
            overflowY: "auto",
            flexShrink: 0,
          }}
        >
          {alerts.length === 0 ? (
            <div
              style={{
                padding: 16,
                textAlign: "center",
                color: "#525252",
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 11,
              }}
            >
              No data
            </div>
          ) : (
            alerts.map((alert) => {
              const isSelected = alert.id === selectedId;
              return (
                <div
                  key={alert.id}
                  onClick={() => setSelectedId(alert.id)}
                  style={{
                    padding: "8px 12px",
                    borderBottom: "1px solid #1a1a1a",
                    cursor: "pointer",
                    background: isSelected ? "#1a1a1a" : "transparent",
                    transition: "background 0.15s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: severityColor(alert.severity),
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: 10,
                        color: "#d4d4d4",
                        flex: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {(alert.type ?? "UNKNOWN").replace(/_/g, " ")}
                    </span>
                    <span
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: 8,
                        color: "#525252",
                        flexShrink: 0,
                      }}
                    >
                      {formatTime(alert.timestamp)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right: Detail panel */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "auto",
          }}
        >
          {!selected ? (
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  border: "1px solid #1a1a1a",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#525252",
                  fontSize: 18,
                }}
              >
                &#9654;
              </div>
              <span
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 10,
                  color: "#525252",
                }}
              >
                Select an incident to review
              </span>
            </div>
          ) : (
            <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
              {/* Incident type badge */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    background: `${severityColor(selected.severity)}20`,
                    border: `1px solid ${severityColor(selected.severity)}40`,
                    borderRadius: 4,
                    padding: "3px 8px",
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 10,
                    color: severityColor(selected.severity),
                    textTransform: "uppercase",
                  }}
                >
                  {(selected.type ?? "UNKNOWN").replace(/_/g, " ")}
                </div>
                <span
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 9,
                    color: "#737373",
                    textTransform: "uppercase",
                  }}
                >
                  {selected.severity}
                </span>
              </div>

              {/* Metadata rows */}
              {[
                ["Zone", selected.zoneId ?? "---"],
                ["Time", `${formatDate(selected.timestamp)} ${formatTime(selected.timestamp)}`],
                ["Confidence", selected.confidence != null ? `${(selected.confidence * 100).toFixed(1)}%` : "---"],
                ["Track ID", selected.trackId ?? "---"],
                ["Acknowledged", selected.acknowledgedBy ? "Yes" : "No"],
                ["Resolved", selected.resolvedAt ? formatDate(selected.resolvedAt) : "Open"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "4px 0",
                    borderBottom: "1px solid #1a1a1a10",
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
                    {label}
                  </span>
                  <span
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 9,
                      color: "#d4d4d4",
                      textAlign: "right",
                      maxWidth: "60%",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {value}
                  </span>
                </div>
              ))}

              {/* SVG Mini Zone Map */}
              {totalFrames > 0 && (
                <svg viewBox="0 0 200 120" style={{ width: '100%', height: 120, background: '#0a0a0a', borderRadius: 4, border: '1px solid #1a1a1a', marginTop: 8 }}>
                  {/* Zone boundary */}
                  <rect x={5} y={5} width={190} height={110} rx={4} fill="none" stroke="#1a1a1a" strokeWidth={0.5} />
                  {/* Grid lines */}
                  <line x1={100} y1={5} x2={100} y2={115} stroke="#1a1a1a" strokeWidth={0.3} />
                  <line x1={5} y1={60} x2={195} y2={60} stroke="#1a1a1a" strokeWidth={0.3} />
                  {/* Trail lines */}
                  {trailsByTrack.map((trail, i) => (
                    <polyline key={`trail-${i}`}
                      points={trail.points.map(p => `${mapX(p.x)},${mapY(p.y)}`).join(' ')}
                      fill="none" stroke={trail.color} strokeWidth={1} opacity={0.3} />
                  ))}
                  {/* Track positions at current frame */}
                  {currentFrameTracks.map((track, i) => (
                    <circle key={i}
                      cx={mapX(track.centroid.x)} cy={mapY(track.centroid.y)}
                      r={track.behaviorScore > 70 ? 5 : 3}
                      fill={track.behaviorScore > 70 ? '#ef4444' : track.classification === 'PERSON' ? '#06b6d4' : '#f59e0b'}
                      opacity={0.9}>
                      <animate attributeName="opacity" values="0.9;0.5;0.9" dur="1.5s" repeatCount="indefinite" />
                    </circle>
                  ))}
                  {/* Label */}
                  <text x={10} y={16} fill="#525252" fontSize={7} fontFamily="IBM Plex Mono">
                    {frameLabel}
                  </text>
                </svg>
              )}

              {/* Description */}
              {selected.description && (
                <div
                  style={{
                    background: "#080808",
                    border: "1px solid #1a1a1a",
                    borderRadius: 4,
                    padding: 8,
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 9,
                    color: "#737373",
                    lineHeight: 1.5,
                  }}
                >
                  {selected.description}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom: 24h timeline + transport controls */}
      <div
        style={{
          borderTop: "1px solid #1a1a1a",
          padding: "8px 16px",
          flexShrink: 0,
        }}
      >
        {/* Transport controls */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            marginBottom: 6,
          }}
        >
          {[
            { label: "\u23EE", action: handleSkipBack },
            { label: playing ? "\u23F8" : "\u25B6", action: handlePlayPause },
            { label: "\u23ED", action: handleSkipForward },
          ].map((btn, i) => (
            <button
              key={i}
              onClick={btn.action}
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                border: "1px solid #1a1a1a",
                background: i === 1 ? "#f59e0b20" : "transparent",
                color: i === 1 ? "#f59e0b" : "#525252",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                transition: "all 0.15s",
              }}
            >
              {btn.label}
            </button>
          ))}

          {/* Frame counter */}
          {selectedId && totalFrames > 0 && (
            <span
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 9,
                color: "#737373",
                marginLeft: 4,
              }}
            >
              Frame {Math.min(playbackIndex + 1, totalFrames)}/{totalFrames}
              {currentFrameTracks.length > 0 && (
                <span style={{ color: "#525252", marginLeft: 6 }}>
                  {currentFrameTracks.length} track{currentFrameTracks.length !== 1 ? "s" : ""}
                </span>
              )}
            </span>
          )}
        </div>

        {/* Playback timeline slider (frame-level) */}
        {selectedId && totalFrames > 1 && (
          <div style={{ marginBottom: 6 }}>
            <input
              type="range"
              min={0}
              max={totalFrames - 1}
              value={Math.min(playbackIndex, totalFrames - 1)}
              onChange={(e) => {
                setPlaybackIndex(Number(e.target.value));
                setPlaying(false);
              }}
              style={{
                width: "100%",
                height: 4,
                appearance: "none",
                WebkitAppearance: "none",
                background: "#1a1a1a",
                borderRadius: 2,
                outline: "none",
                cursor: "pointer",
                accentColor: "#f59e0b",
              }}
            />
          </div>
        )}

        {/* 24h timeline bar */}
        <div style={{ position: "relative", height: 16 }}>
          {/* Track bar */}
          <div
            style={{
              position: "absolute",
              top: 7,
              left: 0,
              right: 0,
              height: 2,
              background: "#1a1a1a",
              borderRadius: 1,
            }}
          />
          {/* Hour markers */}
          {[0, 6, 12, 18, 24].map((h) => (
            <div
              key={h}
              style={{
                position: "absolute",
                left: `${(h / 24) * 100}%`,
                top: 0,
                transform: "translateX(-50%)",
              }}
            >
              <div style={{ width: 1, height: 6, background: "#525252", margin: "0 auto" }} />
              <span
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 7,
                  color: "#525252",
                  display: "block",
                  textAlign: "center",
                }}
              >
                {String(h === 24 ? 0 : h).padStart(2, "0")}
              </span>
            </div>
          ))}
          {/* Incident markers */}
          {alerts.map((a) => (
            <div
              key={a.id}
              onClick={() => setSelectedId(a.id)}
              style={{
                position: "absolute",
                left: `${timelinePos(a.timestamp)}%`,
                top: 4,
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: severityColor(a.severity),
                transform: "translateX(-50%)",
                cursor: "pointer",
                boxShadow: a.id === selectedId ? `0 0 6px ${severityColor(a.severity)}` : "none",
                transition: "box-shadow 0.2s",
                zIndex: a.id === selectedId ? 2 : 1,
              }}
              title={`${(a.type ?? "").replace(/_/g, " ")} at ${formatTime(a.timestamp)}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
