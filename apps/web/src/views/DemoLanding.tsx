import { useNavigate } from "react-router-dom";

const FEATURES = [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
    title: "Real-Time Spatial Intelligence",
    desc: "LiDAR sensors track density, flow, and dwell across every zone. No cameras, no PII, no blind spots.",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
    title: "AI Threat Detection",
    desc: "Crowd surges, intrusions, abandoned objects, and perimeter breaches detected in milliseconds with ONNX edge inference.",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.5">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    title: "Predictive Surge Forecasting",
    desc: "ML models predict density surges 8-15 minutes ahead. Recommended actions surface automatically.",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="1.5">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
    title: "Gamified Operator Performance",
    desc: "Shift scores, streaks, badges, and leaderboards transform operations into a high-performance culture.",
  },
];

const VERTICALS = ["Airports", "Seaports", "Stadiums", "Transit Hubs", "Hospitals"];

export function DemoLanding() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#080808",
        color: "#d4d4d4",
        fontFamily: "'Barlow', sans-serif",
        overflow: "hidden",
      }}
    >
      {/* Nav */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 32px",
          maxWidth: 1200,
          margin: "0 auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={() => navigate("/demo")}
            style={{
              background: "none",
              border: "1px solid #f59e0b44",
              color: "#f59e0b",
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 12,
              padding: "8px 20px",
              borderRadius: 4,
              cursor: "pointer",
              letterSpacing: 1,
            }}
          >
            LIVE DEMO
          </button>
          <button
            onClick={() => navigate("/login")}
            style={{
              background: "#f59e0b",
              border: "none",
              color: "#080808",
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 12,
              fontWeight: 600,
              padding: "8px 20px",
              borderRadius: 4,
              cursor: "pointer",
              letterSpacing: 1,
            }}
          >
            LOGIN
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "80px 32px 60px",
          textAlign: "center",
        }}
      >
        {/* Ambient glow */}
        <div
          style={{
            position: "absolute",
            top: "10%",
            left: "50%",
            transform: "translateX(-50%)",
            width: 600,
            height: 400,
            background: "radial-gradient(ellipse, #f59e0b08, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11,
            color: "#f59e0b",
            letterSpacing: 4,
            textTransform: "uppercase",
            marginBottom: 16,
          }}
        >
          LiDAR Spatial Intelligence
        </div>

        <h1
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: "clamp(40px, 7vw, 80px)",
            letterSpacing: 2,
            color: "#f3f4f6",
            margin: "0 0 20px",
            lineHeight: 1.05,
          }}
        >
          The Platform Airports Use
          <br />
          <span style={{ color: "#f59e0b" }}>To See Everything They{"'"}re Missing</span>
        </h1>

        <p
          style={{
            maxWidth: 620,
            margin: "0 auto 40px",
            color: "#737373",
            fontSize: 16,
            lineHeight: 1.7,
          }}
        >
          Soterion transforms LiDAR point clouds into real-time threat detection,
          passenger flow intelligence, and operator performance analytics. Privacy by
          physics — no cameras, no PII, no compromise.
        </p>

        <div style={{ display: "flex", justifyContent: "center", gap: 16 }}>
          <button
            onClick={() => navigate("/demo")}
            style={{
              background: "linear-gradient(135deg, #f59e0b, #d97706)",
              border: "none",
              color: "#080808",
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 14,
              fontWeight: 600,
              padding: "14px 36px",
              borderRadius: 6,
              cursor: "pointer",
              letterSpacing: 1,
              boxShadow: "0 0 32px #f59e0b33",
            }}
          >
            WATCH LIVE DEMO
          </button>
          <button
            onClick={() => navigate("/login")}
            style={{
              background: "none",
              border: "1px solid #1a1a1a",
              color: "#d4d4d4",
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 14,
              padding: "14px 36px",
              borderRadius: 6,
              cursor: "pointer",
              letterSpacing: 1,
            }}
          >
            SIGN IN
          </button>
        </div>

        {/* Vertical tags */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 8,
            marginTop: 40,
            flexWrap: "wrap",
          }}
        >
          {VERTICALS.map((v) => (
            <span
              key={v}
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 10,
                color: "#525252",
                border: "1px solid #1a1a1a",
                padding: "4px 12px",
                borderRadius: 3,
                letterSpacing: 1,
              }}
            >
              {v.toUpperCase()}
            </span>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "40px 32px 80px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 20,
        }}
      >
        {FEATURES.map((f) => (
          <div
            key={f.title}
            style={{
              background: "#0e0e0e",
              border: "1px solid #1a1a1a",
              borderRadius: 8,
              padding: 28,
              transition: "border-color 0.2s ease",
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLDivElement).style.borderColor = "#f59e0b33")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLDivElement).style.borderColor = "#1a1a1a")
            }
          >
            <div style={{ marginBottom: 16 }}>{f.icon}</div>
            <h3
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 20,
                letterSpacing: 1,
                color: "#f3f4f6",
                margin: "0 0 8px",
              }}
            >
              {f.title}
            </h3>
            <p
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 12,
                color: "#737373",
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              {f.desc}
            </p>
          </div>
        ))}
      </section>

      {/* Stats bar */}
      <section
        style={{
          borderTop: "1px solid #1a1a1a",
          borderBottom: "1px solid #1a1a1a",
          padding: "32px 0",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-around",
            flexWrap: "wrap",
            gap: 24,
            padding: "0 32px",
          }}
        >
          {[
            { value: "<50ms", label: "Detection Latency" },
            { value: "99.99%", label: "Uptime SLA" },
            { value: "0", label: "PII Collected" },
            { value: "325", label: "FedRAMP Controls" },
          ].map((s) => (
            <div key={s.label} style={{ textAlign: "center" }}>
              <div
                style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: 36,
                  color: "#f59e0b",
                  lineHeight: 1,
                  marginBottom: 4,
                }}
              >
                {s.value}
              </div>
              <div
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 10,
                  color: "#525252",
                  letterSpacing: 2,
                }}
              >
                {s.label.toUpperCase()}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          padding: "40px 32px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11,
            color: "#333",
            letterSpacing: 1,
          }}
        >
          SOTERION AI PLATFORM — SPATIAL INTELLIGENCE FOR CRITICAL INFRASTRUCTURE
        </div>
      </footer>
    </div>
  );
}
