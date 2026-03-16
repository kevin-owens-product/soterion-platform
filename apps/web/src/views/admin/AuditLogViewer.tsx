import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api";

interface AuditEntry {
  id: string;
  event_time: string;
  actor_id: string | null;
  actor_email: string | null;
  actor_ip: string;
  facility_id: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  before_state: Record<string, unknown> | null;
  after_state: Record<string, unknown> | null;
  outcome: string;
  session_id: string | null;
  request_id: string | null;
}

interface AuditResponse {
  entries: AuditEntry[];
  next_cursor: string | null;
  has_more: boolean;
}

export function AuditLogViewer() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filters
  const [actorEmail, setActorEmail] = useState("");
  const [action, setAction] = useState("");
  const [resourceType, setResourceType] = useState("");
  const [outcome, setOutcome] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchEntries = useCallback(async (appendCursor?: string) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (actorEmail) params.set("actor_email", actorEmail);
    if (action) params.set("action", action);
    if (resourceType) params.set("resource_type", resourceType);
    if (outcome) params.set("outcome", outcome);
    if (dateFrom) params.set("from", dateFrom);
    if (dateTo) params.set("to", dateTo);
    if (appendCursor) params.set("cursor", appendCursor);
    params.set("limit", "50");

    try {
      const data = await apiFetch<AuditResponse>(
        `/api/v1/admin/audit-log?${params.toString()}`
      );
      const safeEntries = Array.isArray(data?.entries) ? data.entries : [];
      if (appendCursor) {
        setEntries((prev) => [...prev, ...safeEntries]);
      } else {
        setEntries(safeEntries);
      }
      setCursor(data?.next_cursor ?? null);
      setHasMore(data?.has_more ?? false);
    } catch (err) {
      console.error("Failed to fetch audit log:", err);
    } finally {
      setLoading(false);
    }
  }, [actorEmail, action, resourceType, outcome, dateFrom, dateTo]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleExport = () => {
    const params = new URLSearchParams();
    if (actorEmail) params.set("actor_email", actorEmail);
    if (action) params.set("action", action);
    if (resourceType) params.set("resource_type", resourceType);
    if (outcome) params.set("outcome", outcome);
    if (dateFrom) params.set("from", dateFrom);
    if (dateTo) params.set("to", dateTo);

    const token = localStorage.getItem("soterion_token");
    const url = `/api/v1/admin/audit-log/export?${params.toString()}`;

    // Use a hidden anchor to trigger download
    const a = document.createElement("a");
    a.href = url;
    a.download = "audit-log.csv";
    // For auth, we'll need to fetch with headers
    fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.blob())
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob);
        a.href = blobUrl;
        a.click();
        URL.revokeObjectURL(blobUrl);
      });
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const outcomeColor = (o: string) => {
    if (o === "SUCCESS") return "text-[#22c55e]";
    if (o === "DENIED") return "text-[#f97316]";
    return "text-[#ef4444]";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl tracking-wider text-gray-100">
          AUDIT LOG
        </h1>
        <button
          onClick={handleExport}
          className="px-3 py-1.5 rounded border border-[#1a1a1a] bg-[#0e0e0e] text-xs font-mono text-[#f59e0b] hover:bg-[#1a1a1a] transition-colors"
        >
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-6 gap-2">
        <FilterInput label="Actor" value={actorEmail} onChange={setActorEmail} placeholder="email..." />
        <FilterInput label="Action" value={action} onChange={setAction} placeholder="POST /api..." />
        <FilterInput label="Resource" value={resourceType} onChange={setResourceType} placeholder="alert, sensor..." />
        <div>
          <label className="text-[9px] font-mono text-gray-600 block mb-1">Outcome</label>
          <select
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            className="w-full bg-[#080808] border border-[#1a1a1a] rounded px-2 py-1.5 text-xs font-mono text-gray-300"
          >
            <option value="">All</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="FAILURE">FAILURE</option>
            <option value="DENIED">DENIED</option>
          </select>
        </div>
        <FilterInput label="From" value={dateFrom} onChange={setDateFrom} placeholder="YYYY-MM-DD" />
        <FilterInput label="To" value={dateTo} onChange={setDateTo} placeholder="YYYY-MM-DD" />
      </div>

      {/* Table */}
      <div className="rounded-lg border border-[#1a1a1a] bg-[#0e0e0e] overflow-hidden">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="border-b border-[#1a1a1a] text-gray-500">
              <th className="text-left px-3 py-2">Time</th>
              <th className="text-left px-3 py-2">Actor</th>
              <th className="text-left px-3 py-2">Action</th>
              <th className="text-left px-3 py-2">Resource</th>
              <th className="text-left px-3 py-2">Outcome</th>
              <th className="text-left px-3 py-2">IP</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <AuditRow
                key={entry.id}
                entry={entry}
                expanded={expandedId === entry.id}
                onToggle={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                formatTime={formatTime}
                outcomeColor={outcomeColor}
              />
            ))}
            {entries.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-600">
                  No audit entries found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="flex justify-center">
          <button
            onClick={() => cursor && fetchEntries(cursor)}
            disabled={loading}
            className="px-4 py-2 rounded border border-[#1a1a1a] bg-[#0e0e0e] text-xs font-mono text-gray-400 hover:text-gray-200 hover:bg-[#1a1a1a] transition-colors disabled:opacity-50"
          >
            {loading ? "Loading..." : "Load More"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────

function FilterInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="text-[9px] font-mono text-gray-600 block mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[#080808] border border-[#1a1a1a] rounded px-2 py-1.5 text-xs font-mono text-gray-300 placeholder:text-gray-700"
      />
    </div>
  );
}

function AuditRow({
  entry,
  expanded,
  onToggle,
  formatTime,
  outcomeColor,
}: {
  entry: AuditEntry;
  expanded: boolean;
  onToggle: () => void;
  formatTime: (s: string) => string;
  outcomeColor: (o: string) => string;
}) {
  return (
    <>
      <tr
        className="border-b border-[#1a1a1a]/50 hover:bg-[#111] cursor-pointer transition-colors"
        onClick={onToggle}
      >
        <td className="px-3 py-2 text-gray-400">{formatTime(entry.event_time)}</td>
        <td className="px-3 py-2 text-gray-300">{entry.actor_email ?? "system"}</td>
        <td className="px-3 py-2 text-gray-300 max-w-[200px] truncate">{entry.action}</td>
        <td className="px-3 py-2 text-gray-500">{entry.resource_type ?? "-"}</td>
        <td className={`px-3 py-2 ${outcomeColor(entry.outcome)}`}>{entry.outcome}</td>
        <td className="px-3 py-2 text-gray-600">{entry.actor_ip}</td>
      </tr>
      {expanded && (
        <tr className="border-b border-[#1a1a1a]/50 bg-[#080808]">
          <td colSpan={6} className="px-4 py-3">
            <div className="grid grid-cols-2 gap-4 text-[10px]">
              <div>
                <span className="text-gray-600 block mb-1">Before State</span>
                <pre className="text-gray-400 bg-[#0a0a0a] rounded p-2 overflow-auto max-h-32">
                  {entry.before_state ? JSON.stringify(entry.before_state, null, 2) : "null"}
                </pre>
              </div>
              <div>
                <span className="text-gray-600 block mb-1">After State</span>
                <pre className="text-gray-400 bg-[#0a0a0a] rounded p-2 overflow-auto max-h-32">
                  {entry.after_state ? JSON.stringify(entry.after_state, null, 2) : "null"}
                </pre>
              </div>
              <div className="col-span-2 flex gap-4 text-gray-600">
                <span>Request ID: {entry.request_id ?? "n/a"}</span>
                <span>Session ID: {entry.session_id ?? "n/a"}</span>
                <span>Resource ID: {entry.resource_id ?? "n/a"}</span>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
