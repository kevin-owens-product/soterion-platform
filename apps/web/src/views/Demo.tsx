import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";

/* ─── Mock Data ──────────────────────────────────────────── */

const ZONES = [
  { name: "Security Checkpoint A", density: 0, target: 87 },
  { name: "Gate B12 Corridor", density: 0, target: 62 },
  { name: "Baggage Claim 3", density: 0, target: 45 },
  { name: "Arrivals Curb", density: 0, target: 73 },
  { name: "Retail Concourse", density: 0, target: 38 },
  { name: "Restricted Airside", density: 0, target: 12 },
];

const LEADERBOARD = [
  { rank: 1, name: "M. Chen", score: 947, streak: 14, badge: "Threat Hunter" },
  { rank: 2, name: "S. Williams", score: 912, streak: 11, badge: "Flow Master" },
  { rank: 3, name: "A. Petrov", score: 889, streak: 9, badge: "Iron Shift" },
  { rank: 4, name: "R. Okafor", score: 856, streak: 7, badge: "First Responder" },
  { rank: 5, name: "J. Santos", score: 831, streak: 5, badge: "Compliance Ace" },
];

const COMPLIANCE_CONTROLS = [
  "AU-2: Audit event logging enabled",
  "AC-3: RBAC enforcement active",
  "SC-8: TLS 1.3 in transit",
  "SC-28: AES-256 at rest",
  "IR-4: Incident response < 60s",
  "SI-4: Anomaly monitoring live",
  "RA-5: Vulnerability scan passed",
  "CM-2: Baseline config locked",
];

const FACILITY_TYPES = [
  { name: "Airport", icon: "✈", desc: "Terminal security, queue flow, airside intrusion" },
  { name: "Seaport", icon: "⚓", desc: "Container yard, berth monitoring, customs" },
  { name: "Stadium", icon: "🏟", desc: "Crowd crush prevention, turnstile flow" },
  { name: "Transit Hub", icon: "🚇", desc: "Platform density, fare barrier analytics" },
  { name: "Hospital", icon: "🏥", desc: "Restricted access, patient fall detection" },
];

const RECOMMENDED_ACTIONS = [
  "Open overflow lane at Checkpoint B",
  "Redirect pax via Gate C corridor",
  "Alert ground crew for crowd control",
];

/* ─── Scene Definitions ──────────────────────────────────── */

interface Scene {
  id: string;
  title: string;
  subtitle: string;
  description: string;
}

const SCENES: Scene[] = [
  {
    id: "monitoring",
    title: "Real-Time Monitoring",
    subtitle: "LIVE OPS CENTER",
    description:
      "Watch every zone in your facility update in real time. LiDAR sensors track density, dwell time, and flow without capturing any personal data.",
  },
  {
    id: "threat",
    title: "Threat Detection",
    subtitle: "AI-POWERED ALERTS",
    description:
      "Anomaly detection identifies crowd surges, intrusions, and abandoned objects in milliseconds. Operators get severity-ranked alerts with actionable context.",
  },
  {
    id: "predictive",
    title: "Predictive Intelligence",
    subtitle: "SURGE FORECASTING",
    description:
      "Machine learning models predict density surges 8-15 minutes ahead, giving operators time to act before queues breach SLA thresholds.",
  },
  {
    id: "performance",
    title: "Operator Performance",
    subtitle: "GAMIFIED SCORING",
    description:
      "Shift scores, streaks, badges, and leaderboards turn routine operations into a high-performance culture. Every acknowledged alert earns points.",
  },
  {
    id: "compliance",
    title: "Compliance Ready",
    subtitle: "SOC 2 + FEDRAMP",
    description:
      "Immutable audit logs, RBAC enforcement, encrypted data at rest and in transit. Built for SOC 2 Type II and FedRAMP Moderate from day one.",
  },
  {
    id: "multivertical",
    title: "Multi-Vertical",
    subtitle: "ONE PLATFORM, ANY FACILITY",
    description:
      "The same spatial intelligence engine powers airports, seaports, stadiums, transit hubs, and hospitals. Configure zone types, KPIs, and compliance frameworks per vertical.",
  },
];

const AUTO_ADVANCE_MS = 8000;

/* ─── Component ──────────────────────────────────────────── */

export function Demo() {
  const navigate = useNavigate();
  const [currentScene, setCurrentScene] = useState(0);
  const [paused, setPaused] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  // Scene-specific animation state
  const [zoneDensities, setZoneDensities] = useState<number[]>(ZONES.map(() => 0));
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertPulse, setAlertPulse] = useState(false);
  const [predictionEta, setPredictionEta] = useState(15);
  const [leaderboardVisible, setLeaderboardVisible] = useState<boolean[]>([]);
  const [checksVisible, setChecksVisible] = useState<boolean[]>([]);
  const [facilitiesVisible, setFacilitiesVisible] = useState<boolean[]>([]);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animFrameRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Navigate to next scene with transition
  const goToScene = useCallback(
    (idx: number) => {
      if (idx === currentScene) return;
      setTransitioning(true);
      setTimeout(() => {
        setCurrentScene(idx);
        setTransitioning(false);
      }, 400);
    },
    [currentScene],
  );

  const nextScene = useCallback(() => {
    if (currentScene < SCENES.length - 1) {
      goToScene(currentScene + 1);
    }
  }, [currentScene, goToScene]);

  const prevScene = useCallback(() => {
    if (currentScene > 0) {
      goToScene(currentScene - 1);
    }
  }, [currentScene, goToScene]);

  // Auto-advance timer
  useEffect(() => {
    if (paused || currentScene >= SCENES.length - 1) return;
    timerRef.current = setTimeout(nextScene, AUTO_ADVANCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentScene, paused, nextScene]);

  // Scene-specific animations
  useEffect(() => {
    if (animFrameRef.current) clearInterval(animFrameRef.current);

    const scene = SCENES[currentScene]!;
    if (!scene) return;

    if (scene.id === "monitoring") {
      setZoneDensities(ZONES.map(() => 0));
      let tick = 0;
      animFrameRef.current = setInterval(() => {
        tick++;
        setZoneDensities(
          ZONES.map((z) => Math.min(z.target, Math.floor((z.target * tick) / 20))),
        );
        if (tick >= 20 && animFrameRef.current) clearInterval(animFrameRef.current);
      }, 80);
    }

    if (scene.id === "threat") {
      setAlertVisible(false);
      setAlertPulse(false);
      const t1 = setTimeout(() => setAlertVisible(true), 600);
      const t2 = setTimeout(() => setAlertPulse(true), 1200);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }

    if (scene.id === "predictive") {
      setPredictionEta(15);
      let eta = 15;
      animFrameRef.current = setInterval(() => {
        eta = Math.max(8, eta - 1);
        setPredictionEta(eta);
        if (eta <= 8 && animFrameRef.current) clearInterval(animFrameRef.current);
      }, 200);
    }

    if (scene.id === "performance") {
      setLeaderboardVisible([]);
      LEADERBOARD.forEach((_, i) => {
        setTimeout(() => {
          setLeaderboardVisible((prev) => {
            const next = [...prev];
            next[i] = true;
            return next;
          });
        }, 300 * (i + 1));
      });
    }

    if (scene.id === "compliance") {
      setChecksVisible([]);
      COMPLIANCE_CONTROLS.forEach((_, i) => {
        setTimeout(() => {
          setChecksVisible((prev) => {
            const next = [...prev];
            next[i] = true;
            return next;
          });
        }, 350 * (i + 1));
      });
    }

    if (scene.id === "multivertical") {
      setFacilitiesVisible([]);
      FACILITY_TYPES.forEach((_, i) => {
        setTimeout(() => {
          setFacilitiesVisible((prev) => {
            const next = [...prev];
            next[i] = true;
            return next;
          });
        }, 400 * (i + 1));
      });
    }

    return () => {
      if (animFrameRef.current) clearInterval(animFrameRef.current);
    };
  }, [currentScene]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        nextScene();
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        prevScene();
      }
      if (e.key === "p") setPaused((p) => !p);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [nextScene, prevScene]);

  const scene = SCENES[currentScene]!;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#080808",
        color: "#d4d4d4",
        fontFamily: "'Barlow', sans-serif",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Header */}
      <header
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 32px",
          background: "linear-gradient(to bottom, rgba(8,8,8,0.95), rgba(8,8,8,0))",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "#f59e0b",
              boxShadow: "0 0 8px #f59e0b",
            }}
          />
          <span
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 22,
              letterSpacing: 3,
              color: "#f59e0b",
            }}
          >
            SOTERION AI
          </span>
          <span
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11,
              color: "#737373",
              marginLeft: 8,
              textTransform: "uppercase",
              letterSpacing: 2,
            }}
          >
            Live Demo
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button
            onClick={() => setPaused((p) => !p)}
            style={{
              background: "none",
              border: "1px solid #1a1a1a",
              color: "#737373",
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11,
              padding: "6px 12px",
              borderRadius: 4,
              cursor: "pointer",
              letterSpacing: 1,
            }}
          >
            {paused ? "RESUME" : "PAUSE"}
          </button>
          <button
            onClick={() => navigate("/login")}
            style={{
              background: "none",
              border: "1px solid #f59e0b33",
              color: "#f59e0b",
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11,
              padding: "6px 16px",
              borderRadius: 4,
              cursor: "pointer",
              letterSpacing: 1,
            }}
          >
            LOGIN
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          padding: "80px 32px 120px",
          opacity: transitioning ? 0 : 1,
          transform: transitioning ? "translateY(12px)" : "translateY(0)",
          transition: "opacity 0.4s ease, transform 0.4s ease",
        }}
      >
        {/* Scene subtitle */}
        <div
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11,
            color: "#f59e0b",
            letterSpacing: 4,
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          {scene.subtitle}
        </div>

        {/* Scene title */}
        <h1
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: "clamp(36px, 6vw, 64px)",
            letterSpacing: 2,
            color: "#f3f4f6",
            margin: "0 0 12px",
            textAlign: "center",
          }}
        >
          {scene.title}
        </h1>

        {/* Scene description */}
        <p
          style={{
            maxWidth: 560,
            textAlign: "center",
            color: "#737373",
            fontSize: 15,
            lineHeight: 1.7,
            marginBottom: 40,
          }}
        >
          {scene.description}
        </p>

        {/* Visual area */}
        <div
          style={{
            width: "100%",
            maxWidth: 720,
            minHeight: 320,
          }}
        >
          {/* Scene 1: Real-Time Monitoring */}
          {scene.id === "monitoring" && (
            <div
              style={{
                background: "#0e0e0e",
                border: "1px solid #1a1a1a",
                borderRadius: 8,
                padding: 24,
              }}
            >
              <div
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 10,
                  color: "#525252",
                  letterSpacing: 2,
                  marginBottom: 16,
                }}
              >
                ZONE DENSITY — LIVE
              </div>
              {ZONES.map((zone, i) => {
                const d = zoneDensities[i] ?? 0;
                return (
                <div key={zone.name} style={{ marginBottom: 14 }}>
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
                        fontSize: 12,
                        color: "#9ca3af",
                      }}
                    >
                      {zone.name}
                    </span>
                    <span
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: 12,
                        color:
                          d > 70
                            ? "#ef4444"
                            : d > 50
                              ? "#f59e0b"
                              : "#22c55e",
                      }}
                    >
                      {d}%
                    </span>
                  </div>
                  <div
                    style={{
                      height: 6,
                      background: "#111111",
                      borderRadius: 3,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${d}%`,
                        background:
                          d > 70
                            ? "#ef4444"
                            : d > 50
                              ? "#f59e0b"
                              : "#22c55e",
                        borderRadius: 3,
                        transition: "width 0.15s ease",
                      }}
                    />
                  </div>
                </div>
                );
              })}
            </div>
          )}

          {/* Scene 2: Threat Detection */}
          {scene.id === "threat" && (
            <div
              style={{
                background: "#0e0e0e",
                border: alertVisible ? "1px solid #ef444466" : "1px solid #1a1a1a",
                borderRadius: 8,
                padding: 24,
                transition: "border-color 0.5s ease",
              }}
            >
              <div
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 10,
                  color: "#525252",
                  letterSpacing: 2,
                  marginBottom: 20,
                }}
              >
                THREAT FEED
              </div>

              {/* Alert card */}
              <div
                style={{
                  opacity: alertVisible ? 1 : 0,
                  transform: alertVisible ? "translateY(0)" : "translateY(20px)",
                  transition: "all 0.6s ease",
                  background: "#111111",
                  border: "1px solid #ef444444",
                  borderRadius: 6,
                  padding: 20,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 12,
                  }}
                >
                  {/* Pulsing indicator */}
                  <div
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      background: "#ef4444",
                      boxShadow: alertPulse
                        ? "0 0 16px #ef4444, 0 0 32px #ef444466"
                        : "0 0 4px #ef4444",
                      animation: alertPulse ? "demo-pulse 1.5s ease-in-out infinite" : "none",
                    }}
                  />
                  <span
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#ef4444",
                      letterSpacing: 1,
                    }}
                  >
                    CROWD_SURGE
                  </span>
                  <span
                    style={{
                      marginLeft: "auto",
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 10,
                      background: "#ef444422",
                      color: "#ef4444",
                      padding: "3px 10px",
                      borderRadius: 3,
                      letterSpacing: 1,
                    }}
                  >
                    SEV 5 — CRITICAL
                  </span>
                </div>
                <div
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 12,
                    color: "#9ca3af",
                    lineHeight: 1.6,
                  }}
                >
                  Security Checkpoint A density at 94%. 312 tracked objects. Dwell time
                  exceeding SLA by 4.2 minutes. Confidence: 0.96
                </div>
                <div
                  style={{
                    marginTop: 16,
                    display: "flex",
                    gap: 10,
                  }}
                >
                  <button
                    style={{
                      background: "#ef444422",
                      border: "1px solid #ef444444",
                      color: "#ef4444",
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 11,
                      padding: "6px 16px",
                      borderRadius: 4,
                      cursor: "pointer",
                      letterSpacing: 1,
                    }}
                  >
                    ACKNOWLEDGE
                  </button>
                  <button
                    style={{
                      background: "none",
                      border: "1px solid #1a1a1a",
                      color: "#737373",
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 11,
                      padding: "6px 16px",
                      borderRadius: 4,
                      cursor: "pointer",
                      letterSpacing: 1,
                    }}
                  >
                    ESCALATE
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Scene 3: Predictive Intelligence */}
          {scene.id === "predictive" && (
            <div
              style={{
                background: "#0e0e0e",
                border: "1px solid #1a1a1a",
                borderRadius: 8,
                padding: 24,
              }}
            >
              <div
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 10,
                  color: "#525252",
                  letterSpacing: 2,
                  marginBottom: 20,
                }}
              >
                SURGE PREDICTION ENGINE
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 32,
                  marginBottom: 24,
                }}
              >
                {/* ETA circle */}
                <div
                  style={{
                    width: 140,
                    height: 140,
                    borderRadius: "50%",
                    border: `3px solid ${predictionEta <= 10 ? "#ef4444" : "#f59e0b"}`,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: `0 0 24px ${predictionEta <= 10 ? "#ef444433" : "#f59e0b33"}`,
                    transition: "all 0.3s ease",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'Bebas Neue', sans-serif",
                      fontSize: 48,
                      color: predictionEta <= 10 ? "#ef4444" : "#f59e0b",
                      lineHeight: 1,
                    }}
                  >
                    {predictionEta}
                  </span>
                  <span
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 10,
                      color: "#737373",
                      letterSpacing: 1,
                    }}
                  >
                    MIN ETA
                  </span>
                </div>

                <div>
                  <div
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 10,
                      background: "#ef444422",
                      color: "#ef4444",
                      padding: "4px 12px",
                      borderRadius: 3,
                      letterSpacing: 2,
                      marginBottom: 12,
                      display: "inline-block",
                    }}
                  >
                    CRITICAL
                  </div>
                  <div
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 12,
                      color: "#9ca3af",
                      marginBottom: 4,
                    }}
                  >
                    Security Checkpoint A
                  </div>
                  <div
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 11,
                      color: "#525252",
                    }}
                  >
                    Confidence: 0.91
                  </div>
                </div>
              </div>

              <div
                style={{
                  borderTop: "1px solid #1a1a1a",
                  paddingTop: 16,
                }}
              >
                <div
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 10,
                    color: "#525252",
                    letterSpacing: 2,
                    marginBottom: 10,
                  }}
                >
                  RECOMMENDED ACTIONS
                </div>
                {RECOMMENDED_ACTIONS.map((action, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 8,
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 12,
                      color: "#9ca3af",
                    }}
                  >
                    <span style={{ color: "#f59e0b" }}>{i + 1}.</span>
                    {action}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Scene 4: Operator Performance */}
          {scene.id === "performance" && (
            <div
              style={{
                background: "#0e0e0e",
                border: "1px solid #1a1a1a",
                borderRadius: 8,
                padding: 24,
              }}
            >
              <div
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 10,
                  color: "#525252",
                  letterSpacing: 2,
                  marginBottom: 16,
                }}
              >
                WEEKLY LEADERBOARD
              </div>
              {LEADERBOARD.map((entry, i) => (
                <div
                  key={entry.rank}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    padding: "10px 12px",
                    marginBottom: 4,
                    background: i === 0 ? "#f59e0b0a" : "transparent",
                    borderRadius: 4,
                    border:
                      i === 0 ? "1px solid #f59e0b22" : "1px solid transparent",
                    opacity: leaderboardVisible[i] ? 1 : 0,
                    transform: leaderboardVisible[i]
                      ? "translateX(0)"
                      : "translateX(-20px)",
                    transition: "all 0.4s ease",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'Bebas Neue', sans-serif",
                      fontSize: 24,
                      color: i === 0 ? "#f59e0b" : "#525252",
                      width: 32,
                    }}
                  >
                    {entry.rank}
                  </span>
                  <span
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 13,
                      color: "#d4d4d4",
                      flex: 1,
                    }}
                  >
                    {entry.name}
                  </span>
                  <span
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 10,
                      color: "#f59e0b",
                      background: "#f59e0b11",
                      padding: "3px 8px",
                      borderRadius: 3,
                    }}
                  >
                    {entry.streak}d streak
                  </span>
                  <span
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 10,
                      color: "#737373",
                      background: "#111111",
                      padding: "3px 8px",
                      borderRadius: 3,
                    }}
                  >
                    {entry.badge}
                  </span>
                  <span
                    style={{
                      fontFamily: "'Bebas Neue', sans-serif",
                      fontSize: 22,
                      color: i === 0 ? "#f59e0b" : "#9ca3af",
                      width: 52,
                      textAlign: "right",
                    }}
                  >
                    {entry.score}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Scene 5: Compliance */}
          {scene.id === "compliance" && (
            <div
              style={{
                background: "#0e0e0e",
                border: "1px solid #1a1a1a",
                borderRadius: 8,
                padding: 24,
              }}
            >
              <div
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 10,
                  color: "#525252",
                  letterSpacing: 2,
                  marginBottom: 16,
                }}
              >
                COMPLIANCE CONTROLS
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                }}
              >
                {COMPLIANCE_CONTROLS.map((control, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 12px",
                      background: "#111111",
                      borderRadius: 4,
                      border: checksVisible[i]
                        ? "1px solid #22c55e33"
                        : "1px solid #1a1a1a",
                      opacity: checksVisible[i] ? 1 : 0,
                      transform: checksVisible[i]
                        ? "translateY(0)"
                        : "translateY(10px)",
                      transition: "all 0.4s ease",
                    }}
                  >
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        background: checksVisible[i] ? "#22c55e22" : "#1a1a1a",
                        border: checksVisible[i]
                          ? "1.5px solid #22c55e"
                          : "1.5px solid #333",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 11,
                        color: "#22c55e",
                        transition: "all 0.3s ease",
                        flexShrink: 0,
                      }}
                    >
                      {checksVisible[i] ? "\u2713" : ""}
                    </div>
                    <span
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: 11,
                        color: "#9ca3af",
                      }}
                    >
                      {control}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Scene 6: Multi-Vertical */}
          {scene.id === "multivertical" && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 12,
              }}
            >
              {FACILITY_TYPES.map((fac, i) => (
                <div
                  key={fac.name}
                  style={{
                    background: "#0e0e0e",
                    border: "1px solid #1a1a1a",
                    borderRadius: 8,
                    padding: 20,
                    opacity: facilitiesVisible[i] ? 1 : 0,
                    transform: facilitiesVisible[i]
                      ? "translateY(0) scale(1)"
                      : "translateY(16px) scale(0.96)",
                    transition: "all 0.5s ease",
                  }}
                >
                  <div style={{ fontSize: 28, marginBottom: 8 }}>{fac.icon}</div>
                  <div
                    style={{
                      fontFamily: "'Bebas Neue', sans-serif",
                      fontSize: 20,
                      letterSpacing: 1,
                      color: "#f3f4f6",
                      marginBottom: 6,
                    }}
                  >
                    {fac.name}
                  </div>
                  <div
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 11,
                      color: "#737373",
                      lineHeight: 1.5,
                    }}
                  >
                    {fac.desc}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Navigation buttons */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginTop: 40,
          }}
        >
          {currentScene > 0 && (
            <button
              onClick={prevScene}
              style={{
                background: "none",
                border: "1px solid #1a1a1a",
                color: "#737373",
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 12,
                padding: "10px 24px",
                borderRadius: 4,
                cursor: "pointer",
                letterSpacing: 1,
              }}
            >
              BACK
            </button>
          )}
          {currentScene < SCENES.length - 1 ? (
            <button
              onClick={nextScene}
              style={{
                background: "#f59e0b11",
                border: "1px solid #f59e0b44",
                color: "#f59e0b",
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 12,
                padding: "10px 24px",
                borderRadius: 4,
                cursor: "pointer",
                letterSpacing: 1,
              }}
            >
              NEXT
            </button>
          ) : (
            <button
              onClick={() => navigate("/login")}
              style={{
                background: "linear-gradient(135deg, #f59e0b, #d97706)",
                border: "none",
                color: "#080808",
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 13,
                fontWeight: 600,
                padding: "12px 32px",
                borderRadius: 6,
                cursor: "pointer",
                letterSpacing: 1,
                boxShadow: "0 0 24px #f59e0b44",
              }}
            >
              START FREE TRIAL
            </button>
          )}
        </div>
      </main>

      {/* Progress dots */}
      <div
        style={{
          position: "fixed",
          bottom: 32,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: 10,
          zIndex: 100,
        }}
      >
        {SCENES.map((_, i) => (
          <button
            key={i}
            onClick={() => goToScene(i)}
            style={{
              width: i === currentScene ? 24 : 8,
              height: 8,
              borderRadius: 4,
              border: "none",
              background: i === currentScene ? "#f59e0b" : "#333",
              cursor: "pointer",
              transition: "all 0.3s ease",
              padding: 0,
            }}
            aria-label={`Go to scene ${i + 1}`}
          />
        ))}
      </div>

      {/* Pulse animation style */}
      <style>{`
        @keyframes demo-pulse {
          0%, 100% { box-shadow: 0 0 4px #ef4444, 0 0 8px #ef444444; }
          50% { box-shadow: 0 0 16px #ef4444, 0 0 32px #ef444466; }
        }
      `}</style>
    </div>
  );
}
