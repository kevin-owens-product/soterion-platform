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
