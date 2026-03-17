-- seed.sql
-- Demo data for Soterion AI Platform — Heathrow T2

------------------------------------------------------------
-- 1. Airport
------------------------------------------------------------
INSERT INTO airports (id, name, iata_code)
VALUES ('a0000000-0000-4000-8000-000000000001', 'London Heathrow', 'LHR');

------------------------------------------------------------
-- 2. Terminal
------------------------------------------------------------
INSERT INTO terminals (id, airport_id, name)
VALUES ('b0000000-0000-4000-8000-000000000001',
        'a0000000-0000-4000-8000-000000000001',
        'Terminal 2');

------------------------------------------------------------
-- 3. Zones (5 zones across Terminal 2)
------------------------------------------------------------
INSERT INTO zones (id, terminal_id, name, type, sla_wait_mins, boundary) VALUES
('c0000000-0000-4000-8000-000000000001',
 'b0000000-0000-4000-8000-000000000001',
 'Security Checkpoint A', 'security', 10,
 '{"type":"Polygon","coordinates":[[[-0.4510,51.4710],[-0.4510,51.4715],[-0.4500,51.4715],[-0.4500,51.4710],[-0.4510,51.4710]]]}'::jsonb),

('c0000000-0000-4000-8000-000000000002',
 'b0000000-0000-4000-8000-000000000001',
 'Terminal B Gates', 'gate', 15,
 '{"type":"Polygon","coordinates":[[[-0.4500,51.4710],[-0.4500,51.4715],[-0.4490,51.4715],[-0.4490,51.4710],[-0.4500,51.4710]]]}'::jsonb),

('c0000000-0000-4000-8000-000000000003',
 'b0000000-0000-4000-8000-000000000001',
 'Baggage Claim Hall', 'baggage', 20,
 '{"type":"Polygon","coordinates":[[[-0.4490,51.4710],[-0.4490,51.4715],[-0.4480,51.4715],[-0.4480,51.4710],[-0.4490,51.4710]]]}'::jsonb),

('c0000000-0000-4000-8000-000000000004',
 'b0000000-0000-4000-8000-000000000001',
 'Arrivals Curb', 'curb', 15,
 '{"type":"Polygon","coordinates":[[[-0.4480,51.4710],[-0.4480,51.4715],[-0.4470,51.4715],[-0.4470,51.4710],[-0.4480,51.4710]]]}'::jsonb),

('c0000000-0000-4000-8000-000000000005',
 'b0000000-0000-4000-8000-000000000001',
 'Departure Lounge C', 'lounge', 15,
 '{"type":"Polygon","coordinates":[[[-0.4470,51.4710],[-0.4470,51.4715],[-0.4460,51.4715],[-0.4460,51.4710],[-0.4470,51.4710]]]}'::jsonb);

------------------------------------------------------------
-- 4. Sensor Nodes (10 nodes, mix across zones)
------------------------------------------------------------
INSERT INTO sensor_nodes (id, zone_id, label, model, coords, fov_degrees, range_meters, health, last_ping_at) VALUES
-- Security Checkpoint A: 3 sensors
('d0000000-0000-4000-8000-000000000001',
 'c0000000-0000-4000-8000-000000000001',
 'S-001', 'Hesai JT128',
 '{"x":-0.4505,"y":51.4712,"z":3.5}'::jsonb,
 360, 50, 'ONLINE', NOW() - INTERVAL '30 seconds'),

('d0000000-0000-4000-8000-000000000002',
 'c0000000-0000-4000-8000-000000000001',
 'S-002', 'Hesai JT128',
 '{"x":-0.4507,"y":51.4713,"z":3.5}'::jsonb,
 360, 50, 'ONLINE', NOW() - INTERVAL '15 seconds'),

('d0000000-0000-4000-8000-000000000003',
 'c0000000-0000-4000-8000-000000000001',
 'S-003', 'Hesai JT128',
 '{"x":-0.4503,"y":51.4711,"z":3.5}'::jsonb,
 360, 50, 'ONLINE', NOW() - INTERVAL '45 seconds'),

-- Terminal B Gates: 2 sensors
('d0000000-0000-4000-8000-000000000004',
 'c0000000-0000-4000-8000-000000000002',
 'S-004', 'Hesai JT128',
 '{"x":-0.4495,"y":51.4712,"z":4.0}'::jsonb,
 360, 50, 'ONLINE', NOW() - INTERVAL '20 seconds'),

('d0000000-0000-4000-8000-000000000005',
 'c0000000-0000-4000-8000-000000000002',
 'S-005', 'Hesai JT128',
 '{"x":-0.4493,"y":51.4713,"z":4.0}'::jsonb,
 360, 50, 'DEGRADED', NOW() - INTERVAL '5 minutes'),

-- Baggage Claim Hall: 2 sensors
('d0000000-0000-4000-8000-000000000006',
 'c0000000-0000-4000-8000-000000000003',
 'S-006', 'Hesai JT128',
 '{"x":-0.4485,"y":51.4712,"z":3.0}'::jsonb,
 360, 50, 'ONLINE', NOW() - INTERVAL '10 seconds'),

('d0000000-0000-4000-8000-000000000007',
 'c0000000-0000-4000-8000-000000000003',
 'S-007', 'Hesai JT128',
 '{"x":-0.4487,"y":51.4713,"z":3.0}'::jsonb,
 360, 50, 'ONLINE', NOW() - INTERVAL '25 seconds'),

-- Arrivals Curb: 2 sensors
('d0000000-0000-4000-8000-000000000008',
 'c0000000-0000-4000-8000-000000000004',
 'S-008', 'Hesai JT128',
 '{"x":-0.4475,"y":51.4712,"z":5.0}'::jsonb,
 360, 50, 'ONLINE', NOW() - INTERVAL '5 seconds'),

('d0000000-0000-4000-8000-000000000009',
 'c0000000-0000-4000-8000-000000000004',
 'S-009', 'Hesai JT128',
 '{"x":-0.4473,"y":51.4713,"z":5.0}'::jsonb,
 360, 50, 'OFFLINE', NOW() - INTERVAL '2 hours'),

-- Departure Lounge C: 1 sensor
('d0000000-0000-4000-8000-000000000010',
 'c0000000-0000-4000-8000-000000000005',
 'S-010', 'Hesai JT128',
 '{"x":-0.4465,"y":51.4712,"z":3.5}'::jsonb,
 360, 50, 'ONLINE', NOW() - INTERVAL '8 seconds');

------------------------------------------------------------
-- 5. Demo Operators (password: soterion123)
------------------------------------------------------------
INSERT INTO operators (id, airport_id, name, email, password_hash, role, team) VALUES
('e0000000-0000-4000-8000-000000000001',
 'a0000000-0000-4000-8000-000000000001',
 'Amara O.', 'amara.o@soterion.io',
 '$2b$12$fONOquHEM99rwP4Hb50ujemOcSpkK0vI4arS/TrdUMNz2WPFumBWm',
 'operator', 'Alpha'),

('e0000000-0000-4000-8000-000000000002',
 'a0000000-0000-4000-8000-000000000001',
 'James W.', 'james.w@soterion.io',
 '$2b$12$fONOquHEM99rwP4Hb50ujemOcSpkK0vI4arS/TrdUMNz2WPFumBWm',
 'operator', 'Bravo'),

('e0000000-0000-4000-8000-000000000003',
 'a0000000-0000-4000-8000-000000000001',
 'Priya S.', 'priya.s@soterion.io',
 '$2b$12$fONOquHEM99rwP4Hb50ujemOcSpkK0vI4arS/TrdUMNz2WPFumBWm',
 'supervisor', 'Alpha'),

('e0000000-0000-4000-8000-000000000004',
 'a0000000-0000-4000-8000-000000000001',
 'Chen L.', 'chen.l@soterion.io',
 '$2b$12$fONOquHEM99rwP4Hb50ujemOcSpkK0vI4arS/TrdUMNz2WPFumBWm',
 'operator', 'Charlie'),

('e0000000-0000-4000-8000-000000000005',
 'a0000000-0000-4000-8000-000000000001',
 'Admin User', 'admin@soterion.io',
 '$2b$12$fONOquHEM99rwP4Hb50ujemOcSpkK0vI4arS/TrdUMNz2WPFumBWm',
 'admin', NULL);

------------------------------------------------------------
-- 6. Badge Definitions
------------------------------------------------------------
INSERT INTO badge_definitions (id, key, name, description, icon, category) VALUES
(uuid_generate_v4(), 'FIRST_DETECT',
 'First Detect', 'Acknowledged your first anomaly event', 'shield-check', 'milestone'),
(uuid_generate_v4(), 'SEVEN_DAY_STREAK',
 'Seven-Day Streak', 'Maintained a 7-day scoring streak', 'fire', 'streak'),
(uuid_generate_v4(), 'FAST_RESPONDER',
 'Fast Responder', 'Acknowledged an event within 30 seconds', 'zap', 'performance'),
(uuid_generate_v4(), 'ZERO_FALSE_POSITIVES',
 'Zero False Positives', 'Completed a shift with zero false positive escalations', 'target', 'accuracy'),
(uuid_generate_v4(), 'IRON_GRID',
 'Iron Grid', 'All sensors in your zones stayed ONLINE for an entire shift', 'cpu', 'uptime'),
(uuid_generate_v4(), 'TOP_OF_WEEK',
 'Top of the Week', 'Highest composite score for the week', 'trophy', 'leaderboard'),
(uuid_generate_v4(), 'ALL_CLEAR',
 'All Clear', 'Zero unresolved anomalies at end of shift', 'check-circle', 'performance'),
(uuid_generate_v4(), 'THIRTY_DAY_SLA',
 '30-Day SLA Champion', 'Met queue SLA targets for 30 consecutive days', 'award', 'streak');

------------------------------------------------------------
-- 7. Active Missions for LHR
------------------------------------------------------------
INSERT INTO missions (id, airport_id, title, description, metric_key, target_value, reward_type, reward_value, resets_at, active) VALUES
(uuid_generate_v4(),
 'a0000000-0000-4000-8000-000000000001',
 'Speed Demon', 'Acknowledge 20 anomaly events within 60 seconds each',
 'fast_ack_count', 20, 'bonus_points', 500,
 NOW() + INTERVAL '7 days', TRUE),

(uuid_generate_v4(),
 'a0000000-0000-4000-8000-000000000001',
 'Queue Buster', 'Keep Security Checkpoint A wait time under 8 minutes for 24 hours',
 'queue_wait_time', 8, 'badge', 1,
 NOW() + INTERVAL '1 day', TRUE),

(uuid_generate_v4(),
 'a0000000-0000-4000-8000-000000000001',
 'Sensor Shepherd', 'Restore all DEGRADED or OFFLINE sensors in your zones within a shift',
 'sensor_restore_count', 5, 'bonus_points', 300,
 NOW() + INTERVAL '12 hours', TRUE);

------------------------------------------------------------
-- 8. Zone Type Definitions (5 verticals)
------------------------------------------------------------

-- AIRPORT
INSERT INTO zone_type_definitions (id, facility_type, key, label, default_sla) VALUES
(uuid_generate_v4(), 'AIRPORT', 'security',   'Security Checkpoint',  '{"wait_mins": 10}'),
(uuid_generate_v4(), 'AIRPORT', 'gate',        'Gate Area',            '{"wait_mins": 15}'),
(uuid_generate_v4(), 'AIRPORT', 'baggage',     'Baggage Claim',        '{"wait_mins": 20}'),
(uuid_generate_v4(), 'AIRPORT', 'curb',        'Curbside',             '{"wait_mins": 15}'),
(uuid_generate_v4(), 'AIRPORT', 'lounge',      'Lounge',               '{"wait_mins": 15}'),
(uuid_generate_v4(), 'AIRPORT', 'retail',      'Retail / Concession',  '{"wait_mins": 30}'),
(uuid_generate_v4(), 'AIRPORT', 'restricted',  'Restricted Area',      '{"wait_mins": 5}');

-- SEAPORT
INSERT INTO zone_type_definitions (id, facility_type, key, label, default_sla) VALUES
(uuid_generate_v4(), 'SEAPORT', 'berth',       'Berth',                '{"wait_mins": 30}'),
(uuid_generate_v4(), 'SEAPORT', 'yard',        'Container Yard',       '{"wait_mins": 20}'),
(uuid_generate_v4(), 'SEAPORT', 'gate',        'Gate / Entry',         '{"wait_mins": 10}'),
(uuid_generate_v4(), 'SEAPORT', 'warehouse',   'Warehouse',            '{"wait_mins": 25}'),
(uuid_generate_v4(), 'SEAPORT', 'restricted',  'Restricted Perimeter', '{"wait_mins": 5}');

-- STADIUM
INSERT INTO zone_type_definitions (id, facility_type, key, label, default_sla) VALUES
(uuid_generate_v4(), 'STADIUM', 'entrance',    'Entrance Gate',        '{"wait_mins": 8}'),
(uuid_generate_v4(), 'STADIUM', 'concourse',   'Concourse',            '{"wait_mins": 15}'),
(uuid_generate_v4(), 'STADIUM', 'seating',     'Seating Bowl',         '{"wait_mins": 20}'),
(uuid_generate_v4(), 'STADIUM', 'concession',  'Concession Stand',     '{"wait_mins": 10}'),
(uuid_generate_v4(), 'STADIUM', 'parking',     'Parking Area',         '{"wait_mins": 15}');

-- HOSPITAL
INSERT INTO zone_type_definitions (id, facility_type, key, label, default_sla) VALUES
(uuid_generate_v4(), 'HOSPITAL', 'er',          'Emergency Room',       '{"wait_mins": 5}'),
(uuid_generate_v4(), 'HOSPITAL', 'lobby',       'Main Lobby',           '{"wait_mins": 10}'),
(uuid_generate_v4(), 'HOSPITAL', 'ward',        'Patient Ward',         '{"wait_mins": 15}'),
(uuid_generate_v4(), 'HOSPITAL', 'pharmacy',    'Pharmacy',             '{"wait_mins": 12}'),
(uuid_generate_v4(), 'HOSPITAL', 'restricted',  'Restricted / OR',      '{"wait_mins": 3}');

-- TRANSIT_HUB
INSERT INTO zone_type_definitions (id, facility_type, key, label, default_sla) VALUES
(uuid_generate_v4(), 'TRANSIT_HUB', 'platform',    'Platform',            '{"wait_mins": 5}'),
(uuid_generate_v4(), 'TRANSIT_HUB', 'concourse',   'Main Concourse',      '{"wait_mins": 10}'),
(uuid_generate_v4(), 'TRANSIT_HUB', 'ticketing',   'Ticketing Hall',      '{"wait_mins": 8}'),
(uuid_generate_v4(), 'TRANSIT_HUB', 'entrance',    'Station Entrance',    '{"wait_mins": 10}'),
(uuid_generate_v4(), 'TRANSIT_HUB', 'parking',     'Parking / Drop-off',  '{"wait_mins": 15}');

------------------------------------------------------------
-- 9. KPI Definitions for AIRPORT vertical
------------------------------------------------------------
INSERT INTO kpi_definitions (id, facility_type, key, label, unit, direction, default_target) VALUES
(uuid_generate_v4(), 'AIRPORT', 'queue_wait_time',
 'Queue Wait Time', 'minutes', 'lower_better', 10),
(uuid_generate_v4(), 'AIRPORT', 'throughput_per_hr',
 'Throughput per Hour', 'passengers/hr', 'higher_better', 300),
(uuid_generate_v4(), 'AIRPORT', 'security_response_time',
 'Security Response Time', 'seconds', 'lower_better', 60),
(uuid_generate_v4(), 'AIRPORT', 'false_positive_rate',
 'False Positive Rate', 'percent', 'lower_better', 5),
(uuid_generate_v4(), 'AIRPORT', 'sensor_uptime',
 'Sensor Uptime', 'percent', 'higher_better', 99.5);

------------------------------------------------------------
-- 10. Compliance Frameworks for AIRPORT vertical
------------------------------------------------------------
INSERT INTO compliance_frameworks (id, facility_type, framework_key, label, rules) VALUES
(uuid_generate_v4(), 'AIRPORT', 'TSA',
 'TSA Security Directives',
 '[
    {"rule": "SD-1580/82-2022-01", "description": "Cybersecurity requirements for airport operators"},
    {"rule": "SD-1542-04-08G", "description": "Checked baggage screening procedures"},
    {"rule": "SD-1544-09-06", "description": "Passenger screening using advanced imaging technology"}
  ]'::jsonb),

(uuid_generate_v4(), 'AIRPORT', 'ICAO_ANNEX_17',
 'ICAO Annex 17 — Aviation Security',
 '[
    {"rule": "4.2", "description": "Measures relating to access control"},
    {"rule": "4.3", "description": "Measures relating to aircraft security"},
    {"rule": "4.5", "description": "Measures relating to screening of passengers and cabin baggage"}
  ]'::jsonb),

(uuid_generate_v4(), 'AIRPORT', 'GDPR',
 'General Data Protection Regulation',
 '[
    {"rule": "Art. 5", "description": "Principles relating to processing of personal data"},
    {"rule": "Art. 6", "description": "Lawfulness of processing"},
    {"rule": "Art. 35", "description": "Data protection impact assessment for video/LiDAR surveillance"}
  ]'::jsonb);

------------------------------------------------------------
-- 11. Demo Facility (Heathrow as AIRPORT)
------------------------------------------------------------
INSERT INTO facilities (id, name, type, short_code, address, country_code, timezone, config)
VALUES (
    'f0000000-0000-4000-8000-000000000001',
    'London Heathrow Airport',
    'AIRPORT',
    'LHR',
    'Longford TW6, United Kingdom',
    'GB',
    'Europe/London',
    '{
        "runways": 2,
        "terminals": 4,
        "annual_passengers": 80000000,
        "iata_code": "LHR"
    }'::jsonb
);

------------------------------------------------------------
-- 12. Anomaly Events (threat feed, last 8 hours)
------------------------------------------------------------
INSERT INTO anomaly_events (id, airport_id, zone_id, type, severity, confidence, track_ids, snapshot_s3, acknowledged, acknowledged_by, acknowledged_at, escalated, resolved_at, created_at) VALUES
-- CRITICAL: unacknowledged intrusion in restricted-adjacent zone (most recent)
('ae000000-0000-4000-8000-000000000001',
 'a0000000-0000-4000-8000-000000000001',
 'c0000000-0000-4000-8000-000000000001',
 'INTRUSION', 5, 0.96,
 ARRAY['11111111-aaaa-4000-8000-000000000001'::uuid, '11111111-aaaa-4000-8000-000000000002'::uuid],
 NULL, FALSE, NULL, NULL, FALSE, NULL,
 NOW() - INTERVAL '12 minutes'),

-- CRITICAL: crowd surge at security checkpoint, acknowledged by Priya
('ae000000-0000-4000-8000-000000000002',
 'a0000000-0000-4000-8000-000000000001',
 'c0000000-0000-4000-8000-000000000001',
 'CROWD_SURGE', 5, 0.92,
 ARRAY['11111111-aaaa-4000-8000-000000000003'::uuid, '11111111-aaaa-4000-8000-000000000004'::uuid, '11111111-aaaa-4000-8000-000000000005'::uuid],
 NULL, TRUE, 'e0000000-0000-4000-8000-000000000003', NOW() - INTERVAL '55 minutes', FALSE, NULL,
 NOW() - INTERVAL '1 hour'),

-- HIGH: loitering near gates, acknowledged by Amara
('ae000000-0000-4000-8000-000000000003',
 'a0000000-0000-4000-8000-000000000001',
 'c0000000-0000-4000-8000-000000000002',
 'LOITERING', 4, 0.87,
 ARRAY['11111111-aaaa-4000-8000-000000000006'::uuid],
 NULL, TRUE, 'e0000000-0000-4000-8000-000000000001', NOW() - INTERVAL '1 hour 50 minutes', FALSE, NULL,
 NOW() - INTERVAL '2 hours'),

-- HIGH: abandoned object in baggage claim, unacknowledged
('ae000000-0000-4000-8000-000000000004',
 'a0000000-0000-4000-8000-000000000001',
 'c0000000-0000-4000-8000-000000000003',
 'ABANDONED_OBJECT', 4, 0.83,
 ARRAY['11111111-aaaa-4000-8000-000000000007'::uuid],
 NULL, FALSE, NULL, NULL, FALSE, NULL,
 NOW() - INTERVAL '25 minutes'),

-- HIGH: perimeter breach at arrivals curb, escalated and resolved
('ae000000-0000-4000-8000-000000000005',
 'a0000000-0000-4000-8000-000000000001',
 'c0000000-0000-4000-8000-000000000004',
 'PERIMETER_BREACH', 4, 0.91,
 ARRAY['11111111-aaaa-4000-8000-000000000008'::uuid, '11111111-aaaa-4000-8000-000000000009'::uuid],
 NULL, TRUE, 'e0000000-0000-4000-8000-000000000003', NOW() - INTERVAL '3 hours 10 minutes', TRUE, NOW() - INTERVAL '2 hours 45 minutes',
 NOW() - INTERVAL '3 hours 15 minutes'),

-- MEDIUM: loitering in departure lounge
('ae000000-0000-4000-8000-000000000006',
 'a0000000-0000-4000-8000-000000000001',
 'c0000000-0000-4000-8000-000000000005',
 'LOITERING', 3, 0.72,
 ARRAY['11111111-aaaa-4000-8000-000000000010'::uuid],
 NULL, TRUE, 'e0000000-0000-4000-8000-000000000002', NOW() - INTERVAL '4 hours 5 minutes', FALSE, NOW() - INTERVAL '3 hours 30 minutes',
 NOW() - INTERVAL '4 hours 10 minutes'),

-- MEDIUM: crowd surge at gates
('ae000000-0000-4000-8000-000000000007',
 'a0000000-0000-4000-8000-000000000001',
 'c0000000-0000-4000-8000-000000000002',
 'CROWD_SURGE', 3, 0.68,
 ARRAY['11111111-aaaa-4000-8000-000000000011'::uuid, '11111111-aaaa-4000-8000-000000000012'::uuid],
 NULL, TRUE, 'e0000000-0000-4000-8000-000000000001', NOW() - INTERVAL '5 hours 25 minutes', FALSE, NOW() - INTERVAL '5 hours',
 NOW() - INTERVAL '5 hours 30 minutes'),

-- MEDIUM: drone detected near arrivals curb
('ae000000-0000-4000-8000-000000000008',
 'a0000000-0000-4000-8000-000000000001',
 'c0000000-0000-4000-8000-000000000004',
 'DRONE_DETECTED', 3, 0.78,
 NULL, NULL, TRUE, 'e0000000-0000-4000-8000-000000000001', NOW() - INTERVAL '5 hours 55 minutes', TRUE, NOW() - INTERVAL '5 hours 20 minutes',
 NOW() - INTERVAL '6 hours'),

-- LOW: brief loitering at baggage claim, resolved
('ae000000-0000-4000-8000-000000000009',
 'a0000000-0000-4000-8000-000000000001',
 'c0000000-0000-4000-8000-000000000003',
 'LOITERING', 2, 0.55,
 ARRAY['11111111-aaaa-4000-8000-000000000013'::uuid],
 NULL, TRUE, 'e0000000-0000-4000-8000-000000000004', NOW() - INTERVAL '6 hours 55 minutes', FALSE, NOW() - INTERVAL '6 hours 30 minutes',
 NOW() - INTERVAL '7 hours'),

-- LOW: abandoned object at security (false positive), resolved
('ae000000-0000-4000-8000-000000000010',
 'a0000000-0000-4000-8000-000000000001',
 'c0000000-0000-4000-8000-000000000001',
 'ABANDONED_OBJECT', 1, 0.42,
 ARRAY['11111111-aaaa-4000-8000-000000000014'::uuid],
 NULL, TRUE, 'e0000000-0000-4000-8000-000000000002', NOW() - INTERVAL '7 hours 25 minutes', FALSE, NOW() - INTERVAL '7 hours',
 NOW() - INTERVAL '7 hours 30 minutes');

------------------------------------------------------------
-- 13. Shift Scores (last 3 days, 5 operators)
------------------------------------------------------------
INSERT INTO shift_scores (operator_id, airport_id, shift_date, shift_start, shift_end, total_score, security_score, flow_score, response_score, compliance_score, uptime_score, streak_multiplier) VALUES
-- Amara O. — top performer, 5-day streak
('e0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
 CURRENT_DATE, NOW() - INTERVAL '6 hours', NOW(),
 920, 900, 920, 950, 880, 980, 1.25),
('e0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
 CURRENT_DATE - 1, NOW() - INTERVAL '30 hours', NOW() - INTERVAL '22 hours',
 885, 870, 900, 910, 860, 950, 1.20),
('e0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
 CURRENT_DATE - 2, NOW() - INTERVAL '54 hours', NOW() - INTERVAL '46 hours',
 890, 880, 910, 920, 850, 940, 1.15),

-- James W. — mid-tier, no streak
('e0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001',
 CURRENT_DATE, NOW() - INTERVAL '6 hours', NOW(),
 780, 750, 800, 820, 720, 810, 1.0),
('e0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001',
 CURRENT_DATE - 1, NOW() - INTERVAL '30 hours', NOW() - INTERVAL '22 hours',
 765, 740, 790, 800, 710, 790, 1.0),
('e0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001',
 CURRENT_DATE - 2, NOW() - INTERVAL '54 hours', NOW() - INTERVAL '46 hours',
 750, 720, 770, 780, 700, 780, 1.0),

-- Priya S. — strong supervisor, 3-day streak
('e0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001',
 CURRENT_DATE, NOW() - INTERVAL '6 hours', NOW(),
 855, 840, 870, 880, 830, 900, 1.15),
('e0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001',
 CURRENT_DATE - 1, NOW() - INTERVAL '30 hours', NOW() - INTERVAL '22 hours',
 840, 820, 860, 870, 810, 890, 1.10),
('e0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001',
 CURRENT_DATE - 2, NOW() - INTERVAL '54 hours', NOW() - INTERVAL '46 hours',
 820, 800, 840, 850, 800, 870, 1.05),

-- Chen L. — newer operator, improving
('e0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001',
 CURRENT_DATE, NOW() - INTERVAL '6 hours', NOW(),
 710, 680, 720, 740, 690, 750, 1.0),
('e0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001',
 CURRENT_DATE - 1, NOW() - INTERVAL '30 hours', NOW() - INTERVAL '22 hours',
 680, 650, 700, 710, 660, 730, 1.0),
('e0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001',
 CURRENT_DATE - 2, NOW() - INTERVAL '54 hours', NOW() - INTERVAL '46 hours',
 620, 600, 640, 660, 610, 700, 1.0),

-- Admin — moderate, consistent
('e0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000001',
 CURRENT_DATE, NOW() - INTERVAL '6 hours', NOW(),
 820, 810, 830, 840, 800, 860, 1.05),
('e0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000001',
 CURRENT_DATE - 1, NOW() - INTERVAL '30 hours', NOW() - INTERVAL '22 hours',
 810, 800, 820, 830, 790, 850, 1.0);

------------------------------------------------------------
-- 14. Operator Badges (earned)
------------------------------------------------------------
-- We need badge IDs. Since badge_definitions uses uuid_generate_v4(),
-- we reference them by key via subquery.
INSERT INTO operator_badges (operator_id, badge_id, earned_at) VALUES
-- Amara O. (5 badges — top performer)
('e0000000-0000-4000-8000-000000000001', (SELECT id FROM badge_definitions WHERE key = 'FIRST_DETECT'), NOW() - INTERVAL '14 days'),
('e0000000-0000-4000-8000-000000000001', (SELECT id FROM badge_definitions WHERE key = 'FAST_RESPONDER'), NOW() - INTERVAL '10 days'),
('e0000000-0000-4000-8000-000000000001', (SELECT id FROM badge_definitions WHERE key = 'SEVEN_DAY_STREAK'), NOW() - INTERVAL '5 days'),
('e0000000-0000-4000-8000-000000000001', (SELECT id FROM badge_definitions WHERE key = 'TOP_OF_WEEK'), NOW() - INTERVAL '3 days'),
('e0000000-0000-4000-8000-000000000001', (SELECT id FROM badge_definitions WHERE key = 'ALL_CLEAR'), NOW() - INTERVAL '1 day'),

-- James W. (2 badges)
('e0000000-0000-4000-8000-000000000002', (SELECT id FROM badge_definitions WHERE key = 'FIRST_DETECT'), NOW() - INTERVAL '12 days'),
('e0000000-0000-4000-8000-000000000002', (SELECT id FROM badge_definitions WHERE key = 'ALL_CLEAR'), NOW() - INTERVAL '4 days'),

-- Priya S. (4 badges — strong supervisor)
('e0000000-0000-4000-8000-000000000003', (SELECT id FROM badge_definitions WHERE key = 'FIRST_DETECT'), NOW() - INTERVAL '13 days'),
('e0000000-0000-4000-8000-000000000003', (SELECT id FROM badge_definitions WHERE key = 'FAST_RESPONDER'), NOW() - INTERVAL '8 days'),
('e0000000-0000-4000-8000-000000000003', (SELECT id FROM badge_definitions WHERE key = 'IRON_GRID'), NOW() - INTERVAL '6 days'),
('e0000000-0000-4000-8000-000000000003', (SELECT id FROM badge_definitions WHERE key = 'THIRTY_DAY_SLA'), NOW() - INTERVAL '2 days'),

-- Chen L. (1 badge — new operator)
('e0000000-0000-4000-8000-000000000004', (SELECT id FROM badge_definitions WHERE key = 'FIRST_DETECT'), NOW() - INTERVAL '7 days'),

-- Admin (2 badges)
('e0000000-0000-4000-8000-000000000005', (SELECT id FROM badge_definitions WHERE key = 'FIRST_DETECT'), NOW() - INTERVAL '15 days'),
('e0000000-0000-4000-8000-000000000005', (SELECT id FROM badge_definitions WHERE key = 'IRON_GRID'), NOW() - INTERVAL '9 days');

------------------------------------------------------------
-- 15. Mission Progress
------------------------------------------------------------
INSERT INTO mission_progress (operator_id, mission_id, progress, completed, completed_at, updated_at) VALUES
-- Speed Demon (target: 20 fast acks)
('e0000000-0000-4000-8000-000000000001', (SELECT id FROM missions WHERE title = 'Speed Demon'), 18, FALSE, NULL, NOW() - INTERVAL '30 minutes'),
('e0000000-0000-4000-8000-000000000002', (SELECT id FROM missions WHERE title = 'Speed Demon'), 8, FALSE, NULL, NOW() - INTERVAL '2 hours'),
('e0000000-0000-4000-8000-000000000003', (SELECT id FROM missions WHERE title = 'Speed Demon'), 12, FALSE, NULL, NOW() - INTERVAL '1 hour'),
('e0000000-0000-4000-8000-000000000004', (SELECT id FROM missions WHERE title = 'Speed Demon'), 3, FALSE, NULL, NOW() - INTERVAL '3 hours'),

-- Queue Buster (target: keep wait < 8 min for 24h, progress = fraction of day met)
('e0000000-0000-4000-8000-000000000001', (SELECT id FROM missions WHERE title = 'Queue Buster'), 0.92, FALSE, NULL, NOW() - INTERVAL '15 minutes'),
('e0000000-0000-4000-8000-000000000003', (SELECT id FROM missions WHERE title = 'Queue Buster'), 0.78, FALSE, NULL, NOW() - INTERVAL '45 minutes'),

-- Sensor Shepherd (target: restore 5 sensors)
('e0000000-0000-4000-8000-000000000001', (SELECT id FROM missions WHERE title = 'Sensor Shepherd'), 5, TRUE, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours'),
('e0000000-0000-4000-8000-000000000003', (SELECT id FROM missions WHERE title = 'Sensor Shepherd'), 3, FALSE, NULL, NOW() - INTERVAL '1 hour 30 minutes'),
('e0000000-0000-4000-8000-000000000002', (SELECT id FROM missions WHERE title = 'Sensor Shepherd'), 1, FALSE, NULL, NOW() - INTERVAL '4 hours');

------------------------------------------------------------
-- 16. Zone Density (last 2 hours, every 5 min per zone)
------------------------------------------------------------
INSERT INTO zone_density (time, zone_id, count, density_pct, avg_dwell_secs)
SELECT
  ts,
  z.id,
  CASE z.name
    WHEN 'Security Checkpoint A' THEN 25 + (15 * sin(EXTRACT(EPOCH FROM ts) / 600))::int + (random() * 8)::int
    WHEN 'Terminal B Gates'      THEN 35 + (10 * sin(EXTRACT(EPOCH FROM ts) / 900))::int + (random() * 6)::int
    WHEN 'Baggage Claim Hall'    THEN 18 + (12 * sin(EXTRACT(EPOCH FROM ts) / 700))::int + (random() * 5)::int
    WHEN 'Arrivals Curb'         THEN 12 + (8  * sin(EXTRACT(EPOCH FROM ts) / 500))::int + (random() * 4)::int
    WHEN 'Departure Lounge C'    THEN 40 + (20 * sin(EXTRACT(EPOCH FROM ts) / 1200))::int + (random() * 7)::int
  END,
  CASE z.name
    WHEN 'Security Checkpoint A' THEN 55 + (20 * sin(EXTRACT(EPOCH FROM ts) / 600))::numeric + (random() * 10)::numeric
    WHEN 'Terminal B Gates'      THEN 45 + (15 * sin(EXTRACT(EPOCH FROM ts) / 900))::numeric + (random() * 8)::numeric
    WHEN 'Baggage Claim Hall'    THEN 38 + (18 * sin(EXTRACT(EPOCH FROM ts) / 700))::numeric + (random() * 7)::numeric
    WHEN 'Arrivals Curb'         THEN 30 + (20 * sin(EXTRACT(EPOCH FROM ts) / 500))::numeric + (random() * 6)::numeric
    WHEN 'Departure Lounge C'    THEN 35 + (25 * sin(EXTRACT(EPOCH FROM ts) / 1200))::numeric + (random() * 9)::numeric
  END,
  CASE z.name
    WHEN 'Security Checkpoint A' THEN 140 + (random() * 60)::numeric
    WHEN 'Terminal B Gates'      THEN 420 + (random() * 180)::numeric
    WHEN 'Baggage Claim Hall'    THEN 200 + (random() * 80)::numeric
    WHEN 'Arrivals Curb'         THEN 70  + (random() * 50)::numeric
    WHEN 'Departure Lounge C'    THEN 1800 + (random() * 1200)::numeric
  END
FROM zones z
CROSS JOIN generate_series(NOW() - INTERVAL '2 hours', NOW(), INTERVAL '5 minutes') AS ts;

------------------------------------------------------------
-- 17. Queue Metrics (last 4 hours, every 5 min per zone)
------------------------------------------------------------
INSERT INTO queue_metrics (time, zone_id, queue_depth, wait_time_mins, throughput_per_hr, sla_met)
SELECT
  ts,
  z.id,
  CASE z.name
    WHEN 'Security Checkpoint A' THEN 20 + (15 * sin(EXTRACT(EPOCH FROM ts) / 600))::int + (random() * 10)::int
    WHEN 'Terminal B Gates'      THEN 8  + (5  * sin(EXTRACT(EPOCH FROM ts) / 900))::int + (random() * 4)::int
    WHEN 'Baggage Claim Hall'    THEN 30 + (20 * sin(EXTRACT(EPOCH FROM ts) / 700))::int + (random() * 8)::int
    WHEN 'Arrivals Curb'         THEN 15 + (10 * sin(EXTRACT(EPOCH FROM ts) / 500))::int + (random() * 5)::int
    WHEN 'Departure Lounge C'    THEN 60 + (30 * sin(EXTRACT(EPOCH FROM ts) / 1200))::int + (random() * 10)::int
  END,
  CASE z.name
    WHEN 'Security Checkpoint A' THEN 6.5 + (4.5 * sin(EXTRACT(EPOCH FROM ts) / 600))::numeric + (random() * 2)::numeric
    WHEN 'Terminal B Gates'      THEN 4   + (3   * sin(EXTRACT(EPOCH FROM ts) / 900))::numeric + (random() * 1.5)::numeric
    WHEN 'Baggage Claim Hall'    THEN 10  + (8   * sin(EXTRACT(EPOCH FROM ts) / 700))::numeric + (random() * 3)::numeric
    WHEN 'Arrivals Curb'         THEN 5   + (5   * sin(EXTRACT(EPOCH FROM ts) / 500))::numeric + (random() * 2)::numeric
    WHEN 'Departure Lounge C'    THEN 3   + (2   * sin(EXTRACT(EPOCH FROM ts) / 1200))::numeric + (random() * 1)::numeric
  END,
  CASE z.name
    WHEN 'Security Checkpoint A' THEN 180 + (40 * sin(EXTRACT(EPOCH FROM ts) / 600))::int + (random() * 20)::int
    WHEN 'Terminal B Gates'      THEN 140 + (30 * sin(EXTRACT(EPOCH FROM ts) / 900))::int + (random() * 15)::int
    WHEN 'Baggage Claim Hall'    THEN 200 + (40 * sin(EXTRACT(EPOCH FROM ts) / 700))::int + (random() * 25)::int
    WHEN 'Arrivals Curb'         THEN 120 + (30 * sin(EXTRACT(EPOCH FROM ts) / 500))::int + (random() * 15)::int
    WHEN 'Departure Lounge C'    THEN 100 + (20 * sin(EXTRACT(EPOCH FROM ts) / 1200))::int + (random() * 10)::int
  END,
  CASE z.name
    WHEN 'Security Checkpoint A' THEN (6.5 + (4.5 * sin(EXTRACT(EPOCH FROM ts) / 600))::numeric + (random() * 2)::numeric) < z.sla_wait_mins
    WHEN 'Terminal B Gates'      THEN (4   + (3   * sin(EXTRACT(EPOCH FROM ts) / 900))::numeric + (random() * 1.5)::numeric) < z.sla_wait_mins
    WHEN 'Baggage Claim Hall'    THEN (10  + (8   * sin(EXTRACT(EPOCH FROM ts) / 700))::numeric + (random() * 3)::numeric) < z.sla_wait_mins
    WHEN 'Arrivals Curb'         THEN (5   + (5   * sin(EXTRACT(EPOCH FROM ts) / 500))::numeric + (random() * 2)::numeric) < z.sla_wait_mins
    WHEN 'Departure Lounge C'    THEN TRUE
  END
FROM zones z
CROSS JOIN generate_series(NOW() - INTERVAL '4 hours', NOW(), INTERVAL '5 minutes') AS ts;

------------------------------------------------------------
-- 18. Track Objects (last 30 min, realistic movement data)
------------------------------------------------------------
INSERT INTO track_objects (time, track_id, sensor_id, zone_id, centroid, velocity_ms, classification, behavior_score, dwell_secs)
SELECT
  ts + (random() * INTERVAL '4 minutes'),
  uuid_generate_v4(),
  s.id,
  s.zone_id,
  json_build_object(
    'x', -0.4500 + (random() * 0.005),
    'y', 51.4710 + (random() * 0.0005),
    'z', 0.8 + (random() * 0.5)
  )::jsonb,
  CASE WHEN random() < 0.7 THEN 1.2 + (random() * 0.5)   -- walking
       WHEN random() < 0.9 THEN 0.0 + (random() * 0.3)    -- stationary
       ELSE 1.8 + (random() * 1.0)                          -- fast
  END,
  CASE WHEN random() < 0.92 THEN 'PERSON'
       WHEN random() < 0.96 THEN 'OBJECT'
       ELSE 'UNKNOWN'
  END,
  CASE WHEN random() < 0.80 THEN (10 + (random() * 25))::int    -- normal
       WHEN random() < 0.95 THEN (40 + (random() * 30))::int    -- elevated
       ELSE (75 + (random() * 25))::int                           -- suspicious
  END,
  (5 + (random() * 300))::numeric
FROM sensor_nodes s
CROSS JOIN generate_series(NOW() - INTERVAL '30 minutes', NOW(), INTERVAL '1 minute') AS ts;

------------------------------------------------------------
-- 19. Retention Policies
------------------------------------------------------------
INSERT INTO retention_policies (facility_id, data_type, retention_days, legal_basis, auto_purge, last_purged_at) VALUES
('f0000000-0000-4000-8000-000000000001', 'track_objects', 30, 'GDPR Art. 5(1)(e) — storage limitation', TRUE, NOW() - INTERVAL '3 days'),
('f0000000-0000-4000-8000-000000000001', 'zone_density', 90, 'GDPR Art. 6(1)(b) — contract performance', TRUE, NOW() - INTERVAL '3 days'),
('f0000000-0000-4000-8000-000000000001', 'queue_metrics', 90, 'GDPR Art. 6(1)(b) — contract performance', TRUE, NOW() - INTERVAL '3 days'),
('f0000000-0000-4000-8000-000000000001', 'anomaly_events', 365, 'GDPR Art. 6(1)(c) — legal obligation (aviation security)', TRUE, NOW() - INTERVAL '7 days'),
('f0000000-0000-4000-8000-000000000001', 'audit_log', 1095, 'FedRAMP AU-11 — 3 year retention', TRUE, NOW() - INTERVAL '7 days'),
('f0000000-0000-4000-8000-000000000001', 'operator_sessions', 30, 'GDPR Art. 5(1)(e) — storage limitation', TRUE, NOW() - INTERVAL '1 day'),
('f0000000-0000-4000-8000-000000000001', 'vulnerability_findings', 730, 'FedRAMP RA-5 — vulnerability management', FALSE, NULL);

------------------------------------------------------------
-- 20. Security Incidents
------------------------------------------------------------
INSERT INTO security_incidents (facility_id, title, severity, category, description, detected_at, reported_at, contained_at, resolved_at, root_cause, remediation, notified_parties, created_by) VALUES
-- Resolved CRITICAL
('f0000000-0000-4000-8000-000000000001',
 'SQL injection attempt on /api/v1/lidar/ingest',
 'CRITICAL', 'injection_attack',
 'Automated scanner detected parameterised SQL injection payloads in POST body targeting track_objects insert path. WAF blocked all attempts. No data exfiltration.',
 NOW() - INTERVAL '48 hours', NOW() - INTERVAL '47 hours 45 minutes', NOW() - INTERVAL '47 hours', NOW() - INTERVAL '36 hours',
 'Automated vulnerability scanner from external IP. All payloads blocked by Zod schema validation and parameterised queries.',
 'Blocked source IP at WAF. Added rate limiting on ingest endpoint. Filed CVE review.',
 ARRAY['CISO', 'Security Team', 'US-CERT'],
 'e0000000-0000-4000-8000-000000000005'),

-- In-progress HIGH
('f0000000-0000-4000-8000-000000000001',
 'Unauthorized API key usage from unknown IP range',
 'HIGH', 'unauthorised_access',
 'API key sk_live_3f8a was used from IP range 203.0.113.0/24 which is not in the facility allowlist. 47 requests over 12 minutes before rate limiter engaged.',
 NOW() - INTERVAL '18 hours', NOW() - INTERVAL '17 hours 50 minutes', NOW() - INTERVAL '16 hours', NULL,
 NULL, NULL,
 ARRAY['CISO', 'Security Team'],
 'e0000000-0000-4000-8000-000000000005'),

-- Open MEDIUM
('f0000000-0000-4000-8000-000000000001',
 'Database backup configuration drift detected',
 'MEDIUM', 'configuration',
 'Automated compliance check found backup retention reduced from 30 days to 7 days on standby replica. Does not meet FedRAMP CP-9 requirements.',
 NOW() - INTERVAL '6 hours', NOW() - INTERVAL '5 hours 30 minutes', NULL, NULL,
 NULL, NULL,
 ARRAY['Infrastructure Team'],
 'e0000000-0000-4000-8000-000000000003'),

-- Open MEDIUM
('f0000000-0000-4000-8000-000000000001',
 'TLS certificate approaching expiry on edge node cluster',
 'MEDIUM', 'certificate_management',
 'Certificate for edge-node-lhr-02.soterion.io expires in 14 days. Auto-renewal via cert-manager may be misconfigured.',
 NOW() - INTERVAL '4 hours', NULL, NULL, NULL,
 NULL, NULL, NULL,
 'e0000000-0000-4000-8000-000000000005'),

-- Open LOW
('f0000000-0000-4000-8000-000000000001',
 'Verbose error messages in staging API responses',
 'LOW', 'information_disclosure',
 'Staging environment returning full stack traces in 500 responses. Not a production issue but violates security baseline.',
 NOW() - INTERVAL '2 hours', NULL, NULL, NULL,
 NULL, NULL, NULL,
 'e0000000-0000-4000-8000-000000000003');

------------------------------------------------------------
-- 21. Vulnerability Findings
------------------------------------------------------------
INSERT INTO vulnerability_findings (source, severity, cve_id, title, description, affected_component, discovered_at, remediation_due, remediated_at, status, risk_acceptance_reason) VALUES
-- CRITICAL — overdue
('snyk', 'CRITICAL', 'CVE-2024-4067',
 'Prototype pollution in micromatch',
 'micromatch < 4.0.8 allows prototype pollution via crafted glob pattern, enabling remote code execution in server-side usage.',
 'micromatch@4.0.5', NOW() - INTERVAL '20 days', NOW() - INTERVAL '5 days', NULL, 'IN_PROGRESS', NULL),

-- HIGH — in progress
('penetration_test', 'HIGH', NULL,
 'Missing rate limiting on /api/v1/auth/refresh',
 'Refresh token endpoint accepts unlimited requests. Attacker with stolen refresh token could generate unlimited access tokens before revocation.',
 'apps/api/src/routes/auth.ts', NOW() - INTERVAL '10 days', NOW() + INTERVAL '20 days', NULL, 'IN_PROGRESS', NULL),

-- HIGH — open
('snyk', 'HIGH', 'CVE-2024-6531',
 'ReDoS in semver dependency',
 'semver < 7.5.4 vulnerable to regular expression denial of service when parsing crafted version strings.',
 'semver@7.5.2', NOW() - INTERVAL '8 days', NOW() + INTERVAL '22 days', NULL, 'OPEN', NULL),

-- MEDIUM — remediated
('internal_scan', 'MEDIUM', NULL,
 'HTTP security headers missing Permissions-Policy',
 'API responses missing Permissions-Policy header. Browser features not restricted per security baseline.',
 'apps/api/src/middleware/securityHeaders.ts', NOW() - INTERVAL '15 days', NOW() + INTERVAL '75 days', NOW() - INTERVAL '3 days', 'REMEDIATED', NULL),

-- MEDIUM — open
('snyk', 'MEDIUM', 'CVE-2024-5535',
 'Information disclosure in OpenSSL',
 'OpenSSL < 3.0.14 may expose memory contents via crafted TLS handshake. Applicable to Node.js built-in TLS.',
 'node:crypto (Node.js 20.11.0)', NOW() - INTERVAL '12 days', NOW() + INTERVAL '78 days', NULL, 'OPEN', NULL),

-- MEDIUM — open
('internal_scan', 'MEDIUM', NULL,
 'Database connection string logged at INFO level on startup',
 'Auto-migration log output includes partial connection string. Masked in production but not in staging log aggregator.',
 'apps/api/src/db/client.ts', NOW() - INTERVAL '5 days', NOW() + INTERVAL '85 days', NULL, 'OPEN', NULL),

-- LOW — remediated
('snyk', 'LOW', 'CVE-2024-4068',
 'Inefficient regular expression in braces',
 'braces < 3.0.3 vulnerable to ReDoS. Low impact due to server-side only usage with validated input.',
 'braces@3.0.2', NOW() - INTERVAL '25 days', NOW() + INTERVAL '65 days', NOW() - INTERVAL '10 days', 'REMEDIATED', NULL),

-- LOW — accepted risk
('penetration_test', 'LOW', NULL,
 'Server version disclosure in response headers',
 'Fastify returns X-Powered-By header disclosing framework version. Minor information disclosure.',
 'fastify@4.26.0', NOW() - INTERVAL '18 days', NOW() + INTERVAL '72 days', NULL, 'ACCEPTED',
 'Minimal risk. Fastify version is public knowledge. Removing header provides negligible security benefit.'),

-- INFORMATIONAL — false positive
('snyk', 'INFORMATIONAL', 'CVE-2024-0001',
 'Theoretical timing attack on bcrypt comparison',
 'bcrypt comparison not constant-time. In practice, bcrypt''s built-in salting makes timing attacks infeasible.',
 'bcrypt@5.1.1', NOW() - INTERVAL '30 days', NULL, NULL, 'FALSE_POSITIVE',
 'bcrypt comparison is inherently timing-safe due to salt-based hashing. No practical attack vector.');

------------------------------------------------------------
-- 22. RBAC: Roles, Permissions, Assignments
------------------------------------------------------------
-- Roles
INSERT INTO roles (id, facility_id, name, description, is_system) VALUES
('r0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001', 'operator', 'Standard security operator', TRUE),
('r0000000-0000-4000-8000-000000000002', 'f0000000-0000-4000-8000-000000000001', 'supervisor', 'Shift supervisor with escalation authority', TRUE),
('r0000000-0000-4000-8000-000000000003', 'f0000000-0000-4000-8000-000000000001', 'admin', 'Facility administrator', TRUE),
('r0000000-0000-4000-8000-000000000004', 'f0000000-0000-4000-8000-000000000001', 'platform_admin', 'Platform-wide administrator', TRUE);

-- Permissions
INSERT INTO permissions (id, resource, action, description) VALUES
('p0000000-0000-4000-8000-000000000001', 'alerts', 'read', 'View alerts and threat feed'),
('p0000000-0000-4000-8000-000000000002', 'alerts', 'acknowledge', 'Acknowledge alerts'),
('p0000000-0000-4000-8000-000000000003', 'alerts', 'escalate', 'Escalate alerts to supervisor'),
('p0000000-0000-4000-8000-000000000004', 'sensors', 'read', 'View sensor status'),
('p0000000-0000-4000-8000-000000000005', 'sensors', 'write', 'Update sensor configuration'),
('p0000000-0000-4000-8000-000000000006', 'zones', 'read', 'View zone data'),
('p0000000-0000-4000-8000-000000000007', 'leaderboard', 'read', 'View leaderboard'),
('p0000000-0000-4000-8000-000000000008', 'operators', 'read', 'View operator list'),
('p0000000-0000-4000-8000-000000000009', 'operators', 'write', 'Manage operators'),
('p0000000-0000-4000-8000-000000000010', 'admin', 'read', 'Access admin dashboard'),
('p0000000-0000-4000-8000-000000000011', 'admin', 'write', 'Modify admin settings'),
('p0000000-0000-4000-8000-000000000012', 'audit_log', 'read', 'View audit log'),
('p0000000-0000-4000-8000-000000000013', 'compliance', 'read', 'View compliance reports'),
('p0000000-0000-4000-8000-000000000014', 'compliance', 'write', 'Manage compliance settings');

-- Role-Permission assignments
-- Operator: alerts(read,ack,escalate), sensors(read), zones(read), leaderboard(read)
INSERT INTO role_permissions (role_id, permission_id) VALUES
('r0000000-0000-4000-8000-000000000001', 'p0000000-0000-4000-8000-000000000001'),
('r0000000-0000-4000-8000-000000000001', 'p0000000-0000-4000-8000-000000000002'),
('r0000000-0000-4000-8000-000000000001', 'p0000000-0000-4000-8000-000000000003'),
('r0000000-0000-4000-8000-000000000001', 'p0000000-0000-4000-8000-000000000004'),
('r0000000-0000-4000-8000-000000000001', 'p0000000-0000-4000-8000-000000000006'),
('r0000000-0000-4000-8000-000000000001', 'p0000000-0000-4000-8000-000000000007'),
-- Supervisor: everything operator has + operators(read), sensors(write)
('r0000000-0000-4000-8000-000000000002', 'p0000000-0000-4000-8000-000000000001'),
('r0000000-0000-4000-8000-000000000002', 'p0000000-0000-4000-8000-000000000002'),
('r0000000-0000-4000-8000-000000000002', 'p0000000-0000-4000-8000-000000000003'),
('r0000000-0000-4000-8000-000000000002', 'p0000000-0000-4000-8000-000000000004'),
('r0000000-0000-4000-8000-000000000002', 'p0000000-0000-4000-8000-000000000005'),
('r0000000-0000-4000-8000-000000000002', 'p0000000-0000-4000-8000-000000000006'),
('r0000000-0000-4000-8000-000000000002', 'p0000000-0000-4000-8000-000000000007'),
('r0000000-0000-4000-8000-000000000002', 'p0000000-0000-4000-8000-000000000008'),
-- Admin: everything + admin, audit, compliance
('r0000000-0000-4000-8000-000000000003', 'p0000000-0000-4000-8000-000000000001'),
('r0000000-0000-4000-8000-000000000003', 'p0000000-0000-4000-8000-000000000002'),
('r0000000-0000-4000-8000-000000000003', 'p0000000-0000-4000-8000-000000000003'),
('r0000000-0000-4000-8000-000000000003', 'p0000000-0000-4000-8000-000000000004'),
('r0000000-0000-4000-8000-000000000003', 'p0000000-0000-4000-8000-000000000005'),
('r0000000-0000-4000-8000-000000000003', 'p0000000-0000-4000-8000-000000000006'),
('r0000000-0000-4000-8000-000000000003', 'p0000000-0000-4000-8000-000000000007'),
('r0000000-0000-4000-8000-000000000003', 'p0000000-0000-4000-8000-000000000008'),
('r0000000-0000-4000-8000-000000000003', 'p0000000-0000-4000-8000-000000000009'),
('r0000000-0000-4000-8000-000000000003', 'p0000000-0000-4000-8000-000000000010'),
('r0000000-0000-4000-8000-000000000003', 'p0000000-0000-4000-8000-000000000011'),
('r0000000-0000-4000-8000-000000000003', 'p0000000-0000-4000-8000-000000000012'),
('r0000000-0000-4000-8000-000000000003', 'p0000000-0000-4000-8000-000000000013'),
-- Platform Admin: everything
('r0000000-0000-4000-8000-000000000004', 'p0000000-0000-4000-8000-000000000001'),
('r0000000-0000-4000-8000-000000000004', 'p0000000-0000-4000-8000-000000000002'),
('r0000000-0000-4000-8000-000000000004', 'p0000000-0000-4000-8000-000000000003'),
('r0000000-0000-4000-8000-000000000004', 'p0000000-0000-4000-8000-000000000004'),
('r0000000-0000-4000-8000-000000000004', 'p0000000-0000-4000-8000-000000000005'),
('r0000000-0000-4000-8000-000000000004', 'p0000000-0000-4000-8000-000000000006'),
('r0000000-0000-4000-8000-000000000004', 'p0000000-0000-4000-8000-000000000007'),
('r0000000-0000-4000-8000-000000000004', 'p0000000-0000-4000-8000-000000000008'),
('r0000000-0000-4000-8000-000000000004', 'p0000000-0000-4000-8000-000000000009'),
('r0000000-0000-4000-8000-000000000004', 'p0000000-0000-4000-8000-000000000010'),
('r0000000-0000-4000-8000-000000000004', 'p0000000-0000-4000-8000-000000000011'),
('r0000000-0000-4000-8000-000000000004', 'p0000000-0000-4000-8000-000000000012'),
('r0000000-0000-4000-8000-000000000004', 'p0000000-0000-4000-8000-000000000013'),
('r0000000-0000-4000-8000-000000000004', 'p0000000-0000-4000-8000-000000000014');

-- Operator-Role assignments
INSERT INTO operator_roles (operator_id, role_id, granted_by, granted_at) VALUES
('e0000000-0000-4000-8000-000000000001', 'r0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000005', NOW() - INTERVAL '30 days'),
('e0000000-0000-4000-8000-000000000002', 'r0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000005', NOW() - INTERVAL '28 days'),
('e0000000-0000-4000-8000-000000000003', 'r0000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000005', NOW() - INTERVAL '25 days'),
('e0000000-0000-4000-8000-000000000004', 'r0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000005', NOW() - INTERVAL '14 days'),
('e0000000-0000-4000-8000-000000000005', 'r0000000-0000-4000-8000-000000000004', NULL, NOW() - INTERVAL '60 days');

------------------------------------------------------------
-- 23. Audit Log (last 8 hours of activity)
-- NOTE: audit_log has rules preventing UPDATE/DELETE, but INSERT is allowed.
------------------------------------------------------------
INSERT INTO audit_log (event_time, actor_id, actor_email, actor_ip, actor_user_agent, facility_id, action, resource_type, resource_id, before_state, after_state, outcome, session_id, request_id) VALUES
-- Login events
(NOW() - INTERVAL '7 hours 55 minutes', 'e0000000-0000-4000-8000-000000000001', 'amara.o@soterion.io', '192.168.1.100', 'Mozilla/5.0 Chrome/122', 'f0000000-0000-4000-8000-000000000001', 'auth.login', 'operator', 'e0000000-0000-4000-8000-000000000001', NULL, '{"role":"operator"}', 'SUCCESS', NULL, uuid_generate_v4()),
(NOW() - INTERVAL '7 hours 50 minutes', 'e0000000-0000-4000-8000-000000000002', 'james.w@soterion.io', '192.168.1.101', 'Mozilla/5.0 Firefox/123', 'f0000000-0000-4000-8000-000000000001', 'auth.login', 'operator', 'e0000000-0000-4000-8000-000000000002', NULL, '{"role":"operator"}', 'SUCCESS', NULL, uuid_generate_v4()),
(NOW() - INTERVAL '7 hours 45 minutes', 'e0000000-0000-4000-8000-000000000003', 'priya.s@soterion.io', '192.168.1.102', 'Mozilla/5.0 Safari/17', 'f0000000-0000-4000-8000-000000000001', 'auth.login', 'operator', 'e0000000-0000-4000-8000-000000000003', NULL, '{"role":"supervisor"}', 'SUCCESS', NULL, uuid_generate_v4()),
(NOW() - INTERVAL '7 hours 40 minutes', 'e0000000-0000-4000-8000-000000000005', 'admin@soterion.io', '10.0.0.1', 'Mozilla/5.0 Chrome/122', 'f0000000-0000-4000-8000-000000000001', 'auth.login', 'operator', 'e0000000-0000-4000-8000-000000000005', NULL, '{"role":"admin"}', 'SUCCESS', NULL, uuid_generate_v4()),
-- Failed login attempt
(NOW() - INTERVAL '6 hours 30 minutes', NULL, 'unknown@test.com', '203.0.113.15', 'curl/8.1.2', 'f0000000-0000-4000-8000-000000000001', 'auth.login', 'operator', NULL, NULL, NULL, 'FAILURE', NULL, uuid_generate_v4()),
-- Alert acknowledgements
(NOW() - INTERVAL '5 hours 25 minutes', 'e0000000-0000-4000-8000-000000000001', 'amara.o@soterion.io', '192.168.1.100', 'Mozilla/5.0 Chrome/122', 'f0000000-0000-4000-8000-000000000001', 'alert.acknowledge', 'anomaly_event', 'ae000000-0000-4000-8000-000000000007', '{"acknowledged":false}', '{"acknowledged":true,"acknowledged_by":"e0000000-0000-4000-8000-000000000001"}', 'SUCCESS', NULL, uuid_generate_v4()),
(NOW() - INTERVAL '5 hours', 'e0000000-0000-4000-8000-000000000001', 'amara.o@soterion.io', '192.168.1.100', 'Mozilla/5.0 Chrome/122', 'f0000000-0000-4000-8000-000000000001', 'alert.acknowledge', 'anomaly_event', 'ae000000-0000-4000-8000-000000000008', '{"acknowledged":false}', '{"acknowledged":true}', 'SUCCESS', NULL, uuid_generate_v4()),
(NOW() - INTERVAL '4 hours 5 minutes', 'e0000000-0000-4000-8000-000000000002', 'james.w@soterion.io', '192.168.1.101', 'Mozilla/5.0 Firefox/123', 'f0000000-0000-4000-8000-000000000001', 'alert.acknowledge', 'anomaly_event', 'ae000000-0000-4000-8000-000000000006', '{"acknowledged":false}', '{"acknowledged":true}', 'SUCCESS', NULL, uuid_generate_v4()),
-- Alert escalation
(NOW() - INTERVAL '3 hours 10 minutes', 'e0000000-0000-4000-8000-000000000003', 'priya.s@soterion.io', '192.168.1.102', 'Mozilla/5.0 Safari/17', 'f0000000-0000-4000-8000-000000000001', 'alert.escalate', 'anomaly_event', 'ae000000-0000-4000-8000-000000000005', '{"escalated":false}', '{"escalated":true}', 'SUCCESS', NULL, uuid_generate_v4()),
-- Sensor updates
(NOW() - INTERVAL '2 hours 30 minutes', 'e0000000-0000-4000-8000-000000000005', 'admin@soterion.io', '10.0.0.1', 'Mozilla/5.0 Chrome/122', 'f0000000-0000-4000-8000-000000000001', 'sensor.update', 'sensor_node', 'd0000000-0000-4000-8000-000000000005', '{"health":"OFFLINE"}', '{"health":"DEGRADED"}', 'SUCCESS', NULL, uuid_generate_v4()),
(NOW() - INTERVAL '2 hours', 'e0000000-0000-4000-8000-000000000005', 'admin@soterion.io', '10.0.0.1', 'Mozilla/5.0 Chrome/122', 'f0000000-0000-4000-8000-000000000001', 'sensor.update', 'sensor_node', 'd0000000-0000-4000-8000-000000000009', '{"health":"OFFLINE"}', '{"health":"ONLINE"}', 'SUCCESS', NULL, uuid_generate_v4()),
-- Denied access attempt
(NOW() - INTERVAL '1 hour 15 minutes', 'e0000000-0000-4000-8000-000000000004', 'chen.l@soterion.io', '192.168.1.103', 'Mozilla/5.0 Chrome/122', 'f0000000-0000-4000-8000-000000000001', 'admin.access', 'admin_dashboard', NULL, NULL, NULL, 'DENIED', NULL, uuid_generate_v4()),
-- Configuration changes
(NOW() - INTERVAL '45 minutes', 'e0000000-0000-4000-8000-000000000005', 'admin@soterion.io', '10.0.0.1', 'Mozilla/5.0 Chrome/122', 'f0000000-0000-4000-8000-000000000001', 'retention.update', 'retention_policy', NULL, '{"retention_days":60}', '{"retention_days":90}', 'SUCCESS', NULL, uuid_generate_v4()),
-- Recent alert acks
(NOW() - INTERVAL '55 minutes', 'e0000000-0000-4000-8000-000000000003', 'priya.s@soterion.io', '192.168.1.102', 'Mozilla/5.0 Safari/17', 'f0000000-0000-4000-8000-000000000001', 'alert.acknowledge', 'anomaly_event', 'ae000000-0000-4000-8000-000000000002', '{"acknowledged":false}', '{"acknowledged":true}', 'SUCCESS', NULL, uuid_generate_v4()),
(NOW() - INTERVAL '1 hour 50 minutes', 'e0000000-0000-4000-8000-000000000001', 'amara.o@soterion.io', '192.168.1.100', 'Mozilla/5.0 Chrome/122', 'f0000000-0000-4000-8000-000000000001', 'alert.acknowledge', 'anomaly_event', 'ae000000-0000-4000-8000-000000000003', '{"acknowledged":false}', '{"acknowledged":true}', 'SUCCESS', NULL, uuid_generate_v4());
