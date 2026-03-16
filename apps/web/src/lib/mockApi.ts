// Mock data for static demo deployment (no backend needed)
// This file mirrors every export from api.ts but returns hardcoded data.

const MOCK_ZONES = [
  { id: "z1", name: "Security Checkpoint A", type: "security", terminalName: "Terminal 2", currentCount: 78, currentDensityPct: "72.5", sensorCount: 2, slaWaitMins: 15 },
  { id: "z2", name: "Terminal B Gates", type: "gate", terminalName: "Terminal 2", currentCount: 45, currentDensityPct: "45.2", sensorCount: 2, slaWaitMins: 15 },
  { id: "z3", name: "Baggage Claim Hall", type: "baggage", terminalName: "Terminal 2", currentCount: 62, currentDensityPct: "58.8", sensorCount: 2, slaWaitMins: 15 },
  { id: "z4", name: "Arrivals Curb", type: "curb", terminalName: "Terminal 2", currentCount: 88, currentDensityPct: "82.1", sensorCount: 2, slaWaitMins: 15 },
  { id: "z5", name: "Departure Lounge C", type: "lounge", terminalName: "Terminal 2", currentCount: 31, currentDensityPct: "31.4", sensorCount: 2, slaWaitMins: 15 },
];

const MOCK_SENSORS = [
  { id: "s1", label: "S-001", model: "Hesai JT128", zoneId: "z1", status: "online", health: "ONLINE", fovDegrees: 360, rangeMeters: 50, lastPingAt: new Date().toISOString() },
  { id: "s2", label: "S-002", model: "Hesai JT128", zoneId: "z1", status: "online", health: "ONLINE", fovDegrees: 360, rangeMeters: 50, lastPingAt: new Date().toISOString() },
  { id: "s3", label: "S-003", model: "Hesai JT128", zoneId: "z2", status: "degraded", health: "DEGRADED", fovDegrees: 360, rangeMeters: 50, lastPingAt: new Date().toISOString() },
  { id: "s4", label: "S-004", model: "Hesai JT128", zoneId: "z2", status: "online", health: "ONLINE", fovDegrees: 360, rangeMeters: 50, lastPingAt: new Date().toISOString() },
  { id: "s5", label: "S-005", model: "Hesai JT128", zoneId: "z3", status: "online", health: "ONLINE", fovDegrees: 360, rangeMeters: 50, lastPingAt: new Date().toISOString() },
  { id: "s6", label: "S-006", model: "Hesai JT128", zoneId: "z3", status: "online", health: "ONLINE", fovDegrees: 360, rangeMeters: 50, lastPingAt: new Date().toISOString() },
  { id: "s7", label: "S-007", model: "Hesai JT128", zoneId: "z4", status: "online", health: "ONLINE", fovDegrees: 360, rangeMeters: 50, lastPingAt: new Date().toISOString() },
  { id: "s8", label: "S-008", model: "Hesai JT128", zoneId: "z4", status: "offline", health: "OFFLINE", fovDegrees: 360, rangeMeters: 50, lastPingAt: null },
  { id: "s9", label: "S-009", model: "Hesai JT128", zoneId: "z5", status: "online", health: "ONLINE", fovDegrees: 360, rangeMeters: 50, lastPingAt: new Date().toISOString() },
  { id: "s10", label: "S-010", model: "Hesai JT128", zoneId: "z5", status: "online", health: "ONLINE", fovDegrees: 360, rangeMeters: 50, lastPingAt: new Date().toISOString() },
];

const ALERT_TYPES = ["LOITERING", "CROWD_SURGE", "INTRUSION", "ABANDONED_OBJECT", "PERIMETER_BREACH"] as const;
const MOCK_ALERTS = Array.from({ length: 20 }, (_, i) => ({
  id: `alert-${i}`,
  type: ALERT_TYPES[i % 5],
  severity: (i % 5) + 1,
  confidence: +(0.7 + Math.random() * 0.28).toFixed(2),
  zoneId: MOCK_ZONES[i % 5]!.id,
  acknowledged: i > 10,
  acknowledgedBy: i > 10 ? "operator-1" : null,
  acknowledgedAt: i > 10 ? new Date(Date.now() - i * 300000).toISOString() : null,
  createdAt: new Date(Date.now() - i * 600000).toISOString(),
  escalated: i === 2,
}));

const MOCK_LEADERBOARD = [
  { operatorId: "op1", name: "Amara O.", team: "Alpha", totalScore: 6392, rank: 1, streak: 12, badgeCount: 4, deltaRank: 0 },
  { operatorId: "op2", name: "Priya S.", team: "Alpha", totalScore: 6209, rank: 2, streak: 7, badgeCount: 2, deltaRank: 1 },
  { operatorId: "op3", name: "James W.", team: "Bravo", totalScore: 6072, rank: 3, streak: 9, badgeCount: 3, deltaRank: -1 },
  { operatorId: "op4", name: "Chen L.", team: "Charlie", totalScore: 5938, rank: 4, streak: 5, badgeCount: 1, deltaRank: 0 },
  { operatorId: "op5", name: "Admin User", team: "Ops", totalScore: 5852, rank: 5, streak: 0, badgeCount: 1, deltaRank: 0 },
];

const MOCK_OPERATOR = {
  id: "op5", name: "Admin User", email: "admin@soterion.io", role: "admin" as const,
  team: "Ops", airportId: "a1", facilityId: "f1", avatarUrl: null,
  shiftScoreAllTime: 5852, currentStreak: 3, badges: ["FIRST_DETECT"],
  createdAt: "2026-01-15T10:00:00Z",
};

// ── Auth ────────────────────────────────────────────────
export async function login(_email?: string, _password?: string) {
  return { access_token: "mock-token", token: "mock-token", operator: MOCK_OPERATOR };
}
export async function getMe() { return MOCK_OPERATOR; }
export async function refreshToken() { return { token: "mock-token" }; }

// ── Alerts ──────────────────────────────────────────────
export async function getAlerts(_filters?: unknown) { return MOCK_ALERTS; }
export async function getAlert(id: string) { return MOCK_ALERTS.find(a => a.id === id) ?? MOCK_ALERTS[0]; }
export async function acknowledgeAlert(id: string) { return { ...MOCK_ALERTS[0], id, acknowledged: true }; }
export async function escalateAlert(id: string) { return { ...MOCK_ALERTS[0], id, escalated: true }; }
export async function getAlertStats() {
  return {
    totalOpen: 9, totalAcknowledged: 11, totalResolvedToday: 3, avgConfidence: 0.87,
    bySeverity: { critical: 2, high: 4, medium: 6, low: 5, info: 3 },
    byType: { LOITERING: 5, CROWD_SURGE: 4, INTRUSION: 3, ABANDONED_OBJECT: 4, PERIMETER_BREACH: 4 },
  };
}

// ── Zones & Terminals ───────────────────────────────────
export async function getZones() { return MOCK_ZONES; }
export async function getZone(id: string) { return MOCK_ZONES.find(z => z.id === id) ?? MOCK_ZONES[0]; }
export async function getTerminals() { return []; }
export async function getZoneDensity(zoneId: string) {
  const z = MOCK_ZONES.find(mz => mz.id === zoneId) ?? MOCK_ZONES[0]!;
  return { zoneId: z.id, count: z.currentCount, densityPct: parseFloat(z.currentDensityPct), avgDwellSecs: 45, timestamp: new Date().toISOString() };
}
export async function getZoneDensities() {
  return MOCK_ZONES.map(z => ({ zoneId: z.id, count: z.currentCount, densityPct: parseFloat(z.currentDensityPct), avgDwellSecs: 45, timestamp: new Date().toISOString() }));
}
export async function getQueueMetrics(_checkpointId: string) {
  return { queueDepth: 23, waitTimeMins: 8.2, throughputPerHr: 210, slaMet: true };
}

// ── Sensors ─────────────────────────────────────────────
export async function getSensors() { return MOCK_SENSORS; }
export async function getSensor(id: string) { return MOCK_SENSORS.find(s => s.id === id) ?? MOCK_SENSORS[0]; }

// ── Gamification ────────────────────────────────────────
export async function getShiftScore() {
  return {
    score: 847, totalScore: 847, securityScore: 940, flowScore: 820,
    responseScore: 780, complianceScore: 910, uptimeScore: 980,
    shiftStart: new Date().toISOString(), shiftDate: new Date().toISOString().slice(0, 10),
    streakMultiplier: 1.35,
  };
}
export async function getScoreHistory() {
  return Array.from({ length: 14 }, (_, i) => ({
    id: `s${i}`, score: 750 + Math.random() * 200, totalScore: 750 + Math.random() * 200,
    shiftStart: new Date(Date.now() - i * 86400000).toISOString(),
    shiftDate: new Date(Date.now() - i * 86400000).toISOString().slice(0, 10),
  }));
}
export async function getLeaderboard() { return MOCK_LEADERBOARD; }
export async function getBadges() {
  return [
    { id: "b1", key: "FIRST_DETECT", slug: "FIRST_DETECT", name: "First Strike", description: "Detect your first threat", icon: "target", iconUrl: "target", category: "universal", criteria: {} },
    { id: "b2", key: "SEVEN_DAY_STREAK", slug: "SEVEN_DAY_STREAK", name: "7-Day Streak", description: "7 consecutive qualifying shifts", icon: "fire", iconUrl: "fire", category: "universal", criteria: {} },
    { id: "b3", key: "FAST_RESPONDER", slug: "FAST_RESPONDER", name: "Fast Responder", description: "Median ack time under 60s", icon: "zap", iconUrl: "zap", category: "universal", criteria: {} },
    { id: "b4", key: "ZERO_FALSE_POSITIVES", slug: "ZERO_FALSE_POSITIVES", name: "Zero False+", description: "No false positives in 30 days", icon: "shield", iconUrl: "shield", category: "universal", criteria: {} },
  ];
}
export async function getMyBadges() {
  return [{ id: "b1", key: "FIRST_DETECT", slug: "FIRST_DETECT", name: "First Strike", icon: "target", iconUrl: "target", earnedAt: "2026-03-01", criteria: {} }];
}
export async function getMissions() {
  return [
    { id: "m1", title: "Acknowledge 5 alerts", description: "Ack 5 alerts before escalation", targetValue: 5, active: true, xpReward: 100, criteria: {}, expiresAt: "" },
    { id: "m2", title: "Maintain 95% queue SLA", description: "Keep SLA for 2 hours", targetValue: 2, active: true, xpReward: 150, criteria: {}, expiresAt: "" },
  ];
}
export async function getMissionProgress() {
  return [
    { missionId: "m1", operatorId: "op5", progress: 3, target: 5, completed: false, completedAt: null },
    { missionId: "m2", operatorId: "op5", progress: 1, target: 2, completed: false, completedAt: null },
  ];
}

// ── Surge Predictions ───────────────────────────────────
export async function getSurgePredictions() {
  return [
    { zoneId: "z1", zoneName: "Security Checkpoint A", currentDensityPct: 72.5, currentCount: 78, predictedDensity_15m: 81, predictedDensity_30m: 88, surgeRisk: "HIGH" as const, surgeEtaMinutes: 12, confidence: 0.89, recommendedActions: ["Open additional screening lane", "Alert shift supervisor"] },
    { zoneId: "z4", zoneName: "Arrivals Curb", currentDensityPct: 82.1, currentCount: 88, predictedDensity_15m: 79, predictedDensity_30m: 72, surgeRisk: "MEDIUM" as const, surgeEtaMinutes: null, confidence: 0.84, recommendedActions: ["Monitor closely"] },
  ];
}

// ── Cross-Zone Intelligence ─────────────────────────────
export async function getFlowAnomalies() {
  return [{ type: "WRONG_WAY_FLOW" as const, zones: ["Arrivals Curb", "Security Checkpoint A"], severity: "HIGH" as const, description: "Unusual reverse flow detected", detectedAt: new Date().toISOString(), confidence: 0.87 }];
}

// ── Playbooks ───────────────────────────────────────────
export async function getPlaybooks() {
  return [{ trigger: "CROWD_SURGE", name: "Crowd Surge Response", severityThreshold: 3, steps: [{ order: 1, action: "Alert shift supervisor", auto: true, etaSecs: 0 }, { order: 2, action: "Open additional lane", auto: false, etaSecs: 120 }], escalationAfterSecs: 180, escalationTo: "Terminal Ops Director" }];
}

// ── Facility Config ─────────────────────────────────────
export async function getFacilityConfig() {
  return {
    facilityType: "AIRPORT",
    facility: { id: "f1", name: "London Heathrow", shortCode: "LHR", type: "AIRPORT", zones: MOCK_ZONES },
    zoneTypes: [{ key: "security", label: "Security Checkpoint" }, { key: "gate", label: "Departure Gate" }, { key: "baggage", label: "Baggage Claim" }, { key: "curb", label: "Arrivals Curb" }, { key: "lounge", label: "Departure Lounge" }],
    kpiDefinitions: [],
    complianceFrameworks: [{ frameworkKey: "TSA", label: "TSA" }],
    activeMLModels: {},
    anomalyTypes: ["LOITERING", "CROWD_SURGE", "INTRUSION", "ABANDONED_OBJECT", "PERIMETER_BREACH"],
    journeyStages: ["Curb", "Check-in", "Security", "Gate", "Boarding"],
    subtitle: "Intelligence Platform",
  };
}
export async function getFacilities() {
  return [{ id: "f1", name: "London Heathrow", type: "AIRPORT", shortCode: "LHR" }];
}
export async function getFacility(_id: string) {
  return { id: "f1", name: "London Heathrow", type: "AIRPORT", shortCode: "LHR", zoneCount: 5, sensorCount: 10, operatorCount: 5 };
}
export async function createFacility(_data: unknown) { return { id: "f1" }; }
export async function updateFacility(_id: string, _data: unknown) { return { id: "f1" }; }
export async function addFacilityZone(_facilityId: string, _data: unknown) { return { id: "z1" }; }
export async function addFacilitySensor(_facilityId: string, _data: unknown) { return { id: "s1" }; }
export async function addFacilityOperator(_facilityId: string, _data: unknown) { return { id: "op1" }; }

// ── ROI Analytics ───────────────────────────────────────
export async function getROIMetrics() {
  return {
    incidentsDetected24h: 54, avgResponseTimeSecs: 14.8, queueSlaCompliancePct: 86,
    avgQueueWaitMins: 8.2, personHoursSavedWeek: 142, falsePositiveRatePct: 3.2,
    detectionLeadTimeMins: 8.3, costSavingsMonthlyUsd: 25560, sensorUptimePct: 98.5,
    alertsBeforeEscalationPct: 94,
  };
}

// ── Shift Handoff ───────────────────────────────────────
export async function getShiftHandoff() {
  return {
    shift: { operator: "Admin User", start: new Date(Date.now() - 28800000).toISOString(), end: new Date().toISOString(), score: 847 },
    summary: { totalIncidents: 12, acknowledged: 10, escalated: 1, pending: 2, avgResponseSecs: 14.8, peakZone: "Security Checkpoint A", peakDensityPct: 87 },
    pendingItems: [{ type: "UNACKED_ALERT", detail: "LOITERING at Baggage Claim" }],
    watchItems: ["Security Checkpoint density trending up"],
    missionsStatus: [{ title: "Acknowledge 5 alerts", progress: 3, target: 5, completed: false }],
    topIncidents: [{ type: "CROWD_SURGE", zone: "Security Checkpoint A", severity: 4, time: "10:23", resolved: true }],
  };
}

// ── Trend Analytics ─────────────────────────────────────
export async function getTrends(_metric?: string, _period?: string, _zoneId?: string) {
  return {
    metric: "density", period: "7d",
    data: Array.from({ length: 7 }, (_, i) => ({
      date: new Date(Date.now() - (6 - i) * 86400000).toISOString().slice(0, 10),
      value: 40 + Math.random() * 30, min: 10 + Math.random() * 15,
      max: 70 + Math.random() * 20, avg: 40 + Math.random() * 30,
    })),
    comparison: { previousPeriodAvg: 49.5, currentPeriodAvg: 54.2, changePct: 9.5, trend: "up" as const },
  };
}

// ── Benchmarking ────────────────────────────────────────
export async function getBenchmarks() {
  return {
    facilities: [{
      id: "f1", name: "London Heathrow T2", type: "AIRPORT",
      avgResponseSecs: 14.8, avgDensityPct: 52, incidentRate24h: 54,
      slaCompliancePct: 86, operatorAvgScore: 880, sensorUptimePct: 98.5,
    }],
    industryAverages: { avgResponseSecs: 45, slaCompliancePct: 72, sensorUptimePct: 94 },
  };
}

// ── Compliance Reports ──────────────────────────────────
export async function getComplianceReport(_framework?: string, _from?: string, _to?: string) {
  return {
    report: {
      framework: "TSA", facility: "London Heathrow T2",
      period: { from: "2026-01-01", to: "2026-03-16" }, generatedAt: new Date().toISOString(),
      summary: { totalIncidents: 54, avgResponseTimeSecs: 14.8, slaCompliancePct: 86, falsePositiveRatePct: 3.2, sensorUptimePct: 98.5, zonesMonitored: 5, operatorsActive: 5, totalShiftsScored: 42 },
      incidentBreakdown: [{ type: "LOITERING", count: 12, avgSeverity: 2.3, avgResponseSecs: 12 }, { type: "CROWD_SURGE", count: 8, avgSeverity: 3.8, avgResponseSecs: 18 }],
      zoneCoverage: [{ zone: "Security Checkpoint A", sensors: 2, uptimePct: 99.1, avgDensityPct: 72 }],
      operatorPerformance: [{ name: "Admin User", shifts: 10, avgScore: 847, badgesEarned: 1 }],
      complianceControls: [{ control: "Real-time detection", status: "COMPLIANT", evidence: "54 incidents detected in period" }],
    },
  };
}

// ── ML Models ───────────────────────────────────────────
export async function getModels() {
  return [
    { id: "ml1", facilityType: "AIRPORT", modelKey: "anomaly_v2", version: "2.1.0", status: "active" as const, accuracy: 0.94, trainedAt: "2026-03-10T08:00:00Z", samplesUsed: 125000, nextTrainingDue: "2026-04-10T08:00:00Z", progress: null },
    { id: "ml2", facilityType: "AIRPORT", modelKey: "crowd_v1", version: "1.3.0", status: "active" as const, accuracy: 0.91, trainedAt: "2026-03-08T08:00:00Z", samplesUsed: 80000, nextTrainingDue: "2026-04-08T08:00:00Z", progress: null },
  ];
}
export async function retrainModel(_id: string) {
  return { jobId: "job-1", estimatedMinutes: 45, status: "queued" };
}
export async function getModelMetrics(_id: string) {
  return {
    accuracyHistory: [{ version: "2.0.0", accuracy: 0.91, date: "2026-02-01" }, { version: "2.1.0", accuracy: 0.94, date: "2026-03-10" }],
    confusionMatrix: { truePositive: 847, falsePositive: 28, trueNegative: 9120, falseNegative: 52 },
    topMisclassifications: [{ predicted: "LOITERING", actual: "NORMAL", count: 12 }, { predicted: "INTRUSION", actual: "LOITERING", count: 8 }],
  };
}

// ── Onboarding ──────────────────────────────────────────
export async function signup(_data: unknown) {
  return { facilityId: "f1", operatorId: "op5", apiKey: "sk_demo_xxxx", loginUrl: "/login" };
}
export async function getOnboardingStatus(_facilityId: string) {
  return { steps: [{ step: "Create facility", completed: true, completedAt: "2026-03-01" }, { step: "Add zones", completed: true, completedAt: "2026-03-01" }, { step: "Register sensors", completed: false, completedAt: null }], completionPct: 66 };
}

// ── Integrations ────────────────────────────────────────
export async function getIntegrations() {
  return [
    { id: "int1", type: "slack" as const, name: "Ops Channel", config: { channel: "#soterion-alerts" }, enabled: true, triggerSeverity: 3, lastFiredAt: new Date(Date.now() - 3600000).toISOString(), createdAt: "2026-02-15T10:00:00Z" },
    { id: "int2", type: "pagerduty" as const, name: "Critical Escalation", config: { serviceId: "P123" }, enabled: true, triggerSeverity: 4, lastFiredAt: null, createdAt: "2026-02-20T10:00:00Z" },
  ];
}
export async function createIntegration(_data: unknown) { return (await getIntegrations())[0]; }
export async function updateIntegration(_id: string, _data: unknown) { return (await getIntegrations())[0]; }
export async function deleteIntegration(_id: string) { return { message: "Deleted" }; }
export async function testIntegration(_id: string) { return { success: true, message: "Test notification sent" }; }

// ── Alert Rules ─────────────────────────────────────────
export async function getAlertRules() {
  return [
    { id: "r1", name: "High Density Alert", enabled: true, conditions: { zoneType: "security", densityAbove: 80 }, action: { alertType: "CROWD_SURGE", severity: 4, message: "Density threshold exceeded" }, cooldownMins: 15, lastTriggeredAt: new Date(Date.now() - 7200000).toISOString(), createdBy: "op5", createdAt: "2026-02-10T10:00:00Z" },
  ];
}
export async function createAlertRule(_data: unknown) { return (await getAlertRules())[0]; }
export async function updateAlertRule(_id: string, _data: unknown) { return (await getAlertRules())[0]; }
export async function deleteAlertRule(_id: string) { return { message: "Deleted" }; }
export async function toggleAlertRule(_id: string) { return (await getAlertRules())[0]; }

// ── Low-level fetch helpers (no-ops in demo mode) ───────
export async function apiFetch<T = unknown>(_path: string, _options?: unknown): Promise<T> {
  return {} as T;
}
export async function apiPost<T = unknown>(_path: string, _body?: unknown, _options?: unknown): Promise<T> {
  return {} as T;
}
export async function apiPatch<T = unknown>(_path: string, _body?: unknown, _options?: unknown): Promise<T> {
  return {} as T;
}
export async function apiDelete<T = unknown>(_path: string, _options?: unknown): Promise<T> {
  return {} as T;
}
