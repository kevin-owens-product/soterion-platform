import { create } from "zustand";
import type { AnomalyEvent } from "@/types";
import { getAlerts, acknowledgeAlert as apiAckAlert, escalateAlert as apiEscalateAlert } from "@/lib/api";
import { connectAlerts } from "@/lib/ws";
import type { WSClient } from "@/lib/ws";

interface AlertsState {
  alerts: AnomalyEvent[];
  unacknowledgedCount: number;
  loading: boolean;
  error: string | null;
  wsConnected: boolean;
  _wsClient: WSClient | null;

  addAlert: (alert: AnomalyEvent) => void;
  acknowledgeAlert: (id: string, operatorId: string) => void;
  resolveAlert: (id: string) => void;
  setAlerts: (alerts: AnomalyEvent[]) => void;
  fetchAlerts: (filters?: Record<string, string>) => Promise<void>;
  acknowledgeAlertAsync: (id: string) => Promise<void>;
  escalateAlertAsync: (id: string) => Promise<void>;
  connectWebSocket: (facilityId: string) => void;
  disconnectWebSocket: () => void;
}

function countUnacked(alerts: AnomalyEvent[] | unknown): number {
  const arr = Array.isArray(alerts) ? alerts : [];
  return arr.filter((a) => !a.acknowledgedBy && !a.acknowledged).length;
}

export const useAlertsStore = create<AlertsState>((set, get) => ({
  alerts: [],
  unacknowledgedCount: 0,
  loading: false,
  error: null,
  wsConnected: false,
  _wsClient: null,

  addAlert: (alert) =>
    set((state) => {
      const alerts = [alert, ...state.alerts].slice(0, 200);
      return {
        alerts,
        unacknowledgedCount: countUnacked(alerts),
      };
    }),

  acknowledgeAlert: (id, operatorId) =>
    set((state) => {
      const alerts = state.alerts.map((a) =>
        a.id === id ? { ...a, acknowledged: true, acknowledgedBy: operatorId, acknowledgedAt: new Date().toISOString() } : a,
      );
      return {
        alerts,
        unacknowledgedCount: countUnacked(alerts),
      };
    }),

  resolveAlert: (id) =>
    set((state) => ({
      alerts: state.alerts.map((a) =>
        a.id === id ? { ...a, resolvedAt: new Date().toISOString() } : a,
      ),
    })),

  setAlerts: (alerts) => {
    const arr = Array.isArray(alerts) ? alerts : [];
    set({
      alerts: arr,
      unacknowledgedCount: countUnacked(arr),
    });
  },

  fetchAlerts: async (filters) => {
    set({ loading: true, error: null });
    try {
      const raw = await getAlerts(filters ?? {});
      const data = Array.isArray(raw) ? raw : (raw as any)?.alerts ?? (raw as any)?.data ?? [];
      set({
        alerts: data,
        unacknowledgedCount: countUnacked(data),
        loading: false,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to fetch alerts",
        loading: false,
      });
    }
  },

  acknowledgeAlertAsync: async (id: string) => {
    // Optimistic update
    const state = get();
    const operator = "current"; // placeholder, real operator id comes from operatorStore
    state.acknowledgeAlert(id, operator);
    try {
      await apiAckAlert(id);
    } catch {
      // Revert on failure - refetch
      await state.fetchAlerts();
    }
  },

  escalateAlertAsync: async (id: string) => {
    try {
      const updated = await apiEscalateAlert(id);
      set((state) => ({
        alerts: state.alerts.map((a) => (a.id === id ? updated : a)),
      }));
    } catch {
      // silently fail, could add toast here
    }
  },

  connectWebSocket: (facilityId: string) => {
    // Skip WebSocket in dev (Vite proxy doesn't support WS upgrade reliably)
    if (import.meta.env.DEV) {
      console.log('[Alerts] WebSocket skipped in dev mode - using REST polling');
      set({ wsConnected: false });
      return;
    }
    try {
      const existing = get()._wsClient;
      if (existing) {
        existing.disconnect();
      }

      const client = connectAlerts(
        facilityId,
        (alert) => {
          get().addAlert(alert);
        },
        () => set({ wsConnected: true }),
        () => set({ wsConnected: false }),
      );
      set({ _wsClient: client });
    } catch (err) {
      console.warn("[AlertsStore] Failed to connect WebSocket:", err);
      set({ wsConnected: false });
    }
  },

  disconnectWebSocket: () => {
    const client = get()._wsClient;
    if (client) {
      client.disconnect();
      set({ _wsClient: null, wsConnected: false });
    }
  },
}));
