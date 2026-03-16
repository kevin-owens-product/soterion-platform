import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getAlerts, acknowledgeAlert as apiAck } from "@/lib/api";
import { useAlertsStore } from "@/store/alertsStore";
import { useFacilityStore } from "@/store/facilityStore";
import { useToastStore } from "@/store/toastStore";
import type { AnomalyEvent } from "@/types";

export function useAlerts() {
  const facilityId = useFacilityStore((s) => s.facility?.id);
  const setAlerts = useAlertsStore((s) => s.setAlerts);
  const storeAlerts = useAlertsStore((s) => s.alerts);
  const connectWebSocket = useAlertsStore((s) => s.connectWebSocket);
  const disconnectWebSocket = useAlertsStore((s) => s.disconnectWebSocket);
  const wsConnected = useAlertsStore((s) => s.wsConnected);
  const addToast = useToastStore((s) => s.addToast);
  const queryClient = useQueryClient();

  // Initial fetch via React Query
  const query = useQuery<AnomalyEvent[]>({
    queryKey: ["alerts", facilityId],
    queryFn: () => getAlerts({}),
    enabled: !!facilityId,
    refetchInterval: wsConnected ? false : 10_000, // fallback polling if WS disconnected
  });

  // Sync React Query data to Zustand store
  useEffect(() => {
    if (query.data) {
      const arr = Array.isArray(query.data) ? query.data : (query.data as any)?.alerts ?? (query.data as any)?.data ?? [];
      setAlerts(arr);
    }
  }, [query.data, setAlerts]);

  // Connect WebSocket for live updates
  useEffect(() => {
    if (!facilityId) return;
    connectWebSocket(facilityId);
    return () => {
      disconnectWebSocket();
    };
  }, [facilityId, connectWebSocket, disconnectWebSocket]);

  // Derived data
  const alerts = Array.isArray(storeAlerts) ? storeAlerts : [];
  const unacknowledged = useMemo(
    () => alerts.filter((a) => !a.acknowledgedBy && !a.acknowledged),
    [alerts],
  );
  const criticalCount = useMemo(
    () => unacknowledged.filter((a) => a.severity === "critical" || (a.severity as unknown) === 5).length,
    [unacknowledged],
  );

  const acknowledge = async (id: string) => {
    // Optimistic update in store
    const prev = [...alerts];
    useAlertsStore.getState().acknowledgeAlert(id, "optimistic");

    try {
      await apiAck(id);
      addToast({ type: "success", title: "Alert acknowledged. +12 pts" });
      // Invalidate to get server truth
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
    } catch {
      // Revert
      setAlerts(prev);
      addToast({ type: "error", title: "Failed to acknowledge alert" });
    }
  };

  return {
    alerts,
    unacknowledged,
    criticalCount,
    acknowledge,
    isLoading: query.isLoading,
    error: query.error,
  };
}
