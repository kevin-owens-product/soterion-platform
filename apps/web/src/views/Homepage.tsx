import React, { useRef, useEffect, useState, CSSProperties } from "react";
import { useNavigate } from "react-router-dom";

/* ─── DESIGN TOKENS ─── */
const C = {
  bg: "#080808",
  surface: "#0e0e0e",
  surfaceAlt: "#111111",
  border: "#1a1a1a",
  text: "#d4d4d4",
  muted: "#737373",
  dim: "#525252",
  accent: "#f59e0b",
  accentDim: "#b47708",
  critical: "#ef4444",
  high: "#f97316",
  ok: "#22c55e",
  info: "#06b6d4",
  white: "#f3f4f6",
} as const;

const F = {
  display: "'Bebas Neue', sans-serif",
  mono: "'IBM Plex Mono', monospace",
  body: "'Barlow', sans-serif",
} as const;

/* ─── HELPERS ─── */
const sectionPadding: CSSProperties = {
  padding: "100px 24px",
  maxWidth: 1200,
  margin: "0 auto",
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: F.mono,
        fontSize: 11,
        letterSpacing: 3,
        textTransform: "uppercase",
        color: C.accent,
        marginBottom: 12,
      }}
    >
      {children}
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontFamily: F.display,
        fontSize: "clamp(36px, 5vw, 56px)",
        color: C.white,
        letterSpacing: 1,
        lineHeight: 1.1,
        marginBottom: 20,
      }}
    >
      {children}
    </h2>
  );
}

function Divider() {
  return (
    <div
      style={{
        width: "100%",
        height: 1,
        background: `linear-gradient(90deg, transparent, ${C.border}, transparent)`,
      }}
    />
  );
}

/* ─── FADE-IN ON SCROLL ─── */
function FadeIn({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0] && entries[0].isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ─── DATA ─── */
const NAV_LINKS = ["Platform", "Industries", "Modules", "Security", "Pricing"];

const STATS = [
  { label: "Detection", value: "< 50ms" },
  { label: "Uptime", value: "99.99%" },
  { label: "PII Stored", value: "Zero" },
  { label: "FedRAMP Controls", value: "325+" },
];

const TRUSTED = [
  "Major US Airports",
  "International Seaports",
  "Premier League Stadiums",
  "NHS Hospital Trusts",
];

const PLATFORM_COLS = [
  {
    step: "01",
    title: "SENSE",
    desc: "LiDAR sensors capture 3D point clouds at 300,000 points/sec. No faces. No identities. Just spatial data.",
    icon: "\u25C9", // ◉
  },
  {
    step: "02",
    title: "ANALYZE",
    desc: "AI models detect anomalies, predict crowd surges, and score operator performance in real-time.",
    icon: "\u25B3", // △
  },
  {
    step: "03",
    title: "ACT",
    desc: "Operators get instant alerts, playbooks activate automatically, and compliance reports generate themselves.",
    icon: "\u25A0", // ■
  },
];

const INDUSTRIES = [
  {
    icon: "\u2708",
    name: "Airports",
    useCases: [
      "Queue intelligence & wait-time prediction",
      "Perimeter security & airside intrusion",
      "Crowd surge detection at gates & terminals",
    ],
    anomalies: "Intrusion, Loitering, Crowd Surge, Drone Detection, Wrong-Way Flow",
    compliance: "TSA, ICAO Annex 17, FedRAMP",
  },
  {
    icon: "\u2693",
    name: "Seaports",
    useCases: [
      "Container yard monitoring & tracking",
      "Berth security & quayside enforcement",
      "Vehicle speed enforcement & routing",
    ],
    anomalies: "Vehicle Overspeed, Unauthorized Vehicle, Container Proximity, Perimeter Breach",
    compliance: "ISO 28000, ISPS Code, GDPR",
  },
  {
    icon: "\u26BD",
    name: "Stadiums",
    useCases: [
      "Entry flow management & turnstile analytics",
      "Crowd crush risk prevention",
      "Pitch incursion detection",
    ],
    anomalies: "Crowd Crush Risk, Pitch Incursion, Exit Blockage, Abandoned Object",
    compliance: "Green Guide UK, FIFA Safety, GDPR",
  },
  {
    icon: "\u2695",
    name: "Hospitals",
    useCases: [
      "Restricted area enforcement",
      "Patient fall risk detection",
      "Medical asset tracking & removal alerts",
    ],
    anomalies: "Patient Fall Risk, Restricted Access, Asset Removal, Loitering",
    compliance: "CQC, NHS Estates, HIPAA, GDPR",
  },
  {
    icon: "\u{1F687}",
    name: "Transit Hubs",
    useCases: [
      "Platform density monitoring",
      "Fare barrier analytics & fraud detection",
      "Wrong-way flow detection in corridors",
    ],
    anomalies: "Crowd Surge, Wrong-Way Flow, Loitering, Perimeter Breach",
    compliance: "DfT UK, RSSB, GDPR",
  },
  {
    icon: "\u{1F4E6}",
    name: "Logistics",
    useCases: [
      "Vehicle overspeed detection in yards",
      "Loading bay occupancy monitoring",
      "Unauthorized access to restricted zones",
    ],
    anomalies: "Vehicle Overspeed, Unauthorized Vehicle, Intrusion, Container Proximity",
    compliance: "ISO 28000, HSE UK, GDPR",
  },
];

const MODULES = [
  {
    icon: "\u26A1",
    title: "Real-Time Threat Feed",
    desc: "AI-detected anomalies with severity scoring and one-click acknowledgment.",
    metrics: ["6 threat types", "< 50ms latency"],
  },
  {
    icon: "\u{1F4CA}",
    title: "Queue Intelligence",
    desc: "Predictive wait times, SLA tracking, and throughput optimization.",
    metrics: ["+15/+30 min forecasts", "95% SLA accuracy"],
  },
  {
    icon: "\u{1F5FA}",
    title: "Spatial Heatmaps",
    desc: "Time-lapse density visualization with historical playback.",
    metrics: ["2hr history", "5-min resolution"],
  },
  {
    icon: "\u{1F310}",
    title: "Digital Twin",
    desc: "Live zone map with track path overlays and sensor status.",
    metrics: ["Movement paths", "Behavior scoring"],
  },
  {
    icon: "\u{1F3AF}",
    title: "Operator Gamification",
    desc: "Shift scores, badges, leaderboards, and missions that drive performance.",
    metrics: ["5 score dimensions", "8 badge types"],
  },
  {
    icon: "\u23EA",
    title: "Incident Replay",
    desc: "Track-level playback of security events with timeline scrubbing.",
    metrics: ["\u00B160s window", "Frame-by-frame"],
  },
  {
    icon: "\u{1F6E1}",
    title: "Compliance Engine",
    desc: "SOC 2, FedRAMP, GDPR automated evidence collection and reporting.",
    metrics: ["325 controls", "Immutable audit log"],
  },
  {
    icon: "\u2699",
    title: "Admin Platform",
    desc: "Multi-facility management, RBAC, API keys, and vulnerability tracking.",
    metrics: ["4 facility types", "Role-based access"],
  },
];

const SECURITY_FEATURES = [
  "TLS 1.3 on all connections",
  "AES-256 encryption at rest",
  "bcrypt password hashing (cost 12)",
  "Immutable append-only audit logs",
  "15-minute JWT with refresh rotation",
  "Session management with idle timeout",
  "Rate limiting & brute-force protection",
  "Request-level audit trail with actor attribution",
];

const COMPLIANCE_BADGES = [
  { name: "SOC 2 Type II", color: C.ok },
  { name: "FedRAMP Moderate", color: C.info },
  { name: "GDPR", color: C.accent },
  { name: "ISO 27001", color: C.high },
  { name: "HIPAA", color: C.critical },
];

const PRICING_TIERS = [
  {
    name: "Starter",
    price: "$499/mo",
    features: ["1 facility", "10 sensors", "3 operators", "Core modules", "Email support"],
    cta: "Get Started",
    href: "/signup",
    highlighted: false,
  },
  {
    name: "Professional",
    price: "Custom pricing",
    features: [
      "5 facilities",
      "50 sensors",
      "25 operators",
      "All modules",
      "Priority support",
      "Custom integrations",
    ],
    cta: "Contact Sales",
    href: "/demo",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom pricing",
    features: [
      "Unlimited facilities",
      "Unlimited sensors",
      "Unlimited operators",
      "FedRAMP Moderate",
      "Dedicated CSM",
      "Custom SLAs",
      "On-premise option",
    ],
    cta: "Contact Sales",
    href: "/demo",
    highlighted: false,
  },
];

/* ═══════════════════════════════════════════════ */
/*  HOMEPAGE COMPONENT                             */
/* ═══════════════════════════════════════════════ */

export function Homepage() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [activeIndustry, setActiveIndustry] = useState(0);

  /* Section refs for smooth scroll */
  const platformRef = useRef<HTMLElement>(null);
  const industriesRef = useRef<HTMLElement>(null);
  const modulesRef = useRef<HTMLElement>(null);
  const securityRef = useRef<HTMLElement>(null);
  const pricingRef = useRef<HTMLElement>(null);
  const refs: Record<string, React.RefObject<HTMLElement | null>> = {
    Platform: platformRef,
    Industries: industriesRef,
    Modules: modulesRef,
    Security: securityRef,
    Pricing: pricingRef,
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (section: string) => {
    refs[section]?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  /* ── KEYFRAMES (injected once) ── */
  useEffect(() => {
    const id = "soterion-homepage-styles";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
      @keyframes hero-glow {
        0%, 100% { opacity: 0.35; transform: scale(1); }
        50% { opacity: 0.55; transform: scale(1.08); }
      }
      @keyframes hero-glow-2 {
        0%, 100% { opacity: 0.2; transform: scale(1.05) translate(5%, -3%); }
        50% { opacity: 0.4; transform: scale(0.95) translate(-5%, 3%); }
      }
      @keyframes stat-line {
        0% { width: 0; }
        100% { width: 100%; }
      }
      @keyframes float-in {
        from { opacity: 0; transform: translateY(16px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes scan-line {
        0% { top: 0%; opacity: 0; }
        10% { opacity: 1; }
        90% { opacity: 1; }
        100% { top: 100%; opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }, []);

  return (
    <div
      style={{
        background: C.bg,
        color: C.text,
        fontFamily: F.body,
        minHeight: "100vh",
        overflowX: "hidden",
      }}
    >
      {/* ════════ NAVBAR ════════ */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          padding: "0 24px",
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: scrolled ? "rgba(8,8,8,0.92)" : "transparent",
          backdropFilter: scrolled ? "blur(12px)" : "none",
          borderBottom: scrolled ? `1px solid ${C.border}` : "1px solid transparent",
          transition: "all 0.3s ease",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 48 }}>
          <span
            style={{
              fontFamily: F.display,
              fontSize: 26,
              color: C.accent,
              letterSpacing: 3,
              cursor: "pointer",
            }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            SOTERION
          </span>
          <div
            style={{
              display: "flex",
              gap: 32,
              alignItems: "center",
            }}
            className="nav-links-desktop"
          >
            {NAV_LINKS.map((link) => (
              <span
                key={link}
                onClick={() => scrollTo(link)}
                style={{
                  fontFamily: F.mono,
                  fontSize: 12,
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                  color: C.muted,
                  cursor: "pointer",
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = C.text)}
                onMouseLeave={(e) => (e.currentTarget.style.color = C.muted)}
              >
                {link}
              </span>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button
            onClick={() => navigate("/login")}
            style={{
              fontFamily: F.mono,
              fontSize: 12,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              color: C.muted,
              background: "transparent",
              border: `1px solid ${C.border}`,
              padding: "8px 20px",
              borderRadius: 4,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = C.text;
              e.currentTarget.style.borderColor = C.dim;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = C.muted;
              e.currentTarget.style.borderColor = C.border;
            }}
          >
            Login
          </button>
          <button
            onClick={() => navigate("/demo")}
            style={{
              fontFamily: F.mono,
              fontSize: 12,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              color: C.bg,
              background: C.accent,
              border: "none",
              padding: "8px 20px",
              borderRadius: 4,
              cursor: "pointer",
              fontWeight: 600,
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#d4890a")}
            onMouseLeave={(e) => (e.currentTarget.style.background = C.accent)}
          >
            Request Demo
          </button>
        </div>
      </nav>

      {/* ════════ HERO ════════ */}
      <section
        style={{
          position: "relative",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "120px 24px 80px",
          textAlign: "center",
          overflow: "hidden",
        }}
      >
        {/* Animated background glows */}
        <div
          style={{
            position: "absolute",
            top: "20%",
            left: "30%",
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${C.accent}22 0%, transparent 70%)`,
            animation: "hero-glow 6s ease-in-out infinite",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "40%",
            right: "20%",
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${C.info}15 0%, transparent 70%)`,
            animation: "hero-glow-2 8s ease-in-out infinite",
            pointerEvents: "none",
          }}
        />

        {/* Grid pattern overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `
              linear-gradient(${C.border}33 1px, transparent 1px),
              linear-gradient(90deg, ${C.border}33 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
            maskImage: "radial-gradient(ellipse 70% 60% at 50% 40%, black 20%, transparent 100%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 70% 60% at 50% 40%, black 20%, transparent 100%)",
            pointerEvents: "none",
          }}
        />

        <FadeIn>
          <div
            style={{
              fontFamily: F.mono,
              fontSize: 11,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: C.accent,
              marginBottom: 24,
              display: "flex",
              alignItems: "center",
              gap: 8,
              justifyContent: "center",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: C.ok,
                display: "inline-block",
                boxShadow: `0 0 8px ${C.ok}`,
              }}
            />
            Enterprise LiDAR Intelligence Platform
          </div>
        </FadeIn>

        <FadeIn delay={100}>
          <h1
            style={{
              fontFamily: F.display,
              fontSize: "clamp(48px, 8vw, 80px)",
              color: C.white,
              letterSpacing: 2,
              lineHeight: 1.05,
              marginBottom: 24,
              maxWidth: 900,
            }}
          >
            See Everything.
            <br />
            Store Nothing.
          </h1>
        </FadeIn>

        <FadeIn delay={200}>
          <p
            style={{
              fontSize: "clamp(16px, 2vw, 20px)",
              color: C.muted,
              maxWidth: 680,
              lineHeight: 1.6,
              marginBottom: 40,
            }}
          >
            Enterprise LiDAR intelligence that detects threats, optimizes operations,
            and protects privacy — without a single camera.
          </p>
        </FadeIn>

        <FadeIn delay={300}>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
            <button
              onClick={() => navigate("/demo")}
              style={{
                fontFamily: F.mono,
                fontSize: 13,
                letterSpacing: 1.5,
                textTransform: "uppercase",
                color: C.bg,
                background: C.accent,
                border: "none",
                padding: "14px 32px",
                borderRadius: 4,
                cursor: "pointer",
                fontWeight: 600,
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#d4890a")}
              onMouseLeave={(e) => (e.currentTarget.style.background = C.accent)}
            >
              Watch Demo
            </button>
            <button
              onClick={() => navigate("/signup")}
              style={{
                fontFamily: F.mono,
                fontSize: 13,
                letterSpacing: 1.5,
                textTransform: "uppercase",
                color: C.text,
                background: "transparent",
                border: `1px solid ${C.border}`,
                padding: "14px 32px",
                borderRadius: 4,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = C.accent;
                e.currentTarget.style.color = C.accent;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = C.border;
                e.currentTarget.style.color = C.text;
              }}
            >
              Start Free Trial
            </button>
          </div>
        </FadeIn>

        {/* Stats row */}
        <FadeIn delay={500} style={{ width: "100%", maxWidth: 900, marginTop: 80 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: 1,
              background: C.border,
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            {STATS.map((s) => (
              <div
                key={s.label}
                style={{
                  background: C.surface,
                  padding: "24px 16px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontFamily: F.display,
                    fontSize: 28,
                    color: C.white,
                    letterSpacing: 1,
                    marginBottom: 4,
                  }}
                >
                  {s.value}
                </div>
                <div
                  style={{
                    fontFamily: F.mono,
                    fontSize: 10,
                    letterSpacing: 2,
                    textTransform: "uppercase",
                    color: C.dim,
                  }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </FadeIn>
      </section>

      <Divider />

      {/* ════════ TRUSTED BY ════════ */}
      <section style={{ ...sectionPadding, padding: "60px 24px", textAlign: "center" }}>
        <FadeIn>
          <p
            style={{
              fontFamily: F.mono,
              fontSize: 12,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: C.dim,
              marginBottom: 32,
            }}
          >
            Trusted by security teams at the world's busiest facilities
          </p>
          <div
            style={{
              display: "flex",
              gap: 16,
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            {TRUSTED.map((t) => (
              <span
                key={t}
                style={{
                  fontFamily: F.mono,
                  fontSize: 12,
                  letterSpacing: 1,
                  color: C.muted,
                  padding: "10px 24px",
                  border: `1px solid ${C.border}`,
                  borderRadius: 4,
                  background: C.surface,
                }}
              >
                {t}
              </span>
            ))}
          </div>
        </FadeIn>
      </section>

      <Divider />

      {/* ════════ PLATFORM OVERVIEW ════════ */}
      <section ref={platformRef} style={sectionPadding}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <FadeIn>
            <SectionLabel>How It Works</SectionLabel>
            <SectionHeading>One Platform. Every Physical Space.</SectionHeading>
          </FadeIn>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 1,
            background: C.border,
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          {PLATFORM_COLS.map((col, i) => (
            <FadeIn key={col.title} delay={i * 150}>
              <div
                style={{
                  background: C.surface,
                  padding: "48px 36px",
                  minHeight: 280,
                  display: "flex",
                  flexDirection: "column",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {/* Scan line effect */}
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    height: 1,
                    background: `linear-gradient(90deg, transparent, ${C.accent}40, transparent)`,
                    animation: `scan-line ${4 + i}s ease-in-out infinite`,
                    animationDelay: `${i * 1.5}s`,
                    pointerEvents: "none",
                  }}
                />
                <div
                  style={{
                    fontFamily: F.mono,
                    fontSize: 11,
                    color: C.dim,
                    letterSpacing: 2,
                    marginBottom: 16,
                  }}
                >
                  {col.step}
                </div>
                <div
                  style={{
                    fontSize: 32,
                    marginBottom: 16,
                    opacity: 0.6,
                  }}
                >
                  {col.icon}
                </div>
                <div
                  style={{
                    fontFamily: F.display,
                    fontSize: 32,
                    color: C.accent,
                    letterSpacing: 2,
                    marginBottom: 16,
                  }}
                >
                  {col.title}
                </div>
                <p style={{ color: C.muted, lineHeight: 1.7, fontSize: 15 }}>{col.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      <Divider />

      {/* ════════ INDUSTRIES ════════ */}
      <section ref={industriesRef} style={sectionPadding}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <FadeIn>
            <SectionLabel>Verticals</SectionLabel>
            <SectionHeading>Built for Every Critical Environment</SectionHeading>
            <p style={{ color: C.muted, maxWidth: 600, margin: "0 auto", lineHeight: 1.6 }}>
              Configuration-driven architecture adapts zone taxonomies, anomaly models, and
              compliance frameworks to each vertical.
            </p>
          </FadeIn>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "240px 1fr",
            gap: 0,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            overflow: "hidden",
            minHeight: 420,
          }}
        >
          {/* Tabs */}
          <div
            style={{
              borderRight: `1px solid ${C.border}`,
              background: C.surface,
            }}
          >
            {INDUSTRIES.map((ind, i) => (
              <button
                key={ind.name}
                onClick={() => setActiveIndustry(i)}
                style={{
                  width: "100%",
                  padding: "18px 24px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  background: activeIndustry === i ? C.surfaceAlt : "transparent",
                  border: "none",
                  borderLeft:
                    activeIndustry === i
                      ? `2px solid ${C.accent}`
                      : "2px solid transparent",
                  borderBottom: `1px solid ${C.border}`,
                  cursor: "pointer",
                  fontFamily: F.body,
                  fontSize: 14,
                  color: activeIndustry === i ? C.white : C.muted,
                  textAlign: "left",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  if (activeIndustry !== i) e.currentTarget.style.background = C.surfaceAlt;
                }}
                onMouseLeave={(e) => {
                  if (activeIndustry !== i) e.currentTarget.style.background = "transparent";
                }}
              >
                <span style={{ fontSize: 20 }}>{ind.icon}</span>
                {ind.name}
              </button>
            ))}
          </div>

          {/* Content */}
          <div style={{ padding: "36px 40px", background: C.surfaceAlt }}>
            {(() => {
              const ind = INDUSTRIES[activeIndustry]!;
              return (
                <div key={ind.name} style={{ animation: "float-in 0.3s ease" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      marginBottom: 28,
                    }}
                  >
                    <span style={{ fontSize: 28 }}>{ind.icon}</span>
                    <h3
                      style={{
                        fontFamily: F.display,
                        fontSize: 36,
                        color: C.white,
                        letterSpacing: 2,
                      }}
                    >
                      {ind.name}
                    </h3>
                  </div>

                  <div
                    style={{
                      fontFamily: F.mono,
                      fontSize: 10,
                      letterSpacing: 2,
                      textTransform: "uppercase",
                      color: C.dim,
                      marginBottom: 12,
                    }}
                  >
                    Key Use Cases
                  </div>
                  <ul style={{ listStyle: "none", padding: 0, marginBottom: 28 }}>
                    {ind.useCases.map((uc) => (
                      <li
                        key={uc}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 10,
                          marginBottom: 10,
                          fontSize: 14,
                          color: C.text,
                          lineHeight: 1.5,
                        }}
                      >
                        <span style={{ color: C.accent, fontSize: 8, marginTop: 6 }}>
                          {"\u25C6"}
                        </span>
                        {uc}
                      </li>
                    ))}
                  </ul>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 20,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontFamily: F.mono,
                          fontSize: 10,
                          letterSpacing: 2,
                          textTransform: "uppercase",
                          color: C.dim,
                          marginBottom: 8,
                        }}
                      >
                        Anomaly Detection
                      </div>
                      <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>
                        {ind.anomalies}
                      </p>
                    </div>
                    <div>
                      <div
                        style={{
                          fontFamily: F.mono,
                          fontSize: 10,
                          letterSpacing: 2,
                          textTransform: "uppercase",
                          color: C.dim,
                          marginBottom: 8,
                        }}
                      >
                        Compliance
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {ind.compliance.split(", ").map((c) => (
                          <span
                            key={c}
                            style={{
                              fontFamily: F.mono,
                              fontSize: 10,
                              letterSpacing: 1,
                              color: C.accent,
                              padding: "4px 10px",
                              border: `1px solid ${C.accent}33`,
                              borderRadius: 3,
                              background: `${C.accent}0a`,
                            }}
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Mobile: stack as cards instead */}
        <style>{`
          @media (max-width: 768px) {
            .industries-grid-desktop { display: none !important; }
          }
          @media (min-width: 769px) {
            .industries-mobile-cards { display: none !important; }
          }
        `}</style>
      </section>

      <Divider />

      {/* ════════ MODULES ════════ */}
      <section ref={modulesRef} style={sectionPadding}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <FadeIn>
            <SectionLabel>Modules</SectionLabel>
            <SectionHeading>Eight Modules. Complete Spatial Intelligence.</SectionHeading>
          </FadeIn>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))",
            gap: 1,
            background: C.border,
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          {MODULES.map((mod, i) => (
            <FadeIn key={mod.title} delay={i * 80}>
              <div
                style={{
                  background: C.surface,
                  padding: "32px 28px",
                  minHeight: 220,
                  display: "flex",
                  flexDirection: "column",
                  transition: "background 0.2s",
                  cursor: "default",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = C.surfaceAlt)}
                onMouseLeave={(e) => (e.currentTarget.style.background = C.surface)}
              >
                <div style={{ fontSize: 24, marginBottom: 16 }}>{mod.icon}</div>
                <h4
                  style={{
                    fontFamily: F.display,
                    fontSize: 22,
                    color: C.white,
                    letterSpacing: 1,
                    marginBottom: 10,
                  }}
                >
                  {mod.title}
                </h4>
                <p
                  style={{
                    fontSize: 14,
                    color: C.muted,
                    lineHeight: 1.6,
                    marginBottom: 16,
                    flex: 1,
                  }}
                >
                  {mod.desc}
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {mod.metrics.map((m) => (
                    <span
                      key={m}
                      style={{
                        fontFamily: F.mono,
                        fontSize: 10,
                        letterSpacing: 1,
                        color: C.info,
                        padding: "3px 8px",
                        border: `1px solid ${C.info}33`,
                        borderRadius: 3,
                        background: `${C.info}0a`,
                      }}
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      <Divider />

      {/* ════════ SECURITY & COMPLIANCE ════════ */}
      <section ref={securityRef} style={sectionPadding}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <FadeIn>
            <SectionLabel>Security</SectionLabel>
            <SectionHeading>Built for FedRAMP. Designed for Zero Trust.</SectionHeading>
          </FadeIn>
        </div>

        <FadeIn>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: 1,
              background: C.border,
              borderRadius: 8,
              overflow: "hidden",
              marginBottom: 48,
            }}
          >
            {/* Security features */}
            <div style={{ background: C.surface, padding: "40px 36px" }}>
              <div
                style={{
                  fontFamily: F.mono,
                  fontSize: 11,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  color: C.dim,
                  marginBottom: 24,
                }}
              >
                Security Architecture
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {SECURITY_FEATURES.map((f) => (
                  <li
                    key={f}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      marginBottom: 14,
                      fontSize: 14,
                      color: C.text,
                    }}
                  >
                    <span
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        border: `1px solid ${C.ok}44`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 10,
                        color: C.ok,
                        flexShrink: 0,
                      }}
                    >
                      {"\u2713"}
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Compliance badges */}
            <div style={{ background: C.surface, padding: "40px 36px" }}>
              <div
                style={{
                  fontFamily: F.mono,
                  fontSize: 11,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  color: C.dim,
                  marginBottom: 24,
                }}
              >
                Compliance Certifications
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
                {COMPLIANCE_BADGES.map((b) => (
                  <div
                    key={b.name}
                    style={{
                      border: `1px solid ${b.color}33`,
                      borderRadius: 6,
                      padding: "20px 16px",
                      textAlign: "center",
                      background: `${b.color}08`,
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        border: `1.5px solid ${b.color}66`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto 10px",
                        fontSize: 14,
                        color: b.color,
                      }}
                    >
                      {"\u2713"}
                    </div>
                    <div
                      style={{
                        fontFamily: F.mono,
                        fontSize: 11,
                        letterSpacing: 1,
                        color: b.color,
                      }}
                    >
                      {b.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </FadeIn>

        <FadeIn>
          <div
            style={{
              textAlign: "center",
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: "36px 32px",
            }}
          >
            <p
              style={{
                fontSize: 16,
                color: C.text,
                maxWidth: 700,
                margin: "0 auto",
                lineHeight: 1.7,
              }}
            >
              <span style={{ color: C.accent, fontWeight: 600 }}>Privacy by physics</span> — LiDAR
              sees geometry, not identity. No PII is ever captured, processed, or stored. Point
              clouds contain spatial coordinates and velocity vectors. Nothing more.
            </p>
          </div>
        </FadeIn>
      </section>

      <Divider />

      {/* ════════ PRICING ════════ */}
      <section ref={pricingRef} style={sectionPadding}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <FadeIn>
            <SectionLabel>Pricing</SectionLabel>
            <SectionHeading>Scale from One Facility to Hundreds</SectionHeading>
          </FadeIn>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 24,
            alignItems: "stretch",
          }}
        >
          {PRICING_TIERS.map((tier, i) => (
            <FadeIn key={tier.name} delay={i * 120}>
              <div
                style={{
                  border: `1px solid ${tier.highlighted ? C.accent + "66" : C.border}`,
                  borderRadius: 8,
                  padding: "40px 32px",
                  background: tier.highlighted ? C.surfaceAlt : C.surface,
                  display: "flex",
                  flexDirection: "column",
                  position: "relative",
                  overflow: "hidden",
                  height: "100%",
                }}
              >
                {tier.highlighted && (
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 2,
                      background: `linear-gradient(90deg, transparent, ${C.accent}, transparent)`,
                    }}
                  />
                )}
                <div
                  style={{
                    fontFamily: F.mono,
                    fontSize: 10,
                    letterSpacing: 2,
                    textTransform: "uppercase",
                    color: tier.highlighted ? C.accent : C.dim,
                    marginBottom: 8,
                  }}
                >
                  {tier.highlighted ? "Most Popular" : "\u00A0"}
                </div>
                <h3
                  style={{
                    fontFamily: F.display,
                    fontSize: 32,
                    color: C.white,
                    letterSpacing: 2,
                    marginBottom: 8,
                  }}
                >
                  {tier.name}
                </h3>
                <div
                  style={{
                    fontFamily: F.mono,
                    fontSize: 14,
                    color: tier.price === "Custom pricing" ? C.muted : C.accent,
                    marginBottom: 28,
                  }}
                >
                  {tier.price}
                </div>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, flex: 1 }}>
                  {tier.features.map((f) => (
                    <li
                      key={f}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        marginBottom: 12,
                        fontSize: 14,
                        color: C.text,
                      }}
                    >
                      <span style={{ color: C.dim, fontSize: 8 }}>{"\u25C6"}</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => navigate(tier.href)}
                  style={{
                    fontFamily: F.mono,
                    fontSize: 12,
                    letterSpacing: 1.5,
                    textTransform: "uppercase",
                    color: tier.highlighted ? C.bg : C.text,
                    background: tier.highlighted ? C.accent : "transparent",
                    border: tier.highlighted ? "none" : `1px solid ${C.border}`,
                    padding: "12px 24px",
                    borderRadius: 4,
                    cursor: "pointer",
                    fontWeight: 600,
                    marginTop: 16,
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    if (tier.highlighted) {
                      e.currentTarget.style.background = "#d4890a";
                    } else {
                      e.currentTarget.style.borderColor = C.accent;
                      e.currentTarget.style.color = C.accent;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (tier.highlighted) {
                      e.currentTarget.style.background = C.accent;
                    } else {
                      e.currentTarget.style.borderColor = C.border;
                      e.currentTarget.style.color = C.text;
                    }
                  }}
                >
                  {tier.cta}
                </button>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      <Divider />

      {/* ════════ CTA SECTION ════════ */}
      <section
        style={{
          ...sectionPadding,
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Subtle glow */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 600,
            height: 300,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${C.accent}12 0%, transparent 70%)`,
            pointerEvents: "none",
          }}
        />
        <FadeIn>
          <SectionHeading>Ready to See What You've Been Missing?</SectionHeading>
          <p
            style={{
              color: C.muted,
              fontSize: 16,
              maxWidth: 500,
              margin: "0 auto 40px",
              lineHeight: 1.6,
            }}
          >
            Deploy LiDAR intelligence across your facilities in weeks, not months.
            No cameras. No PII. No compromise.
          </p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => navigate("/demo")}
              style={{
                fontFamily: F.mono,
                fontSize: 13,
                letterSpacing: 1.5,
                textTransform: "uppercase",
                color: C.bg,
                background: C.accent,
                border: "none",
                padding: "14px 32px",
                borderRadius: 4,
                cursor: "pointer",
                fontWeight: 600,
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#d4890a")}
              onMouseLeave={(e) => (e.currentTarget.style.background = C.accent)}
            >
              Request Demo
            </button>
            <button
              onClick={() => navigate("/signup")}
              style={{
                fontFamily: F.mono,
                fontSize: 13,
                letterSpacing: 1.5,
                textTransform: "uppercase",
                color: C.text,
                background: "transparent",
                border: `1px solid ${C.border}`,
                padding: "14px 32px",
                borderRadius: 4,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = C.accent;
                e.currentTarget.style.color = C.accent;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = C.border;
                e.currentTarget.style.color = C.text;
              }}
            >
              Start Free Trial
            </button>
          </div>
        </FadeIn>
      </section>

      <Divider />

      {/* ════════ FOOTER ════════ */}
      <footer
        style={{
          padding: "60px 24px 40px",
          maxWidth: 1200,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 40,
            marginBottom: 40,
          }}
        >
          <div>
            <span
              style={{
                fontFamily: F.display,
                fontSize: 22,
                color: C.accent,
                letterSpacing: 3,
              }}
            >
              SOTERION
            </span>
            <p
              style={{
                fontFamily: F.mono,
                fontSize: 11,
                color: C.dim,
                marginTop: 8,
                letterSpacing: 1,
                maxWidth: 280,
                lineHeight: 1.6,
              }}
            >
              Enterprise LiDAR intelligence for physical security and operations. Privacy by physics.
            </p>
          </div>

          <div style={{ display: "flex", gap: 48, flexWrap: "wrap" }}>
            <div>
              <div
                style={{
                  fontFamily: F.mono,
                  fontSize: 10,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  color: C.dim,
                  marginBottom: 16,
                }}
              >
                Product
              </div>
              {["Platform", "Industries", "Modules", "Security", "Pricing"].map((link) => (
                <div
                  key={link}
                  style={{
                    fontSize: 13,
                    color: C.muted,
                    cursor: "pointer",
                    marginBottom: 10,
                    transition: "color 0.2s",
                  }}
                  onClick={() => scrollTo(link)}
                  onMouseEnter={(e) => (e.currentTarget.style.color = C.text)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = C.muted)}
                >
                  {link}
                </div>
              ))}
            </div>
            <div>
              <div
                style={{
                  fontFamily: F.mono,
                  fontSize: 10,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  color: C.dim,
                  marginBottom: 16,
                }}
              >
                Resources
              </div>
              {[
                { label: "API Docs", href: "/docs/api" },
                { label: "Login", href: "/login" },
                { label: "Sign Up", href: "/signup" },
                { label: "Request Demo", href: "/demo" },
              ].map((link) => (
                <div
                  key={link.label}
                  style={{
                    fontSize: 13,
                    color: C.muted,
                    cursor: "pointer",
                    marginBottom: 10,
                    transition: "color 0.2s",
                  }}
                  onClick={() => navigate(link.href)}
                  onMouseEnter={(e) => (e.currentTarget.style.color = C.text)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = C.muted)}
                >
                  {link.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div
          style={{
            borderTop: `1px solid ${C.border}`,
            paddingTop: 24,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <span style={{ fontFamily: F.mono, fontSize: 11, color: C.dim }}>
            &copy; 2026 Soterion AI. All rights reserved.
          </span>
          <div style={{ display: "flex", gap: 20 }}>
            {["Privacy Policy", "Terms of Service", "Security"].map((link) => (
              <span
                key={link}
                style={{
                  fontFamily: F.mono,
                  fontSize: 11,
                  color: C.dim,
                  cursor: "pointer",
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = C.muted)}
                onMouseLeave={(e) => (e.currentTarget.style.color = C.dim)}
              >
                {link}
              </span>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
