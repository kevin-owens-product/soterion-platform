import { useEffect, useState, useCallback } from "react";
import { getTrends, getZones, type TrendResponse, type TrendDataPoint } from "@/lib/api";

type Metric = "density" | "incidents" | "queue_wait" | "scores";
type Period = "7d" | "30d" | "90d";

const METRICS: { key: Metric; label: string }[] = [
  { key: "density", label: "Density" },
  { key: "incidents", label: "Incidents" },
  { key: "queue_wait", label: "Queue Wait" },
  { key: "scores", label: "Scores" },
];

const PERIODS: { key: Period; label: string }[] = [
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
];

function barColor(metric: Metric, value: number, maxVal: number): string {
  const ratio = maxVal > 0 ? value / maxVal : 0;
  if (metric === "scores") {
    // Higher is better: green=high, red=low
    if (ratio >= 0.75) return "#22c55e";
    if (ratio >= 0.5) return "#f59e0b";
    return "#ef4444";
  }
  if (metric === "incidents") {
    if (ratio >= 0.75) return "#ef4444";
    if (ratio >= 0.5) return "#f97316";
    if (ratio >= 0.25) return "#f59e0b";
    return "#22c55e";
  }
  if (metric === "queue_wait") {
    if (ratio >= 0.75) return "#ef4444";
    if (ratio >= 0.5) return "#f59e0b";
    return "#22c55e";
  }
  // density
  if (ratio >= 0.8) return "#ef4444";
  if (ratio >= 0.6) return "#f97316";
  if (ratio >= 0.4) return "#f59e0b";
  return "#22c55e";
}

function isImprovingDirection(metric: Metric): "lower_better" | "higher_better" {
  if (metric === "scores") return "higher_better";
  return "lower_better";
}

function formatValue(metric: Metric, value: number): string {
  if (metric === "queue_wait") return `${value.toFixed(1)}m`;
  if (metric === "density") return `${value.toFixed(1)}%`;
  if (metric === "scores") return value.toFixed(0);
  return value.toFixed(0);
}

function metricUnit(metric: Metric): string {
  if (metric === "density") return "%";
  if (metric === "queue_wait") return "min";
  if (metric === "scores") return "pts";
  return "";
}

export function Analytics() {
  const [metric, setMetric] = useState<Metric>("density");
  const [period, setPeriod] = useState<Period>("7d");
  const [zoneId, setZoneId] = useState<string>("");
  const [zones, setZones] = useState<{ id: string; name: string }[]>([]);
  const [data, setData] = useState<TrendResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  // Load zones for filter
  useEffect(() => {
    getZones()
      .then((z) => setZones(z.map((zone: any) => ({ id: zone.id, name: zone.name }))))
      .catch(() => {});
  }, []);

  const fetchData = useCallback(() => {
    setLoading(true);
    getTrends(metric, period, zoneId || undefined)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [metric, period, zoneId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const maxVal = data?.data
    ? Math.max(...data.data.map((d) => d.value), 1)
    : 1;

  const comparison = data?.comparison;
  const direction = isImprovingDirection(metric);
  const isImproving =
    comparison &&
    ((direction === "lower_better" && comparison.changePct < 0) ||
      (direction === "higher_better" && comparison.changePct > 0));

  // Summary stats
  const allValues = data?.data?.map((d) => d.value) ?? [];
  const summaryMin = allValues.length > 0 ? Math.min(...allValues) : 0;
  const summaryMax = allValues.length > 0 ? Math.max(...allValues) : 0;
  const summaryAvg =
    allValues.length > 0
      ? Math.round((allValues.reduce((a, b) => a + b, 0) / allValues.length) * 10) / 10
      : 0;

  return (
    <div className="analytics-container">
      {/* Header */}
      <div className="analytics-header">
        <h1 className="analytics-title">ANALYTICS</h1>
      </div>

      {/* Controls */}
      <div className="analytics-controls">
        {/* Metric tabs */}
        <div className="analytics-tabs">
          {METRICS.map((m) => (
            <button
              key={m.key}
              className={`analytics-tab ${metric === m.key ? "analytics-tab--active" : ""}`}
              onClick={() => setMetric(m.key)}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="analytics-filters">
          {/* Period selector */}
          <div className="analytics-period">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                className={`analytics-period-btn ${period === p.key ? "analytics-period-btn--active" : ""}`}
                onClick={() => setPeriod(p.key)}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Zone filter */}
          {zones.length > 0 && (
            <select
              className="analytics-zone-select"
              value={zoneId}
              onChange={(e) => setZoneId(e.target.value)}
            >
              <option value="">All Zones</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Comparison Card */}
      {comparison && (
        <div className="analytics-comparison-row">
          <div className="analytics-comparison-card">
            <div className="analytics-comparison-label">vs Previous Period</div>
            <div className="analytics-comparison-value">
              <span
                className="analytics-comparison-arrow"
                style={{
                  color: isImproving ? "#22c55e" : comparison.changePct === 0 ? "#737373" : "#ef4444",
                }}
              >
                {comparison.trend === "up" ? "\u2191" : comparison.trend === "down" ? "\u2193" : "\u2192"}
              </span>
              <span
                className="analytics-comparison-pct"
                style={{
                  color: isImproving ? "#22c55e" : comparison.changePct === 0 ? "#737373" : "#ef4444",
                }}
              >
                {Math.abs(comparison.changePct).toFixed(1)}%
              </span>
            </div>
            <div className="analytics-comparison-detail">
              {formatValue(metric, comparison.previousPeriodAvg)} {metricUnit(metric)} avg
              {" -> "}
              {formatValue(metric, comparison.currentPeriodAvg)} {metricUnit(metric)} avg
            </div>
          </div>

          {/* Summary cards */}
          <div className="analytics-stat-card">
            <div className="analytics-stat-value">{formatValue(metric, summaryMin)}</div>
            <div className="analytics-stat-label">Min</div>
          </div>
          <div className="analytics-stat-card">
            <div className="analytics-stat-value">{formatValue(metric, summaryAvg)}</div>
            <div className="analytics-stat-label">Average</div>
          </div>
          <div className="analytics-stat-card">
            <div className="analytics-stat-value">{formatValue(metric, summaryMax)}</div>
            <div className="analytics-stat-label">Max</div>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="analytics-chart-container">
        {loading ? (
          <div className="analytics-chart-loading">
            <div className="analytics-loading-spinner" />
            Loading trend data...
          </div>
        ) : !data || data.data.length === 0 ? (
          <div className="analytics-chart-empty">
            No data available for selected filters.
          </div>
        ) : (
          <div className="analytics-chart">
            <div className="analytics-chart-bars">
              {data.data.map((point: TrendDataPoint, i: number) => {
                const heightPct = maxVal > 0 ? (point.value / maxVal) * 100 : 0;
                const color = barColor(metric, point.value, maxVal);
                const isHovered = hoveredBar === i;
                return (
                  <div
                    key={i}
                    className="analytics-bar-wrapper"
                    onMouseEnter={() => setHoveredBar(i)}
                    onMouseLeave={() => setHoveredBar(null)}
                  >
                    {isHovered && (
                      <div className="analytics-bar-tooltip">
                        <div className="analytics-tooltip-date">
                          {point.date}
                        </div>
                        <div className="analytics-tooltip-value">
                          {formatValue(metric, point.value)} {metricUnit(metric)}
                        </div>
                        <div className="analytics-tooltip-range">
                          min {formatValue(metric, point.min)} / max {formatValue(metric, point.max)}
                        </div>
                      </div>
                    )}
                    <div className="analytics-bar-track">
                      <div
                        className="analytics-bar"
                        style={{
                          height: `${Math.max(2, heightPct)}%`,
                          backgroundColor: color,
                          opacity: isHovered ? 1 : 0.8,
                        }}
                      />
                    </div>
                    <div className="analytics-bar-label">
                      {data.data.length <= 14
                        ? point.date.slice(5) // MM-DD
                        : i % Math.ceil(data.data.length / 10) === 0
                          ? point.date.slice(5)
                          : ""}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <style>{`
        .analytics-container {
          max-width: 1100px;
          margin: 0 auto;
          font-family: var(--font-mono, 'IBM Plex Mono', monospace);
        }

        .analytics-header {
          margin-bottom: 20px;
        }

        .analytics-title {
          font-family: var(--font-display, 'Bebas Neue', sans-serif);
          font-size: 32px;
          letter-spacing: 3px;
          color: #f59e0b;
          margin: 0;
        }

        .analytics-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 20px;
        }

        .analytics-tabs {
          display: flex;
          gap: 4px;
          background: #0e0e0e;
          border: 1px solid #1a1a1a;
          border-radius: 8px;
          padding: 4px;
        }

        .analytics-tab {
          font-family: var(--font-mono, 'IBM Plex Mono', monospace);
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #737373;
          background: transparent;
          border: none;
          border-radius: 6px;
          padding: 8px 16px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .analytics-tab:hover {
          color: #d4d4d4;
          background: rgba(255, 255, 255, 0.05);
        }

        .analytics-tab--active {
          color: #f59e0b;
          background: rgba(245, 158, 11, 0.1);
        }

        .analytics-filters {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .analytics-period {
          display: flex;
          gap: 2px;
          background: #0e0e0e;
          border: 1px solid #1a1a1a;
          border-radius: 6px;
          padding: 3px;
        }

        .analytics-period-btn {
          font-family: var(--font-mono, 'IBM Plex Mono', monospace);
          font-size: 10px;
          font-weight: 500;
          color: #737373;
          background: transparent;
          border: none;
          border-radius: 4px;
          padding: 6px 10px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .analytics-period-btn:hover {
          color: #d4d4d4;
        }

        .analytics-period-btn--active {
          color: #d4d4d4;
          background: #1a1a1a;
        }

        .analytics-zone-select {
          font-family: var(--font-mono, 'IBM Plex Mono', monospace);
          font-size: 11px;
          color: #d4d4d4;
          background: #0e0e0e;
          border: 1px solid #1a1a1a;
          border-radius: 6px;
          padding: 6px 10px;
          outline: none;
          cursor: pointer;
        }

        .analytics-zone-select option {
          background: #0e0e0e;
          color: #d4d4d4;
        }

        .analytics-comparison-row {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr;
          gap: 12px;
          margin-bottom: 20px;
        }

        .analytics-comparison-card {
          background: #0e0e0e;
          border: 1px solid #1a1a1a;
          border-radius: 8px;
          padding: 16px 20px;
        }

        .analytics-comparison-label {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: #525252;
          margin-bottom: 8px;
        }

        .analytics-comparison-value {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 4px;
        }

        .analytics-comparison-arrow {
          font-size: 24px;
          font-weight: 700;
        }

        .analytics-comparison-pct {
          font-family: var(--font-display, 'Bebas Neue', sans-serif);
          font-size: 28px;
          letter-spacing: 1px;
        }

        .analytics-comparison-detail {
          font-size: 10px;
          color: #737373;
        }

        .analytics-stat-card {
          background: #0e0e0e;
          border: 1px solid #1a1a1a;
          border-radius: 8px;
          padding: 16px;
          text-align: center;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .analytics-stat-value {
          font-family: var(--font-display, 'Bebas Neue', sans-serif);
          font-size: 24px;
          letter-spacing: 1px;
          color: #d4d4d4;
        }

        .analytics-stat-label {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: #525252;
          margin-top: 4px;
        }

        .analytics-chart-container {
          background: #0e0e0e;
          border: 1px solid #1a1a1a;
          border-radius: 8px;
          padding: 24px;
          min-height: 320px;
        }

        .analytics-chart-loading,
        .analytics-chart-empty {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          height: 280px;
          color: #737373;
          font-size: 12px;
        }

        .analytics-loading-spinner {
          width: 18px;
          height: 18px;
          border: 2px solid #1a1a1a;
          border-top-color: #f59e0b;
          border-radius: 50%;
          animation: analytics-spin 0.8s linear infinite;
        }

        @keyframes analytics-spin {
          to { transform: rotate(360deg); }
        }

        .analytics-chart {
          height: 280px;
        }

        .analytics-chart-bars {
          display: flex;
          align-items: flex-end;
          gap: 2px;
          height: 250px;
          padding-bottom: 24px;
          position: relative;
        }

        .analytics-bar-wrapper {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          height: 100%;
          position: relative;
          cursor: crosshair;
        }

        .analytics-bar-track {
          flex: 1;
          width: 100%;
          display: flex;
          align-items: flex-end;
          justify-content: center;
        }

        .analytics-bar {
          width: 80%;
          max-width: 32px;
          min-width: 4px;
          border-radius: 3px 3px 0 0;
          transition: height 0.3s ease, opacity 0.15s;
        }

        .analytics-bar-label {
          font-size: 8px;
          color: #525252;
          margin-top: 4px;
          white-space: nowrap;
          height: 16px;
        }

        .analytics-bar-tooltip {
          position: absolute;
          bottom: calc(100% + 4px);
          left: 50%;
          transform: translateX(-50%);
          background: #1a1a1a;
          border: 1px solid #2a2a2a;
          border-radius: 6px;
          padding: 8px 12px;
          z-index: 10;
          white-space: nowrap;
          pointer-events: none;
        }

        .analytics-tooltip-date {
          font-size: 10px;
          color: #737373;
          margin-bottom: 2px;
        }

        .analytics-tooltip-value {
          font-size: 14px;
          font-weight: 700;
          color: #d4d4d4;
        }

        .analytics-tooltip-range {
          font-size: 9px;
          color: #525252;
          margin-top: 2px;
        }
      `}</style>
    </div>
  );
}
