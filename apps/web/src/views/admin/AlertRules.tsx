import { useState, useEffect, useCallback } from "react";
import { apiFetch, apiPost, apiDelete } from "@/lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RuleConditions {
  zoneType?: string;
  densityAbove?: number;
  timeWindow?: { start: string; end: string };
  days?: string[];
}

interface RuleAction {
  alertType: string;
  severity: number;
  message: string;
}

interface AlertRule {
  id: string;
  name: string;
  enabled: boolean;
  conditions: RuleConditions;
  action: RuleAction;
  cooldownMins: number;
  lastTriggeredAt: string | null;
  createdBy: string;
  createdAt: string;
}

const ZONE_TYPES = [
  "security",
  "gate",
  "baggage",
  "curb",
  "lounge",
  "retail",
  "restricted",
];

const ALERT_TYPES = [
  "CROWD_SURGE",
  "INTRUSION",
  "ABANDONED_OBJECT",
  "LOITERING",
  "PERIMETER_BREACH",
  "DRONE_DETECTED",
];

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const DAY_SHORT: Record<string, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

const SEVERITY_META: Record<number, { label: string; color: string }> = {
  1: { label: "Info", color: "#06b6d4" },
  2: { label: "Low", color: "#22c55e" },
  3: { label: "Medium", color: "#f59e0b" },
  4: { label: "High", color: "#f97316" },
  5: { label: "Critical", color: "#ef4444" },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AlertRules() {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  // Form state
  const [form, setForm] = useState({
    name: "",
    zoneType: "security",
    densityAbove: 50,
    timeStart: "00:00",
    timeEnd: "23:59",
    days: [...DAYS] as string[],
    alertType: "CROWD_SURGE",
    severity: 3,
    message: "",
    cooldownMins: 15,
  });

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ rules: AlertRule[] }>("/api/v1/admin/alert-rules");
      setRules(Array.isArray(data?.rules) ? data.rules : []);
    } catch (err) {
      console.error("Failed to fetch alert rules:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const handleToggle = async (id: string) => {
    try {
      const updated = await apiPost<AlertRule>(
        `/api/v1/admin/alert-rules/${id}/toggle`,
        {},
      );
      setRules((prev) =>
        prev.map((r) => (r.id === id ? { ...r, enabled: updated.enabled ?? !r.enabled } : r)),
      );
    } catch (err) {
      console.error("Failed to toggle rule:", err);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete rule "${name}"? This cannot be undone.`)) return;
    try {
      await apiDelete(`/api/v1/admin/alert-rules/${id}`);
      setRules((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error("Failed to delete rule:", err);
    }
  };

  const toggleDay = (day: string) => {
    setForm((prev) => ({
      ...prev,
      days: prev.days.includes(day)
        ? prev.days.filter((d) => d !== day)
        : [...prev.days, day],
    }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiPost("/api/v1/admin/alert-rules", {
        name: form.name,
        conditions: {
          zone_type: form.zoneType,
          density_above: form.densityAbove,
          time_window: { start: form.timeStart, end: form.timeEnd },
          days: form.days,
        },
        action: {
          alert_type: form.alertType,
          severity: form.severity,
          message: form.message,
        },
        cooldown_mins: form.cooldownMins,
        enabled: true,
      });
      setShowCreate(false);
      setForm({
        name: "",
        zoneType: "security",
        densityAbove: 50,
        timeStart: "00:00",
        timeEnd: "23:59",
        days: [...DAYS],
        alertType: "CROWD_SURGE",
        severity: 3,
        message: "",
        cooldownMins: 15,
      });
      fetchRules();
    } catch (err) {
      console.error("Failed to create rule:", err);
    }
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return "--";
    return new Date(iso).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const summarizeConditions = (c: RuleConditions): string => {
    const parts: string[] = [];
    if (c.zoneType) parts.push(c.zoneType);
    if (c.densityAbove != null) parts.push(`density > ${c.densityAbove}%`);
    if (c.timeWindow) parts.push(`${c.timeWindow.start}-${c.timeWindow.end}`);
    if (c.days && c.days.length < 7) {
      parts.push(c.days.map((d) => DAY_SHORT[d] ?? d).join(", "));
    }
    return parts.join(" / ") || "Any";
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl tracking-wider text-gray-100">
          ALERT RULES
        </h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-3 py-1.5 rounded bg-[#f59e0b] text-[#080808] text-xs font-mono font-bold hover:bg-[#d97706] transition-colors"
        >
          {showCreate ? "Cancel" : "Create Rule"}
        </button>
      </div>

      <p className="text-xs font-mono text-gray-500">
        Define custom rules that trigger alerts when zone conditions match. Rules are evaluated against live density data.
      </p>

      {/* Create Form */}
      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="rounded-lg border border-[#1a1a1a] bg-[#0e0e0e] p-5 space-y-4"
        >
          <div className="text-sm font-mono text-gray-300 mb-1">New Alert Rule</div>

          {/* Rule Name */}
          <div>
            <label className="text-[9px] font-mono text-gray-600 block mb-1">Rule Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Morning Rush Crowd Alert"
              className="w-full bg-[#080808] border border-[#1a1a1a] rounded px-3 py-2 text-xs font-mono text-gray-300 focus:border-[#f59e0b] focus:outline-none"
              required
            />
          </div>

          {/* Conditions section */}
          <div className="rounded border border-[#1a1a1a] p-3 space-y-3">
            <div className="text-[10px] font-mono text-[#f59e0b] uppercase tracking-wider">
              Conditions
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Zone type */}
              <div>
                <label className="text-[9px] font-mono text-gray-600 block mb-1">Zone Type</label>
                <select
                  value={form.zoneType}
                  onChange={(e) => setForm({ ...form, zoneType: e.target.value })}
                  className="w-full bg-[#080808] border border-[#1a1a1a] rounded px-3 py-2 text-xs font-mono text-gray-300 focus:border-[#f59e0b] focus:outline-none"
                >
                  {ZONE_TYPES.map((zt) => (
                    <option key={zt} value={zt}>
                      {zt.charAt(0).toUpperCase() + zt.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Density threshold */}
              <div>
                <label className="text-[9px] font-mono text-gray-600 block mb-1">
                  Density Threshold: {form.densityAbove}%
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={form.densityAbove}
                  onChange={(e) => setForm({ ...form, densityAbove: parseInt(e.target.value) })}
                  className="w-full accent-[#f59e0b] h-1.5"
                />
                <div className="flex justify-between text-[8px] font-mono text-gray-700 mt-0.5">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>

            {/* Time window */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] font-mono text-gray-600 block mb-1">Start Time</label>
                <input
                  type="time"
                  value={form.timeStart}
                  onChange={(e) => setForm({ ...form, timeStart: e.target.value })}
                  className="w-full bg-[#080808] border border-[#1a1a1a] rounded px-3 py-2 text-xs font-mono text-gray-300 focus:border-[#f59e0b] focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[9px] font-mono text-gray-600 block mb-1">End Time</label>
                <input
                  type="time"
                  value={form.timeEnd}
                  onChange={(e) => setForm({ ...form, timeEnd: e.target.value })}
                  className="w-full bg-[#080808] border border-[#1a1a1a] rounded px-3 py-2 text-xs font-mono text-gray-300 focus:border-[#f59e0b] focus:outline-none"
                />
              </div>
            </div>

            {/* Days of week */}
            <div>
              <label className="text-[9px] font-mono text-gray-600 block mb-2">Days of Week</label>
              <div className="flex gap-1.5">
                {DAYS.map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`px-2 py-1 rounded border text-[10px] font-mono transition-colors ${
                      form.days.includes(day)
                        ? "border-[#f59e0b] bg-[#f59e0b]/10 text-[#f59e0b]"
                        : "border-[#1a1a1a] text-gray-600 hover:text-gray-400"
                    }`}
                  >
                    {DAY_SHORT[day]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action section */}
          <div className="rounded border border-[#1a1a1a] p-3 space-y-3">
            <div className="text-[10px] font-mono text-[#f59e0b] uppercase tracking-wider">
              Action
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Alert type */}
              <div>
                <label className="text-[9px] font-mono text-gray-600 block mb-1">Alert Type</label>
                <select
                  value={form.alertType}
                  onChange={(e) => setForm({ ...form, alertType: e.target.value })}
                  className="w-full bg-[#080808] border border-[#1a1a1a] rounded px-3 py-2 text-xs font-mono text-gray-300 focus:border-[#f59e0b] focus:outline-none"
                >
                  {ALERT_TYPES.map((at) => (
                    <option key={at} value={at}>
                      {at.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>

              {/* Severity */}
              <div>
                <label className="text-[9px] font-mono text-gray-600 block mb-1">Severity</label>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setForm({ ...form, severity: s })}
                      className={`flex-1 px-1 py-1.5 rounded border text-[10px] font-mono transition-colors ${
                        form.severity === s
                          ? "font-bold"
                          : "border-[#1a1a1a] text-gray-600 hover:text-gray-400"
                      }`}
                      style={
                        form.severity === s && SEVERITY_META[s]
                          ? {
                              color: SEVERITY_META[s]!.color,
                              borderColor: SEVERITY_META[s]!.color,
                              backgroundColor: SEVERITY_META[s]!.color + "15",
                            }
                          : undefined
                      }
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Custom message */}
            <div>
              <label className="text-[9px] font-mono text-gray-600 block mb-1">Custom Message</label>
              <textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Alert message to include when this rule fires..."
                rows={2}
                className="w-full bg-[#080808] border border-[#1a1a1a] rounded px-3 py-2 text-xs font-mono text-gray-300 focus:border-[#f59e0b] focus:outline-none resize-none"
                required
              />
            </div>

            {/* Cooldown */}
            <div>
              <label className="text-[9px] font-mono text-gray-600 block mb-1">
                Cooldown (minutes)
              </label>
              <input
                type="number"
                min={1}
                max={1440}
                value={form.cooldownMins}
                onChange={(e) =>
                  setForm({ ...form, cooldownMins: parseInt(e.target.value) || 15 })
                }
                className="w-32 bg-[#080808] border border-[#1a1a1a] rounded px-3 py-2 text-xs font-mono text-gray-300 focus:border-[#f59e0b] focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={!form.name || !form.message}
            className="px-4 py-2 rounded bg-[#f59e0b] text-[#080808] text-xs font-mono font-bold hover:bg-[#d97706] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create Rule
          </button>
        </form>
      )}

      {/* Rules table */}
      {loading ? (
        <div className="text-center py-12 text-gray-600 font-mono text-xs">Loading rules...</div>
      ) : (
        <div className="rounded-lg border border-[#1a1a1a] bg-[#0e0e0e] overflow-hidden">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-[#1a1a1a] text-gray-500">
                <th className="text-left px-3 py-2.5">Status</th>
                <th className="text-left px-3 py-2.5">Name</th>
                <th className="text-left px-3 py-2.5">Conditions</th>
                <th className="text-left px-3 py-2.5">Alert Type</th>
                <th className="text-left px-3 py-2.5">Severity</th>
                <th className="text-left px-3 py-2.5">Cooldown</th>
                <th className="text-left px-3 py-2.5">Last Triggered</th>
                <th className="text-left px-3 py-2.5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => {
                const sev = SEVERITY_META[rule.action?.severity] ?? SEVERITY_META[3]!;
                return (
                  <tr
                    key={rule.id}
                    className={`border-b border-[#1a1a1a]/50 hover:bg-[#111] transition-colors ${
                      !rule.enabled ? "opacity-40" : ""
                    }`}
                  >
                    {/* Toggle */}
                    <td className="px-3 py-2.5">
                      <button
                        onClick={() => handleToggle(rule.id)}
                        className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
                          rule.enabled ? "bg-[#f59e0b]" : "bg-[#1a1a1a]"
                        }`}
                      >
                        <span
                          className={`inline-block h-2.5 w-2.5 rounded-full bg-white transition-transform ${
                            rule.enabled ? "translate-x-[14px]" : "translate-x-[3px]"
                          }`}
                        />
                      </button>
                    </td>

                    {/* Name */}
                    <td className="px-3 py-2.5 text-gray-200">{rule.name}</td>

                    {/* Conditions */}
                    <td className="px-3 py-2.5 text-gray-400 max-w-[200px] truncate">
                      {summarizeConditions(rule.conditions)}
                    </td>

                    {/* Alert type */}
                    <td className="px-3 py-2.5">
                      <span className="px-1.5 py-0.5 rounded bg-[#1a1a1a] text-gray-400 text-[9px]">
                        {rule.action?.alertType ?? "--"}
                      </span>
                    </td>

                    {/* Severity badge */}
                    <td className="px-3 py-2.5">
                      {sev && (
                        <span
                          className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                          style={{
                            backgroundColor: sev.color + "20",
                            color: sev.color,
                          }}
                        >
                          {sev.label}
                        </span>
                      )}
                    </td>

                    {/* Cooldown */}
                    <td className="px-3 py-2.5 text-gray-500">{rule.cooldownMins}m</td>

                    {/* Last triggered */}
                    <td className="px-3 py-2.5 text-gray-500">
                      {formatDate(rule.lastTriggeredAt)}
                    </td>

                    {/* Delete */}
                    <td className="px-3 py-2.5">
                      <button
                        onClick={() => handleDelete(rule.id, rule.name)}
                        className="text-[#ef4444] hover:text-[#dc2626] text-[10px] transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
              {rules.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-600">
                    No alert rules configured. Click "Create Rule" to add one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
