// ── Facility ──────────────────────────────────────────────

export type FacilityType = "AIRPORT" | "SEAPORT" | "STADIUM" | "TRANSIT_HUB" | "HOSPITAL";

export interface FacilityConfig {
  id: string;
  name: string;
  type: FacilityType;
  location: { lat: number; lng: number };
  timezone: string;
  zones: Zone[];
  createdAt: string;
  updatedAt: string;
}

// ── Zone ─────────────────────────────────────────────────

export interface Zone {
  id: string;
  facilityId: string;
  name: string;
  label: string;
  type: string; // Driven by zone_type_definitions for each facility type
  polygon: Array<{ x: number; y: number; z: number }>;
  threatLevel: "low" | "medium" | "high" | "critical";
  occupancy: number;
  maxOccupancy: number;
}

// ── Sensor ───────────────────────────────────────────────

export interface SensorNode {
  id: string;
  facilityId: string;
  zoneId: string;
  model: string;
  position: { x: number; y: number; z: number };
  rotation: { pitch: number; yaw: number; roll: number };
  status: "online" | "degraded" | "offline" | "maintenance";
  fps: number;
  pointsPerSecond: number;
  lastHeartbeat: string;
  firmware: string;
}

// ── Track ────────────────────────────────────────────────

export interface TrackObject {
  id: string;
  facilityId: string;
  zoneId: string;
  classification: "person" | "vehicle" | "animal" | "drone" | "unknown";
  position: { x: number; y: number; z: number };
  velocity: { vx: number; vy: number; vz: number };
  heading: number;
  confidence: number;
  firstSeen: string;
  lastSeen: string;
  trackletIds: string[];
}

// ── Anomaly / Alert ──────────────────────────────────────

export interface AnomalyEvent {
  id: string;
  facilityId: string;
  zoneId: string;
  trackId: string | null;
  type: string; // Driven by facilityConfig.anomalyTypes for each facility type
  severity: "low" | "medium" | "high" | "critical";
  confidence: number;
  description: string;
  timestamp: string;
  acknowledgedBy: string | null;
  resolvedAt: string | null;
  metadata: Record<string, unknown>;
}

// ── Operator & Gamification ──────────────────────────────

export interface Operator {
  id: string;
  facilityId: string;
  name: string;
  email: string;
  role: "operator" | "supervisor" | "admin" | "platform_admin";
  avatarUrl: string | null;
  shiftScoreAllTime: number;
  currentStreak: number;
  badges: string[];
  createdAt: string;
}

export interface ShiftScore {
  id: string;
  operatorId: string;
  shiftStart: string;
  shiftEnd: string | null;
  alertsAcknowledged: number;
  avgResponseMs: number;
  falsePositivesCaught: number;
  escalationsCorrect: number;
  score: number;
  grade: "S" | "A" | "B" | "C" | "D" | "F";
}

export interface BadgeDefinition {
  id: string;
  slug: string;
  name: string;
  description: string;
  iconUrl: string;
  criteria: Record<string, unknown>;
}

// ── Missions ─────────────────────────────────────────────

export interface Mission {
  id: string;
  title: string;
  description: string;
  type: "daily" | "weekly" | "special";
  xpReward: number;
  criteria: Record<string, unknown>;
  expiresAt: string;
}

export interface MissionProgress {
  missionId: string;
  operatorId: string;
  progress: number;
  target: number;
  completedAt: string | null;
}

// ── Alert Stats ─────────────────────────────────────────

export interface AlertStats {
  total: number;
  unacknowledged: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  avgConfidence: number;
  avgResponseMs: number;
  // Fields from /alerts/stats endpoint (after camelizeKeys)
  totalOpen?: number;
  totalAcknowledged?: number;
  totalResolvedToday?: number;
}

// ── Zone Density ────────────────────────────────────────

export interface ZoneDensity {
  zoneId: string;
  count: number;
  densityPct: number;
  avgDwellSecs: number;
  timestamp: string;
}

// ── Queue Metrics ───────────────────────────────────────

export interface QueueMetrics {
  zoneId: string;
  queueDepth: number;
  waitTimeMins: number;
  throughputPerHr: number;
  slaMet: boolean;
  timestamp: string;
}

// ── Terminal ────────────────────────────────────────────

export interface Terminal {
  id: string;
  facilityId: string;
  name: string;
  floorPlan: unknown;
}

// ── Leaderboard Entry ───────────────────────────────────

export interface LeaderboardEntry {
  operatorId: string;
  operatorName: string;
  name?: string; // API returns `name` after camelization
  avatarUrl: string | null;
  team: string;
  totalScore: number;
  rank: number;
  streak: number;
  badgeCount: number;
  badges: string[];
  deltaRank: number; // positive = moved up, negative = moved down, 0 = no change
  isCurrentUser?: boolean;
}

// ── Gamification Notifications ──────────────────────────

export type GamificationEventType =
  | "badge_unlock"
  | "mission_complete"
  | "streak_milestone"
  | "score_update";

export interface GamificationNotification {
  id: string;
  type: GamificationEventType;
  title: string;
  message: string;
  icon: string;
  color: string;
  timestamp: number;
  dismissed: boolean;
}

// ── Badge (enhanced) ────────────────────────────────────

export interface Badge {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
  category: "universal" | "vertical";
  facilityTypes?: string[];
  earned: boolean;
  earnedAt?: string;
}

// ── Streak ──────────────────────────────────────────────

export interface StreakDay {
  date: string;
  qualifying: boolean | null; // null = future
  score?: number;
}

export interface StreakInfo {
  currentStreak: number;
  multiplier: number;
  qualifyingThreshold: number;
  recentDays: StreakDay[];
}

// ── Mission (enhanced) ──────────────────────────────────

export interface MissionWithProgress {
  id: string;
  title: string;
  description: string;
  type: "daily" | "weekly" | "special";
  progress: number;
  target: number;
  rewardPreview: string;
  expiresAt: string;
  completed: boolean;
  completedAt: string | null;
  color: string;
}

// ── Auth ────────────────────────────────────────────────

export interface AuthResponse {
  token?: string;
  access_token?: string;
  refresh_token?: string;
  operator: Operator;
}

// ── Facility Config (multi-vertical) ────────────────────

export interface ZoneTypeDefinition {
  id: string;
  facilityType: string;
  key: string;
  label: string;
  defaultSla: Record<string, unknown> | null;
}

export interface KpiDefinition {
  id: string;
  facilityType: string;
  key: string;
  label: string;
  unit: string | null;
  direction: "lower_better" | "higher_better";
  defaultTarget: number | null;
}

export interface ComplianceFramework {
  id: string;
  facilityType: string;
  frameworkKey: string;
  label: string;
  rules: unknown[];
}

export interface FullFacilityConfig {
  facility: FacilityConfig;
  facilityType: string;
  zoneTypes: ZoneTypeDefinition[];
  anomalyTypes: string[];
  kpiDefinitions: KpiDefinition[];
  complianceFrameworks: ComplianceFramework[];
  journeyStages?: string[];
  subtitle?: string;
}

// ── WebSocket Messages ──────────────────────────────────

export interface WsAlertMessage {
  type: "alert";
  payload: AnomalyEvent;
}

export interface WsSensorFrame {
  type: "sensor_frame";
  sensorId: string;
  payload: Record<string, unknown>;
}
