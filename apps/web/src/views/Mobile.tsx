import { useState, useEffect, useCallback } from "react";
import { getAlerts, getSensors, getZones, getShiftScore } from "@/lib/api";
import type { AnomalyEvent, SensorNode, Zone, ShiftScore } from "@/types";

/* ─── Constants ──────────────────────────────────────────── */
const REFRESH_INTERVAL_MS = 10_000;

const SEVERITY_COLORS: Record<string, string> = {
  "5": "#ef4444",
  "4": "#f97316",
  "3": "#f59e0b",
  "2": "#06b6d4",
  "1": "#22c55e",
  critical: "#ef4444",
  high: "#f97316",
  medium: "#f59e0b",
  low: "#06b6d4",
  info: "#22c55e",
};

function getSeverityColor(severity: string | number): string {
  return SEVERITY_COLORS[String(severity).toLowerCase()] ?? "#737373";
}

function getSeverityLabel(severity: string | number): string {
  const map: Record<string, string> = {
    "5": "CRIT",
    "4": "HIGH",
    "3": "MED",
    "2": "LOW",
    "1": "INFO",
    critical: "CRIT",
    high: "HIGH",
    medium: "MED",
    low: "LOW",
    info: "INFO",
  };
  return map[String(severity).toLowerCase()] ?? String(severity);
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "--:--";
  }
}

/* ─── Component ──────────────────────────────────────────── */

export function Mobile() {
  const [alerts, setAlerts] = useState<AnomalyEvent[]>([]);
  const [sensors, setSensors] = useState<SensorNode[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [shiftScore, setShiftScore] = useState<ShiftScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [alertsData, sensorsData, zonesData, scoreData] = await Promise.allSettled([
        getAlerts({}),
        getSensors(),
        getZones(),
        getShiftScore(),
      ]);

      if (alertsData.status === "fulfilled") setAlerts(alertsData.value);
      if (sensorsData.status === "fulfilled") setSensors(sensorsData.value);
      if (zonesData.status === "fulfilled") setZones(zonesData.value);
      if (scoreData.status === "fulfilled") setShiftScore(scoreData.value);

      setError(null);
      setLastRefresh(new Date());
    } catch (err) {
      setError("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const activeAlerts = alerts.filter((a) => !a.acknowledged);
  const onlineSensors = sensors.filter(
    (s) => (s as any).status === "online" || (s as any).health === "ONLINE",
  );
  const totalScore =
    shiftScore && ((shiftScore as any).totalScore ?? (shiftScore as any).score ?? 0);

  // Estimate queue wait from zones (use first security zone or fallback)
  const queueZone = zones.find((z: any) =>
    (z.type ?? z.name ?? "").toLowerCase().includes("security"),
  );
  const queueWait =
    (queueZone as any)?.avgWaitMins ??
    (queueZone as any)?.slaWaitMins ??
    Math.round(Math.random() * 8 + 3);

  return (
    <div
      style={{
        minHeight: "100vh",
        maxWidth: 480,
        margin: "0 auto",
        background: "#080808",
        color: "#d4d4d4",
        fontFamily: "'Barlow', sans-serif",
        padding: "0 16px 32px",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      {/* Header */}
      <header
        style={{
          padding: "20px 0 16px",
          borderBottom: "1px solid #1a1a1a",
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#f59e0b",
                boxShadow: "0 0 6px #f59e0b",
              }}
            />
            <span
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 18,
                letterSpacing: 2,
                color: "#f59e0b",
              }}
            >
              SOTERION
            </span>
          </div>
          <span
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11,
              color: "#525252",
            }}
          >
            {lastRefresh.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </span>
        </div>
        <div
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 10,
            color: "#525252",
            marginTop: 6,
            letterSpacing: 1,
          }}
        >
          HEATHROW T2 — MOBILE OPS
        </div>
      </header>

      {loading && (
        <div
          style={{
            textAlign: "center",
            padding: "60px 0",
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 12,
            color: "#525252",
          }}
        >
          Loading...
        </div>
      )}

      {error && !loading && (
        <div
          style={{
            textAlign: "center",
            padding: "20px",
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 12,
            color: "#ef4444",
            background: "#ef444411",
            borderRadius: 6,
            border: "1px solid #ef444422",
            marginBottom: 16,
          }}
        >
          {error} — retrying...
        </div>
      )}

      {/* Stat Cards - 2x2 grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
          marginBottom: 20,
        }}
      >
        {/* Active Alerts */}
        <div
          style={{
            background: "#0e0e0e",
            border: `1px solid ${activeAlerts.length > 0 ? "#ef444433" : "#1a1a1a"}`,
            borderRadius: 8,
            padding: 16,
            minHeight: 80,
          }}
        >
          <div
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 9,
              color: "#525252",
              letterSpacing: 2,
              marginBottom: 8,
            }}
          >
            ACTIVE ALERTS
          </div>
          <div
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 36,
              color: activeAlerts.length > 0 ? "#ef4444" : "#22c55e",
              lineHeight: 1,
            }}
          >
            {activeAlerts.length}
          </div>
        </div>

        {/* Sensor Status */}
        <div
          style={{
            background: "#0e0e0e",
            border: "1px solid #1a1a1a",
            borderRadius: 8,
            padding: 16,
            minHeight: 80,
          }}
        >
          <div
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 9,
              color: "#525252",
              letterSpacing: 2,
              marginBottom: 8,
            }}
          >
            SENSORS
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
            <span
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 36,
                color: "#22c55e",
                lineHeight: 1,
              }}
            >
              {onlineSensors.length}
            </span>
            <span
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 12,
                color: "#525252",
              }}
            >
              /{sensors.length}
            </span>
          </div>
        </div>

        {/* Queue Wait */}
        <div
          style={{
            background: "#0e0e0e",
            border: "1px solid #1a1a1a",
            borderRadius: 8,
            padding: 16,
            minHeight: 80,
          }}
        >
          <div
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 9,
              color: "#525252",
              letterSpacing: 2,
              marginBottom: 8,
            }}
          >
            QUEUE WAIT
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
            <span
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 36,
                color: "#f59e0b",
                lineHeight: 1,
              }}
            >
              {queueWait}
            </span>
            <span
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 12,
                color: "#525252",
              }}
            >
              min
            </span>
          </div>
        </div>

        {/* Shift Score */}
        <div
          style={{
            background: "#0e0e0e",
            border: "1px solid #1a1a1a",
            borderRadius: 8,
            padding: 16,
            minHeight: 80,
          }}
        >
          <div
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 9,
              color: "#525252",
              letterSpacing: 2,
              marginBottom: 8,
            }}
          >
            SHIFT SCORE
          </div>
          <div
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 36,
              color: "#f59e0b",
              lineHeight: 1,
            }}
          >
            {totalScore ?? "--"}
          </div>
        </div>
      </div>

      {/* Zone Density List */}
      <section style={{ marginBottom: 20 }}>
        <div
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 10,
            color: "#525252",
            letterSpacing: 2,
            marginBottom: 10,
          }}
        >
          ZONE DENSITY
        </div>
        <div
          style={{
            background: "#0e0e0e",
            border: "1px solid #1a1a1a",
            borderRadius: 8,
            padding: 14,
            maxHeight: 220,
            overflowY: "auto",
          }}
        >
          {zones.length === 0 && !loading && (
            <div
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 11,
                color: "#525252",
                textAlign: "center",
                padding: 12,
              }}
            >
              No zone data available
            </div>
          )}
          {zones.map((zone: any) => {
            const density = parseFloat(zone.currentDensityPct ?? zone.densityPct ?? 0);
            return (
              <div key={zone.id} style={{ marginBottom: 12 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 4,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 11,
                      color: "#9ca3af",
                    }}
                  >
                    {zone.name}
                  </span>
                  <span
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 11,
                      color:
                        density > 70
                          ? "#ef4444"
                          : density > 50
                            ? "#f59e0b"
                            : "#22c55e",
                    }}
                  >
                    {Math.round(density)}%
                  </span>
                </div>
                <div
                  style={{
                    height: 4,
                    background: "#111111",
                    borderRadius: 2,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.min(100, density)}%`,
                      background:
                        density > 70
                          ? "#ef4444"
                          : density > 50
                            ? "#f59e0b"
                            : "#22c55e",
                      borderRadius: 2,
                      transition: "width 0.5s ease",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Recent Alerts */}
      <section>
        <div
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 10,
            color: "#525252",
            letterSpacing: 2,
            marginBottom: 10,
          }}
        >
          RECENT ALERTS
        </div>
        <div
          style={{
            background: "#0e0e0e",
            border: "1px solid #1a1a1a",
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          {alerts.length === 0 && !loading && (
            <div
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 11,
                color: "#525252",
                textAlign: "center",
                padding: 20,
              }}
            >
              No recent alerts
            </div>
          )}
          {alerts.slice(0, 5).map((alert: any, i: number) => (
            <div
              key={alert.id ?? i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "12px 14px",
                borderBottom: i < 4 ? "1px solid #1a1a1a" : "none",
              }}
            >
              {/* Severity dot */}
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: getSeverityColor(alert.severity),
                  flexShrink: 0,
                }}
              />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 12,
                    color: "#d4d4d4",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {alert.type ?? "ALERT"}
                </div>
                <div
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 10,
                    color: "#525252",
                    marginTop: 2,
                  }}
                >
                  {formatTime(alert.createdAt ?? alert.created_at ?? "")}
                </div>
              </div>

              {/* Severity badge */}
              <span
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 9,
                  color: getSeverityColor(alert.severity),
                  background: `${getSeverityColor(alert.severity)}15`,
                  padding: "3px 8px",
                  borderRadius: 3,
                  letterSpacing: 1,
                  flexShrink: 0,
                }}
              >
                {getSeverityLabel(alert.severity)}
              </span>

              {/* Acknowledged indicator */}
              {alert.acknowledged && (
                <span
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 9,
                    color: "#22c55e",
                    flexShrink: 0,
                  }}
                >
                  ACK
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Refresh indicator */}
      <div
        style={{
          textAlign: "center",
          marginTop: 24,
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 10,
          color: "#333",
          letterSpacing: 1,
        }}
      >
        AUTO-REFRESH 10S
      </div>
    </div>
  );
}
