import { useState } from "react";
import { apiFetch } from "@/lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Framework = "TSA" | "ICAO" | "GDPR";

interface IncidentRow {
  type: string;
  count: number;
  avgSeverity: number;
  avgResponseSecs: number;
}

interface ZoneRow {
  zone: string;
  sensors: number;
  uptimePct: number;
  avgDensityPct: number;
}

interface OperatorRow {
  name: string;
  shifts: number;
  avgScore: number;
  badgesEarned: number;
}

interface ControlRow {
  control: string;
  status: string;
  evidence: string;
}

interface ReportData {
  framework: string;
  facility: string;
  period: { from: string; to: string };
  generatedAt: string;
  summary: {
    totalIncidents: number;
    avgResponseTimeSecs: number;
    slaCompliancePct: number;
    falsePositiveRatePct: number;
    sensorUptimePct: number;
    zonesMonitored: number;
    operatorsActive: number;
    totalShiftsScored: number;
  };
  incidentBreakdown: IncidentRow[];
  zoneCoverage: ZoneRow[];
  operatorPerformance: OperatorRow[];
  complianceControls: ControlRow[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ComplianceReport() {
  const [framework, setFramework] = useState<Framework>("TSA");
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 15);
    return d.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ report: ReportData }>(
        `/api/v1/reports/compliance?framework=${framework}&from=${fromDate}&to=${toDate}&format=json`,
      );
      setReport(res.report);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = async () => {
    try {
      const res = await fetch(
        `/api/v1/reports/compliance?framework=${framework}&from=${fromDate}&to=${toDate}&format=csv`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("soterion_token") || ""}`,
          },
        },
      );
      if (!res.ok) throw new Error("CSV export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `compliance-${framework}-${fromDate}-${toDate}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("CSV export failed:", err);
    }
  };

  return (
    <div className="space-y-6 compliance-report">
      {/* Print stylesheet */}
      <style>{`
        @media print {
          body, .compliance-report { background: #fff !important; color: #111 !important; }
          .compliance-report * { color: #111 !important; border-color: #ddd !important; background: #fff !important; }
          .no-print { display: none !important; }
          .print-card { border: 1px solid #ddd !important; box-shadow: none !important; }
          .print-badge-compliant { background: #dcfce7 !important; color: #166534 !important; }
          .print-badge-noncompliant { background: #fef2f2 !important; color: #991b1b !important; }
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between no-print">
        <h1 className="font-display text-3xl tracking-wider text-gray-100">
          COMPLIANCE REPORTS
        </h1>
      </div>

      {/* Controls */}
      <div className="rounded-lg border border-[#1a1a1a] bg-[#0e0e0e] p-5 space-y-4 no-print">
        {/* Framework selector */}
        <div>
          <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest block mb-2">
            Framework
          </label>
          <div className="flex gap-2">
            {(["TSA", "ICAO", "GDPR"] as const).map((fw) => (
              <button
                key={fw}
                onClick={() => setFramework(fw)}
                className={`px-4 py-2 rounded text-xs font-mono font-bold transition-colors ${
                  framework === fw
                    ? "bg-[#f59e0b] text-[#080808]"
                    : "bg-[#111] text-gray-400 border border-[#1a1a1a] hover:text-gray-200 hover:border-[#333]"
                }`}
              >
                {fw}
              </button>
            ))}
          </div>
        </div>

        {/* Date range */}
        <div className="flex gap-4">
          <div>
            <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest block mb-1">
              From
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-[#080808] border border-[#1a1a1a] rounded px-3 py-2 text-xs font-mono text-gray-300 focus:border-[#f59e0b] focus:outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest block mb-1">
              To
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-[#080808] border border-[#1a1a1a] rounded px-3 py-2 text-xs font-mono text-gray-300 focus:border-[#f59e0b] focus:outline-none"
            />
          </div>
        </div>

        {/* Generate button */}
        <button
          onClick={generate}
          disabled={loading}
          className="px-6 py-2.5 rounded bg-[#f59e0b] text-[#080808] text-sm font-mono font-bold hover:bg-[#d97706] disabled:opacity-50 transition-colors"
        >
          {loading ? "Generating..." : "Generate Report"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-[#ef4444]/30 bg-[#ef4444]/5 p-4 text-xs font-mono text-[#ef4444]">
          {error}
        </div>
      )}

      {/* Report */}
      {report && (
        <div className="space-y-6">
          {/* Report header */}
          <div className="rounded-lg border border-[#1a1a1a] bg-[#0e0e0e] p-5 print-card">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-display text-2xl text-gray-100 tracking-wide">
                  {report.framework} COMPLIANCE REPORT
                </h2>
                <p className="text-xs font-mono text-gray-500 mt-1">
                  {report.facility} &middot; {report.period.from} to {report.period.to}
                </p>
              </div>
              <div className="text-right no-print">
                <p className="text-[9px] font-mono text-gray-600">
                  Generated {new Date(report.generatedAt).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Executive Summary */}
          <div>
            <h3 className="font-display text-lg text-gray-200 tracking-wide mb-3">
              EXECUTIVE SUMMARY
            </h3>
            <div className="grid grid-cols-4 gap-3">
              <SummaryCard label="Total Incidents" value={report.summary.totalIncidents} />
              <SummaryCard label="Avg Response" value={`${report.summary.avgResponseTimeSecs}s`} />
              <SummaryCard label="SLA Compliance" value={`${report.summary.slaCompliancePct}%`} highlight />
              <SummaryCard label="False Positive Rate" value={`${report.summary.falsePositiveRatePct}%`} />
              <SummaryCard label="Sensor Uptime" value={`${report.summary.sensorUptimePct}%`} highlight />
              <SummaryCard label="Zones Monitored" value={report.summary.zonesMonitored} />
              <SummaryCard label="Operators Active" value={report.summary.operatorsActive} />
              <SummaryCard label="Shifts Scored" value={report.summary.totalShiftsScored} />
            </div>
          </div>

          {/* Incident Breakdown */}
          <div>
            <h3 className="font-display text-lg text-gray-200 tracking-wide mb-3">
              INCIDENT BREAKDOWN
            </h3>
            <div className="rounded-lg border border-[#1a1a1a] bg-[#0e0e0e] overflow-hidden print-card">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-[#1a1a1a]">
                    <th className="text-left px-4 py-2.5 text-gray-500 font-normal">Type</th>
                    <th className="text-right px-4 py-2.5 text-gray-500 font-normal">Count</th>
                    <th className="text-right px-4 py-2.5 text-gray-500 font-normal">Avg Severity</th>
                    <th className="text-right px-4 py-2.5 text-gray-500 font-normal">Avg Response (s)</th>
                  </tr>
                </thead>
                <tbody>
                  {report.incidentBreakdown.map((row) => (
                    <tr key={row.type} className="border-b border-[#1a1a1a]/50 hover:bg-[#111]">
                      <td className="px-4 py-2.5 text-gray-300">{row.type.replace(/_/g, " ")}</td>
                      <td className="text-right px-4 py-2.5 text-gray-200">{row.count}</td>
                      <td className="text-right px-4 py-2.5 text-gray-200">{row.avgSeverity}</td>
                      <td className="text-right px-4 py-2.5 text-gray-200">{row.avgResponseSecs}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Zone Coverage */}
          <div>
            <h3 className="font-display text-lg text-gray-200 tracking-wide mb-3">
              ZONE COVERAGE
            </h3>
            <div className="rounded-lg border border-[#1a1a1a] bg-[#0e0e0e] overflow-hidden print-card">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-[#1a1a1a]">
                    <th className="text-left px-4 py-2.5 text-gray-500 font-normal">Zone</th>
                    <th className="text-right px-4 py-2.5 text-gray-500 font-normal">Sensors</th>
                    <th className="text-right px-4 py-2.5 text-gray-500 font-normal">Uptime (%)</th>
                    <th className="text-right px-4 py-2.5 text-gray-500 font-normal">Avg Density (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {report.zoneCoverage.map((row) => (
                    <tr key={row.zone} className="border-b border-[#1a1a1a]/50 hover:bg-[#111]">
                      <td className="px-4 py-2.5 text-gray-300">{row.zone}</td>
                      <td className="text-right px-4 py-2.5 text-gray-200">{row.sensors}</td>
                      <td className="text-right px-4 py-2.5 text-gray-200">{row.uptimePct}</td>
                      <td className="text-right px-4 py-2.5 text-gray-200">{row.avgDensityPct}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Operator Performance */}
          <div>
            <h3 className="font-display text-lg text-gray-200 tracking-wide mb-3">
              OPERATOR PERFORMANCE
            </h3>
            <div className="rounded-lg border border-[#1a1a1a] bg-[#0e0e0e] overflow-hidden print-card">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-[#1a1a1a]">
                    <th className="text-left px-4 py-2.5 text-gray-500 font-normal">Operator</th>
                    <th className="text-right px-4 py-2.5 text-gray-500 font-normal">Shifts</th>
                    <th className="text-right px-4 py-2.5 text-gray-500 font-normal">Avg Score</th>
                    <th className="text-right px-4 py-2.5 text-gray-500 font-normal">Badges</th>
                  </tr>
                </thead>
                <tbody>
                  {report.operatorPerformance.map((row) => (
                    <tr key={row.name} className="border-b border-[#1a1a1a]/50 hover:bg-[#111]">
                      <td className="px-4 py-2.5 text-gray-300">{row.name}</td>
                      <td className="text-right px-4 py-2.5 text-gray-200">{row.shifts}</td>
                      <td className="text-right px-4 py-2.5 text-gray-200">{row.avgScore}</td>
                      <td className="text-right px-4 py-2.5 text-gray-200">{row.badgesEarned}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Compliance Controls */}
          <div>
            <h3 className="font-display text-lg text-gray-200 tracking-wide mb-3">
              COMPLIANCE CONTROLS
            </h3>
            <div className="space-y-2">
              {report.complianceControls.map((ctrl) => {
                const isCompliant = ctrl.status === "COMPLIANT";
                return (
                  <div
                    key={ctrl.control}
                    className="rounded-lg border border-[#1a1a1a] bg-[#0e0e0e] p-4 flex items-start gap-4 print-card"
                  >
                    <div className="mt-0.5 shrink-0">
                      {isCompliant ? (
                        <div className="w-6 h-6 rounded-full bg-[#22c55e]/20 flex items-center justify-center">
                          <svg className="w-4 h-4 text-[#22c55e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                          </svg>
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-[#ef4444]/20 flex items-center justify-center">
                          <svg className="w-4 h-4 text-[#ef4444]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-sm font-mono text-gray-200">{ctrl.control}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold ${
                            isCompliant
                              ? "bg-[#22c55e]/20 text-[#22c55e] print-badge-compliant"
                              : "bg-[#ef4444]/20 text-[#ef4444] print-badge-noncompliant"
                          }`}
                        >
                          {ctrl.status}
                        </span>
                      </div>
                      <p className="text-xs font-mono text-gray-500">{ctrl.evidence}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 no-print">
            <button
              onClick={exportCsv}
              className="px-5 py-2.5 rounded border border-[#1a1a1a] bg-[#111] text-xs font-mono font-bold text-gray-300 hover:text-gray-100 hover:border-[#333] transition-colors"
            >
              Export CSV
            </button>
            <button
              onClick={() => window.print()}
              className="px-5 py-2.5 rounded border border-[#1a1a1a] bg-[#111] text-xs font-mono font-bold text-gray-300 hover:text-gray-100 hover:border-[#333] transition-colors"
            >
              Print / Save PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Summary Card
// ---------------------------------------------------------------------------

function SummaryCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-lg border border-[#1a1a1a] bg-[#0e0e0e] p-4 print-card">
      <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest block mb-1">
        {label}
      </span>
      <span
        className={`font-display text-2xl ${
          highlight ? "text-[#f59e0b]" : "text-gray-100"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
