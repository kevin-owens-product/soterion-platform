import { create } from "zustand";
import type { ShiftScore } from "@/types";
import { getShiftScore, getScoreHistory } from "@/lib/api";

interface ShiftState {
  currentShift: ShiftScore | null;
  shiftHistory: ShiftScore[];
  loading: boolean;
  error: string | null;
  _pollTimer: ReturnType<typeof setInterval> | null;

  setCurrentShift: (shift: ShiftScore) => void;
  setShiftHistory: (history: ShiftScore[]) => void;
  clearShift: () => void;
  fetchCurrentScore: () => Promise<void>;
  fetchHistory: () => Promise<void>;
  startPolling: () => void;
  stopPolling: () => void;
}

export const useShiftStore = create<ShiftState>((set, get) => ({
  currentShift: null,
  shiftHistory: [],
  loading: false,
  error: null,
  _pollTimer: null,

  setCurrentShift: (shift) => set({ currentShift: shift }),
  setShiftHistory: (history) => set({ shiftHistory: history }),
  clearShift: () => set({ currentShift: null }),

  fetchCurrentScore: async () => {
    set({ loading: true, error: null });
    try {
      const score = await getShiftScore();
      set({ currentShift: score, loading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to fetch shift score",
        loading: false,
      });
    }
  },

  fetchHistory: async () => {
    try {
      const history = await getScoreHistory();
      set({ shiftHistory: history });
    } catch {
      // silent fail for history
    }
  },

  startPolling: () => {
    const existing = get()._pollTimer;
    if (existing) clearInterval(existing);
    get().fetchCurrentScore();
    const timer = setInterval(() => {
      get().fetchCurrentScore();
    }, 30_000);
    set({ _pollTimer: timer });
  },

  stopPolling: () => {
    const timer = get()._pollTimer;
    if (timer) {
      clearInterval(timer);
      set({ _pollTimer: null });
    }
  },
}));
