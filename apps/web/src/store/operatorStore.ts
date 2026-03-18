import { create } from "zustand";
import type { Operator } from "@/types";
import { login as apiLogin, getMe, DEMO_MODE } from "@/lib/api";

interface OperatorState {
  currentOperator: Operator | null;
  operators: Operator[];
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;

  setCurrentOperator: (operator: Operator) => void;
  setOperators: (operators: Operator[]) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  fetchProfile: () => Promise<void>;
  checkAuth: () => boolean;
}

// In demo mode, ensure a token exists so auth guards pass
if (DEMO_MODE && !localStorage.getItem("soterion_token")) {
  localStorage.setItem("soterion_token", "demo-token");
}

export const useOperatorStore = create<OperatorState>((set, get) => ({
  currentOperator: DEMO_MODE ? { id: "op5", name: "Admin User", email: "admin@soterion.io", role: "admin", team: "Ops", airportId: "a1", facilityId: "f1", avatarUrl: null, shiftScoreAllTime: 5852, currentStreak: 3, badges: ["FIRST_DETECT"], createdAt: "2026-01-15T10:00:00Z" } as Operator : null,
  operators: [],
  loading: false,
  error: null,
  isAuthenticated: DEMO_MODE || !!localStorage.getItem("soterion_token"),

  setCurrentOperator: (operator) =>
    set({ currentOperator: operator, isAuthenticated: true }),
  setOperators: (operators) => set({ operators }),

  login: async (email: string, password: string) => {
    set({ loading: true, error: null });
    try {
      const response = await apiLogin(email, password);
      const token = response.accessToken || response.access_token || response.token || "";
      const refreshToken = (response as any).refreshToken || (response as any).refresh_token || "";
      localStorage.setItem("soterion_token", token);
      if (refreshToken) localStorage.setItem("soterion_refresh_token", refreshToken);
      set({
        currentOperator: response.operator,
        isAuthenticated: true,
        loading: false,
      });
    } catch (err) {
      // In demo mode, if login still fails for some reason, force-succeed
      if (DEMO_MODE) {
        localStorage.setItem("soterion_token", "demo-token");
        set({
          currentOperator: { id: "op5", name: "Admin User", email: "admin@soterion.io", role: "admin", team: "Ops", airportId: "a1", facilityId: "f1", avatarUrl: null, shiftScoreAllTime: 5852, currentStreak: 3, badges: ["FIRST_DETECT"], createdAt: "2026-01-15T10:00:00Z" } as Operator,
          isAuthenticated: true,
          loading: false,
        });
        return;
      }
      set({
        error: err instanceof Error ? err.message : "Login failed",
        loading: false,
        isAuthenticated: false,
      });
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem("soterion_token");
    localStorage.removeItem("soterion_refresh_token");
    set({
      currentOperator: null,
      isAuthenticated: false,
      error: null,
    });
  },

  fetchProfile: async () => {
    if (!get().isAuthenticated && !DEMO_MODE) return;
    set({ loading: true, error: null });
    try {
      const operator = await getMe();
      set({ currentOperator: operator, isAuthenticated: true, loading: false });
    } catch (err) {
      if (DEMO_MODE) {
        set({
          currentOperator: { id: "op5", name: "Admin User", email: "admin@soterion.io", role: "admin", team: "Ops", airportId: "a1", facilityId: "f1", avatarUrl: null, shiftScoreAllTime: 5852, currentStreak: 3, badges: ["FIRST_DETECT"], createdAt: "2026-01-15T10:00:00Z" } as Operator,
          isAuthenticated: true,
          loading: false,
        });
        return;
      }
      // Don't auto-logout in dev - the token might be expired but dev bypass still works
      console.warn("fetchProfile failed:", err instanceof Error ? err.message : err);
      set({
        error: null,
        loading: false,
      });
    }
  },

  checkAuth: () => {
    return DEMO_MODE || !!localStorage.getItem("soterion_token");
  },
}));
