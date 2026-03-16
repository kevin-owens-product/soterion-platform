import { useState, useEffect, useCallback } from "react";
import { apiFetch, apiPost } from "@/lib/api";

interface AdminOperator {
  id: string;
  name: string;
  email: string;
  role: string;
  team: string | null;
  facility_id: string;
  facility_name: string | null;
  facility_code: string | null;
  created_at: string;
  roles: Array<{ role_id: string; role_name: string }>;
}

interface OperatorListResponse {
  operators: AdminOperator[];
  total: number;
}

export function OperatorManagement() {
  const [operators, setOperators] = useState<AdminOperator[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  // Create form state
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "operator",
    team: "",
    facility_id: "",
  });
  const [createError, setCreateError] = useState<string | null>(null);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

  const fetchOperators = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<OperatorListResponse>("/api/v1/admin/operators?limit=100");
      setOperators(Array.isArray(data?.operators) ? data.operators : []);
      setTotal(data?.total ?? 0);
    } catch (err) {
      console.error("Failed to fetch operators:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOperators();
  }, [fetchOperators]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setPasswordErrors([]);

    // Basic client-side password validation
    const pwErrors: string[] = [];
    if (form.password.length < 12) pwErrors.push("Minimum 12 characters");
    if (!/[A-Z]/.test(form.password)) pwErrors.push("Needs uppercase letter");
    if (!/[a-z]/.test(form.password)) pwErrors.push("Needs lowercase letter");
    if (!/[0-9]/.test(form.password)) pwErrors.push("Needs digit");
    if (!/[^A-Za-z0-9]/.test(form.password)) pwErrors.push("Needs special character");
    if (pwErrors.length > 0) {
      setPasswordErrors(pwErrors);
      return;
    }

    try {
      await apiPost("/api/v1/admin/operators", form);
      setShowCreate(false);
      setForm({ name: "", email: "", password: "", role: "operator", team: "", facility_id: "" });
      fetchOperators();
    } catch (err: any) {
      const msg = err?.message ?? "Failed to create operator";
      setCreateError(msg);
    }
  };

  const handleDeactivate = async (id: string, name: string) => {
    if (!confirm(`Deactivate operator "${name}"? This will revoke all their sessions.`)) return;
    try {
      await apiPost(`/api/v1/admin/operators/${id}/deactivate`, {});
      fetchOperators();
    } catch (err) {
      console.error("Failed to deactivate operator:", err);
    }
  };

  const roleBadgeColor = (role: string) => {
    switch (role) {
      case "admin": return "bg-[#f59e0b]/20 text-[#f59e0b]";
      case "supervisor": return "bg-[#06b6d4]/20 text-[#06b6d4]";
      case "platform_admin": return "bg-[#a855f7]/20 text-[#a855f7]";
      case "deactivated": return "bg-[#ef4444]/20 text-[#ef4444]";
      default: return "bg-[#22c55e]/20 text-[#22c55e]";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl tracking-wider text-gray-100">
          OPERATORS
        </h1>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-gray-500">{total} operators</span>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="px-3 py-1.5 rounded bg-[#f59e0b] text-[#080808] text-xs font-mono font-bold hover:bg-[#d97706] transition-colors"
          >
            {showCreate ? "Cancel" : "Create Operator"}
          </button>
        </div>
      </div>

      {/* Create Form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="rounded-lg border border-[#1a1a1a] bg-[#0e0e0e] p-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <FormField label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
            <FormField label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} type="email" />
            <FormField label="Password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} type="password" />
            <div>
              <label className="text-[9px] font-mono text-gray-600 block mb-1">Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full bg-[#080808] border border-[#1a1a1a] rounded px-2 py-1.5 text-xs font-mono text-gray-300"
              >
                <option value="operator">Operator</option>
                <option value="supervisor">Supervisor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <FormField label="Team" value={form.team} onChange={(v) => setForm({ ...form, team: v })} />
            <FormField label="Facility ID" value={form.facility_id} onChange={(v) => setForm({ ...form, facility_id: v })} />
          </div>
          {passwordErrors.length > 0 && (
            <div className="text-[10px] font-mono text-[#ef4444] space-y-0.5">
              {passwordErrors.map((e, i) => <div key={i}>{e}</div>)}
            </div>
          )}
          {createError && (
            <div className="text-[10px] font-mono text-[#ef4444]">{createError}</div>
          )}
          <button
            type="submit"
            className="px-4 py-2 rounded bg-[#f59e0b] text-[#080808] text-xs font-mono font-bold hover:bg-[#d97706] transition-colors"
          >
            Create Operator
          </button>
        </form>
      )}

      {/* Operator Table */}
      <div className="rounded-lg border border-[#1a1a1a] bg-[#0e0e0e] overflow-hidden">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="border-b border-[#1a1a1a] text-gray-500">
              <th className="text-left px-3 py-2">Name</th>
              <th className="text-left px-3 py-2">Email</th>
              <th className="text-left px-3 py-2">Role</th>
              <th className="text-left px-3 py-2">RBAC Roles</th>
              <th className="text-left px-3 py-2">Facility</th>
              <th className="text-left px-3 py-2">Team</th>
              <th className="text-left px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {operators.map((op) => (
              <tr key={op.id} className="border-b border-[#1a1a1a]/50 hover:bg-[#111] transition-colors">
                <td className="px-3 py-2 text-gray-200">{op.name}</td>
                <td className="px-3 py-2 text-gray-400">{op.email}</td>
                <td className="px-3 py-2">
                  <span className={`px-1.5 py-0.5 rounded text-[9px] ${roleBadgeColor(op.role)}`}>
                    {op.role.toUpperCase()}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <div className="flex gap-1 flex-wrap">
                    {(Array.isArray(op.roles) ? op.roles : []).map((r) => (
                      <span key={r.role_id} className="px-1 py-0.5 rounded bg-[#1a1a1a] text-gray-400 text-[8px]">
                        {r.role_name}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-2 text-gray-500">
                  {op.facility_code ?? op.facility_id?.substring(0, 8)}
                </td>
                <td className="px-3 py-2 text-gray-500">{op.team ?? "-"}</td>
                <td className="px-3 py-2">
                  {op.role !== "deactivated" && (
                    <button
                      onClick={() => handleDeactivate(op.id, op.name)}
                      className="text-[#ef4444] hover:text-[#dc2626] text-[10px] transition-colors"
                    >
                      Deactivate
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {operators.length === 0 && !loading && (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gray-600">
                  No operators found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FormField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="text-[9px] font-mono text-gray-600 block mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[#080808] border border-[#1a1a1a] rounded px-2 py-1.5 text-xs font-mono text-gray-300 placeholder:text-gray-700"
        required
      />
    </div>
  );
}
