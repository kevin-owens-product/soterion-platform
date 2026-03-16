import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getLeaderboard,
  getBadges,
  getMyBadges,
  getScoreHistory,
  getMissions,
  getMissionProgress,
} from "@/lib/api";
import { useNotificationStore } from "@/store/notificationStore";
import { useFacilityStore } from "@/store/facilityStore";
import { WSClient } from "@/lib/ws";
import type {
  LeaderboardEntry,
  Badge,
  BadgeDefinition,
  StreakInfo,
  StreakDay,
  ShiftScore,
  MissionWithProgress,
  Mission,
  MissionProgress,
} from "@/types";

// ── useLeaderboard ──────────────────────────────────────

export function useLeaderboard() {
  const query = useQuery<LeaderboardEntry[]>({
    queryKey: ["leaderboard"],
    queryFn: getLeaderboard,
    refetchInterval: 30_000,
  });

  const safeData = Array.isArray(query.data) ? query.data : [];

  return {
    ...query,
    data: safeData,
  };
}

// ── useBadges ───────────────────────────────────────────

export function useBadges() {
  const allBadgesQuery = useQuery<BadgeDefinition[]>({
    queryKey: ["badges-all"],
    queryFn: getBadges,
  });

  const myBadgesQuery = useQuery<BadgeDefinition[]>({
    queryKey: ["badges-mine"],
    queryFn: getMyBadges,
    refetchInterval: 30_000,
  });

  const facilityType = useFacilityStore((s) => s.facility?.type);

  const allBadgesArr = Array.isArray(allBadgesQuery.data) ? allBadgesQuery.data : [];
  const myBadgesArr = Array.isArray(myBadgesQuery.data) ? myBadgesQuery.data : [];
  const badgeIconFallbacks: Record<string, string> = {
    FIRST_DETECT: "\uD83C\uDFAF",
    SEVEN_DAY_STREAK: "\uD83D\uDD25",
    FAST_RESPONDER: "\u26A1",
    ZERO_FALSE_POSITIVES: "\uD83D\uDEE1",
    IRON_GRID: "\uD83D\uDC41",
    TOP_OF_WEEK: "\uD83C\uDFC6",
    ALL_CLEAR: "\uD83C\uDF10",
    THIRTY_DAY_SLA: "\uD83D\uDC8E",
  };

  const badges: Badge[] = allBadgesArr.map((def) => {
    const earned = myBadgesArr.some((b) => b.id === def.id);
    // Determine category based on criteria or a naming convention
    const isVertical = def.criteria && "facilityTypes" in def.criteria;
    const badgeKey = (def as any).key || def.slug || "";
    const iconFromApi = def.iconUrl;
    const resolvedIcon = (iconFromApi && iconFromApi.trim())
      ? iconFromApi
      : badgeIconFallbacks[badgeKey] ?? badgeIconFallbacks[badgeKey.toUpperCase()] ?? "\uD83C\uDFC5";
    return {
      id: def.id,
      key: badgeKey,
      name: def.name,
      description: def.description,
      icon: resolvedIcon,
      category: isVertical ? "vertical" : "universal",
      facilityTypes: isVertical
        ? (def.criteria as { facilityTypes?: string[] }).facilityTypes
        : undefined,
      earned,
    };
  });

  // Filter to show universal + current vertical badges
  const filtered = badges.filter(
    (b) =>
      b.category === "universal" ||
      !b.facilityTypes ||
      (facilityType && b.facilityTypes.includes(facilityType)),
  );

  return {
    badges: filtered,
    isLoading: allBadgesQuery.isLoading || myBadgesQuery.isLoading,
    error: allBadgesQuery.error || myBadgesQuery.error,
    earnedCount: filtered.filter((b) => b.earned).length,
    totalCount: filtered.length,
  };
}

// ── useStreak ───────────────────────────────────────────

const QUALIFYING_THRESHOLD = 750;

export function useStreak() {
  const historyQuery = useQuery<ShiftScore[]>({
    queryKey: ["score-history"],
    queryFn: getScoreHistory,
    refetchInterval: 60_000,
  });

  const scores = Array.isArray(historyQuery.data) ? historyQuery.data : [];

  // Calculate streak from most recent scores
  let currentStreak = 0;
  const sorted = [...scores].sort((a, b) => {
    const dateA = a.shiftStart || '';
    const dateB = b.shiftStart || '';
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });

  for (const score of sorted) {
    const totalScore = (score as any).totalScore ?? score.score ?? 0;
    if (totalScore >= QUALIFYING_THRESHOLD) {
      currentStreak++;
    } else {
      break;
    }
  }

  // Multiplier: min(2.0, 1 + streak * 0.05)
  const multiplier = Math.min(2.0, 1 + currentStreak * 0.05);

  // Build last 7 days calendar
  const today = new Date();
  const recentDays: StreakDay[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);

    if (i === 0 && new Date().getHours() < 12) {
      // Today might be future if shift hasn't ended
      const todayScore = sorted.find((s) => {
        const d = (s.shiftStart || '').slice(0, 10);
        return d === dateStr;
      });
      const todayTotal = todayScore ? ((todayScore as any).totalScore ?? todayScore.score ?? 0) : 0;
      recentDays.push({
        date: dateStr,
        qualifying: todayScore ? todayTotal >= QUALIFYING_THRESHOLD : null,
        score: todayTotal || undefined,
      });
    } else {
      const dayScore = sorted.find((s) => {
        const d = (s.shiftStart || '').slice(0, 10);
        return d === dateStr;
      });
      const dayTotal = dayScore ? ((dayScore as any).totalScore ?? dayScore.score ?? 0) : 0;
      recentDays.push({
        date: dateStr,
        qualifying: dayScore ? dayTotal >= QUALIFYING_THRESHOLD : false,
        score: dayTotal || undefined,
      });
    }
  }

  const streakInfo: StreakInfo = {
    currentStreak,
    multiplier,
    qualifyingThreshold: QUALIFYING_THRESHOLD,
    recentDays,
  };

  return {
    ...streakInfo,
    isLoading: historyQuery.isLoading,
    error: historyQuery.error,
  };
}

// ── useMissionsWithProgress ─────────────────────────────

export function useMissionsWithProgress() {
  const missionsQuery = useQuery<Mission[]>({
    queryKey: ["missions"],
    queryFn: getMissions,
  });

  const progressQuery = useQuery<MissionProgress[]>({
    queryKey: ["mission-progress"],
    queryFn: getMissionProgress,
    refetchInterval: 15_000,
  });

  const missionColors: Record<string, string> = {
    daily: "#f59e0b",
    weekly: "#8b5cf6",
    special: "#06b6d4",
  };

  const missionsArr = Array.isArray(missionsQuery.data) ? missionsQuery.data : [];
  const progressArr = Array.isArray(progressQuery.data) ? progressQuery.data : [];
  const missions: MissionWithProgress[] = missionsArr.map(
    (m) => {
      const prog = progressArr.find(
        (p) => p.missionId === m.id,
      );
      // Target comes from the mission definition (criteria.targetValue) or progress API
      const missionTarget = (m.criteria as any)?.targetValue
        ?? (m as any).targetValue
        ?? prog?.target
        ?? 1;
      return {
        id: m.id,
        title: m.title,
        description: m.description,
        type: m.type,
        progress: prog?.progress ?? 0,
        target: Number(missionTarget) || 1,
        rewardPreview: `+${m.xpReward} pts`,
        expiresAt: m.expiresAt,
        completed: prog?.completedAt ? true : (prog?.progress ?? 0) >= (Number(missionTarget) || 1),
        completedAt: prog?.completedAt ?? null,
        color: missionColors[m.type] ?? "#f59e0b",
      };
    },
  );

  return {
    missions,
    isLoading: missionsQuery.isLoading || progressQuery.isLoading,
    error: missionsQuery.error || progressQuery.error,
  };
}

// ── useGamificationEvents (WebSocket) ───────────────────

interface GamificationWsMessage {
  type: "badge_unlock" | "mission_complete" | "streak_milestone" | "score_update";
  title: string;
  message: string;
  icon?: string;
}

export function useGamificationEvents(facilityId?: string) {
  const push = useNotificationStore((s) => s.push);
  const clientRef = useRef<WSClient | null>(null);

  useEffect(() => {
    if (!facilityId) return;
    // Skip WebSocket in dev mode
    if (import.meta.env.DEV) return;

    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const base = `${proto}//${window.location.host}`;

    const client = new WSClient({
      url: `${base}/ws/gamification/${facilityId}`,
      onMessage: (data) => {
        const msg = data as GamificationWsMessage;
        if (msg.type && msg.title) {
          push(msg.type, msg.title, msg.message, msg.icon);
        }
      },
    });

    try {
      client.connect();
    } catch (err) {
      console.warn("[WS] Failed to connect gamification WebSocket:", err);
    }
    clientRef.current = client;

    return () => {
      client.disconnect();
      clientRef.current = null;
    };
  }, [facilityId, push]);
}
