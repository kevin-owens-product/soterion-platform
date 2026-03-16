import { useState, useEffect, useCallback } from "react";
import { apiFetch, apiPost, apiPatch, apiDelete } from "@/lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface IntegrationConfig {
  webhookUrl?: string;
  routingKey?: string;
  recipients?: string[];
}

interface AlertIntegration {
  id: string;
  type: "slack" | "pagerduty" | "email";
  name: string;
  config: IntegrationConfig;
  enabled: boolean;
  triggerSeverity: number;
  lastFiredAt: string | null;
  createdAt: string;
}

type IntegrationType = "slack" | "pagerduty" | "email";

const TYPE_META: Record<IntegrationType, { label: string; color: string; icon: JSX.Element }> = {
  slack: {
    label: "Slack",
    color: "#4A154B",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.27 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.163 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.163 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.163 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.27a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.315A2.528 2.528 0 0 1 24 15.163a2.528 2.528 0 0 1-2.522 2.523h-6.315z" />
      </svg>
    ),
  },
  pagerduty: {
    label: "PagerDuty",
    color: "#06AC38",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M16.965 1.18C15.085.164 13.769 0 10.683 0H3.73v14.55h6.926c2.743 0 4.8-.164 6.61-1.37 1.975-1.303 3.004-3.47 3.004-6.074 0-2.879-1.182-4.75-3.305-5.926zM11.43 10.074H8.078V4.449h3.164c2.66 0 4.2.93 4.2 2.74 0 1.975-1.46 2.885-3.988 2.885H11.43zM3.73 17.611h4.348V24H3.73z" />
      </svg>
    ),
  },
  email: {
    label: "Email",
    color: "#06b6d4",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
      </svg>
    ),
  },
};

const SEVERITY_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: "Info", color: "#06b6d4" },
  2: { label: "Low", color: "#22c55e" },
  3: { label: "Medium", color: "#f59e0b" },
  4: { label: "High", color: "#f97316" },
  5: { label: "Critical", color: "#ef4444" },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Integrations() {
  const [integrations, setIntegrations] = useState<AlertIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; message: string } | null>(null);

  // Create form state
  const [form, setForm] = useState<{
    type: IntegrationType;
    name: string;
    webhookUrl: string;
    routingKey: string;
    recipients: string;
    triggerSeverity: number;
  }>({
    type: "slack",
    name: "",
    webhookUrl: "",
    routingKey: "",
    recipients: "",
    triggerSeverity: 3,
  });

  const fetchIntegrations = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ integrations: AlertIntegration[] }>(
        "/api/v1/admin/integrations",
      );
      setIntegrations(Array.isArray(data?.integrations) ? data.integrations : []);
    } catch (err) {
      console.error("Failed to fetch integrations:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  const handleToggle = async (id: string, currentEnabled: boolean) => {
    try {
      await apiPatch(`/api/v1/admin/integrations/${id}`, { enabled: !currentEnabled });
      setIntegrations((prev) =>
        prev.map((i) => (i.id === id ? { ...i, enabled: !currentEnabled } : i)),
      );
    } catch (err) {
      console.error("Failed to toggle integration:", err);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete integration "${name}"? This cannot be undone.`)) return;
    try {
      await apiDelete(`/api/v1/admin/integrations/${id}`);
      setIntegrations((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      console.error("Failed to delete integration:", err);
    }
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    setTestResult(null);
    try {
      const result = await apiPost<{ message: string }>(
        `/api/v1/admin/integrations/${id}/test`,
        {},
      );
      setTestResult({ id, message: result.message ?? "Test sent successfully" });
    } catch (err) {
      setTestResult({ id, message: "Test failed" });
      console.error("Failed to test integration:", err);
    } finally {
      setTestingId(null);
      setTimeout(() => setTestResult(null), 4000);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const config: Record<string, unknown> = {};
    if (form.type === "slack") config.webhook_url = form.webhookUrl;
    if (form.type === "pagerduty") config.routing_key = form.routingKey;
    if (form.type === "email") {
      config.recipients = form.recipients
        .split(",")
        .map((r) => r.trim())
        .filter(Boolean);
    }

    try {
      await apiPost("/api/v1/admin/integrations", {
        type: form.type,
        name: form.name,
        config,
        trigger_severity: form.triggerSeverity,
        enabled: true,
      });
      setShowCreate(false);
      setForm({ type: "slack", name: "", webhookUrl: "", routingKey: "", recipients: "", triggerSeverity: 3 });
      fetchIntegrations();
    } catch (err) {
      console.error("Failed to create integration:", err);
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl tracking-wider text-gray-100">
          INTEGRATIONS
        </h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-3 py-1.5 rounded bg-[#f59e0b] text-[#080808] text-xs font-mono font-bold hover:bg-[#d97706] transition-colors"
        >
          {showCreate ? "Cancel" : "Add Integration"}
        </button>
      </div>

      <p className="text-xs font-mono text-gray-500">
        Configure alert delivery channels. Notifications are sent when alert severity meets or exceeds the configured threshold.
      </p>

      {/* Create Modal */}
      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="rounded-lg border border-[#1a1a1a] bg-[#0e0e0e] p-5 space-y-4"
        >
          <div className="text-sm font-mono text-gray-300 mb-2">New Integration</div>

          {/* Type selector */}
          <div>
            <label className="text-[9px] font-mono text-gray-600 block mb-2">Type</label>
            <div className="flex gap-2">
              {(["slack", "pagerduty", "email"] as IntegrationType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm({ ...form, type: t })}
                  className={`flex items-center gap-2 px-3 py-2 rounded border text-xs font-mono transition-colors ${
                    form.type === t
                      ? "border-[#f59e0b] bg-[#f59e0b]/10 text-[#f59e0b]"
                      : "border-[#1a1a1a] text-gray-500 hover:text-gray-300 hover:border-gray-600"
                  }`}
                >
                  <span style={{ color: form.type === t ? TYPE_META[t].color : undefined }}>
                    {TYPE_META[t].icon}
                  </span>
                  {TYPE_META[t].label}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="text-[9px] font-mono text-gray-600 block mb-1">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Security Ops Channel"
              className="w-full bg-[#080808] border border-[#1a1a1a] rounded px-3 py-2 text-xs font-mono text-gray-300 focus:border-[#f59e0b] focus:outline-none"
              required
            />
          </div>

          {/* Config fields per type */}
          {form.type === "slack" && (
            <div>
              <label className="text-[9px] font-mono text-gray-600 block mb-1">Webhook URL</label>
              <input
                type="url"
                value={form.webhookUrl}
                onChange={(e) => setForm({ ...form, webhookUrl: e.target.value })}
                placeholder="https://hooks.slack.com/services/..."
                className="w-full bg-[#080808] border border-[#1a1a1a] rounded px-3 py-2 text-xs font-mono text-gray-300 focus:border-[#f59e0b] focus:outline-none"
                required
              />
            </div>
          )}
          {form.type === "pagerduty" && (
            <div>
              <label className="text-[9px] font-mono text-gray-600 block mb-1">Routing Key</label>
              <input
                type="text"
                value={form.routingKey}
                onChange={(e) => setForm({ ...form, routingKey: e.target.value })}
                placeholder="PagerDuty integration routing key"
                className="w-full bg-[#080808] border border-[#1a1a1a] rounded px-3 py-2 text-xs font-mono text-gray-300 focus:border-[#f59e0b] focus:outline-none"
                required
              />
            </div>
          )}
          {form.type === "email" && (
            <div>
              <label className="text-[9px] font-mono text-gray-600 block mb-1">
                Recipients (comma separated)
              </label>
              <input
                type="text"
                value={form.recipients}
                onChange={(e) => setForm({ ...form, recipients: e.target.value })}
                placeholder="ops@airport.com, security@airport.com"
                className="w-full bg-[#080808] border border-[#1a1a1a] rounded px-3 py-2 text-xs font-mono text-gray-300 focus:border-[#f59e0b] focus:outline-none"
                required
              />
            </div>
          )}

          {/* Severity threshold */}
          <div>
            <label className="text-[9px] font-mono text-gray-600 block mb-2">
              Severity Threshold (minimum severity to trigger)
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setForm({ ...form, triggerSeverity: s })}
                  className={`px-3 py-1.5 rounded border text-xs font-mono transition-colors ${
                    form.triggerSeverity === s
                      ? "border-current font-bold"
                      : "border-[#1a1a1a] text-gray-600 hover:text-gray-400"
                  }`}
                  style={
                    form.triggerSeverity === s
                      ? { color: SEVERITY_LABELS[s]?.color, borderColor: SEVERITY_LABELS[s]?.color, backgroundColor: (SEVERITY_LABELS[s]?.color ?? "") + "15" }
                      : undefined
                  }
                >
                  {SEVERITY_LABELS[s]?.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="px-4 py-2 rounded bg-[#f59e0b] text-[#080808] text-xs font-mono font-bold hover:bg-[#d97706] transition-colors"
          >
            Create Integration
          </button>
        </form>
      )}

      {/* Integration cards */}
      {loading ? (
        <div className="text-center py-12 text-gray-600 font-mono text-xs">Loading integrations...</div>
      ) : integrations.length === 0 ? (
        <div className="text-center py-12 text-gray-600 font-mono text-xs">
          No integrations configured. Click "Add Integration" to get started.
        </div>
      ) : (
        <div className="space-y-3">
          {integrations.map((integration) => {
            const meta = TYPE_META[integration.type];
            const sev = SEVERITY_LABELS[integration.triggerSeverity] ?? SEVERITY_LABELS[3];
            return (
              <div
                key={integration.id}
                className={`rounded-lg border bg-[#0e0e0e] p-4 transition-colors ${
                  integration.enabled ? "border-[#1a1a1a]" : "border-[#1a1a1a] opacity-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: meta.color + "20", color: meta.color }}
                    >
                      {meta.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono text-gray-200">
                          {integration.name}
                        </span>
                        <span
                          className="px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase"
                          style={{ backgroundColor: meta.color + "20", color: meta.color }}
                        >
                          {meta.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[10px] font-mono text-gray-600">
                          Threshold:{" "}
                          <span style={{ color: sev?.color }}>{sev?.label}+</span>
                        </span>
                        {integration.lastFiredAt && (
                          <span className="text-[10px] font-mono text-gray-600">
                            Last fired: {formatDate(integration.lastFiredAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Test result inline */}
                    {testResult?.id === integration.id && (
                      <span className="text-[10px] font-mono text-[#22c55e]">
                        {testResult.message}
                      </span>
                    )}

                    {/* Test button */}
                    <button
                      onClick={() => handleTest(integration.id)}
                      disabled={testingId === integration.id}
                      className="px-2.5 py-1 rounded border border-[#1a1a1a] text-[10px] font-mono text-gray-400 hover:text-gray-200 hover:border-gray-600 transition-colors disabled:opacity-50"
                    >
                      {testingId === integration.id ? "Sending..." : "Test"}
                    </button>

                    {/* Toggle */}
                    <button
                      onClick={() => handleToggle(integration.id, integration.enabled)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        integration.enabled ? "bg-[#f59e0b]" : "bg-[#1a1a1a]"
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                          integration.enabled ? "translate-x-[18px]" : "translate-x-[3px]"
                        }`}
                      />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(integration.id, integration.name)}
                      className="text-[10px] font-mono text-[#ef4444] hover:text-[#dc2626] transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
