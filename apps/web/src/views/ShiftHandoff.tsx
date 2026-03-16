import { useEffect, useState } from "react";
import { getShiftHandoff, type ShiftHandoff as ShiftHandoffData } from "@/lib/api";

function scoreColor(score: number): string {
  if (score >= 900) return "#22c55e";
  if (score >= 750) return "#f59e0b";
  if (score >= 600) return "#f97316";
  return "#ef4444";
}

function severityColor(sev: number): string {
  if (sev >= 5) return "#ef4444";
  if (sev >= 4) return "#f97316";
  if (sev >= 3) return "#f59e0b";
  return "#06b6d4";
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export function ShiftHandoff() {
  const [data, setData] = useState<ShiftHandoffData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getShiftHandoff()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="handoff-container">
        <div className="handoff-loading">
          <div className="handoff-loading-spinner" />
          <span>Generating handoff report...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="handoff-container">
        <div className="handoff-error">
          Failed to load handoff report: {error ?? "Unknown error"}
        </div>
      </div>
    );
  }

  return (
    <div className="handoff-container">
      {/* Header */}
      <div className="handoff-header">
        <div className="handoff-header-left">
          <h1 className="handoff-title">SHIFT HANDOFF REPORT</h1>
          <p className="handoff-subtitle">
            {formatDate(data.shift.start)}
          </p>
        </div>
        <div className="handoff-header-right">
          <div className="handoff-operator">{data.shift.operator}</div>
          <div className="handoff-shift-time">
            {formatTime(data.shift.start)} - {formatTime(data.shift.end)}
          </div>
          <div
            className="handoff-score-badge"
            style={{ borderColor: scoreColor(data.shift.score), color: scoreColor(data.shift.score) }}
          >
            {data.shift.score}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="handoff-summary-grid">
        <div className="handoff-card">
          <div className="handoff-card-value">{data.summary.totalIncidents}</div>
          <div className="handoff-card-label">Total Incidents</div>
        </div>
        <div className="handoff-card">
          <div className="handoff-card-value" style={{ color: "#22c55e" }}>
            {data.summary.acknowledged}
          </div>
          <div className="handoff-card-label">Acknowledged</div>
        </div>
        <div className="handoff-card">
          <div className="handoff-card-value" style={{ color: data.summary.pending > 0 ? "#f59e0b" : "#22c55e" }}>
            {data.summary.pending}
          </div>
          <div className="handoff-card-label">Pending</div>
        </div>
        <div className="handoff-card">
          <div className="handoff-card-value">{data.summary.avgResponseSecs}s</div>
          <div className="handoff-card-label">Avg Response</div>
        </div>
        <div className="handoff-card">
          <div className="handoff-card-value" style={{ color: data.summary.peakDensityPct > 80 ? "#ef4444" : "#f59e0b" }}>
            {data.summary.peakDensityPct}%
          </div>
          <div className="handoff-card-label">Peak Density</div>
        </div>
        <div className="handoff-card">
          <div className="handoff-card-value" style={{ color: "#f97316" }}>
            {data.summary.escalated}
          </div>
          <div className="handoff-card-label">Escalated</div>
        </div>
      </div>

      {/* Pending Items */}
      {data.pendingItems.length > 0 && (
        <div className="handoff-section">
          <h2 className="handoff-section-title handoff-section-title--warning">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            PENDING ITEMS
          </h2>
          <div className="handoff-items">
            {data.pendingItems.map((item, i) => (
              <div key={i} className="handoff-pending-item">
                <span className="handoff-pending-type">{item.type.replace(/_/g, " ")}</span>
                <span className="handoff-pending-detail">{item.detail}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Watch Items */}
      {data.watchItems.length > 0 && (
        <div className="handoff-section">
          <h2 className="handoff-section-title handoff-section-title--info">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            WATCH ITEMS
          </h2>
          <ul className="handoff-watch-list">
            {data.watchItems.map((item, i) => (
              <li key={i} className="handoff-watch-item">{item}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Top Incidents */}
      {data.topIncidents.length > 0 && (
        <div className="handoff-section">
          <h2 className="handoff-section-title">TOP INCIDENTS</h2>
          <div className="handoff-timeline">
            {data.topIncidents.map((inc, i) => (
              <div key={i} className="handoff-incident">
                <div className="handoff-incident-time">{inc.time}</div>
                <div
                  className="handoff-incident-dot"
                  style={{ backgroundColor: severityColor(inc.severity) }}
                />
                <div className="handoff-incident-content">
                  <div className="handoff-incident-type">
                    {inc.type.replace(/_/g, " ")}
                    <span
                      className="handoff-incident-severity"
                      style={{ color: severityColor(inc.severity) }}
                    >
                      SEV {inc.severity}
                    </span>
                  </div>
                  <div className="handoff-incident-zone">{inc.zone}</div>
                  <span
                    className="handoff-incident-status"
                    style={{ color: inc.resolved ? "#22c55e" : "#f59e0b" }}
                  >
                    {inc.resolved ? "Resolved" : "Open"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Missions */}
      {data.missionsStatus.length > 0 && (
        <div className="handoff-section">
          <h2 className="handoff-section-title">MISSIONS</h2>
          <div className="handoff-missions">
            {data.missionsStatus.map((m, i) => {
              const pct = m.target > 0 ? Math.min(100, Math.round((m.progress / m.target) * 100)) : 0;
              return (
                <div key={i} className="handoff-mission">
                  <div className="handoff-mission-header">
                    <span className="handoff-mission-title">{m.title}</span>
                    <span
                      className="handoff-mission-status"
                      style={{ color: m.completed ? "#22c55e" : "#f59e0b" }}
                    >
                      {m.completed ? "COMPLETE" : `${m.progress}/${m.target}`}
                    </span>
                  </div>
                  <div className="handoff-progress-bar">
                    <div
                      className="handoff-progress-fill"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: m.completed ? "#22c55e" : "#f59e0b",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Print Button */}
      <div className="handoff-print-bar">
        <button
          className="handoff-print-btn"
          onClick={() => window.print()}
        >
          Print Report
        </button>
      </div>

      <style>{`
        .handoff-container {
          max-width: 900px;
          margin: 0 auto;
          font-family: var(--font-mono, 'IBM Plex Mono', monospace);
        }

        .handoff-loading {
          display: flex;
          align-items: center;
          gap: 12px;
          justify-content: center;
          padding: 80px 0;
          color: #737373;
          font-size: 13px;
        }

        .handoff-loading-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid #1a1a1a;
          border-top-color: #f59e0b;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .handoff-error {
          padding: 40px;
          color: #ef4444;
          text-align: center;
          font-size: 13px;
        }

        .handoff-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 24px;
          background: #0e0e0e;
          border: 1px solid #1a1a1a;
          border-radius: 8px;
          margin-bottom: 20px;
        }

        .handoff-title {
          font-family: var(--font-display, 'Bebas Neue', sans-serif);
          font-size: 32px;
          letter-spacing: 3px;
          color: #f59e0b;
          margin: 0;
        }

        .handoff-subtitle {
          font-size: 12px;
          color: #737373;
          margin: 4px 0 0;
        }

        .handoff-header-right {
          text-align: right;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 4px;
        }

        .handoff-operator {
          font-size: 14px;
          font-weight: 600;
          color: #d4d4d4;
        }

        .handoff-shift-time {
          font-size: 11px;
          color: #737373;
        }

        .handoff-score-badge {
          font-family: var(--font-display, 'Bebas Neue', sans-serif);
          font-size: 28px;
          letter-spacing: 2px;
          border: 2px solid;
          border-radius: 8px;
          padding: 2px 14px;
          margin-top: 4px;
        }

        .handoff-summary-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 20px;
        }

        .handoff-card {
          background: #0e0e0e;
          border: 1px solid #1a1a1a;
          border-radius: 8px;
          padding: 16px;
          text-align: center;
        }

        .handoff-card-value {
          font-family: var(--font-display, 'Bebas Neue', sans-serif);
          font-size: 28px;
          letter-spacing: 1px;
          color: #d4d4d4;
        }

        .handoff-card-label {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: #525252;
          margin-top: 4px;
        }

        .handoff-section {
          background: #0e0e0e;
          border: 1px solid #1a1a1a;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 16px;
        }

        .handoff-section-title {
          font-family: var(--font-display, 'Bebas Neue', sans-serif);
          font-size: 18px;
          letter-spacing: 2px;
          color: #d4d4d4;
          margin: 0 0 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .handoff-section-title--warning {
          color: #f59e0b;
        }

        .handoff-section-title--info {
          color: #06b6d4;
        }

        .handoff-pending-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 10px 12px;
          border-left: 3px solid #f59e0b;
          background: rgba(245, 158, 11, 0.05);
          border-radius: 0 6px 6px 0;
          margin-bottom: 8px;
        }

        .handoff-pending-type {
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #f59e0b;
          white-space: nowrap;
          padding-top: 2px;
        }

        .handoff-pending-detail {
          font-size: 12px;
          color: #d4d4d4;
          line-height: 1.5;
        }

        .handoff-watch-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .handoff-watch-item {
          font-size: 12px;
          color: #d4d4d4;
          padding: 8px 0 8px 20px;
          position: relative;
          border-bottom: 1px solid #1a1a1a;
          line-height: 1.6;
        }

        .handoff-watch-item:last-child {
          border-bottom: none;
        }

        .handoff-watch-item::before {
          content: '';
          position: absolute;
          left: 0;
          top: 14px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          border: 2px solid #06b6d4;
        }

        .handoff-timeline {
          position: relative;
          padding-left: 60px;
        }

        .handoff-incident {
          position: relative;
          padding: 12px 0 12px 28px;
          border-bottom: 1px solid #1a1a1a;
        }

        .handoff-incident:last-child {
          border-bottom: none;
        }

        .handoff-incident-time {
          position: absolute;
          left: -60px;
          top: 14px;
          font-size: 11px;
          color: #525252;
          width: 50px;
          text-align: right;
        }

        .handoff-incident-dot {
          position: absolute;
          left: 0;
          top: 16px;
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }

        .handoff-incident-content {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
        }

        .handoff-incident-type {
          font-size: 13px;
          font-weight: 600;
          color: #d4d4d4;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .handoff-incident-severity {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 1px;
        }

        .handoff-incident-zone {
          font-size: 11px;
          color: #737373;
        }

        .handoff-incident-status {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .handoff-missions {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .handoff-mission {
          padding: 0;
        }

        .handoff-mission-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 6px;
        }

        .handoff-mission-title {
          font-size: 12px;
          color: #d4d4d4;
        }

        .handoff-mission-status {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.5px;
        }

        .handoff-progress-bar {
          height: 6px;
          background: #1a1a1a;
          border-radius: 3px;
          overflow: hidden;
        }

        .handoff-progress-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.4s ease;
        }

        .handoff-print-bar {
          display: flex;
          justify-content: center;
          padding: 24px 0;
        }

        .handoff-print-btn {
          font-family: var(--font-mono, 'IBM Plex Mono', monospace);
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: #080808;
          background: #f59e0b;
          border: none;
          border-radius: 6px;
          padding: 10px 32px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .handoff-print-btn:hover {
          background: #d97706;
        }

        /* Print styles */
        @media print {
          body {
            background: #fff !important;
            color: #000 !important;
          }

          .handoff-container {
            max-width: 100%;
          }

          .handoff-header {
            background: #fff !important;
            border-color: #ccc !important;
          }

          .handoff-title {
            color: #000 !important;
          }

          .handoff-subtitle,
          .handoff-shift-time {
            color: #555 !important;
          }

          .handoff-operator {
            color: #000 !important;
          }

          .handoff-card {
            background: #fff !important;
            border-color: #ccc !important;
          }

          .handoff-card-value {
            color: #000 !important;
          }

          .handoff-card-label {
            color: #555 !important;
          }

          .handoff-section {
            background: #fff !important;
            border-color: #ccc !important;
          }

          .handoff-section-title {
            color: #000 !important;
          }

          .handoff-pending-item {
            background: #fffbeb !important;
            border-left-color: #d97706 !important;
          }

          .handoff-pending-detail,
          .handoff-incident-type,
          .handoff-mission-title,
          .handoff-watch-item {
            color: #000 !important;
          }

          .handoff-incident-zone,
          .handoff-incident-time {
            color: #555 !important;
          }

          .handoff-incident {
            border-bottom-color: #ddd !important;
          }

          .handoff-watch-item {
            border-bottom-color: #ddd !important;
          }

          .handoff-progress-bar {
            background: #ddd !important;
          }

          .handoff-print-bar {
            display: none !important;
          }

          /* Hide sidebar, header, and other app chrome */
          aside, header, nav {
            display: none !important;
          }

          main {
            padding: 0 !important;
            overflow: visible !important;
          }

          .flex.h-screen {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
}
