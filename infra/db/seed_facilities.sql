-- seed_facilities.sql
-- Additional airport facilities: DFW, IAH, TPA
-- Run after seed.sql to add demo data for client presentations

------------------------------------------------------------
-- 1. Airports
------------------------------------------------------------
INSERT INTO airports (id, name, iata_code) VALUES
('a0000000-0000-4000-8000-000000000002', 'Dallas/Fort Worth International', 'DFW'),
('a0000000-0000-4000-8000-000000000003', 'George Bush Intercontinental', 'IAH'),
('a0000000-0000-4000-8000-000000000004', 'Tampa International', 'TPA')
ON CONFLICT (iata_code) DO NOTHING;

------------------------------------------------------------
-- 2. Facilities
------------------------------------------------------------
INSERT INTO facilities (id, name, type, short_code, address, country_code, timezone, config) VALUES
('f0000000-0000-4000-8000-000000000002',
 'Dallas/Fort Worth International Airport',
 'AIRPORT', 'DFW',
 '2400 Aviation Dr, DFW Airport, TX 75261',
 'US', 'America/Chicago',
 '{"runways": 7, "terminals": 5, "annual_passengers": 73400000, "iata_code": "DFW"}'::jsonb),

('f0000000-0000-4000-8000-000000000003',
 'George Bush Intercontinental Airport',
 'AIRPORT', 'IAH',
 '2800 N Terminal Rd, Houston, TX 77032',
 'US', 'America/Chicago',
 '{"runways": 5, "terminals": 5, "annual_passengers": 45300000, "iata_code": "IAH"}'::jsonb),

('f0000000-0000-4000-8000-000000000004',
 'Tampa International Airport',
 'AIRPORT', 'TPA',
 '4100 George J Bean Pkwy, Tampa, FL 33607',
 'US', 'America/New_York',
 '{"runways": 2, "terminals": 1, "annual_passengers": 23500000, "iata_code": "TPA"}'::jsonb)
ON CONFLICT (short_code) DO NOTHING;

------------------------------------------------------------
-- 3. Terminals
------------------------------------------------------------
-- DFW: Terminals A, D, E
INSERT INTO terminals (id, airport_id, name) VALUES
('b0000000-0000-4000-8000-000000000010', 'a0000000-0000-4000-8000-000000000002', 'Terminal A'),
('b0000000-0000-4000-8000-000000000011', 'a0000000-0000-4000-8000-000000000002', 'Terminal D'),
('b0000000-0000-4000-8000-000000000012', 'a0000000-0000-4000-8000-000000000002', 'Terminal E');

-- IAH: Terminals A, B, C, E
INSERT INTO terminals (id, airport_id, name) VALUES
('b0000000-0000-4000-8000-000000000020', 'a0000000-0000-4000-8000-000000000003', 'Terminal A'),
('b0000000-0000-4000-8000-000000000021', 'a0000000-0000-4000-8000-000000000003', 'Terminal B'),
('b0000000-0000-4000-8000-000000000022', 'a0000000-0000-4000-8000-000000000003', 'Terminal C'),
('b0000000-0000-4000-8000-000000000023', 'a0000000-0000-4000-8000-000000000003', 'Terminal E');

-- TPA: Main Terminal + Airsides C, E, F
INSERT INTO terminals (id, airport_id, name) VALUES
('b0000000-0000-4000-8000-000000000030', 'a0000000-0000-4000-8000-000000000004', 'Main Terminal'),
('b0000000-0000-4000-8000-000000000031', 'a0000000-0000-4000-8000-000000000004', 'Airside C'),
('b0000000-0000-4000-8000-000000000032', 'a0000000-0000-4000-8000-000000000004', 'Airside F');

------------------------------------------------------------
-- 4. Zones
------------------------------------------------------------
-- DFW Zones (Terminal A & D)
INSERT INTO zones (id, terminal_id, name, type, sla_wait_mins, boundary) VALUES
('c0000000-0000-4000-8000-000000000010', 'b0000000-0000-4000-8000-000000000010', 'TSA Checkpoint A17', 'security', 12,
 '{"type":"Polygon","coordinates":[[[-97.0380,32.8980],[-97.0380,32.8985],[-97.0370,32.8985],[-97.0370,32.8980],[-97.0380,32.8980]]]}'::jsonb),
('c0000000-0000-4000-8000-000000000011', 'b0000000-0000-4000-8000-000000000010', 'Gate A22-A28', 'gate', 15,
 '{"type":"Polygon","coordinates":[[[-97.0370,32.8980],[-97.0370,32.8985],[-97.0360,32.8985],[-97.0360,32.8980],[-97.0370,32.8980]]]}'::jsonb),
('c0000000-0000-4000-8000-000000000012', 'b0000000-0000-4000-8000-000000000011', 'Skylink Station D', 'lounge', 20,
 '{"type":"Polygon","coordinates":[[[-97.0350,32.8975],[-97.0350,32.8980],[-97.0340,32.8980],[-97.0340,32.8975],[-97.0350,32.8975]]]}'::jsonb),
('c0000000-0000-4000-8000-000000000013', 'b0000000-0000-4000-8000-000000000011', 'Baggage Claim D', 'baggage', 18,
 '{"type":"Polygon","coordinates":[[[-97.0340,32.8975],[-97.0340,32.8980],[-97.0330,32.8980],[-97.0330,32.8975],[-97.0340,32.8975]]]}'::jsonb),
('c0000000-0000-4000-8000-000000000014', 'b0000000-0000-4000-8000-000000000012', 'Terminal E Curbside', 'curb', 10,
 '{"type":"Polygon","coordinates":[[[-97.0320,32.8970],[-97.0320,32.8975],[-97.0310,32.8975],[-97.0310,32.8970],[-97.0320,32.8970]]]}'::jsonb);

-- IAH Zones
INSERT INTO zones (id, terminal_id, name, type, sla_wait_mins, boundary) VALUES
('c0000000-0000-4000-8000-000000000020', 'b0000000-0000-4000-8000-000000000020', 'TSA Pre-Check A', 'security', 8,
 '{"type":"Polygon","coordinates":[[[-95.3415,29.9905],[-95.3415,29.9910],[-95.3405,29.9910],[-95.3405,29.9905],[-95.3415,29.9905]]]}'::jsonb),
('c0000000-0000-4000-8000-000000000021', 'b0000000-0000-4000-8000-000000000021', 'Gate B42-B50', 'gate', 15,
 '{"type":"Polygon","coordinates":[[[-95.3405,29.9905],[-95.3405,29.9910],[-95.3395,29.9910],[-95.3395,29.9905],[-95.3405,29.9905]]]}'::jsonb),
('c0000000-0000-4000-8000-000000000022', 'b0000000-0000-4000-8000-000000000022', 'International Arrivals C', 'baggage', 25,
 '{"type":"Polygon","coordinates":[[[-95.3395,29.9905],[-95.3395,29.9910],[-95.3385,29.9910],[-95.3385,29.9905],[-95.3395,29.9905]]]}'::jsonb),
('c0000000-0000-4000-8000-000000000023', 'b0000000-0000-4000-8000-000000000023', 'Terminal E Connector', 'lounge', 20,
 '{"type":"Polygon","coordinates":[[[-95.3385,29.9900],[-95.3385,29.9905],[-95.3375,29.9905],[-95.3375,29.9900],[-95.3385,29.9900]]]}'::jsonb),
('c0000000-0000-4000-8000-000000000024', 'b0000000-0000-4000-8000-000000000020', 'Ground Transport Center', 'curb', 10,
 '{"type":"Polygon","coordinates":[[[-95.3375,29.9900],[-95.3375,29.9905],[-95.3365,29.9905],[-95.3365,29.9900],[-95.3375,29.9900]]]}'::jsonb);

-- TPA Zones
INSERT INTO zones (id, terminal_id, name, type, sla_wait_mins, boundary) VALUES
('c0000000-0000-4000-8000-000000000030', 'b0000000-0000-4000-8000-000000000030', 'Main Terminal Security', 'security', 10,
 '{"type":"Polygon","coordinates":[[[-82.5335,27.9755],[-82.5335,27.9760],[-82.5325,27.9760],[-82.5325,27.9755],[-82.5335,27.9755]]]}'::jsonb),
('c0000000-0000-4000-8000-000000000031', 'b0000000-0000-4000-8000-000000000031', 'Airside C Gates', 'gate', 15,
 '{"type":"Polygon","coordinates":[[[-82.5325,27.9755],[-82.5325,27.9760],[-82.5315,27.9760],[-82.5315,27.9755],[-82.5325,27.9755]]]}'::jsonb),
('c0000000-0000-4000-8000-000000000032', 'b0000000-0000-4000-8000-000000000032', 'Airside F International', 'gate', 20,
 '{"type":"Polygon","coordinates":[[[-82.5315,27.9755],[-82.5315,27.9760],[-82.5305,27.9760],[-82.5305,27.9755],[-82.5315,27.9755]]]}'::jsonb),
('c0000000-0000-4000-8000-000000000033', 'b0000000-0000-4000-8000-000000000030', 'Baggage Level 1', 'baggage', 18,
 '{"type":"Polygon","coordinates":[[[-82.5305,27.9750],[-82.5305,27.9755],[-82.5295,27.9755],[-82.5295,27.9750],[-82.5305,27.9750]]]}'::jsonb),
('c0000000-0000-4000-8000-000000000034', 'b0000000-0000-4000-8000-000000000030', 'Blue Express Curbside', 'curb', 8,
 '{"type":"Polygon","coordinates":[[[-82.5295,27.9750],[-82.5295,27.9755],[-82.5285,27.9755],[-82.5285,27.9750],[-82.5295,27.9750]]]}'::jsonb);

------------------------------------------------------------
-- 5. Sensor Nodes
------------------------------------------------------------
-- DFW Sensors (8 sensors)
INSERT INTO sensor_nodes (id, zone_id, label, model, coords, fov_degrees, range_meters, health, last_ping_at) VALUES
('d0000000-0000-4000-8000-000000000020', 'c0000000-0000-4000-8000-000000000010', 'DFW-001', 'Ouster OS1-128', '{"x":-97.0375,"y":32.8982,"z":4.0}'::jsonb, 360, 60, 'ONLINE', NOW() - INTERVAL '15 seconds'),
('d0000000-0000-4000-8000-000000000021', 'c0000000-0000-4000-8000-000000000010', 'DFW-002', 'Ouster OS1-128', '{"x":-97.0373,"y":32.8983,"z":4.0}'::jsonb, 360, 60, 'ONLINE', NOW() - INTERVAL '10 seconds'),
('d0000000-0000-4000-8000-000000000022', 'c0000000-0000-4000-8000-000000000011', 'DFW-003', 'Ouster OS1-128', '{"x":-97.0365,"y":32.8982,"z":3.5}'::jsonb, 360, 50, 'ONLINE', NOW() - INTERVAL '20 seconds'),
('d0000000-0000-4000-8000-000000000023', 'c0000000-0000-4000-8000-000000000012', 'DFW-004', 'Hesai JT128', '{"x":-97.0345,"y":32.8977,"z":5.0}'::jsonb, 360, 50, 'DEGRADED', NOW() - INTERVAL '3 minutes'),
('d0000000-0000-4000-8000-000000000024', 'c0000000-0000-4000-8000-000000000013', 'DFW-005', 'Hesai JT128', '{"x":-97.0335,"y":32.8977,"z":3.0}'::jsonb, 360, 50, 'ONLINE', NOW() - INTERVAL '8 seconds'),
('d0000000-0000-4000-8000-000000000025', 'c0000000-0000-4000-8000-000000000013', 'DFW-006', 'Hesai JT128', '{"x":-97.0337,"y":32.8978,"z":3.0}'::jsonb, 360, 50, 'ONLINE', NOW() - INTERVAL '12 seconds'),
('d0000000-0000-4000-8000-000000000026', 'c0000000-0000-4000-8000-000000000014', 'DFW-007', 'Velodyne VLP-32', '{"x":-97.0315,"y":32.8972,"z":6.0}'::jsonb, 360, 80, 'ONLINE', NOW() - INTERVAL '5 seconds'),
('d0000000-0000-4000-8000-000000000027', 'c0000000-0000-4000-8000-000000000014', 'DFW-008', 'Velodyne VLP-32', '{"x":-97.0313,"y":32.8973,"z":6.0}'::jsonb, 360, 80, 'OFFLINE', NOW() - INTERVAL '45 minutes');

-- IAH Sensors (8 sensors)
INSERT INTO sensor_nodes (id, zone_id, label, model, coords, fov_degrees, range_meters, health, last_ping_at) VALUES
('d0000000-0000-4000-8000-000000000030', 'c0000000-0000-4000-8000-000000000020', 'IAH-001', 'Ouster OS1-128', '{"x":-95.3410,"y":29.9907,"z":4.0}'::jsonb, 360, 60, 'ONLINE', NOW() - INTERVAL '8 seconds'),
('d0000000-0000-4000-8000-000000000031', 'c0000000-0000-4000-8000-000000000020', 'IAH-002', 'Ouster OS1-128', '{"x":-95.3408,"y":29.9908,"z":4.0}'::jsonb, 360, 60, 'ONLINE', NOW() - INTERVAL '12 seconds'),
('d0000000-0000-4000-8000-000000000032', 'c0000000-0000-4000-8000-000000000021', 'IAH-003', 'Hesai JT128', '{"x":-95.3400,"y":29.9907,"z":3.5}'::jsonb, 360, 50, 'ONLINE', NOW() - INTERVAL '6 seconds'),
('d0000000-0000-4000-8000-000000000033', 'c0000000-0000-4000-8000-000000000021', 'IAH-004', 'Hesai JT128', '{"x":-95.3398,"y":29.9908,"z":3.5}'::jsonb, 360, 50, 'ONLINE', NOW() - INTERVAL '18 seconds'),
('d0000000-0000-4000-8000-000000000034', 'c0000000-0000-4000-8000-000000000022', 'IAH-005', 'Hesai JT128', '{"x":-95.3390,"y":29.9907,"z":3.0}'::jsonb, 360, 50, 'ONLINE', NOW() - INTERVAL '25 seconds'),
('d0000000-0000-4000-8000-000000000035', 'c0000000-0000-4000-8000-000000000022', 'IAH-006', 'Hesai JT128', '{"x":-95.3388,"y":29.9908,"z":3.0}'::jsonb, 360, 50, 'DEGRADED', NOW() - INTERVAL '5 minutes'),
('d0000000-0000-4000-8000-000000000036', 'c0000000-0000-4000-8000-000000000023', 'IAH-007', 'Velodyne VLP-32', '{"x":-95.3380,"y":29.9902,"z":4.5}'::jsonb, 360, 70, 'ONLINE', NOW() - INTERVAL '10 seconds'),
('d0000000-0000-4000-8000-000000000037', 'c0000000-0000-4000-8000-000000000024', 'IAH-008', 'Velodyne VLP-32', '{"x":-95.3370,"y":29.9902,"z":6.0}'::jsonb, 360, 80, 'ONLINE', NOW() - INTERVAL '4 seconds');

-- TPA Sensors (8 sensors)
INSERT INTO sensor_nodes (id, zone_id, label, model, coords, fov_degrees, range_meters, health, last_ping_at) VALUES
('d0000000-0000-4000-8000-000000000040', 'c0000000-0000-4000-8000-000000000030', 'TPA-001', 'Ouster OS1-128', '{"x":-82.5330,"y":27.9757,"z":4.0}'::jsonb, 360, 60, 'ONLINE', NOW() - INTERVAL '5 seconds'),
('d0000000-0000-4000-8000-000000000041', 'c0000000-0000-4000-8000-000000000030', 'TPA-002', 'Ouster OS1-128', '{"x":-82.5328,"y":27.9758,"z":4.0}'::jsonb, 360, 60, 'ONLINE', NOW() - INTERVAL '10 seconds'),
('d0000000-0000-4000-8000-000000000042', 'c0000000-0000-4000-8000-000000000031', 'TPA-003', 'Hesai JT128', '{"x":-82.5320,"y":27.9757,"z":3.5}'::jsonb, 360, 50, 'ONLINE', NOW() - INTERVAL '15 seconds'),
('d0000000-0000-4000-8000-000000000043', 'c0000000-0000-4000-8000-000000000031', 'TPA-004', 'Hesai JT128', '{"x":-82.5318,"y":27.9758,"z":3.5}'::jsonb, 360, 50, 'ONLINE', NOW() - INTERVAL '8 seconds'),
('d0000000-0000-4000-8000-000000000044', 'c0000000-0000-4000-8000-000000000032', 'TPA-005', 'Hesai JT128', '{"x":-82.5310,"y":27.9757,"z":3.5}'::jsonb, 360, 50, 'DEGRADED', NOW() - INTERVAL '8 minutes'),
('d0000000-0000-4000-8000-000000000045', 'c0000000-0000-4000-8000-000000000032', 'TPA-006', 'Hesai JT128', '{"x":-82.5308,"y":27.9758,"z":3.5}'::jsonb, 360, 50, 'ONLINE', NOW() - INTERVAL '20 seconds'),
('d0000000-0000-4000-8000-000000000046', 'c0000000-0000-4000-8000-000000000033', 'TPA-007', 'Velodyne VLP-32', '{"x":-82.5300,"y":27.9752,"z":3.0}'::jsonb, 360, 60, 'ONLINE', NOW() - INTERVAL '12 seconds'),
('d0000000-0000-4000-8000-000000000047', 'c0000000-0000-4000-8000-000000000034', 'TPA-008', 'Velodyne VLP-32', '{"x":-82.5290,"y":27.9752,"z":6.0}'::jsonb, 360, 80, 'ONLINE', NOW() - INTERVAL '3 seconds');

------------------------------------------------------------
-- 6. Operators (password: soterion123)
------------------------------------------------------------
-- DFW Operators
INSERT INTO operators (id, airport_id, name, email, password_hash, role, team) VALUES
('e0000000-0000-4000-8000-000000000010', 'a0000000-0000-4000-8000-000000000002', 'Marcus J.', 'marcus.j@soterion.io', '$2b$12$fONOquHEM99rwP4Hb50ujemOcSpkK0vI4arS/TrdUMNz2WPFumBWm', 'operator', 'Alpha'),
('e0000000-0000-4000-8000-000000000011', 'a0000000-0000-4000-8000-000000000002', 'Rachel T.', 'rachel.t@soterion.io', '$2b$12$fONOquHEM99rwP4Hb50ujemOcSpkK0vI4arS/TrdUMNz2WPFumBWm', 'operator', 'Bravo'),
('e0000000-0000-4000-8000-000000000012', 'a0000000-0000-4000-8000-000000000002', 'David K.', 'david.k@soterion.io', '$2b$12$fONOquHEM99rwP4Hb50ujemOcSpkK0vI4arS/TrdUMNz2WPFumBWm', 'supervisor', 'Alpha'),
('e0000000-0000-4000-8000-000000000013', 'a0000000-0000-4000-8000-000000000002', 'DFW Admin', 'dfw-admin@soterion.io', '$2b$12$fONOquHEM99rwP4Hb50ujemOcSpkK0vI4arS/TrdUMNz2WPFumBWm', 'admin', NULL);

-- IAH Operators
INSERT INTO operators (id, airport_id, name, email, password_hash, role, team) VALUES
('e0000000-0000-4000-8000-000000000020', 'a0000000-0000-4000-8000-000000000003', 'Sofia R.', 'sofia.r@soterion.io', '$2b$12$fONOquHEM99rwP4Hb50ujemOcSpkK0vI4arS/TrdUMNz2WPFumBWm', 'operator', 'Terminal A'),
('e0000000-0000-4000-8000-000000000021', 'a0000000-0000-4000-8000-000000000003', 'Carlos M.', 'carlos.m@soterion.io', '$2b$12$fONOquHEM99rwP4Hb50ujemOcSpkK0vI4arS/TrdUMNz2WPFumBWm', 'operator', 'Terminal B'),
('e0000000-0000-4000-8000-000000000022', 'a0000000-0000-4000-8000-000000000003', 'Linda W.', 'linda.w@soterion.io', '$2b$12$fONOquHEM99rwP4Hb50ujemOcSpkK0vI4arS/TrdUMNz2WPFumBWm', 'supervisor', 'Control'),
('e0000000-0000-4000-8000-000000000023', 'a0000000-0000-4000-8000-000000000003', 'IAH Admin', 'iah-admin@soterion.io', '$2b$12$fONOquHEM99rwP4Hb50ujemOcSpkK0vI4arS/TrdUMNz2WPFumBWm', 'admin', NULL);

-- TPA Operators
INSERT INTO operators (id, airport_id, name, email, password_hash, role, team) VALUES
('e0000000-0000-4000-8000-000000000030', 'a0000000-0000-4000-8000-000000000004', 'Jake P.', 'jake.p@soterion.io', '$2b$12$fONOquHEM99rwP4Hb50ujemOcSpkK0vI4arS/TrdUMNz2WPFumBWm', 'operator', 'Main'),
('e0000000-0000-4000-8000-000000000031', 'a0000000-0000-4000-8000-000000000004', 'Maria G.', 'maria.g@soterion.io', '$2b$12$fONOquHEM99rwP4Hb50ujemOcSpkK0vI4arS/TrdUMNz2WPFumBWm', 'operator', 'Airside'),
('e0000000-0000-4000-8000-000000000032', 'a0000000-0000-4000-8000-000000000004', 'Nick S.', 'nick.s@soterion.io', '$2b$12$fONOquHEM99rwP4Hb50ujemOcSpkK0vI4arS/TrdUMNz2WPFumBWm', 'supervisor', 'Control'),
('e0000000-0000-4000-8000-000000000033', 'a0000000-0000-4000-8000-000000000004', 'TPA Admin', 'tpa-admin@soterion.io', '$2b$12$fONOquHEM99rwP4Hb50ujemOcSpkK0vI4arS/TrdUMNz2WPFumBWm', 'admin', NULL);

------------------------------------------------------------
-- 7. Anomaly Events
------------------------------------------------------------
-- DFW Events (last 6 hours)
INSERT INTO anomaly_events (airport_id, zone_id, type, severity, confidence, track_ids, acknowledged, acknowledged_by, acknowledged_at, escalated, resolved_at, created_at) VALUES
('a0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000010', 'INTRUSION', 5, 0.94, ARRAY[uuid_generate_v4()], FALSE, NULL, NULL, FALSE, NULL, NOW() - INTERVAL '18 minutes'),
('a0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000010', 'CROWD_SURGE', 4, 0.88, ARRAY[uuid_generate_v4(), uuid_generate_v4()], TRUE, 'e0000000-0000-4000-8000-000000000012', NOW() - INTERVAL '1 hour 5 minutes', FALSE, NULL, NOW() - INTERVAL '1 hour 10 minutes'),
('a0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000011', 'LOITERING', 3, 0.76, ARRAY[uuid_generate_v4()], TRUE, 'e0000000-0000-4000-8000-000000000010', NOW() - INTERVAL '2 hours 20 minutes', FALSE, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours 25 minutes'),
('a0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000014', 'ABANDONED_OBJECT', 4, 0.82, ARRAY[uuid_generate_v4()], FALSE, NULL, NULL, FALSE, NULL, NOW() - INTERVAL '35 minutes'),
('a0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000013', 'LOITERING', 2, 0.58, ARRAY[uuid_generate_v4()], TRUE, 'e0000000-0000-4000-8000-000000000011', NOW() - INTERVAL '3 hours 50 minutes', FALSE, NOW() - INTERVAL '3 hours 30 minutes', NOW() - INTERVAL '4 hours'),
('a0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000012', 'DRONE_DETECTED', 3, 0.71, NULL, TRUE, 'e0000000-0000-4000-8000-000000000012', NOW() - INTERVAL '4 hours 55 minutes', TRUE, NOW() - INTERVAL '4 hours 30 minutes', NOW() - INTERVAL '5 hours');

-- IAH Events (last 6 hours)
INSERT INTO anomaly_events (airport_id, zone_id, type, severity, confidence, track_ids, acknowledged, acknowledged_by, acknowledged_at, escalated, resolved_at, created_at) VALUES
('a0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000020', 'CROWD_SURGE', 5, 0.93, ARRAY[uuid_generate_v4(), uuid_generate_v4(), uuid_generate_v4()], FALSE, NULL, NULL, FALSE, NULL, NOW() - INTERVAL '8 minutes'),
('a0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000022', 'INTRUSION', 4, 0.89, ARRAY[uuid_generate_v4()], TRUE, 'e0000000-0000-4000-8000-000000000022', NOW() - INTERVAL '45 minutes', TRUE, NULL, NOW() - INTERVAL '50 minutes'),
('a0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000021', 'ABANDONED_OBJECT', 3, 0.74, ARRAY[uuid_generate_v4()], TRUE, 'e0000000-0000-4000-8000-000000000020', NOW() - INTERVAL '1 hour 40 minutes', FALSE, NOW() - INTERVAL '1 hour 20 minutes', NOW() - INTERVAL '1 hour 45 minutes'),
('a0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000024', 'PERIMETER_BREACH', 4, 0.91, ARRAY[uuid_generate_v4(), uuid_generate_v4()], TRUE, 'e0000000-0000-4000-8000-000000000022', NOW() - INTERVAL '3 hours 10 minutes', TRUE, NOW() - INTERVAL '2 hours 45 minutes', NOW() - INTERVAL '3 hours 15 minutes'),
('a0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000023', 'LOITERING', 2, 0.52, ARRAY[uuid_generate_v4()], TRUE, 'e0000000-0000-4000-8000-000000000021', NOW() - INTERVAL '5 hours 25 minutes', FALSE, NOW() - INTERVAL '5 hours', NOW() - INTERVAL '5 hours 30 minutes');

-- TPA Events (last 6 hours)
INSERT INTO anomaly_events (airport_id, zone_id, type, severity, confidence, track_ids, acknowledged, acknowledged_by, acknowledged_at, escalated, resolved_at, created_at) VALUES
('a0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000030', 'LOITERING', 4, 0.85, ARRAY[uuid_generate_v4()], FALSE, NULL, NULL, FALSE, NULL, NOW() - INTERVAL '22 minutes'),
('a0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000032', 'INTRUSION', 5, 0.97, ARRAY[uuid_generate_v4(), uuid_generate_v4()], TRUE, 'e0000000-0000-4000-8000-000000000032', NOW() - INTERVAL '1 hour 15 minutes', TRUE, NULL, NOW() - INTERVAL '1 hour 20 minutes'),
('a0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000031', 'CROWD_SURGE', 3, 0.69, ARRAY[uuid_generate_v4(), uuid_generate_v4()], TRUE, 'e0000000-0000-4000-8000-000000000030', NOW() - INTERVAL '2 hours 50 minutes', FALSE, NOW() - INTERVAL '2 hours 30 minutes', NOW() - INTERVAL '3 hours'),
('a0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000034', 'ABANDONED_OBJECT', 2, 0.61, ARRAY[uuid_generate_v4()], TRUE, 'e0000000-0000-4000-8000-000000000031', NOW() - INTERVAL '4 hours 10 minutes', FALSE, NOW() - INTERVAL '3 hours 45 minutes', NOW() - INTERVAL '4 hours 15 minutes');

------------------------------------------------------------
-- 8. Shift Scores (last 3 days)
------------------------------------------------------------
-- DFW Scores
INSERT INTO shift_scores (operator_id, airport_id, shift_date, shift_start, shift_end, total_score, security_score, flow_score, response_score, compliance_score, uptime_score, streak_multiplier) VALUES
('e0000000-0000-4000-8000-000000000010', 'a0000000-0000-4000-8000-000000000002', CURRENT_DATE, NOW() - INTERVAL '6 hours', NOW(), 875, 860, 890, 910, 840, 920, 1.15),
('e0000000-0000-4000-8000-000000000010', 'a0000000-0000-4000-8000-000000000002', CURRENT_DATE - 1, NOW() - INTERVAL '30 hours', NOW() - INTERVAL '22 hours', 860, 850, 880, 890, 830, 910, 1.10),
('e0000000-0000-4000-8000-000000000011', 'a0000000-0000-4000-8000-000000000002', CURRENT_DATE, NOW() - INTERVAL '6 hours', NOW(), 790, 770, 810, 830, 750, 800, 1.0),
('e0000000-0000-4000-8000-000000000011', 'a0000000-0000-4000-8000-000000000002', CURRENT_DATE - 1, NOW() - INTERVAL '30 hours', NOW() - INTERVAL '22 hours', 775, 760, 790, 810, 740, 790, 1.0),
('e0000000-0000-4000-8000-000000000012', 'a0000000-0000-4000-8000-000000000002', CURRENT_DATE, NOW() - INTERVAL '6 hours', NOW(), 840, 830, 860, 870, 810, 880, 1.10),
('e0000000-0000-4000-8000-000000000012', 'a0000000-0000-4000-8000-000000000002', CURRENT_DATE - 1, NOW() - INTERVAL '30 hours', NOW() - INTERVAL '22 hours', 830, 820, 850, 860, 800, 870, 1.05);

-- IAH Scores
INSERT INTO shift_scores (operator_id, airport_id, shift_date, shift_start, shift_end, total_score, security_score, flow_score, response_score, compliance_score, uptime_score, streak_multiplier) VALUES
('e0000000-0000-4000-8000-000000000020', 'a0000000-0000-4000-8000-000000000003', CURRENT_DATE, NOW() - INTERVAL '6 hours', NOW(), 910, 900, 920, 940, 870, 960, 1.20),
('e0000000-0000-4000-8000-000000000020', 'a0000000-0000-4000-8000-000000000003', CURRENT_DATE - 1, NOW() - INTERVAL '30 hours', NOW() - INTERVAL '22 hours', 895, 880, 910, 920, 860, 940, 1.15),
('e0000000-0000-4000-8000-000000000021', 'a0000000-0000-4000-8000-000000000003', CURRENT_DATE, NOW() - INTERVAL '6 hours', NOW(), 720, 700, 740, 760, 680, 750, 1.0),
('e0000000-0000-4000-8000-000000000021', 'a0000000-0000-4000-8000-000000000003', CURRENT_DATE - 1, NOW() - INTERVAL '30 hours', NOW() - INTERVAL '22 hours', 690, 670, 710, 730, 660, 720, 1.0),
('e0000000-0000-4000-8000-000000000022', 'a0000000-0000-4000-8000-000000000003', CURRENT_DATE, NOW() - INTERVAL '6 hours', NOW(), 860, 850, 870, 890, 830, 900, 1.10),
('e0000000-0000-4000-8000-000000000022', 'a0000000-0000-4000-8000-000000000003', CURRENT_DATE - 1, NOW() - INTERVAL '30 hours', NOW() - INTERVAL '22 hours', 845, 835, 855, 870, 820, 890, 1.05);

-- TPA Scores
INSERT INTO shift_scores (operator_id, airport_id, shift_date, shift_start, shift_end, total_score, security_score, flow_score, response_score, compliance_score, uptime_score, streak_multiplier) VALUES
('e0000000-0000-4000-8000-000000000030', 'a0000000-0000-4000-8000-000000000004', CURRENT_DATE, NOW() - INTERVAL '6 hours', NOW(), 850, 840, 860, 880, 820, 890, 1.10),
('e0000000-0000-4000-8000-000000000030', 'a0000000-0000-4000-8000-000000000004', CURRENT_DATE - 1, NOW() - INTERVAL '30 hours', NOW() - INTERVAL '22 hours', 835, 825, 845, 860, 810, 880, 1.05),
('e0000000-0000-4000-8000-000000000031', 'a0000000-0000-4000-8000-000000000004', CURRENT_DATE, NOW() - INTERVAL '6 hours', NOW(), 810, 800, 820, 840, 780, 850, 1.05),
('e0000000-0000-4000-8000-000000000031', 'a0000000-0000-4000-8000-000000000004', CURRENT_DATE - 1, NOW() - INTERVAL '30 hours', NOW() - INTERVAL '22 hours', 795, 785, 805, 820, 770, 840, 1.0),
('e0000000-0000-4000-8000-000000000032', 'a0000000-0000-4000-8000-000000000004', CURRENT_DATE, NOW() - INTERVAL '6 hours', NOW(), 890, 880, 900, 920, 860, 930, 1.15),
('e0000000-0000-4000-8000-000000000032', 'a0000000-0000-4000-8000-000000000004', CURRENT_DATE - 1, NOW() - INTERVAL '30 hours', NOW() - INTERVAL '22 hours', 870, 860, 880, 900, 850, 920, 1.10);

------------------------------------------------------------
-- 9. Zone Density (last 2 hours per facility)
------------------------------------------------------------
-- DFW
INSERT INTO zone_density (time, zone_id, count, density_pct, avg_dwell_secs)
SELECT ts, z.id,
  CASE z.name
    WHEN 'TSA Checkpoint A17' THEN 30 + (18 * sin(EXTRACT(EPOCH FROM ts) / 550))::int + (random() * 10)::int
    WHEN 'Gate A22-A28'       THEN 40 + (15 * sin(EXTRACT(EPOCH FROM ts) / 800))::int + (random() * 8)::int
    WHEN 'Skylink Station D'  THEN 25 + (12 * sin(EXTRACT(EPOCH FROM ts) / 1000))::int + (random() * 6)::int
    WHEN 'Baggage Claim D'    THEN 20 + (14 * sin(EXTRACT(EPOCH FROM ts) / 650))::int + (random() * 7)::int
    ELSE 15 + (10 * sin(EXTRACT(EPOCH FROM ts) / 500))::int + (random() * 5)::int
  END,
  CASE z.name
    WHEN 'TSA Checkpoint A17' THEN 60 + (22 * sin(EXTRACT(EPOCH FROM ts) / 550))::numeric + (random() * 12)::numeric
    WHEN 'Gate A22-A28'       THEN 50 + (18 * sin(EXTRACT(EPOCH FROM ts) / 800))::numeric + (random() * 10)::numeric
    WHEN 'Skylink Station D'  THEN 35 + (15 * sin(EXTRACT(EPOCH FROM ts) / 1000))::numeric + (random() * 8)::numeric
    WHEN 'Baggage Claim D'    THEN 42 + (20 * sin(EXTRACT(EPOCH FROM ts) / 650))::numeric + (random() * 9)::numeric
    ELSE 28 + (18 * sin(EXTRACT(EPOCH FROM ts) / 500))::numeric + (random() * 7)::numeric
  END,
  CASE z.name
    WHEN 'TSA Checkpoint A17' THEN 160 + (random() * 70)::numeric
    WHEN 'Gate A22-A28'       THEN 450 + (random() * 200)::numeric
    WHEN 'Skylink Station D'  THEN 120 + (random() * 60)::numeric
    WHEN 'Baggage Claim D'    THEN 210 + (random() * 90)::numeric
    ELSE 80 + (random() * 40)::numeric
  END
FROM zones z
JOIN terminals t ON t.id = z.terminal_id
JOIN airports a ON a.id = t.airport_id
CROSS JOIN generate_series(NOW() - INTERVAL '2 hours', NOW(), INTERVAL '5 minutes') AS ts
WHERE a.iata_code = 'DFW';

-- IAH
INSERT INTO zone_density (time, zone_id, count, density_pct, avg_dwell_secs)
SELECT ts, z.id,
  CASE z.name
    WHEN 'TSA Pre-Check A'         THEN 22 + (12 * sin(EXTRACT(EPOCH FROM ts) / 600))::int + (random() * 8)::int
    WHEN 'Gate B42-B50'            THEN 35 + (12 * sin(EXTRACT(EPOCH FROM ts) / 850))::int + (random() * 7)::int
    WHEN 'International Arrivals C' THEN 28 + (16 * sin(EXTRACT(EPOCH FROM ts) / 700))::int + (random() * 9)::int
    WHEN 'Terminal E Connector'    THEN 18 + (10 * sin(EXTRACT(EPOCH FROM ts) / 1100))::int + (random() * 5)::int
    ELSE 14 + (8 * sin(EXTRACT(EPOCH FROM ts) / 450))::int + (random() * 4)::int
  END,
  CASE z.name
    WHEN 'TSA Pre-Check A'         THEN 48 + (18 * sin(EXTRACT(EPOCH FROM ts) / 600))::numeric + (random() * 10)::numeric
    WHEN 'Gate B42-B50'            THEN 42 + (14 * sin(EXTRACT(EPOCH FROM ts) / 850))::numeric + (random() * 8)::numeric
    WHEN 'International Arrivals C' THEN 55 + (22 * sin(EXTRACT(EPOCH FROM ts) / 700))::numeric + (random() * 11)::numeric
    WHEN 'Terminal E Connector'    THEN 30 + (12 * sin(EXTRACT(EPOCH FROM ts) / 1100))::numeric + (random() * 7)::numeric
    ELSE 25 + (15 * sin(EXTRACT(EPOCH FROM ts) / 450))::numeric + (random() * 6)::numeric
  END,
  CASE z.name
    WHEN 'TSA Pre-Check A'         THEN 100 + (random() * 50)::numeric
    WHEN 'Gate B42-B50'            THEN 380 + (random() * 150)::numeric
    WHEN 'International Arrivals C' THEN 280 + (random() * 120)::numeric
    WHEN 'Terminal E Connector'    THEN 200 + (random() * 100)::numeric
    ELSE 70 + (random() * 35)::numeric
  END
FROM zones z
JOIN terminals t ON t.id = z.terminal_id
JOIN airports a ON a.id = t.airport_id
CROSS JOIN generate_series(NOW() - INTERVAL '2 hours', NOW(), INTERVAL '5 minutes') AS ts
WHERE a.iata_code = 'IAH';

-- TPA
INSERT INTO zone_density (time, zone_id, count, density_pct, avg_dwell_secs)
SELECT ts, z.id,
  CASE z.name
    WHEN 'Main Terminal Security' THEN 20 + (10 * sin(EXTRACT(EPOCH FROM ts) / 580))::int + (random() * 7)::int
    WHEN 'Airside C Gates'       THEN 30 + (12 * sin(EXTRACT(EPOCH FROM ts) / 900))::int + (random() * 6)::int
    WHEN 'Airside F International' THEN 25 + (14 * sin(EXTRACT(EPOCH FROM ts) / 750))::int + (random() * 8)::int
    WHEN 'Baggage Level 1'       THEN 18 + (10 * sin(EXTRACT(EPOCH FROM ts) / 620))::int + (random() * 5)::int
    ELSE 12 + (8 * sin(EXTRACT(EPOCH FROM ts) / 480))::int + (random() * 4)::int
  END,
  CASE z.name
    WHEN 'Main Terminal Security' THEN 45 + (18 * sin(EXTRACT(EPOCH FROM ts) / 580))::numeric + (random() * 9)::numeric
    WHEN 'Airside C Gates'       THEN 38 + (14 * sin(EXTRACT(EPOCH FROM ts) / 900))::numeric + (random() * 7)::numeric
    WHEN 'Airside F International' THEN 52 + (20 * sin(EXTRACT(EPOCH FROM ts) / 750))::numeric + (random() * 10)::numeric
    WHEN 'Baggage Level 1'       THEN 35 + (16 * sin(EXTRACT(EPOCH FROM ts) / 620))::numeric + (random() * 8)::numeric
    ELSE 22 + (12 * sin(EXTRACT(EPOCH FROM ts) / 480))::numeric + (random() * 5)::numeric
  END,
  CASE z.name
    WHEN 'Main Terminal Security' THEN 130 + (random() * 55)::numeric
    WHEN 'Airside C Gates'       THEN 400 + (random() * 180)::numeric
    WHEN 'Airside F International' THEN 350 + (random() * 160)::numeric
    WHEN 'Baggage Level 1'       THEN 190 + (random() * 80)::numeric
    ELSE 65 + (random() * 30)::numeric
  END
FROM zones z
JOIN terminals t ON t.id = z.terminal_id
JOIN airports a ON a.id = t.airport_id
CROSS JOIN generate_series(NOW() - INTERVAL '2 hours', NOW(), INTERVAL '5 minutes') AS ts
WHERE a.iata_code = 'TPA';

------------------------------------------------------------
-- 10. Queue Metrics (last 4 hours per facility)
------------------------------------------------------------
INSERT INTO queue_metrics (time, zone_id, queue_depth, wait_time_mins, throughput_per_hr, sla_met)
SELECT ts, z.id,
  15 + (12 * sin(EXTRACT(EPOCH FROM ts) / 600))::int + (random() * 8)::int,
  5 + (4 * sin(EXTRACT(EPOCH FROM ts) / 600))::numeric + (random() * 2)::numeric,
  160 + (35 * sin(EXTRACT(EPOCH FROM ts) / 600))::int + (random() * 18)::int,
  (5 + (4 * sin(EXTRACT(EPOCH FROM ts) / 600))::numeric + (random() * 2)::numeric) < z.sla_wait_mins
FROM zones z
JOIN terminals t ON t.id = z.terminal_id
JOIN airports a ON a.id = t.airport_id
CROSS JOIN generate_series(NOW() - INTERVAL '4 hours', NOW(), INTERVAL '5 minutes') AS ts
WHERE a.iata_code IN ('DFW', 'IAH', 'TPA');

------------------------------------------------------------
-- 11. Track Objects (last 30 min per facility)
------------------------------------------------------------
INSERT INTO track_objects (time, track_id, sensor_id, zone_id, centroid, velocity_ms, classification, behavior_score, dwell_secs)
SELECT
  ts + (random() * INTERVAL '4 minutes'),
  uuid_generate_v4(),
  s.id, s.zone_id,
  json_build_object('x', -97.0 + (random() * 0.05), 'y', 32.9 + (random() * 0.005), 'z', 0.8 + (random() * 0.5))::jsonb,
  CASE WHEN random() < 0.7 THEN 1.2 + (random() * 0.5) WHEN random() < 0.9 THEN 0.0 + (random() * 0.3) ELSE 1.8 + (random() * 1.0) END,
  CASE WHEN random() < 0.92 THEN 'PERSON' WHEN random() < 0.96 THEN 'OBJECT' ELSE 'UNKNOWN' END,
  CASE WHEN random() < 0.80 THEN (10 + (random() * 25))::int WHEN random() < 0.95 THEN (40 + (random() * 30))::int ELSE (75 + (random() * 25))::int END,
  (5 + (random() * 300))::numeric
FROM sensor_nodes s
JOIN zones z ON z.id = s.zone_id
JOIN terminals t ON t.id = z.terminal_id
JOIN airports a ON a.id = t.airport_id
CROSS JOIN generate_series(NOW() - INTERVAL '30 minutes', NOW(), INTERVAL '2 minutes') AS ts
WHERE a.iata_code IN ('DFW', 'IAH', 'TPA');

------------------------------------------------------------
-- 12. Operator Badges (per facility)
------------------------------------------------------------
-- DFW badges
INSERT INTO operator_badges (operator_id, badge_id, earned_at) VALUES
('e0000000-0000-4000-8000-000000000010', (SELECT id FROM badge_definitions WHERE key = 'FIRST_DETECT'), NOW() - INTERVAL '20 days'),
('e0000000-0000-4000-8000-000000000010', (SELECT id FROM badge_definitions WHERE key = 'FAST_RESPONDER'), NOW() - INTERVAL '12 days'),
('e0000000-0000-4000-8000-000000000010', (SELECT id FROM badge_definitions WHERE key = 'SEVEN_DAY_STREAK'), NOW() - INTERVAL '4 days'),
('e0000000-0000-4000-8000-000000000011', (SELECT id FROM badge_definitions WHERE key = 'FIRST_DETECT'), NOW() - INTERVAL '18 days'),
('e0000000-0000-4000-8000-000000000012', (SELECT id FROM badge_definitions WHERE key = 'FIRST_DETECT'), NOW() - INTERVAL '22 days'),
('e0000000-0000-4000-8000-000000000012', (SELECT id FROM badge_definitions WHERE key = 'IRON_GRID'), NOW() - INTERVAL '8 days'),
('e0000000-0000-4000-8000-000000000012', (SELECT id FROM badge_definitions WHERE key = 'TOP_OF_WEEK'), NOW() - INTERVAL '2 days');

-- IAH badges
INSERT INTO operator_badges (operator_id, badge_id, earned_at) VALUES
('e0000000-0000-4000-8000-000000000020', (SELECT id FROM badge_definitions WHERE key = 'FIRST_DETECT'), NOW() - INTERVAL '25 days'),
('e0000000-0000-4000-8000-000000000020', (SELECT id FROM badge_definitions WHERE key = 'FAST_RESPONDER'), NOW() - INTERVAL '15 days'),
('e0000000-0000-4000-8000-000000000020', (SELECT id FROM badge_definitions WHERE key = 'SEVEN_DAY_STREAK'), NOW() - INTERVAL '6 days'),
('e0000000-0000-4000-8000-000000000020', (SELECT id FROM badge_definitions WHERE key = 'TOP_OF_WEEK'), NOW() - INTERVAL '1 day'),
('e0000000-0000-4000-8000-000000000020', (SELECT id FROM badge_definitions WHERE key = 'THIRTY_DAY_SLA'), NOW() - INTERVAL '3 days'),
('e0000000-0000-4000-8000-000000000021', (SELECT id FROM badge_definitions WHERE key = 'FIRST_DETECT'), NOW() - INTERVAL '16 days'),
('e0000000-0000-4000-8000-000000000022', (SELECT id FROM badge_definitions WHERE key = 'FIRST_DETECT'), NOW() - INTERVAL '24 days'),
('e0000000-0000-4000-8000-000000000022', (SELECT id FROM badge_definitions WHERE key = 'ALL_CLEAR'), NOW() - INTERVAL '5 days'),
('e0000000-0000-4000-8000-000000000022', (SELECT id FROM badge_definitions WHERE key = 'IRON_GRID'), NOW() - INTERVAL '10 days');

-- TPA badges
INSERT INTO operator_badges (operator_id, badge_id, earned_at) VALUES
('e0000000-0000-4000-8000-000000000030', (SELECT id FROM badge_definitions WHERE key = 'FIRST_DETECT'), NOW() - INTERVAL '15 days'),
('e0000000-0000-4000-8000-000000000030', (SELECT id FROM badge_definitions WHERE key = 'FAST_RESPONDER'), NOW() - INTERVAL '7 days'),
('e0000000-0000-4000-8000-000000000031', (SELECT id FROM badge_definitions WHERE key = 'FIRST_DETECT'), NOW() - INTERVAL '13 days'),
('e0000000-0000-4000-8000-000000000031', (SELECT id FROM badge_definitions WHERE key = 'ALL_CLEAR'), NOW() - INTERVAL '3 days'),
('e0000000-0000-4000-8000-000000000032', (SELECT id FROM badge_definitions WHERE key = 'FIRST_DETECT'), NOW() - INTERVAL '18 days'),
('e0000000-0000-4000-8000-000000000032', (SELECT id FROM badge_definitions WHERE key = 'SEVEN_DAY_STREAK'), NOW() - INTERVAL '5 days'),
('e0000000-0000-4000-8000-000000000032', (SELECT id FROM badge_definitions WHERE key = 'IRON_GRID'), NOW() - INTERVAL '9 days'),
('e0000000-0000-4000-8000-000000000032', (SELECT id FROM badge_definitions WHERE key = 'TOP_OF_WEEK'), NOW() - INTERVAL '1 day');

------------------------------------------------------------
-- 13. Retention Policies (per facility)
------------------------------------------------------------
INSERT INTO retention_policies (facility_id, data_type, retention_days, legal_basis, auto_purge, last_purged_at) VALUES
('f0000000-0000-4000-8000-000000000002', 'track_objects', 30, 'TSA SD-1580/82-2022-01', TRUE, NOW() - INTERVAL '2 days'),
('f0000000-0000-4000-8000-000000000002', 'anomaly_events', 365, 'TSA Security Directive', TRUE, NOW() - INTERVAL '5 days'),
('f0000000-0000-4000-8000-000000000002', 'audit_log', 1095, 'FedRAMP AU-11', TRUE, NOW() - INTERVAL '7 days'),
('f0000000-0000-4000-8000-000000000003', 'track_objects', 30, 'TSA SD-1580/82-2022-01', TRUE, NOW() - INTERVAL '3 days'),
('f0000000-0000-4000-8000-000000000003', 'anomaly_events', 365, 'TSA Security Directive', TRUE, NOW() - INTERVAL '6 days'),
('f0000000-0000-4000-8000-000000000003', 'audit_log', 1095, 'FedRAMP AU-11', TRUE, NOW() - INTERVAL '7 days'),
('f0000000-0000-4000-8000-000000000004', 'track_objects', 30, 'TSA SD-1580/82-2022-01', TRUE, NOW() - INTERVAL '1 day'),
('f0000000-0000-4000-8000-000000000004', 'anomaly_events', 365, 'TSA Security Directive', TRUE, NOW() - INTERVAL '4 days'),
('f0000000-0000-4000-8000-000000000004', 'audit_log', 1095, 'FedRAMP AU-11', TRUE, NOW() - INTERVAL '7 days');

------------------------------------------------------------
-- 14. Security Incidents (per facility)
------------------------------------------------------------
INSERT INTO security_incidents (facility_id, title, severity, category, description, detected_at, reported_at, contained_at, resolved_at, root_cause, remediation, notified_parties, created_by) VALUES
-- DFW
('f0000000-0000-4000-8000-000000000002', 'Unauthorized drone activity near Terminal A', 'HIGH', 'airspace_violation',
 'Small commercial drone detected operating within restricted airspace near Terminal A. FAA notified. No impact to operations.',
 NOW() - INTERVAL '20 hours', NOW() - INTERVAL '19 hours 50 minutes', NOW() - INTERVAL '18 hours', NOW() - INTERVAL '12 hours',
 'Recreational drone operator unaware of TFR. FAA enforcement engaged.', 'Added drone detection sensors to Skylink coverage zone.',
 ARRAY['TSA FSD', 'FAA FSDO', 'DFW Police'], 'e0000000-0000-4000-8000-000000000013'),

('f0000000-0000-4000-8000-000000000002', 'Tailgating incident at employee checkpoint', 'MEDIUM', 'access_control',
 'LiDAR detected two individuals passing through employee-only entrance on single badge tap. Second individual had no visible credentials.',
 NOW() - INTERVAL '5 hours', NOW() - INTERVAL '4 hours 45 minutes', NULL, NULL,
 NULL, NULL, ARRAY['Airport Security'], 'e0000000-0000-4000-8000-000000000012'),

-- IAH
('f0000000-0000-4000-8000-000000000003', 'Crowd density exceeded safe threshold at Terminal C customs', 'HIGH', 'crowd_management',
 'International arrivals surge exceeded 85% zone capacity for 12 minutes. Queue backed up into sterile corridor.',
 NOW() - INTERVAL '36 hours', NOW() - INTERVAL '35 hours 50 minutes', NOW() - INTERVAL '35 hours', NOW() - INTERVAL '30 hours',
 'Three widebody arrivals within 15-minute window. CBP staffing insufficient for surge.',
 'Coordinated with CBP to add surge staffing protocol. Added predictive alert for concurrent arrival windows.',
 ARRAY['CBP Port Director', 'IAH Operations', 'TSA FSD'], 'e0000000-0000-4000-8000-000000000023'),

-- TPA
('f0000000-0000-4000-8000-000000000004', 'Unattended bag at Airside C gate area', 'MEDIUM', 'abandoned_object',
 'LiDAR flagged stationary object at gate C42 with no associated person within 8m for 4+ minutes. EOD team responded.',
 NOW() - INTERVAL '8 hours', NOW() - INTERVAL '7 hours 55 minutes', NOW() - INTERVAL '7 hours 30 minutes', NOW() - INTERVAL '7 hours',
 'Passenger left carry-on at seat while using restroom. Object cleared by EOD.', 'No action required — system performed as designed.',
 ARRAY['TPA Police', 'TSA'], 'e0000000-0000-4000-8000-000000000033');

------------------------------------------------------------
-- 15. Compliance Frameworks for US airports
------------------------------------------------------------
INSERT INTO compliance_frameworks (id, facility_type, framework_key, label, rules) VALUES
(uuid_generate_v4(), 'AIRPORT', 'TSA_SD_1580', 'TSA SD-1580/82-2022-01 Cybersecurity',
 '[{"rule":"1.A","description":"Designate cybersecurity coordinator"},{"rule":"1.B","description":"Report incidents to CISA within 24 hours"},{"rule":"1.C","description":"Develop incident response plan"},{"rule":"1.D","description":"Assess cybersecurity vulnerabilities"}]'::jsonb),
(uuid_generate_v4(), 'AIRPORT', 'TSA_49CFR1542', 'TSA 49 CFR 1542 Airport Security',
 '[{"rule":"1542.201","description":"Airport security program required"},{"rule":"1542.205","description":"Security of the AOA"},{"rule":"1542.207","description":"Access control systems"},{"rule":"1542.209","description":"Fingerprint-based criminal history records checks"}]'::jsonb)
ON CONFLICT (facility_type, framework_key) DO NOTHING;

------------------------------------------------------------
-- 16. Missions (per facility)
------------------------------------------------------------
-- DFW Missions
INSERT INTO missions (id, airport_id, title, description, metric_key, target_value, reward_type, reward_value, resets_at, active) VALUES
('aa000000-0000-4000-8000-000000000010', 'a0000000-0000-4000-8000-000000000002',
 'Skylink Guardian', 'Keep all Skylink station zones under 70% density for 12 hours',
 'density_threshold', 70, 'bonus_points', 400, NOW() + INTERVAL '12 hours', TRUE),
('aa000000-0000-4000-8000-000000000011', 'a0000000-0000-4000-8000-000000000002',
 'Eagle Eye', 'Acknowledge 15 anomaly events within 45 seconds each',
 'fast_ack_count', 15, 'bonus_points', 600, NOW() + INTERVAL '7 days', TRUE),
('aa000000-0000-4000-8000-000000000012', 'a0000000-0000-4000-8000-000000000002',
 'Terminal Sweep', 'Complete a full sensor health check across all DFW terminals',
 'sensor_check_count', 8, 'badge', 1, NOW() + INTERVAL '1 day', TRUE);

-- IAH Missions
INSERT INTO missions (id, airport_id, title, description, metric_key, target_value, reward_type, reward_value, resets_at, active) VALUES
('aa000000-0000-4000-8000-000000000020', 'a0000000-0000-4000-8000-000000000003',
 'CBP Surge Shield', 'Maintain International Arrivals queue under 20 min wait for 8 hours',
 'queue_wait_time', 20, 'bonus_points', 500, NOW() + INTERVAL '8 hours', TRUE),
('aa000000-0000-4000-8000-000000000021', 'a0000000-0000-4000-8000-000000000003',
 'Houston Heat', 'Achieve a shift score above 850 for 3 consecutive days',
 'consecutive_high_score', 3, 'bonus_points', 800, NOW() + INTERVAL '7 days', TRUE),
('aa000000-0000-4000-8000-000000000022', 'a0000000-0000-4000-8000-000000000003',
 'Zero Blind Spots', 'Restore all degraded sensors within 15 minutes of alert',
 'sensor_restore_count', 4, 'badge', 1, NOW() + INTERVAL '1 day', TRUE);

-- TPA Missions
INSERT INTO missions (id, airport_id, title, description, metric_key, target_value, reward_type, reward_value, resets_at, active) VALUES
('aa000000-0000-4000-8000-000000000030', 'a0000000-0000-4000-8000-000000000004',
 'Sunshine Streak', 'Maintain a 5-day scoring streak above 800',
 'consecutive_high_score', 5, 'bonus_points', 700, NOW() + INTERVAL '7 days', TRUE),
('aa000000-0000-4000-8000-000000000031', 'a0000000-0000-4000-8000-000000000004',
 'Blue Express', 'Keep curbside pickup zone under SLA for an entire shift',
 'queue_wait_time', 8, 'bonus_points', 350, NOW() + INTERVAL '8 hours', TRUE),
('aa000000-0000-4000-8000-000000000032', 'a0000000-0000-4000-8000-000000000004',
 'Airside Sentinel', 'Acknowledge every alert in Airside F within 60 seconds',
 'fast_ack_count', 10, 'badge', 1, NOW() + INTERVAL '1 day', TRUE);

------------------------------------------------------------
-- 17. Mission Progress
------------------------------------------------------------
-- DFW
INSERT INTO mission_progress (operator_id, mission_id, progress, completed, completed_at, updated_at) VALUES
('e0000000-0000-4000-8000-000000000010', 'aa000000-0000-4000-8000-000000000010', 0.85, FALSE, NULL, NOW() - INTERVAL '20 minutes'),
('e0000000-0000-4000-8000-000000000010', 'aa000000-0000-4000-8000-000000000011', 12, FALSE, NULL, NOW() - INTERVAL '45 minutes'),
('e0000000-0000-4000-8000-000000000011', 'aa000000-0000-4000-8000-000000000011', 6, FALSE, NULL, NOW() - INTERVAL '2 hours'),
('e0000000-0000-4000-8000-000000000012', 'aa000000-0000-4000-8000-000000000012', 8, TRUE, NOW() - INTERVAL '1 hour', NOW() - INTERVAL '1 hour');

-- IAH
INSERT INTO mission_progress (operator_id, mission_id, progress, completed, completed_at, updated_at) VALUES
('e0000000-0000-4000-8000-000000000020', 'aa000000-0000-4000-8000-000000000020', 0.92, FALSE, NULL, NOW() - INTERVAL '15 minutes'),
('e0000000-0000-4000-8000-000000000020', 'aa000000-0000-4000-8000-000000000021', 2, FALSE, NULL, NOW() - INTERVAL '1 hour'),
('e0000000-0000-4000-8000-000000000021', 'aa000000-0000-4000-8000-000000000022', 1, FALSE, NULL, NOW() - INTERVAL '3 hours'),
('e0000000-0000-4000-8000-000000000022', 'aa000000-0000-4000-8000-000000000020', 0.78, FALSE, NULL, NOW() - INTERVAL '30 minutes');

-- TPA
INSERT INTO mission_progress (operator_id, mission_id, progress, completed, completed_at, updated_at) VALUES
('e0000000-0000-4000-8000-000000000030', 'aa000000-0000-4000-8000-000000000030', 3, FALSE, NULL, NOW() - INTERVAL '1 hour'),
('e0000000-0000-4000-8000-000000000030', 'aa000000-0000-4000-8000-000000000032', 8, FALSE, NULL, NOW() - INTERVAL '40 minutes'),
('e0000000-0000-4000-8000-000000000031', 'aa000000-0000-4000-8000-000000000031', 1.0, TRUE, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours'),
('e0000000-0000-4000-8000-000000000032', 'aa000000-0000-4000-8000-000000000030', 5, TRUE, NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '30 minutes');

------------------------------------------------------------
-- 18. RBAC Operator Role Assignments
------------------------------------------------------------
-- DFW operator roles (using roles seeded in seed.sql)
INSERT INTO operator_roles (operator_id, role_id, granted_by, granted_at) VALUES
('e0000000-0000-4000-8000-000000000010', '10000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000013', NOW() - INTERVAL '45 days'),
('e0000000-0000-4000-8000-000000000011', '10000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000013', NOW() - INTERVAL '40 days'),
('e0000000-0000-4000-8000-000000000012', '10000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000013', NOW() - INTERVAL '42 days'),
('e0000000-0000-4000-8000-000000000013', '10000000-0000-4000-8000-000000000003', NULL, NOW() - INTERVAL '60 days');

-- IAH operator roles
INSERT INTO operator_roles (operator_id, role_id, granted_by, granted_at) VALUES
('e0000000-0000-4000-8000-000000000020', '10000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000023', NOW() - INTERVAL '50 days'),
('e0000000-0000-4000-8000-000000000021', '10000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000023', NOW() - INTERVAL '35 days'),
('e0000000-0000-4000-8000-000000000022', '10000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000023', NOW() - INTERVAL '48 days'),
('e0000000-0000-4000-8000-000000000023', '10000000-0000-4000-8000-000000000003', NULL, NOW() - INTERVAL '60 days');

-- TPA operator roles
INSERT INTO operator_roles (operator_id, role_id, granted_by, granted_at) VALUES
('e0000000-0000-4000-8000-000000000030', '10000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000033', NOW() - INTERVAL '30 days'),
('e0000000-0000-4000-8000-000000000031', '10000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000033', NOW() - INTERVAL '28 days'),
('e0000000-0000-4000-8000-000000000032', '10000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000033', NOW() - INTERVAL '32 days'),
('e0000000-0000-4000-8000-000000000033', '10000000-0000-4000-8000-000000000003', NULL, NOW() - INTERVAL '60 days');

------------------------------------------------------------
-- 19. Audit Log (recent activity per facility)
------------------------------------------------------------
INSERT INTO audit_log (event_time, actor_id, actor_email, actor_ip, actor_user_agent, facility_id, action, resource_type, resource_id, before_state, after_state, outcome, session_id, request_id) VALUES
-- DFW activity
(NOW() - INTERVAL '6 hours', 'e0000000-0000-4000-8000-000000000013', 'dfw-admin@soterion.io', '10.10.1.1', 'Mozilla/5.0 Chrome/122', 'f0000000-0000-4000-8000-000000000002', 'auth.login', 'operator', 'e0000000-0000-4000-8000-000000000013', NULL, '{"role":"admin"}', 'SUCCESS', NULL, uuid_generate_v4()),
(NOW() - INTERVAL '5 hours 30 minutes', 'e0000000-0000-4000-8000-000000000010', 'marcus.j@soterion.io', '10.10.1.10', 'Mozilla/5.0 Chrome/122', 'f0000000-0000-4000-8000-000000000002', 'auth.login', 'operator', 'e0000000-0000-4000-8000-000000000010', NULL, '{"role":"operator"}', 'SUCCESS', NULL, uuid_generate_v4()),
(NOW() - INTERVAL '2 hours 20 minutes', 'e0000000-0000-4000-8000-000000000012', 'david.k@soterion.io', '10.10.1.12', 'Mozilla/5.0 Safari/17', 'f0000000-0000-4000-8000-000000000002', 'alert.acknowledge', 'anomaly_event', NULL, '{"acknowledged":false}', '{"acknowledged":true}', 'SUCCESS', NULL, uuid_generate_v4()),
(NOW() - INTERVAL '1 hour', 'e0000000-0000-4000-8000-000000000013', 'dfw-admin@soterion.io', '10.10.1.1', 'Mozilla/5.0 Chrome/122', 'f0000000-0000-4000-8000-000000000002', 'sensor.update', 'sensor_node', 'd0000000-0000-4000-8000-000000000023', '{"health":"OFFLINE"}', '{"health":"DEGRADED"}', 'SUCCESS', NULL, uuid_generate_v4()),

-- IAH activity
(NOW() - INTERVAL '7 hours', 'e0000000-0000-4000-8000-000000000023', 'iah-admin@soterion.io', '10.20.1.1', 'Mozilla/5.0 Chrome/122', 'f0000000-0000-4000-8000-000000000003', 'auth.login', 'operator', 'e0000000-0000-4000-8000-000000000023', NULL, '{"role":"admin"}', 'SUCCESS', NULL, uuid_generate_v4()),
(NOW() - INTERVAL '6 hours 45 minutes', 'e0000000-0000-4000-8000-000000000020', 'sofia.r@soterion.io', '10.20.1.20', 'Mozilla/5.0 Firefox/123', 'f0000000-0000-4000-8000-000000000003', 'auth.login', 'operator', 'e0000000-0000-4000-8000-000000000020', NULL, '{"role":"operator"}', 'SUCCESS', NULL, uuid_generate_v4()),
(NOW() - INTERVAL '50 minutes', 'e0000000-0000-4000-8000-000000000022', 'linda.w@soterion.io', '10.20.1.22', 'Mozilla/5.0 Safari/17', 'f0000000-0000-4000-8000-000000000003', 'alert.escalate', 'anomaly_event', NULL, '{"escalated":false}', '{"escalated":true}', 'SUCCESS', NULL, uuid_generate_v4()),
(NOW() - INTERVAL '30 minutes', NULL, 'unknown@probe.net', '203.0.113.50', 'curl/8.4.0', 'f0000000-0000-4000-8000-000000000003', 'auth.login', 'operator', NULL, NULL, NULL, 'FAILURE', NULL, uuid_generate_v4()),

-- TPA activity
(NOW() - INTERVAL '5 hours', 'e0000000-0000-4000-8000-000000000033', 'tpa-admin@soterion.io', '10.30.1.1', 'Mozilla/5.0 Chrome/122', 'f0000000-0000-4000-8000-000000000004', 'auth.login', 'operator', 'e0000000-0000-4000-8000-000000000033', NULL, '{"role":"admin"}', 'SUCCESS', NULL, uuid_generate_v4()),
(NOW() - INTERVAL '4 hours 50 minutes', 'e0000000-0000-4000-8000-000000000030', 'jake.p@soterion.io', '10.30.1.30', 'Mozilla/5.0 Chrome/122', 'f0000000-0000-4000-8000-000000000004', 'auth.login', 'operator', 'e0000000-0000-4000-8000-000000000030', NULL, '{"role":"operator"}', 'SUCCESS', NULL, uuid_generate_v4()),
(NOW() - INTERVAL '1 hour 15 minutes', 'e0000000-0000-4000-8000-000000000032', 'nick.s@soterion.io', '10.30.1.32', 'Mozilla/5.0 Safari/17', 'f0000000-0000-4000-8000-000000000004', 'alert.acknowledge', 'anomaly_event', NULL, '{"acknowledged":false}', '{"acknowledged":true}', 'SUCCESS', NULL, uuid_generate_v4()),
(NOW() - INTERVAL '45 minutes', 'e0000000-0000-4000-8000-000000000033', 'tpa-admin@soterion.io', '10.30.1.1', 'Mozilla/5.0 Chrome/122', 'f0000000-0000-4000-8000-000000000004', 'retention.update', 'retention_policy', NULL, '{"retention_days":60}', '{"retention_days":90}', 'SUCCESS', NULL, uuid_generate_v4());
