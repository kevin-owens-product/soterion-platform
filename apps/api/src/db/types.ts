// Database row types matching all tables from the Soterion schema

export interface Airport {
  id: string;
  name: string;
  iata_code: string;
  icao_code: string | null;
  latitude: number;
  longitude: number;
  timezone: string;
  created_at: Date;
  updated_at: Date;
}

export interface Terminal {
  id: string;
  airport_id: string;
  name: string;
  code: string;
  floor_plan_url: string | null;
  bounds_geojson: unknown | null;
  created_at: Date;
  updated_at: Date;
}

export interface Zone {
  id: string;
  terminal_id: string;
  name: string;
  zone_type: 'security_checkpoint' | 'gate_area' | 'concourse' | 'customs' | 'baggage_claim' | 'curbside' | 'other';
  capacity: number;
  polygon_geojson: unknown;
  alert_threshold_pct: number;
  created_at: Date;
  updated_at: Date;
}

export interface SensorNode {
  id: string;
  zone_id: string;
  serial_number: string;
  model: string;
  firmware_version: string;
  mount_x: number;
  mount_y: number;
  mount_z: number;
  heading_deg: number;
  fov_h_deg: number;
  fov_v_deg: number;
  status: 'online' | 'offline' | 'degraded' | 'maintenance';
  last_heartbeat_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface Operator {
  id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  role_id: string;
  airport_id: string;
  avatar_url: string | null;
  is_active: boolean;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface TrackObject {
  id: string;
  sensor_node_id: string;
  zone_id: string;
  track_uuid: string;
  object_class: 'person' | 'luggage' | 'cart' | 'wheelchair' | 'vehicle' | 'unknown';
  first_seen_at: Date;
  last_seen_at: Date;
  positions: unknown; // JSONB array of {t, x, y, z}
  velocity_avg: number | null;
  is_active: boolean;
}

export interface ZoneDensity {
  id: string;
  zone_id: string;
  timestamp: Date;
  person_count: number;
  occupancy_pct: number;
  avg_dwell_seconds: number | null;
  flow_in: number;
  flow_out: number;
}

export interface QueueMetric {
  id: string;
  zone_id: string;
  timestamp: Date;
  queue_length: number;
  estimated_wait_seconds: number;
  throughput_per_minute: number;
  service_time_avg_seconds: number | null;
}

export interface AnomalyEvent {
  id: string;
  zone_id: string;
  sensor_node_id: string | null;
  anomaly_type: 'crowd_surge' | 'perimeter_breach' | 'abandoned_object' | 'wrong_way' | 'loitering' | 'tailgating' | 'density_spike';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string | null;
  metadata: unknown | null;
  status: 'open' | 'acknowledged' | 'investigating' | 'resolved' | 'false_positive';
  acknowledged_by: string | null;
  acknowledged_at: Date | null;
  resolved_at: Date | null;
  created_at: Date;
}

export interface ShiftScore {
  id: string;
  operator_id: string;
  shift_date: string;
  response_time_avg_ms: number;
  alerts_handled: number;
  false_positive_rate: number;
  coverage_pct: number;
  total_score: number;
  created_at: Date;
}

export interface BadgeDefinition {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon_url: string | null;
  criteria: unknown;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  created_at: Date;
}

export interface OperatorBadge {
  id: string;
  operator_id: string;
  badge_id: string;
  awarded_at: Date;
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  mission_type: 'daily' | 'weekly' | 'special';
  criteria: unknown;
  reward_points: number;
  starts_at: Date;
  ends_at: Date;
  created_at: Date;
}

export interface MissionProgress {
  id: string;
  operator_id: string;
  mission_id: string;
  progress_pct: number;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface AuditLog {
  id: string;
  operator_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: unknown | null;
  ip_address: string | null;
  created_at: Date;
}

export interface OperatorSession {
  id: string;
  operator_id: string;
  token_hash: string;
  ip_address: string | null;
  user_agent: string | null;
  expires_at: Date;
  created_at: Date;
}

export interface Role {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
  created_at: Date;
  updated_at: Date;
}

export interface Permission {
  id: string;
  slug: string;
  description: string | null;
  created_at: Date;
}

export interface ApiKey {
  id: string;
  name: string;
  key_hash: string;
  airport_id: string;
  scopes: string[];
  is_active: boolean;
  last_used_at: Date | null;
  expires_at: Date | null;
  created_at: Date;
}
