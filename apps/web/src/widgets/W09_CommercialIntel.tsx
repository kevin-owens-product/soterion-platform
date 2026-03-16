import { useState } from "react";

/* ── types ───────────────────────────────────────────── */

interface ZoneFootfall {
  name: string;
  today: number;
  yesterday: number;
  delta: number; // percentage change
  color: string;
}

const MOCK_DATA: ZoneFootfall[] = [
  { name: "Retail Zone", today: 2340, yesterday: 2180, delta: 7.3, color: "#f59e0b" },
  { name: "Departure Lounge", today: 1890, yesterday: 1920, delta: -1.6, color: "#8b5cf6" },
  { name: "Arrivals Curb", today: 3100, yesterday: 2950, delta: 5.1, color: "#06b6d4" },
];

/* Peak hours grid: 8am-8pm, intensity 0-1 */
function generatePeakHours(): { hour: number; intensity: number }[] {
  const hours: { hour: number; intensity: number }[] = [];
  for (let h = 8; h <= 20; h++) {
    // Bell curve peaking at 12 and 17
    const p1 = Math.exp(-0.5 * Math.pow((h - 12) / 2.2, 2));
    const p2 = Math.exp(-0.5 * Math.pow((h - 17) / 1.8, 2));
    hours.push({ hour: h, intensity: Math.min(1, (p1 + p2) * 0.65) });
  }
  return hours;
}

const PEAK_HOURS = generatePeakHours();

function intensityColor(v: number): string {
  if (v > 0.8) return "#ef4444";
  if (v > 0.6) return "#f97316";
  if (v > 0.4) return "#f59e0b";
  if (v > 0.2) return "#22c55e40";
  return "#1a1a1a";
}

/* ── component ───────────────────────────────────────── */

export function W09_CommercialIntel() {
  const [compare] = useState<"day">("day");

  const maxToday = Math.max(...MOCK_DATA.map((d) => d.today), 1);

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
            COMMERCIAL INTELLIGENCE
          </span>
        </div>
        <span
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 9,
            color: "#525252",
            textTransform: "uppercase",
          }}
        >
          Revenue Zone Analytics
        </span>
      </div>

      {/* Footfall bars */}
      <div
        style={{
          padding: "12px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {MOCK_DATA.length === 0 ? (
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
          MOCK_DATA.map((zone) => {
            const todayW = (zone.today / maxToday) * 100;
            const yesterdayW = (zone.yesterday / maxToday) * 100;
            const isUp = zone.delta >= 0;

            return (
              <div key={zone.name}>
                {/* Zone name + delta */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 4,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 10,
                      color: "#d4d4d4",
                    }}
                  >
                    {zone.name}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        fontFamily: "'Bebas Neue', sans-serif",
                        fontSize: 18,
                        color: zone.color,
                      }}
                    >
                      {zone.today.toLocaleString()}
                    </span>
                    <span
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: 9,
                        color: isUp ? "#22c55e" : "#ef4444",
                      }}
                    >
                      {isUp ? "+" : ""}
                      {zone.delta}%
                    </span>
                  </div>
                </div>

                {/* Today bar */}
                <div
                  style={{
                    height: 10,
                    background: "#1a1a1a",
                    borderRadius: 3,
                    overflow: "hidden",
                    marginBottom: 3,
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${todayW}%`,
                      background: zone.color,
                      borderRadius: 3,
                      transition: "width 0.6s ease",
                    }}
                  />
                </div>

                {/* Yesterday bar */}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div
                    style={{
                      flex: 1,
                      height: 5,
                      background: "#1a1a1a",
                      borderRadius: 2,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${yesterdayW}%`,
                        background: "#525252",
                        borderRadius: 2,
                        transition: "width 0.6s ease",
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 8,
                      color: "#525252",
                      flexShrink: 0,
                    }}
                  >
                    YESTERDAY {zone.yesterday.toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Peak hours grid */}
      <div
        style={{
          padding: "8px 16px 12px",
          borderTop: "1px solid #1a1a1a",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 9,
            color: "#737373",
            textTransform: "uppercase",
            display: "block",
            marginBottom: 6,
          }}
        >
          Peak Hours (8am – 8pm)
        </span>
        <div style={{ display: "flex", gap: 3 }}>
          {PEAK_HOURS.map((ph) => (
            <div
              key={ph.hour}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: 18,
                  borderRadius: 3,
                  background: intensityColor(ph.intensity),
                  transition: "background 0.4s ease",
                }}
                title={`${ph.hour}:00 — ${Math.round(ph.intensity * 100)}% intensity`}
              />
              <span
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 7,
                  color: "#525252",
                }}
              >
                {ph.hour}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
