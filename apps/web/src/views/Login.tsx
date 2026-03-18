import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useOperatorStore } from "@/store/operatorStore";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const login = useOperatorStore((s) => s.login);
  const loading = useOperatorStore((s) => s.loading);
  const error = useOperatorStore((s) => s.error);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate("/app/ops", { replace: true });
    } catch {
      // error is already set in store
    }
  };

  return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="font-display text-5xl tracking-wider text-[#f59e0b] mb-2">
            SOTERION
          </h1>
          <p className="text-xs font-mono uppercase tracking-[0.3em] text-[#525252]">
            Spatial Intelligence Platform
          </p>
        </div>

        {/* Login card */}
        <div className="bg-[#0e0e0e] border border-[#1a1a1a] rounded-lg p-6">
          <h2 className="text-sm font-mono uppercase tracking-wider text-[#737373] mb-6">
            Operator Login
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-[10px] font-mono uppercase tracking-wider text-[#525252] mb-1.5"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-3 py-2.5 bg-[#111111] border border-[#1a1a1a] rounded-md
                  text-sm font-mono text-[#d4d4d4] placeholder-[#525252]
                  focus:outline-none focus:border-[#f59e0b]/40 focus:ring-1 focus:ring-[#f59e0b]/20
                  transition-colors"
                placeholder="operator@facility.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-[10px] font-mono uppercase tracking-wider text-[#525252] mb-1.5"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-3 py-2.5 bg-[#111111] border border-[#1a1a1a] rounded-md
                  text-sm font-mono text-[#d4d4d4] placeholder-[#525252]
                  focus:outline-none focus:border-[#f59e0b]/40 focus:ring-1 focus:ring-[#f59e0b]/20
                  transition-colors"
                placeholder="Enter password"
              />
            </div>

            {error && (
              <div className="px-3 py-2 bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-md">
                <p className="text-xs font-mono text-[#ef4444]">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[#f59e0b] hover:bg-[#f59e0b]/90 disabled:bg-[#f59e0b]/50
                text-[#080808] text-sm font-semibold rounded-md
                transition-colors duration-150"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-[#080808]/30 border-t-[#080808] rounded-full animate-spin" />
                  Authenticating...
                </span>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center mt-6 text-[10px] font-mono text-[#525252]">
          Secured by Soterion AI Platform v0.1.0
        </p>
      </div>
    </div>
  );
}
