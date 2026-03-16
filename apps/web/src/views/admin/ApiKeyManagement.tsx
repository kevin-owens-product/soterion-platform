import { useState, useEffect, useCallback } from "react";
import { apiFetch, apiPost, apiDelete } from "@/lib/api";

interface ApiKey {
  id: string;
  facility_id: string;
  label: string;
  key_prefix: string;
  scopes: string[];
  last_used_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
}

interface CreateKeyResponse extends ApiKey {
  key: string;
  warning: string;
}

const AVAILABLE_SCOPES = [
  "lidar:ingest",
  "lidar:read",
  "sensors:read",
  "sensors:write",
  "alerts:read",
  "alerts:write",
];

export function ApiKeyManagement() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [_loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyPlaintext, setNewKeyPlaintext] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Create form
  const [form, setForm] = useState({
    label: "",
    scopes: [] as string[],
    expires_in_days: 90,
  });

  const fetchKeys = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ api_keys: ApiKey[] }>("/api/v1/admin/api-keys");
      setKeys(Array.isArray(data?.api_keys) ? data.api_keys : []);
    } catch (err) {
      console.error("Failed to fetch API keys:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await apiPost<CreateKeyResponse>("/api/v1/admin/api-keys", form);
      setNewKeyPlaintext(data.key);
      setShowCreate(false);
      setForm({ label: "", scopes: [], expires_in_days: 90 });
      fetchKeys();
    } catch (err) {
      console.error("Failed to create API key:", err);
    }
  };

  const handleRevoke = async (id: string, label: string) => {
    if (!confirm(`Revoke API key "${label}"? This cannot be undone.`)) return;
    try {
      await apiDelete(`/api/v1/admin/api-keys/${id}`);
      fetchKeys();
    } catch (err) {
      console.error("Failed to revoke API key:", err);
    }
  };

  const handleRotate = async (id: string, label: string) => {
    if (!confirm(`Rotate API key "${label}"? The old key will be revoked immediately.`)) return;
    try {
      const data = await apiPost<CreateKeyResponse>(`/api/v1/admin/api-keys/${id}/rotate`, {});
      setNewKeyPlaintext(data.key);
      fetchKeys();
    } catch (err) {
      console.error("Failed to rotate API key:", err);
    }
  };

  const toggleScope = (scope: string) => {
    setForm((prev) => ({
      ...prev,
      scopes: prev.scopes.includes(scope)
        ? prev.scopes.filter((s) => s !== scope)
        : [...prev.scopes, scope],
    }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return "-";
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const activeKeys = keys.filter((k) => !k.revoked_at);
  const revokedKeys = keys.filter((k) => k.revoked_at);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl tracking-wider text-gray-100">
          API KEYS
        </h1>
        <button
          onClick={() => { setShowCreate(!showCreate); setNewKeyPlaintext(null); }}
          className="px-3 py-1.5 rounded bg-[#f59e0b] text-[#080808] text-xs font-mono font-bold hover:bg-[#d97706] transition-colors"
        >
          {showCreate ? "Cancel" : "Create API Key"}
        </button>
      </div>

      {/* Copy-once key display */}
      {newKeyPlaintext && (
        <div className="rounded-lg border-2 border-[#f59e0b] bg-[#f59e0b]/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-mono text-[#f59e0b] font-bold">
              NEW API KEY - COPY NOW
            </span>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-[#080808] rounded px-3 py-2 text-sm font-mono text-gray-200 select-all">
              {newKeyPlaintext}
            </code>
            <button
              onClick={() => copyToClipboard(newKeyPlaintext)}
              className="px-3 py-2 rounded bg-[#f59e0b] text-[#080808] text-xs font-mono font-bold hover:bg-[#d97706]"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="mt-2 text-[10px] font-mono text-[#ef4444]">
            This key will NOT be shown again. Store it securely.
          </p>
          <button
            onClick={() => setNewKeyPlaintext(null)}
            className="mt-2 text-[10px] font-mono text-gray-500 hover:text-gray-300"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Create Form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="rounded-lg border border-[#1a1a1a] bg-[#0e0e0e] p-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[9px] font-mono text-gray-600 block mb-1">Label</label>
              <input
                type="text"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="e.g. Edge Node T2-S001"
                className="w-full bg-[#080808] border border-[#1a1a1a] rounded px-2 py-1.5 text-xs font-mono text-gray-300"
                required
              />
            </div>
            <div>
              <label className="text-[9px] font-mono text-gray-600 block mb-1">Expires In (days)</label>
              <input
                type="number"
                value={form.expires_in_days}
                onChange={(e) => setForm({ ...form, expires_in_days: parseInt(e.target.value) || 90 })}
                className="w-full bg-[#080808] border border-[#1a1a1a] rounded px-2 py-1.5 text-xs font-mono text-gray-300"
              />
            </div>
          </div>
          <div>
            <label className="text-[9px] font-mono text-gray-600 block mb-1">Scopes</label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_SCOPES.map((scope) => (
                <label
                  key={scope}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded border cursor-pointer text-[10px] font-mono transition-colors ${
                    form.scopes.includes(scope)
                      ? "border-[#f59e0b] bg-[#f59e0b]/10 text-[#f59e0b]"
                      : "border-[#1a1a1a] text-gray-500 hover:text-gray-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={form.scopes.includes(scope)}
                    onChange={() => toggleScope(scope)}
                    className="sr-only"
                  />
                  {scope}
                </label>
              ))}
            </div>
          </div>
          <button
            type="submit"
            disabled={!form.label || form.scopes.length === 0}
            className="px-4 py-2 rounded bg-[#f59e0b] text-[#080808] text-xs font-mono font-bold hover:bg-[#d97706] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create API Key
          </button>
        </form>
      )}

      {/* Active Keys */}
      <div className="rounded-lg border border-[#1a1a1a] bg-[#0e0e0e] overflow-hidden">
        <div className="px-3 py-2 border-b border-[#1a1a1a]">
          <span className="text-[10px] font-mono text-gray-500">Active Keys ({activeKeys.length})</span>
        </div>
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="border-b border-[#1a1a1a] text-gray-500">
              <th className="text-left px-3 py-2">Prefix</th>
              <th className="text-left px-3 py-2">Label</th>
              <th className="text-left px-3 py-2">Scopes</th>
              <th className="text-left px-3 py-2">Last Used</th>
              <th className="text-left px-3 py-2">Expires</th>
              <th className="text-left px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {activeKeys.map((key) => (
              <tr key={key.id} className="border-b border-[#1a1a1a]/50 hover:bg-[#111] transition-colors">
                <td className="px-3 py-2 text-gray-400">{key.key_prefix}...</td>
                <td className="px-3 py-2 text-gray-200">{key.label}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-1 flex-wrap">
                    {(Array.isArray(key.scopes) ? key.scopes : []).map((s) => (
                      <span key={s} className="px-1 py-0.5 rounded bg-[#1a1a1a] text-gray-400 text-[8px]">
                        {s}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-2 text-gray-500">{formatDate(key.last_used_at)}</td>
                <td className="px-3 py-2 text-gray-500">{formatDate(key.expires_at)}</td>
                <td className="px-3 py-2 space-x-2">
                  <button
                    onClick={() => handleRotate(key.id, key.label)}
                    className="text-[#06b6d4] hover:text-[#0891b2] text-[10px]"
                  >
                    Rotate
                  </button>
                  <button
                    onClick={() => handleRevoke(key.id, key.label)}
                    className="text-[#ef4444] hover:text-[#dc2626] text-[10px]"
                  >
                    Revoke
                  </button>
                </td>
              </tr>
            ))}
            {activeKeys.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-6 text-gray-600">No active API keys</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Revoked Keys */}
      {revokedKeys.length > 0 && (
        <div className="rounded-lg border border-[#1a1a1a] bg-[#0e0e0e] overflow-hidden opacity-60">
          <div className="px-3 py-2 border-b border-[#1a1a1a]">
            <span className="text-[10px] font-mono text-gray-600">Revoked Keys ({revokedKeys.length})</span>
          </div>
          <table className="w-full text-xs font-mono">
            <tbody>
              {revokedKeys.map((key) => (
                <tr key={key.id} className="border-b border-[#1a1a1a]/50">
                  <td className="px-3 py-2 text-gray-600">{key.key_prefix}...</td>
                  <td className="px-3 py-2 text-gray-600">{key.label}</td>
                  <td className="px-3 py-2 text-[#ef4444]/60 text-[10px]">
                    Revoked {formatDate(key.revoked_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
