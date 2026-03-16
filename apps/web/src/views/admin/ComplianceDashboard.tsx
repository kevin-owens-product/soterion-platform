import { useState, useEffect } from "react";
import { apiFetch, apiPost } from "@/lib/api";

interface Soc2Control {
  control: string;
  description: string;
  status: string;
  evidence: string;
}

interface Soc2Criteria {
  label: string;
  status: string;
  controls_total: number;
  controls_passing: number;
  controls_failing: number;
  evidence: Soc2Control[];
}

interface Soc2Response {
  framework: string;
  overall_status: string;
  criteria: Record<string, Soc2Criteria>;
}

interface FedRampControl {
  id: string;
  title: string;
  status: string;
  notes: string;
}

interface FedRampFamily {
  label: string;
  controls_total: number;
  controls_implemented: number;
  status: string;
  key_controls: FedRampControl[];
}

interface FedRampResponse {
  framework: string;
  authorization_level: string;
  total_controls: number;
  controls_implemented: number;
  implementation_rate: number;
  families: Record<string, FedRampFamily>;
}

export function ComplianceDashboard() {
  const [activeTab, setActiveTab] = useState<"soc2" | "fedramp" | "gdpr">("soc2");
  const [soc2, setSoc2] = useState<Soc2Response | null>(null);
  const [fedramp, setFedramp] = useState<FedRampResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedFamily, setExpandedFamily] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiFetch<Soc2Response>("/api/v1/admin/compliance/soc2").catch(() => null),
      apiFetch<FedRampResponse>("/api/v1/admin/compliance/fedramp").catch(() => null),
    ]).then(([s, f]) => {
      setSoc2(s);
      setFedramp(f);
      setLoading(false);
    });
  }, []);

  const statusColor = (status: string) => {
    switch (status) {
      case "pass":
      case "implemented":
        return "bg-[#22c55e]/20 text-[#22c55e]";
      case "partial":
        return "bg-[#f59e0b]/20 text-[#f59e0b]";
      case "fail":
      case "planned":
        return "bg-[#ef4444]/20 text-[#ef4444]";
      default:
        return "bg-[#1a1a1a] text-gray-400";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl tracking-wider text-gray-100">
          COMPLIANCE
        </h1>
        <div className="flex items-center gap-2">
          {(["soc2", "fedramp", "gdpr"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded text-xs font-mono transition-colors ${
                activeTab === tab
                  ? "bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/30"
                  : "text-gray-500 hover:text-gray-300 border border-[#1a1a1a]"
              }`}
            >
              {tab === "soc2" ? "SOC 2" : tab === "fedramp" ? "FedRAMP" : "GDPR"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse font-mono text-sm text-gray-500">Loading compliance data...</div>
        </div>
      ) : (
        <>
          {/* SOC 2 Tab */}
          {activeTab === "soc2" && soc2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-5 gap-3">
                {Object.entries(soc2.criteria).map(([key, criteria]) => (
                  <div
                    key={key}
                    className="rounded-lg border border-[#1a1a1a] bg-[#0e0e0e] p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono text-gray-500">{criteria.label.split(" ")[0]}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono ${statusColor(criteria.status)}`}>
                        {criteria.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="font-display text-2xl text-gray-100">
                      {criteria.controls_passing}/{criteria.controls_total}
                    </div>
                    <div className="mt-2 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(criteria.controls_passing / criteria.controls_total) * 100}%`,
                          backgroundColor: criteria.status === "pass" ? "#22c55e" : "#f59e0b",
                        }}
                      />
                    </div>
                    <div className="mt-3 space-y-1">
                      {(Array.isArray(criteria.evidence) ? criteria.evidence : []).map((ev) => (
                        <div key={ev.control} className="flex items-center justify-between text-[9px] font-mono">
                          <span className="text-gray-500">{ev.control}</span>
                          <span className={`px-1 py-0.5 rounded ${statusColor(ev.status)}`}>
                            {ev.status.toUpperCase()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* FedRAMP Tab */}
          {activeTab === "fedramp" && fedramp && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-[#1a1a1a] bg-[#0e0e0e] p-4 text-center">
                  <span className="text-[10px] font-mono text-gray-500 block">Authorization Level</span>
                  <span className="font-display text-xl text-[#f59e0b]">{fedramp.authorization_level}</span>
                </div>
                <div className="rounded-lg border border-[#1a1a1a] bg-[#0e0e0e] p-4 text-center">
                  <span className="text-[10px] font-mono text-gray-500 block">Controls Implemented</span>
                  <span className="font-display text-xl text-gray-100">
                    {fedramp.controls_implemented}/{fedramp.total_controls}
                  </span>
                </div>
                <div className="rounded-lg border border-[#1a1a1a] bg-[#0e0e0e] p-4 text-center">
                  <span className="text-[10px] font-mono text-gray-500 block">Implementation Rate</span>
                  <span className="font-display text-xl text-[#22c55e]">{fedramp.implementation_rate}%</span>
                </div>
              </div>

              <div className="space-y-2">
                {Object.entries(fedramp.families).map(([familyKey, family]) => (
                  <div key={familyKey} className="rounded-lg border border-[#1a1a1a] bg-[#0e0e0e] overflow-hidden">
                    <button
                      onClick={() => setExpandedFamily(expandedFamily === familyKey ? null : familyKey)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#111] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs text-[#f59e0b] w-8">{familyKey}</span>
                        <span className="text-xs font-mono text-gray-200">{family.label}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono text-gray-500">
                          {family.controls_implemented}/{family.controls_total}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono ${statusColor(family.status)}`}>
                          {family.status.toUpperCase()}
                        </span>
                      </div>
                    </button>
                    {expandedFamily === familyKey && (
                      <div className="border-t border-[#1a1a1a] px-4 py-3 space-y-2">
                        {(Array.isArray(family.key_controls) ? family.key_controls : []).map((ctrl) => (
                          <div key={ctrl.id} className="flex items-center justify-between text-xs font-mono">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 w-12">{ctrl.id}</span>
                              <span className="text-gray-300">{ctrl.title}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-600 max-w-[300px] truncate text-[10px]">{ctrl.notes}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[9px] ${statusColor(ctrl.status)}`}>
                                {ctrl.status.toUpperCase()}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* GDPR Tab */}
          {activeTab === "gdpr" && <GdprPanel />}
        </>
      )}
    </div>
  );
}

function GdprPanel() {
  const [type, setType] = useState<"access" | "erasure" | "export">("access");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiPost("/api/v1/admin/compliance/gdpr/requests", {
        type,
        subject_email: email,
        notes,
      });
      setSubmitted(true);
      setEmail("");
      setNotes("");
      setTimeout(() => setSubmitted(false), 3000);
    } catch (err) {
      console.error("Failed to create GDPR request:", err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-[#06b6d4]/30 bg-[#06b6d4]/5 p-4">
        <span className="text-xs font-mono text-[#06b6d4]">
          Soterion stores no PII (LiDAR privacy-by-physics). Track IDs are ephemeral UUIDs with no linkage to identity.
          GDPR data subject requests are minimal but tracked for compliance evidence.
        </span>
      </div>

      <div className="rounded-lg border border-[#1a1a1a] bg-[#0e0e0e] p-4">
        <span className="font-mono text-[10px] text-[#f59e0b] tracking-widest uppercase block mb-3">
          New GDPR Request
        </span>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[9px] font-mono text-gray-600 block mb-1">Request Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as typeof type)}
                className="w-full bg-[#080808] border border-[#1a1a1a] rounded px-2 py-1.5 text-xs font-mono text-gray-300"
              >
                <option value="access">Data Access</option>
                <option value="erasure">Data Erasure</option>
                <option value="export">Data Export</option>
              </select>
            </div>
            <div>
              <label className="text-[9px] font-mono text-gray-600 block mb-1">Subject Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#080808] border border-[#1a1a1a] rounded px-2 py-1.5 text-xs font-mono text-gray-300"
                required
              />
            </div>
            <div>
              <label className="text-[9px] font-mono text-gray-600 block mb-1">Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-[#080808] border border-[#1a1a1a] rounded px-2 py-1.5 text-xs font-mono text-gray-300"
              />
            </div>
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded bg-[#f59e0b] text-[#080808] text-xs font-mono font-bold hover:bg-[#d97706]"
          >
            Submit Request
          </button>
          {submitted && (
            <span className="text-xs font-mono text-[#22c55e] ml-3">Request logged successfully</span>
          )}
        </form>
      </div>
    </div>
  );
}
