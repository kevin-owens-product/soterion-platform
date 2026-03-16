import type {
  AnomalyEvent,
  AlertStats,
  Zone,
  ZoneDensity,
  QueueMetrics,
  Terminal,
  SensorNode,
  ShiftScore,
  LeaderboardEntry,
  BadgeDefinition,
  Mission,
  MissionProgress,
  AuthResponse,
  FullFacilityConfig,
  Operator,
} from "@/types";
import { camelizeKeys } from "@/lib/camelize";

const BASE_URL = "";

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("soterion_token");
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${body}`);
  }

  const data = await res.json();
  return camelizeKeys(data) as T;
}

export async function apiPost<T = unknown>(
  path: string,
  body: unknown,
  options: RequestInit = {},
): Promise<T> {
  return apiFetch<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
    ...options,
  });
}

export async function apiPatch<T = unknown>(
  path: string,
  body: unknown,
  options: RequestInit = {},
): Promise<T> {
  return apiFetch<T>(path, {
    method: "PATCH",
    body: JSON.stringify(body),
    ...options,
  });
}

export async function apiDelete<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  return apiFetch<T>(path, { method: "DELETE", ...options });
}

// ── Auth ────────────────────────────────────────────────

export function login(email: string, password: string): Promise<AuthResponse> {
  return apiPost<AuthResponse>("/api/v1/auth/login", { email, password });
}

export function refreshToken(): Promise<{ token: string }> {
  return apiPost<{ token: string }>("/api/v1/auth/refresh", {});
}

export function getMe(): Promise<Operator> {
  return apiFetch<Operator>("/api/v1/operators/me");
}

// ── Alerts ──────────────────────────────────────────────

export interface AlertFilters {
  zone?: string;
  severity?: string;
  acknowledged?: boolean;
  dateFrom?: string;
  dateTo?: string;
}

export async function getAlerts(filters: AlertFilters = {}): Promise<AnomalyEvent[]> {
  const params = new URLSearchParams();
  if (filters.zone) params.set("zone", filters.zone);
  if (filters.severity) params.set("severity", filters.severity);
  if (filters.acknowledged !== undefined)
    params.set("acknowledged", String(filters.acknowledged));
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  const qs = params.toString();
  const res = await apiFetch<{ alerts: AnomalyEvent[] }>(`/api/v1/alerts${qs ? `?${qs}` : ""}`);
  return Array.isArray(res) ? res : res?.alerts ?? [];
}

export function getAlert(id: string): Promise<AnomalyEvent> {
  return apiFetch<AnomalyEvent>(`/api/v1/alerts/${id}`);
}

export function acknowledgeAlert(id: string): Promise<AnomalyEvent> {
  return apiPost<AnomalyEvent>(`/api/v1/alerts/${id}/acknowledge`, {});
}

export function escalateAlert(id: string): Promise<AnomalyEvent> {
  return apiPost<AnomalyEvent>(`/api/v1/alerts/${id}/escalate`, {});
}

export async function getAlertStats(): Promise<AlertStats> {
  const res = await apiFetch<AlertStats & { stats?: AlertStats }>("/api/v1/alerts/stats");
  return (res as any)?.stats ?? res;
}

// ── Zones & Terminals ───────────────────────────────────

export async function getZones(): Promise<Zone[]> {
  const res = await apiFetch<{ zones: Zone[] }>("/api/v1/zones");
  return Array.isArray(res) ? res : res?.zones ?? [];
}

export function getZone(id: string): Promise<Zone> {
  return apiFetch<Zone>(`/api/v1/zones/${id}`);
}

export async function getTerminals(): Promise<Terminal[]> {
  const res = await apiFetch<{ terminals: Terminal[] }>("/api/v1/terminals");
  return Array.isArray(res) ? res : res?.terminals ?? [];
}

export function getZoneDensity(zoneId: string): Promise<ZoneDensity> {
  return apiFetch<ZoneDensity>(`/api/v1/lidar/zones/${zoneId}/density`);
}

export async function getZoneDensities(): Promise<ZoneDensity[]> {
  // No dedicated densities endpoint - extract from zones which includes currentDensityPct
  const zones = await getZones();
  return zones.map((z: any) => ({
    zoneId: z.id,
    count: Number(z.currentCount) || 0,
    densityPct: parseFloat(z.currentDensityPct) || 0,
    avgDwellSecs: 0,
    timestamp: new Date().toISOString(),
  }));
}

export function getQueueMetrics(checkpointId: string): Promise<QueueMetrics> {
  return apiFetch<QueueMetrics>(`/api/v1/lidar/queue/${checkpointId}`);
}

// ── Sensors ─────────────────────────────────────────────

export async function getSensors(): Promise<SensorNode[]> {
  const res = await apiFetch<{ sensors: SensorNode[] }>("/api/v1/sensors");
  const arr = Array.isArray(res) ? res : res?.sensors ?? [];
  // API returns `health: "ONLINE"` (uppercase) instead of `status: "online"` (lowercase).
  // camelizeKeys handles key conversion but `health` has no underscore, so map explicitly.
  return arr.map((s: any) => {
    const status = s.health
      ? (s.health as string).toLowerCase()
      : s.status ?? "offline";
    return { ...s, status } as SensorNode;
  });
}

export async function getSensor(id: string): Promise<SensorNode> {
  const s: any = await apiFetch<SensorNode>(`/api/v1/sensors/${id}`);
  // Map `health` (uppercase) to `status` (lowercase) for frontend consistency
  if (s.health && !s.status) {
    s.status = (s.health as string).toLowerCase();
  }
  return s as SensorNode;
}

// ── Gamification ────────────────────────────────────────

function normalizeShiftScore(raw: any): ShiftScore {
  // After camelizeKeys: total_score -> totalScore, but ShiftScore type expects `score`.
  // Also map sub-scores to match the type's field names.
  // The API may return sub-scores as securityScore, flowScore, etc. Preserve them.
  const totalScore = raw.totalScore ?? raw.score ?? 0;
  return {
    ...raw,
    score: typeof totalScore === "number" ? totalScore : 0,
    totalScore: typeof totalScore === "number" ? totalScore : 0,
    securityScore: raw.securityScore ?? 0,
    flowScore: raw.flowScore ?? 0,
    responseScore: raw.responseScore ?? 0,
    complianceScore: raw.complianceScore ?? 0,
    uptimeScore: raw.uptimeScore ?? 0,
    shiftStart: raw.shiftStart ?? raw.shiftDate ?? '',
  } as ShiftScore;
}

export async function getShiftScore(): Promise<ShiftScore> {
  const res = await apiFetch<{ score: ShiftScore }>("/api/v1/scores/shift");
  const raw = (res as any)?.score ?? res;
  return normalizeShiftScore(raw);
}

export async function getScoreHistory(): Promise<ShiftScore[]> {
  const res = await apiFetch<{ scores: ShiftScore[] }>("/api/v1/scores/history");
  const arr = Array.isArray(res) ? res : res?.scores ?? [];
  return arr.map(normalizeShiftScore);
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const res = await apiFetch<{ leaderboard: LeaderboardEntry[] }>("/api/v1/leaderboard");
  const arr = Array.isArray(res) ? res : res?.leaderboard ?? [];
  // After camelizeKeys: streak_days -> streakDays, but type expects `streak`.
  // Also delta_rank or delta -> ensure mapped to `deltaRank`.
  return arr.map((e: any) => {
    // streakMultiplier = 1.6 means (1.6-1)/0.05 = 12 day streak
    const mult = parseFloat(e.streakMultiplier ?? e.streak_multiplier ?? "1") || 1;
    const streakDays = mult > 1 ? Math.round((mult - 1) / 0.05) : 0;
    return {
      ...e,
      streak: e.streak ?? streakDays,
      badgeCount: e.badgeCount ?? e.badge_count ?? 0,
      deltaRank: e.deltaRank ?? e.delta ?? 0,
    };
  }) as LeaderboardEntry[];
}

function normalizeBadge(raw: any): BadgeDefinition {
  // API returns `key` and `icon` / `category`; type expects `slug`, `iconUrl`, `criteria`.
  // Preserve `key` for icon fallback lookup in the frontend.
  return {
    ...raw,
    slug: raw.slug ?? raw.key ?? '',
    key: raw.key ?? raw.slug ?? '',
    iconUrl: raw.iconUrl ?? raw.icon ?? '',
    criteria: raw.criteria ?? (raw.category ? { category: raw.category } : {}),
  } as BadgeDefinition;
}

export async function getBadges(): Promise<BadgeDefinition[]> {
  const res = await apiFetch<{ badges: BadgeDefinition[] }>("/api/v1/badges");
  const arr = Array.isArray(res) ? res : res?.badges ?? [];
  return arr.map(normalizeBadge);
}

export async function getMyBadges(): Promise<BadgeDefinition[]> {
  const res = await apiFetch<{ badges: BadgeDefinition[] }>("/api/v1/badges/mine");
  const arr = Array.isArray(res) ? res : res?.badges ?? [];
  return arr.map(normalizeBadge);
}

function normalizeMission(raw: any): Mission {
  // API returns metric_key, target_value, reward_type, reward_value, resets_at (snake_case).
  // After camelizeKeys: metricKey, targetValue, rewardType, rewardValue, resetsAt.
  // Type expects: xpReward, criteria, expiresAt.
  const targetValue = raw.targetValue ?? raw.target_value ?? null;
  return {
    ...raw,
    xpReward: raw.xpReward ?? (Number(raw.rewardValue) || 0),
    targetValue: targetValue != null ? Number(targetValue) : undefined,
    criteria: raw.criteria ?? (raw.metricKey ? { metricKey: raw.metricKey, targetValue: targetValue } : {}),
    expiresAt: raw.expiresAt ?? raw.resetsAt ?? '',
  } as Mission;
}

export async function getMissions(): Promise<Mission[]> {
  const res = await apiFetch<{ missions: Mission[] }>("/api/v1/missions");
  const arr = Array.isArray(res) ? res : res?.missions ?? [];
  return arr.map(normalizeMission);
}

function normalizeMissionProgress(raw: any): MissionProgress {
  // Ensure missionId is present (camelizeKeys handles mission_id -> missionId).
  return {
    ...raw,
    missionId: raw.missionId ?? '',
    operatorId: raw.operatorId ?? '',
    progress: Number(raw.progress) || 0,
    target: Number(raw.target) || Number(raw.targetValue) || 1,
    completedAt: raw.completedAt ?? (raw.completed === true ? new Date().toISOString() : null),
  } as MissionProgress;
}

export async function getMissionProgress(): Promise<MissionProgress[]> {
  const res = await apiFetch<{ progress: MissionProgress[] }>("/api/v1/missions/progress");
  const arr = Array.isArray(res) ? res : res?.progress ?? [];
  return arr.map(normalizeMissionProgress);
}

// ── Surge Predictions ───────────────────────────────────

export interface SurgePrediction {
  zoneId: string;
  zoneName: string;
  currentDensityPct: number;
  currentCount: number;
  predictedDensity_15m: number;
  predictedDensity_30m: number;
  surgeRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  surgeEtaMinutes: number | null;
  confidence: number;
  recommendedActions: string[];
}

export interface SurgePredictionResponse {
  predictions: SurgePrediction[];
  generatedAt: string;
}

export async function getSurgePredictions(): Promise<SurgePrediction[]> {
  const res = await apiFetch<SurgePredictionResponse>('/api/v1/predictions/surge');
  return res?.predictions ?? [];
}

// ── Cross-Zone Intelligence ─────────────────────────────

export interface FlowAnomaly {
  type: 'WRONG_WAY_FLOW' | 'UNUSUAL_DWELL' | 'PERIMETER_PROBE';
  zones: string[];
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  detectedAt: string;
  confidence: number;
}

export async function getFlowAnomalies(): Promise<FlowAnomaly[]> {
  const res = await apiFetch<{ anomalies: FlowAnomaly[] }>('/api/v1/intelligence/flow-anomalies');
  return res?.anomalies ?? [];
}

// ── Incident Response Playbooks ─────────────────────────

export interface PlaybookStep {
  order: number;
  action: string;
  auto: boolean;
  etaSecs: number;
}

export interface Playbook {
  trigger: string;
  name: string;
  severityThreshold: number;
  steps: PlaybookStep[];
  escalationAfterSecs: number;
  escalationTo: string;
}

export async function getPlaybooks(): Promise<Playbook[]> {
  const res = await apiFetch<{ playbooks: Playbook[] }>('/api/v1/playbooks');
  return res?.playbooks ?? [];
}

// ── Facility Config ─────────────────────────────────────

export function getFacilityConfig(): Promise<FullFacilityConfig> {
  return apiFetch<FullFacilityConfig>("/api/v1/facility/config");
}

// ── Facilities (Multi-Vertical) ────────────────────────

export interface FacilitySummary {
  id: string;
  name: string;
  type: string;
  shortCode: string;
  address?: string;
  countryCode?: string;
  timezone?: string;
}

export async function getFacilities(): Promise<FacilitySummary[]> {
  const res = await apiFetch<{ facilities: FacilitySummary[] }>("/api/v1/facilities");
  return Array.isArray(res) ? res : res?.facilities ?? [];
}

export function getFacility(id: string): Promise<FacilitySummary & { zoneCount: number; sensorCount: number; operatorCount: number }> {
  return apiFetch("/api/v1/facilities/" + id);
}

export function createFacility(data: Record<string, unknown>): Promise<unknown> {
  return apiPost("/api/v1/facilities", data);
}

export function updateFacility(id: string, data: Record<string, unknown>): Promise<unknown> {
  return apiPatch("/api/v1/facilities/" + id, data);
}

export function addFacilityZone(facilityId: string, data: Record<string, unknown>): Promise<unknown> {
  return apiPost(`/api/v1/facilities/${facilityId}/zones`, data);
}

export function addFacilitySensor(facilityId: string, data: Record<string, unknown>): Promise<unknown> {
  return apiPost(`/api/v1/facilities/${facilityId}/sensors`, data);
}

export function addFacilityOperator(facilityId: string, data: Record<string, unknown>): Promise<unknown> {
  return apiPost(`/api/v1/facilities/${facilityId}/operators`, data);
}

// ── Benchmarking ────────────────────────────────────────

export interface BenchmarkFacility {
  id: string;
  name: string;
  type: string;
  avgResponseSecs: number;
  avgDensityPct: number;
  incidentRate24h: number;
  slaCompliancePct: number;
  operatorAvgScore: number;
  sensorUptimePct: number;
}

export interface BenchmarkData {
  facilities: BenchmarkFacility[];
  industryAverages: {
    avgResponseSecs: number;
    slaCompliancePct: number;
    sensorUptimePct: number;
  };
}

export function getBenchmarks(): Promise<BenchmarkData> {
  return apiFetch<BenchmarkData>("/api/v1/analytics/benchmarks");
}

// ── ROI Analytics ───────────────────────────────────────

export interface ROIMetrics {
  incidentsDetected24h: number;
  avgResponseTimeSecs: number;
  queueSlaCompliancePct: number;
  avgQueueWaitMins: number;
  personHoursSavedWeek: number;
  falsePositiveRatePct: number;
  detectionLeadTimeMins: number;
  costSavingsMonthlyUsd: number;
  sensorUptimePct: number;
  alertsBeforeEscalationPct: number;
}

export function getROIMetrics(): Promise<ROIMetrics> {
  return apiFetch<ROIMetrics>("/api/v1/analytics/roi");
}

// ── Compliance Reports ──────────────────────────────────

export interface ComplianceReport {
  framework: string;
  facility: string;
  period: { from: string; to: string };
  generatedAt: string;
  summary: {
    totalIncidents: number;
    avgResponseTimeSecs: number;
    slaCompliancePct: number;
    falsePositiveRatePct: number;
    sensorUptimePct: number;
    zonesMonitored: number;
    operatorsActive: number;
    totalShiftsScored: number;
  };
  incidentBreakdown: {
    type: string;
    count: number;
    avgSeverity: number;
    avgResponseSecs: number;
  }[];
  zoneCoverage: {
    zone: string;
    sensors: number;
    uptimePct: number;
    avgDensityPct: number;
  }[];
  operatorPerformance: {
    name: string;
    shifts: number;
    avgScore: number;
    badgesEarned: number;
  }[];
  complianceControls: {
    control: string;
    status: string;
    evidence: string;
  }[];
}

export function getComplianceReport(
  framework: string,
  from: string,
  to: string,
): Promise<{ report: ComplianceReport }> {
  return apiFetch<{ report: ComplianceReport }>(
    `/api/v1/reports/compliance?framework=${encodeURIComponent(framework)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&format=json`,
  );
}
