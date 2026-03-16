import { create } from "zustand";
import type { Operator } from "@/types";
import { login as apiLogin, getMe } from "@/lib/api";

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

export const useOperatorStore = create<OperatorState>((set, get) => ({
  currentOperator: null,
  operators: [],
  loading: false,
  error: null,
  isAuthenticated: !!localStorage.getItem("soterion_token"),

  setCurrentOperator: (operator) =>
    set({ currentOperator: operator, isAuthenticated: true }),
  setOperators: (operators) => set({ operators }),

  login: async (email: string, password: string) => {
    set({ loading: true, error: null });
    try {
      const response = await apiLogin(email, password);
      const token = response.token || response.access_token || "";
      localStorage.setItem("soterion_token", token);
      set({
        currentOperator: response.operator,
        isAuthenticated: true,
        loading: false,
      });
    } catch (err) {
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
    set({
      currentOperator: null,
      isAuthenticated: false,
      error: null,
    });
  },

  fetchProfile: async () => {
    if (!get().isAuthenticated) return;
    set({ loading: true, error: null });
    try {
      const operator = await getMe();
      set({ currentOperator: operator, loading: false });
    } catch (err) {
      // Don't auto-logout in dev - the token might be expired but dev bypass still works
      console.warn("fetchProfile failed:", err instanceof Error ? err.message : err);
      set({
        error: null,
        loading: false,
      });
    }
  },

  checkAuth: () => {
    return !!localStorage.getItem("soterion_token");
  },
}));
