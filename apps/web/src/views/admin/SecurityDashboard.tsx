import { useState, useEffect, useCallback } from "react";
import { apiFetch, apiPost } from "@/lib/api";

interface Incident {
  id: string;
  facility_id: string;
  title: string;
  severity: string;
  category: string | null;
  description: string | null;
  detected_at: string | null;
  reported_at: string | null;
  contained_at: string | null;
  resolved_at: string | null;
  root_cause: string | null;
  remediation: string | null;
  status: string;
  created_by_name: string | null;
  created_at: string;
}

interface VulnFinding {
  id: string;
  source: string | null;
  severity: string;
  cve_id: string | null;
  title: string;
  description: string | null;
  affected_component: string | null;
  discovered_at: string | null;
  remediation_due: string | null;
  remediated_at: string | null;
  status: string;
  days_until_due: number | null;
}

// FedRAMP SLA days by severity
const SLA_DAYS: Record<string, number> = {
  CRITICAL: 15,
  HIGH: 30,
  MEDIUM: 90,
  LOW: 180,
};

export function SecurityDashboard() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [vulns, setVulns] = useState<VulnFinding[]>([]);
  const [activeTab, setActiveTab] = useState<"incidents" | "vulnerabilities">("incidents");
  const [statusFilter, setStatusFilter] = useState("");
  const [showCreateIncident, setShowCreateIncident] = useState(false);
  const [_loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [incData, vulnData] = await Promise.all([
        apiFetch<{ incidents: Incident[] }>("/api/v1/admin/security/incidents?limit=100"),
        apiFetch<{ findings: VulnFinding[] }>("/api/v1/admin/security/vulnerabilities?limit=100"),
      ]);
      setIncidents(Array.isArray(incData?.incidents) ? incData.incidents : []);
      setVulns(Array.isArray(vulnData?.findings) ? vulnData.findings : []);
    } catch (err) {
      console.error("Failed to fetch security data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const lifecycleBadge = (status: string) => {
    const colors: Record<string, string> = {
      detected: "bg-[#ef4444]/20 text-[#ef4444]",
      reported: "bg-[#f97316]/20 text-[#f97316]",
      contained: "bg-[#f59e0b]/20 text-[#f59e0b]",
      resolved: "bg-[#22c55e]/20 text-[#22c55e]",
    };
    return colors[status] ?? "bg-[#1a1a1a] text-gray-400";
  };

  const severityColor = (sev: string) => {
    const colors: Record<string, string> = {
      CRITICAL: "text-[#ef4444]",
      HIGH: "text-[#f97316]",
      MEDIUM: "text-[#f59e0b]",
      LOW: "text-[#22c55e]",
      INFORMATIONAL: "text-[#06b6d4]",
    };
    return colors[sev] ?? "text-gray-400";
  };

  const vulnStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      OPEN: "bg-[#ef4444]/20 text-[#ef4444]",
      IN_PROGRESS: "bg-[#f59e0b]/20 text-[#f59e0b]",
      REMEDIATED: "bg-[#22c55e]/20 text-[#22c55e]",
      ACCEPTED: "bg-[#06b6d4]/20 text-[#06b6d4]",
      FALSE_POSITIVE: "bg-[#1a1a1a] text-gray-500",
    };
    return colors[status] ?? "bg-[#1a1a1a] text-gray-400";
  };

  const filteredIncidents = statusFilter
    ? incidents.filter((i) => i.status === statusFilter)
    : incidents;

  const filteredVulns = statusFilter
    ? vulns.filter((v) => v.status === statusFilter)
    : vulns;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl tracking-wider text-gray-100">
          SECURITY
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("incidents")}
            className={`px-3 py-1.5 rounded text-xs font-mono transition-colors ${
              activeTab === "incidents"
                ? "bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/30"
                : "text-gray-500 hover:text-gray-300 border border-[#1a1a1a]"
            }`}
          >
            Incidents ({incidents.filter((i) => !i.resolved_at).length})
          </button>
          <button
            onClick={() => setActiveTab("vulnerabilities")}
            className={`px-3 py-1.5 rounded text-xs font-mono transition-colors ${
              activeTab === "vulnerabilities"
                ? "bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/30"
                : "text-gray-500 hover:text-gray-300 border border-[#1a1a1a]"
            }`}
          >
            Vulnerabilities ({vulns.filter((v) => v.status === "OPEN" || v.status === "IN_PROGRESS").length})
          </button>
        </div>
      </div>

      {/* Status filter */}
      <div className="flex gap-2">
        {activeTab === "incidents" ? (
          <>
            <FilterChip label="All" active={!statusFilter} onClick={() => setStatusFilter("")} />
            <FilterChip label="Detected" active={statusFilter === "detected"} onClick={() => setStatusFilter("detected")} />
            <FilterChip label="Reported" active={statusFilter === "reported"} onClick={() => setStatusFilter("reported")} />
            <FilterChip label="Contained" active={statusFilter === "contained"} onClick={() => setStatusFilter("contained")} />
            <FilterChip label="Resolved" active={statusFilter === "resolved"} onClick={() => setStatusFilter("resolved")} />
          </>
        ) : (
          <>
            <FilterChip label="All" active={!statusFilter} onClick={() => setStatusFilter("")} />
            <FilterChip label="Open" active={statusFilter === "OPEN"} onClick={() => setStatusFilter("OPEN")} />
            <FilterChip label="In Progress" active={statusFilter === "IN_PROGRESS"} onClick={() => setStatusFilter("IN_PROGRESS")} />
            <FilterChip label="Remediated" active={statusFilter === "REMEDIATED"} onClick={() => setStatusFilter("REMEDIATED")} />
          </>
        )}
        {activeTab === "incidents" && (
          <button
            onClick={() => setShowCreateIncident(!showCreateIncident)}
            className="ml-auto px-3 py-1 rounded bg-[#f59e0b] text-[#080808] text-[10px] font-mono font-bold hover:bg-[#d97706]"
          >
            {showCreateIncident ? "Cancel" : "Create Incident"}
          </button>
        )}
      </div>

      {/* Create Incident Form */}
      {showCreateIncident && activeTab === "incidents" && (
        <CreateIncidentForm
          onCreated={() => { setShowCreateIncident(false); fetchData(); }}
        />
      )}

      {/* Incidents Table */}
      {activeTab === "incidents" && (
        <div className="rounded-lg border border-[#1a1a1a] bg-[#0e0e0e] overflow-hidden">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-[#1a1a1a] text-gray-500">
                <th className="text-left px-3 py-2">Title</th>
                <th className="text-left px-3 py-2">Severity</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">Category</th>
                <th className="text-left px-3 py-2">Detected</th>
                <th className="text-left px-3 py-2">Created By</th>
              </tr>
            </thead>
            <tbody>
              {filteredIncidents.map((inc) => (
                <tr key={inc.id} className="border-b border-[#1a1a1a]/50 hover:bg-[#111] transition-colors">
                  <td className="px-3 py-2 text-gray-200">{inc.title}</td>
                  <td className={`px-3 py-2 ${severityColor(inc.severity)}`}>{inc.severity}</td>
                  <td className="px-3 py-2">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] ${lifecycleBadge(inc.status)}`}>
                      {inc.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-500">{inc.category ?? "-"}</td>
                  <td className="px-3 py-2 text-gray-500">
                    {inc.detected_at ? new Date(inc.detected_at).toLocaleDateString() : "-"}
                  </td>
                  <td className="px-3 py-2 text-gray-500">{inc.created_by_name ?? "-"}</td>
                </tr>
              ))}
              {filteredIncidents.length === 0 && (
                <tr><td colSpan={6} className="text-center py-8 text-gray-600">No incidents</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Vulnerabilities Table */}
      {activeTab === "vulnerabilities" && (
        <div className="rounded-lg border border-[#1a1a1a] bg-[#0e0e0e] overflow-hidden">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-[#1a1a1a] text-gray-500">
                <th className="text-left px-3 py-2">Title</th>
                <th className="text-left px-3 py-2">Severity</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">CVE</th>
                <th className="text-left px-3 py-2">Component</th>
                <th className="text-left px-3 py-2">SLA Countdown</th>
              </tr>
            </thead>
            <tbody>
              {filteredVulns.map((v) => {
                const daysLeft = v.days_until_due !== null ? Math.ceil(v.days_until_due) : null;
                const slaTotal = SLA_DAYS[v.severity] ?? 90;
                const isOverdue = daysLeft !== null && daysLeft < 0;

                return (
                  <tr key={v.id} className="border-b border-[#1a1a1a]/50 hover:bg-[#111] transition-colors">
                    <td className="px-3 py-2 text-gray-200">{v.title}</td>
                    <td className={`px-3 py-2 ${severityColor(v.severity)}`}>{v.severity}</td>
                    <td className="px-3 py-2">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] ${vulnStatusColor(v.status)}`}>
                        {v.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-[#06b6d4]">{v.cve_id ?? "-"}</td>
                    <td className="px-3 py-2 text-gray-500">{v.affected_component ?? "-"}</td>
                    <td className="px-3 py-2">
                      {v.status === "REMEDIATED" ? (
                        <span className="text-[#22c55e]">Resolved</span>
                      ) : daysLeft !== null ? (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden max-w-[80px]">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.max(0, Math.min(100, ((slaTotal - Math.max(0, daysLeft)) / slaTotal) * 100))}%`,
                                backgroundColor: isOverdue ? "#ef4444" : daysLeft < 7 ? "#f97316" : "#f59e0b",
                              }}
                            />
                          </div>
                          <span className={`text-[10px] ${isOverdue ? "text-[#ef4444]" : daysLeft < 7 ? "text-[#f97316]" : "text-gray-400"}`}>
                            {isOverdue ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}
                          </span>
                        </div>
                      ) : "-"}
                    </td>
                  </tr>
                );
              })}
              {filteredVulns.length === 0 && (
                <tr><td colSpan={6} className="text-center py-8 text-gray-600">No vulnerabilities</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-2 py-1 rounded text-[10px] font-mono transition-colors ${
        active
          ? "bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/30"
          : "text-gray-500 hover:text-gray-300 border border-[#1a1a1a]"
      }`}
    >
      {label}
    </button>
  );
}

function CreateIncidentForm({ onCreated }: { onCreated: () => void }) {
  const [form, setForm] = useState({
    facility_id: "",
    title: "",
    severity: "MEDIUM",
    category: "",
    description: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiPost("/api/v1/admin/security/incidents", form);
      onCreated();
    } catch (err) {
      console.error("Failed to create incident:", err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-[#1a1a1a] bg-[#0e0e0e] p-4 space-y-3">
      <div className="grid grid-cols-4 gap-3">
        <div className="col-span-2">
          <label className="text-[9px] font-mono text-gray-600 block mb-1">Title</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full bg-[#080808] border border-[#1a1a1a] rounded px-2 py-1.5 text-xs font-mono text-gray-300"
            required
          />
        </div>
        <div>
          <label className="text-[9px] font-mono text-gray-600 block mb-1">Severity</label>
          <select
            value={form.severity}
            onChange={(e) => setForm({ ...form, severity: e.target.value })}
            className="w-full bg-[#080808] border border-[#1a1a1a] rounded px-2 py-1.5 text-xs font-mono text-gray-300"
          >
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>
        </div>
        <div>
          <label className="text-[9px] font-mono text-gray-600 block mb-1">Category</label>
          <input
            type="text"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            placeholder="e.g. unauthorised_access"
            className="w-full bg-[#080808] border border-[#1a1a1a] rounded px-2 py-1.5 text-xs font-mono text-gray-300"
          />
        </div>
      </div>
      <div>
        <label className="text-[9px] font-mono text-gray-600 block mb-1">Description</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={3}
          className="w-full bg-[#080808] border border-[#1a1a1a] rounded px-2 py-1.5 text-xs font-mono text-gray-300"
        />
      </div>
      <div>
        <label className="text-[9px] font-mono text-gray-600 block mb-1">Facility ID</label>
        <input
          type="text"
          value={form.facility_id}
          onChange={(e) => setForm({ ...form, facility_id: e.target.value })}
          className="w-full bg-[#080808] border border-[#1a1a1a] rounded px-2 py-1.5 text-xs font-mono text-gray-300 max-w-xs"
          required
        />
      </div>
      <button
        type="submit"
        className="px-4 py-2 rounded bg-[#f59e0b] text-[#080808] text-xs font-mono font-bold hover:bg-[#d97706]"
      >
        Create Incident
      </button>
    </form>
  );
}
