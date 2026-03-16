import { create } from "zustand";
import type { SensorNode } from "@/types";
import { getSensors } from "@/lib/api";

interface SensorState {
  sensors: SensorNode[];
  loading: boolean;
  error: string | null;
  _pollTimer: ReturnType<typeof setInterval> | null;

  setSensors: (sensors: SensorNode[]) => void;
  updateSensor: (id: string, patch: Partial<SensorNode>) => void;
  fetchSensors: () => Promise<void>;
  startPolling: () => void;
  stopPolling: () => void;
  onlineCount: () => number;
  degradedCount: () => number;
  offlineCount: () => number;
}

export const useSensorStore = create<SensorState>((set, get) => ({
  sensors: [],
  loading: false,
  error: null,
  _pollTimer: null,

  setSensors: (sensors) => set({ sensors: Array.isArray(sensors) ? sensors : [] }),

  updateSensor: (id, patch) =>
    set((state) => {
      const arr = Array.isArray(state.sensors) ? state.sensors : [];
      return {
        sensors: arr.map((s) =>
          s.id === id ? { ...s, ...patch } : s,
        ),
      };
    }),

  fetchSensors: async () => {
    set({ loading: true, error: null });
    try {
      const raw = await getSensors();
      const data = Array.isArray(raw) ? raw : (raw as any)?.sensors ?? (raw as any)?.data ?? [];
      set({ sensors: data, loading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to fetch sensors",
        loading: false,
      });
    }
  },

  startPolling: () => {
    const existing = get()._pollTimer;
    if (existing) clearInterval(existing);
    // Fetch immediately, then every 5s
    get().fetchSensors();
    const timer = setInterval(() => {
      get().fetchSensors();
    }, 5_000);
    set({ _pollTimer: timer });
  },

  stopPolling: () => {
    const timer = get()._pollTimer;
    if (timer) {
      clearInterval(timer);
      set({ _pollTimer: null });
    }
  },

  onlineCount: () => {
    const arr = Array.isArray(get().sensors) ? get().sensors : [];
    return arr.filter((s) => s.status === "online").length;
  },
  degradedCount: () => {
    const arr = Array.isArray(get().sensors) ? get().sensors : [];
    return arr.filter((s) => s.status === "degraded").length;
  },
  offlineCount: () => {
    const arr = Array.isArray(get().sensors) ? get().sensors : [];
    return arr.filter((s) => s.status === "offline").length;
  },
}));
