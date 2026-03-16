import { useState, useEffect, useMemo } from "react";
import { apiFetch } from "@/lib/api";
import { W12_ROICalculator } from "@/widgets/W12_ROICalculator";

// ── Types ────────────────────────────────────────────────
interface SessionStats {
  total_active: number;
  by_facility: Array<{ facility_name: string; facility_code: string; active_sessions: number }>;
}

interface SecurityDashboard {
  incidents: {
    open_incidents: number;
    critical_open: number;
    high_open: number;
    medium_open: number;
    low_open: number;
  };
  vulnerabilities: {
    open_vulns: number;
    critical_open: number;
    high_open: number;
    overdue_vulns: number;
  };
}

interface Soc2Status {
  overall_status: string;
  criteria: Record<string, {
    label: string;
    status: string;
    controls_total: number;
    controls_passing: number;
  }>;
}

interface FedRampStatus {
  total_controls: number;
  controls_implemented: number;
  implementation_rate: number;
}

// ── Admin Dashboard ────────────────────────────────────────

export function AdminDashboard() {
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null);
  const [securityDash, setSecurityDash] = useState<SecurityDashboard | null>(null);
  const [soc2, setSoc2] = useState<Soc2Status | null>(null);
  const [fedramp, setFedramp] = useState<FedRampStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch<SessionStats>("/api/v1/admin/sessions/stats").catch(() => null),
      apiFetch<SecurityDashboard>("/api/v1/admin/security/dashboard").catch(() => null),
      apiFetch<Soc2Status>("/api/v1/admin/compliance/soc2").catch(() => null),
      apiFetch<FedRampStatus>("/api/v1/admin/compliance/fedramp").catch(() => null),
    ]).then(([s, sec, soc, fed]) => {
      setSessionStats(s);
      setSecurityDash(sec);
      setSoc2(soc);
      setFedramp(fed);
      setLoading(false);
    });
  }, []);

  const complianceRate = useMemo(() => {
    if (!soc2) return 0;
    const criteria = Object.values(soc2.criteria);
    const total = criteria.reduce((s, c) => s + c.controls_total, 0);
    const passing = criteria.reduce((s, c) => s + c.controls_passing, 0);
    return total > 0 ? Math.round((passing / total) * 100) : 0;
  }, [soc2]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl tracking-wider text-gray-100">
          ADMIN DASHBOARD
        </h1>
        <span className="text-xs font-mono text-gray-500">
          Platform health & compliance posture
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse font-mono text-sm text-gray-500">Loading dashboard...</div>
        </div>
      ) : (
        <>
        {/* ROI Calculator - prominent section */}
        <div className="mb-6">
          <W12_ROICalculator />
        </div>

        <div className="grid grid-cols-12 gap-4">
          {/* Compliance Posture Ring */}
          <div className="col-span-4 rounded-lg border border-[#1a1a1a] bg-[#0e0e0e] p-4">
            <span className="font-mono text-[10px] text-[#f59e0b] tracking-widest uppercase">
              Compliance Posture
            </span>
            <div className="flex items-center gap-6 mt-4">
              <ComplianceRing label="SOC 2" rate={complianceRate} color="#22c55e" />
              <ComplianceRing label="FedRAMP" rate={fedramp?.implementation_rate ?? 0} color="#06b6d4" />
            </div>
            <div className="mt-4 space-y-1">
              {soc2 && Object.entries(soc2.criteria).map(([key, c]) => (
                <div key={key} className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-gray-500">{c.label}</span>
                  <StatusBadge status={c.status} />
                </div>
              ))}
            </div>
          </div>

          {/* Active Sessions */}
          <div className="col-span-4 rounded-lg border border-[#1a1a1a] bg-[#0e0e0e] p-4">
            <span className="font-mono text-[10px] text-[#f59e0b] tracking-widest uppercase">
              Active Sessions
            </span>
            <div className="mt-3">
              <span className="font-display text-4xl text-gray-100">
                {sessionStats?.total_active ?? 0}
              </span>
              <span className="text-xs font-mono text-gray-500 ml-2">total active</span>
            </div>
            <div className="mt-4 space-y-2">
              {(Array.isArray(sessionStats?.by_facility) ? sessionStats.by_facility : []).map((f) => (
                <div key={f.facility_code} className="flex items-center justify-between">
                  <span className="text-xs font-mono text-gray-400">
                    {f.facility_code} - {f.facility_name}
                  </span>
                  <span className="text-xs font-mono text-gray-200">{f.active_sessions}</span>
                </div>
              ))}
              {(!sessionStats || !Array.isArray(sessionStats.by_facility) || sessionStats.by_facility.length === 0) && (
                <span className="text-xs font-mono text-gray-600">No active sessions</span>
              )}
            </div>
          </div>

          {/* Open Incidents */}
          <div className="col-span-4 rounded-lg border border-[#1a1a1a] bg-[#0e0e0e] p-4">
            <span className="font-mono text-[10px] text-[#f59e0b] tracking-widest uppercase">
              Open Incidents
            </span>
            <div className="mt-3">
              <span className="font-display text-4xl text-gray-100">
                {securityDash?.incidents.open_incidents ?? 0}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <SeverityCard label="Critical" value={securityDash?.incidents.critical_open ?? 0} color="#ef4444" />
              <SeverityCard label="High" value={securityDash?.incidents.high_open ?? 0} color="#f97316" />
              <SeverityCard label="Medium" value={securityDash?.incidents.medium_open ?? 0} color="#f59e0b" />
              <SeverityCard label="Low" value={securityDash?.incidents.low_open ?? 0} color="#22c55e" />
            </div>
          </div>

          {/* Vulnerability Summary */}
          <div className="col-span-6 rounded-lg border border-[#1a1a1a] bg-[#0e0e0e] p-4">
            <span className="font-mono text-[10px] text-[#f59e0b] tracking-widest uppercase">
              Vulnerability Summary
            </span>
            <div className="mt-3 grid grid-cols-4 gap-3">
              <StatBlock label="Open" value={securityDash?.vulnerabilities.open_vulns ?? 0} color="#d4d4d4" />
              <StatBlock label="Critical" value={securityDash?.vulnerabilities.critical_open ?? 0} color="#ef4444" />
              <StatBlock label="High" value={securityDash?.vulnerabilities.high_open ?? 0} color="#f97316" />
              <StatBlock
                label="Overdue"
                value={securityDash?.vulnerabilities.overdue_vulns ?? 0}
                color={(securityDash?.vulnerabilities.overdue_vulns ?? 0) > 0 ? "#ef4444" : "#22c55e"}
              />
            </div>
            <div className="mt-3 text-[9px] font-mono text-gray-600">
              FedRAMP SLAs: CRITICAL 15d / HIGH 30d / MEDIUM 90d
            </div>
          </div>

          {/* Platform Health */}
          <div className="col-span-6 rounded-lg border border-[#1a1a1a] bg-[#0e0e0e] p-4">
            <span className="font-mono text-[10px] text-[#f59e0b] tracking-widest uppercase">
              Platform Services
            </span>
            <div className="mt-3 space-y-2">
              <ServiceRow name="API Server" status="online" />
              <ServiceRow name="PostgreSQL / TimescaleDB" status="online" />
              <ServiceRow name="Redis Cache" status="online" />
              <ServiceRow name="ML Inference" status="online" />
              <ServiceRow name="WebSocket" status="online" />
              <ServiceRow name="BullMQ Workers" status="online" />
            </div>
          </div>
        </div>
        </>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────

function ComplianceRing({ label, rate, color }: { label: string; rate: number; color: string }) {
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (rate / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg width="88" height="88" viewBox="0 0 88 88">
        <circle cx="44" cy="44" r="36" fill="none" stroke="#1a1a1a" strokeWidth="6" />
        <circle
          cx="44" cy="44" r="36" fill="none"
          stroke={color} strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 44 44)"
          style={{ transition: "stroke-dashoffset 0.5s ease" }}
        />
        <text x="44" y="44" textAnchor="middle" dominantBaseline="central"
          className="font-display text-lg" fill="#d4d4d4">
          {rate}%
        </text>
      </svg>
      <span className="text-[10px] font-mono text-gray-500 mt-1">{label}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pass: "bg-[#22c55e]/20 text-[#22c55e]",
    partial: "bg-[#f59e0b]/20 text-[#f59e0b]",
    fail: "bg-[#ef4444]/20 text-[#ef4444]",
  };
  return (
    <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono ${colors[status] ?? colors.pass}`}>
      {status.toUpperCase()}
    </span>
  );
}

function SeverityCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded border border-[#1a1a1a] bg-[#080808] px-2 py-1.5">
      <span className="font-mono text-[8px] text-gray-600 block">{label}</span>
      <span className="font-display text-xl leading-none" style={{ color }}>
        {value}
      </span>
    </div>
  );
}

function StatBlock({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center">
      <span className="font-display text-2xl block" style={{ color }}>{value}</span>
      <span className="text-[9px] font-mono text-gray-600">{label}</span>
    </div>
  );
}

function ServiceRow({ name, status }: { name: string; status: string }) {
  const isOnline = status === "online";
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs font-mono text-gray-400">{name}</span>
      <div className="flex items-center gap-1.5">
        <span className={`h-2 w-2 rounded-full ${isOnline ? "bg-[#22c55e]" : "bg-[#ef4444]"}`} />
        <span className={`text-[10px] font-mono ${isOnline ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
          {status.toUpperCase()}
        </span>
      </div>
    </div>
  );
}
