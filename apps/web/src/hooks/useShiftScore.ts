import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getShiftScore } from "@/lib/api";
import { useShiftStore } from "@/store/shiftStore";
import type { ShiftScore } from "@/types";

export function useShiftScore(_operatorId?: string) {
  const setCurrentShift = useShiftStore((s) => s.setCurrentShift);
  const currentShift = useShiftStore((s) => s.currentShift);

  const query = useQuery<ShiftScore>({
    queryKey: ["shift-score", _operatorId],
    queryFn: () => getShiftScore(),
    refetchInterval: 30_000,
  });

  useEffect(() => {
    if (query.data) {
      setCurrentShift(query.data);
    }
  }, [query.data, setCurrentShift]);

  const score = query.data ?? currentShift;

  const raw = score as any;
  return {
    score,
    data: score, // alias for components using { data: ... } destructuring
    breakdown: score
      ? {
          security: raw?.securityScore ?? 0,
          flow: raw?.flowScore ?? 0,
          response: raw?.responseScore ?? 0,
          compliance: raw?.complianceScore ?? 0,
          uptime: raw?.uptimeScore ?? 0,
          ...score,
        }
      : null,
    streak: score ? 0 : 0, // streak comes from a different place
    isLoading: query.isLoading,
    error: query.error,
  };
}
