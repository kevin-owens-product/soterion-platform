import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSensors } from "@/lib/api";
import { useSensorStore } from "@/store/sensorStore";
import type { SensorNode } from "@/types";

export function useSensorStatus() {
  const setSensors = useSensorStore((s) => s.setSensors);
  const storeSensors = useSensorStore((s) => s.sensors);

  const query = useQuery<SensorNode[]>({
    queryKey: ["sensors"],
    queryFn: () => getSensors(),
    refetchInterval: 5_000,
  });

  // Sync to Zustand
  useEffect(() => {
    if (query.data) {
      const arr = Array.isArray(query.data) ? query.data : [];
      setSensors(arr);
    }
  }, [query.data, setSensors]);

  const sensors = Array.isArray(query.data) ? query.data : (Array.isArray(storeSensors) ? storeSensors : []);

  const onlineCount = useMemo(
    () => sensors.filter((s) => s.status === "online").length,
    [sensors],
  );
  const degradedCount = useMemo(
    () => sensors.filter((s) => s.status === "degraded").length,
    [sensors],
  );
  const offlineCount = useMemo(
    () => sensors.filter((s) => s.status === "offline").length,
    [sensors],
  );

  return {
    sensors,
    onlineCount,
    degradedCount,
    offlineCount,
    isLoading: query.isLoading,
    error: query.error,
  };
}
