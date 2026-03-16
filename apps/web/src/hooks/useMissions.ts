import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMissions, getMissionProgress } from "@/lib/api";
import type { Mission, MissionProgress } from "@/types";

interface MissionWithProgress extends Mission {
  progress: number;
  target: number;
  completed: boolean;
}

export function useMissions() {
  const missionsQuery = useQuery<Mission[]>({
    queryKey: ["missions"],
    queryFn: () => getMissions(),
    refetchInterval: 60_000,
  });

  const progressQuery = useQuery<MissionProgress[]>({
    queryKey: ["mission-progress"],
    queryFn: () => getMissionProgress(),
    refetchInterval: 60_000,
  });

  const missions = useMemo(() => {
    const missionsArr = Array.isArray(missionsQuery.data) ? missionsQuery.data : [];
    if (missionsArr.length === 0) return [];
    const progressMap = new Map<string, MissionProgress>();
    const progressArr = Array.isArray(progressQuery.data) ? progressQuery.data : [];
    for (const p of progressArr) {
      progressMap.set(p.missionId, p);
    }

    return missionsArr.map((m): MissionWithProgress => {
      const prog = progressMap.get(m.id);
      return {
        ...m,
        progress: prog?.progress ?? 0,
        target: prog?.target ?? 1,
        completed: !!prog?.completedAt,
      };
    });
  }, [missionsQuery.data, progressQuery.data]);

  const activeMissions = useMemo(
    () => missions.filter((m) => !m.completed),
    [missions],
  );

  const completedCount = useMemo(
    () => missions.filter((m) => m.completed).length,
    [missions],
  );

  return {
    missions,
    activeMissions,
    completedCount,
    isLoading: missionsQuery.isLoading || progressQuery.isLoading,
    error: missionsQuery.error || progressQuery.error,
  };
}
