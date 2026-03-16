import { useQuery } from "@tanstack/react-query";
import { getBenchmarks, type BenchmarkFacility, type BenchmarkData } from "@/lib/api";

// ── Helpers ──────────────────────────────────────────────

function clr(value: number, threshold: number, direction: "higher" | "lower"): string {
  if (direction === "higher") {
    return value >= threshold ? "text-[#22c55e]" : "text-[#ef4444]";
  }
  return value <= threshold ? "text-[#22c55e]" : "text-[#ef4444]";
}

function vsIndustry(value: number, industry: number | undefined, direction: "higher" | "lower"): string {
  if (industry === undefined) return "-";
  const diff = value - industry;
  const pct = industry !== 0 ? Math.round((diff / industry) * 100) : 0;
  const sign = diff >= 0 ? "+" : "";
  const good =
    (direction === "higher" && diff >= 0) || (direction === "lower" && diff <= 0);
  return `${sign}${pct}%${good ? "" : " !"}`;
}

function vsColor(value: number, industry: number | undefined, direction: "higher" | "lower"): string {
  if (industry === undefined) return "text-gray-500";
  const diff = value - industry;
  const good =
    (direction === "higher" && diff >= 0) || (direction === "lower" && diff <= 0);
  return good ? "text-[#22c55e]" : "text-[#ef4444]";
}

// ── Bar chart for a single metric ────────────────────────

function MetricBar({
  label,
  value,
  max,
  color,
  unit,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  unit: string;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-mono text-gray-500 w-28 truncate">{label}</span>
      <div className="flex-1 h-3 bg-[#1a1a1a] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-[10px] font-mono text-gray-400 w-16 text-right">
        {value}{unit}
      </span>
    </div>
  );
}

// ── Facility type badge ──────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  AIRPORT: "#06b6d4",
  SEAPORT: "#3b82f6",
  STADIUM: "#a855f7",
  TRANSIT_HUB: "#f59e0b",
  HOSPITAL: "#22c55e",
};

function TypeBadge({ type }: { type: string }) {
  const color = TYPE_COLORS[type] ?? "#737373";
  return (
    <span
      className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded"
      style={{ backgroundColor: color + "20", color }}
    >
      {type.replace("_", " ")}
    </span>
  );
}

// ── Main component ───────────────────────────────────────

export function Benchmarking() {
  const { data, isLoading, error } = useQuery<BenchmarkData>({
    queryKey: ["benchmarks"],
    queryFn: getBenchmarks,
    refetchInterval: 30_000,
  });

  const facilities = data?.facilities ?? [];
  const industry = data?.industryAverages;

  // Compute max values for bar charts
  const maxResponse = Math.max(...facilities.map((f) => f.avgResponseSecs), industry?.avgResponseSecs ?? 0, 1);
  const maxDensity = Math.max(...facilities.map((f) => f.avgDensityPct), 100);
  const maxIncidents = Math.max(...facilities.map((f) => f.incidentRate24h), 1);
  const maxScore = Math.max(...facilities.map((f) => f.operatorAvgScore), 1000);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-display text-gray-200">
            Multi-Site Benchmarking
          </h1>
          <p className="text-xs font-mono text-gray-500 mt-1">
            Comparative performance metrics across all facilities
          </p>
        </div>
        {industry && (
          <div className="flex items-center gap-4 text-[10px] font-mono">
            <span className="text-gray-500">INDUSTRY AVG:</span>
            <span className="text-gray-400">
              Response {industry.avgResponseSecs}s
            </span>
            <span className="text-gray-400">
              SLA {industry.slaCompliancePct}%
            </span>
            <span className="text-gray-400">
              Uptime {industry.sensorUptimePct}%
            </span>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-16 bg-soterion-surface border border-soterion-border rounded-lg animate-pulse"
            />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-[#ef4444]/30 bg-[#ef4444]/5 p-4 text-center">
          <p className="text-xs font-mono text-[#ef4444]">
            Failed to load benchmark data
          </p>
        </div>
      ) : (
        <>
          {/* Comparison Table */}
          <div className="rounded-lg border border-soterion-border bg-soterion-surface overflow-hidden mb-6">
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-soterion-border bg-[#0a0a0a]">
                    <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider text-gray-500">
                      Facility
                    </th>
                    <th className="text-left px-3 py-3 text-[10px] uppercase tracking-wider text-gray-500">
                      Type
                    </th>
                    <th className="text-right px-3 py-3 text-[10px] uppercase tracking-wider text-gray-500">
                      Avg Response
                    </th>
                    <th className="text-right px-3 py-3 text-[10px] uppercase tracking-wider text-gray-500">
                      Density %
                    </th>
                    <th className="text-right px-3 py-3 text-[10px] uppercase tracking-wider text-gray-500">
                      Incidents 24h
                    </th>
                    <th className="text-right px-3 py-3 text-[10px] uppercase tracking-wider text-gray-500">
                      SLA %
                    </th>
                    <th className="text-right px-3 py-3 text-[10px] uppercase tracking-wider text-gray-500">
                      Avg Score
                    </th>
                    <th className="text-right px-3 py-3 text-[10px] uppercase tracking-wider text-gray-500">
                      Sensor Uptime
                    </th>
                    <th className="text-right px-3 py-3 text-[10px] uppercase tracking-wider text-gray-500">
                      vs Industry
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {facilities.map((f: BenchmarkFacility, idx: number) => (
                    <tr
                      key={f.id}
                      className={`border-b border-soterion-border hover:bg-white/[0.02] transition-colors ${
                        idx % 2 === 0 ? "" : "bg-[#0a0a0a]/50"
                      }`}
                    >
                      <td className="px-4 py-3 text-gray-200 font-medium">
                        {f.name}
                      </td>
                      <td className="px-3 py-3">
                        <TypeBadge type={f.type} />
                      </td>
                      <td
                        className={`px-3 py-3 text-right ${clr(
                          f.avgResponseSecs,
                          industry?.avgResponseSecs ?? 45,
                          "lower"
                        )}`}
                      >
                        {f.avgResponseSecs}s
                      </td>
                      <td className="px-3 py-3 text-right text-gray-300">
                        {f.avgDensityPct}%
                      </td>
                      <td className="px-3 py-3 text-right text-gray-300">
                        {f.incidentRate24h}
                      </td>
                      <td
                        className={`px-3 py-3 text-right ${clr(
                          f.slaCompliancePct,
                          industry?.slaCompliancePct ?? 72,
                          "higher"
                        )}`}
                      >
                        {f.slaCompliancePct}%
                      </td>
                      <td className="px-3 py-3 text-right text-gray-300">
                        {f.operatorAvgScore}
                      </td>
                      <td
                        className={`px-3 py-3 text-right ${clr(
                          f.sensorUptimePct,
                          industry?.sensorUptimePct ?? 94,
                          "higher"
                        )}`}
                      >
                        {f.sensorUptimePct}%
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span
                          className={`text-[10px] ${vsColor(
                            f.slaCompliancePct,
                            industry?.slaCompliancePct,
                            "higher"
                          )}`}
                        >
                          {vsIndustry(
                            f.slaCompliancePct,
                            industry?.slaCompliancePct,
                            "higher"
                          )}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Horizontal bar charts per metric */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Response Time */}
            <div className="rounded-lg border border-soterion-border bg-soterion-surface p-4">
              <h3 className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-3">
                Avg Response Time (lower is better)
              </h3>
              <div className="space-y-2">
                {facilities.map((f) => (
                  <MetricBar
                    key={f.id}
                    label={f.name}
                    value={f.avgResponseSecs}
                    max={maxResponse}
                    color={f.avgResponseSecs <= (industry?.avgResponseSecs ?? 45) ? "#22c55e" : "#ef4444"}
                    unit="s"
                  />
                ))}
                {industry && (
                  <MetricBar
                    label="Industry Avg"
                    value={industry.avgResponseSecs}
                    max={maxResponse}
                    color="#525252"
                    unit="s"
                  />
                )}
              </div>
            </div>

            {/* Density */}
            <div className="rounded-lg border border-soterion-border bg-soterion-surface p-4">
              <h3 className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-3">
                Avg Density %
              </h3>
              <div className="space-y-2">
                {facilities.map((f) => (
                  <MetricBar
                    key={f.id}
                    label={f.name}
                    value={f.avgDensityPct}
                    max={maxDensity}
                    color={TYPE_COLORS[f.type] ?? "#f59e0b"}
                    unit="%"
                  />
                ))}
              </div>
            </div>

            {/* Incident Rate */}
            <div className="rounded-lg border border-soterion-border bg-soterion-surface p-4">
              <h3 className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-3">
                Incident Rate (24h)
              </h3>
              <div className="space-y-2">
                {facilities.map((f) => (
                  <MetricBar
                    key={f.id}
                    label={f.name}
                    value={f.incidentRate24h}
                    max={maxIncidents}
                    color={TYPE_COLORS[f.type] ?? "#f59e0b"}
                    unit=""
                  />
                ))}
              </div>
            </div>

            {/* Operator Score */}
            <div className="rounded-lg border border-soterion-border bg-soterion-surface p-4">
              <h3 className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-3">
                Operator Avg Score
              </h3>
              <div className="space-y-2">
                {facilities.map((f) => (
                  <MetricBar
                    key={f.id}
                    label={f.name}
                    value={f.operatorAvgScore}
                    max={maxScore}
                    color={TYPE_COLORS[f.type] ?? "#f59e0b"}
                    unit=""
                  />
                ))}
              </div>
            </div>

            {/* SLA Compliance */}
            <div className="rounded-lg border border-soterion-border bg-soterion-surface p-4">
              <h3 className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-3">
                SLA Compliance % (higher is better)
              </h3>
              <div className="space-y-2">
                {facilities.map((f) => (
                  <MetricBar
                    key={f.id}
                    label={f.name}
                    value={f.slaCompliancePct}
                    max={100}
                    color={f.slaCompliancePct >= (industry?.slaCompliancePct ?? 72) ? "#22c55e" : "#ef4444"}
                    unit="%"
                  />
                ))}
                {industry && (
                  <MetricBar
                    label="Industry Avg"
                    value={industry.slaCompliancePct}
                    max={100}
                    color="#525252"
                    unit="%"
                  />
                )}
              </div>
            </div>

            {/* Sensor Uptime */}
            <div className="rounded-lg border border-soterion-border bg-soterion-surface p-4">
              <h3 className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-3">
                Sensor Uptime % (higher is better)
              </h3>
              <div className="space-y-2">
                {facilities.map((f) => (
                  <MetricBar
                    key={f.id}
                    label={f.name}
                    value={f.sensorUptimePct}
                    max={100}
                    color={f.sensorUptimePct >= (industry?.sensorUptimePct ?? 94) ? "#22c55e" : "#ef4444"}
                    unit="%"
                  />
                ))}
                {industry && (
                  <MetricBar
                    label="Industry Avg"
                    value={industry.sensorUptimePct}
                    max={100}
                    color="#525252"
                    unit="%"
                  />
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
