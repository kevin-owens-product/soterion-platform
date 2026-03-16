-- seed_verticals.sql
-- Multi-vertical demo data for Soterion AI Platform
-- Covers: Seaport, Stadium, Transit Hub, Hospital

------------------------------------------------------------
-- 1. SEAPORT — Port of Felixstowe
------------------------------------------------------------
INSERT INTO facilities (id, name, type, short_code, address, country_code, timezone, config)
VALUES (
    'f1000000-0000-4000-8000-000000000001',
    'Port of Felixstowe',
    'SEAPORT',
    'FXT',
    'Dock Gate 1, Felixstowe IP11 3SY, United Kingdom',
    'GB',
    'Europe/London',
    '{
        "berths": 24,
        "annual_teu": 4000000,
        "quay_length_m": 3700,
        "container_cranes": 33
    }'::jsonb
);

INSERT INTO terminals (id, airport_id, name) VALUES
('t1000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000001', 'Trinity Terminal');

INSERT INTO zones (id, terminal_id, name, type, sla_wait_mins) VALUES
('z1000000-0000-4000-8000-000000000001', 't1000000-0000-4000-8000-000000000001', 'Berth 1-4', 'berth', 30),
('z1000000-0000-4000-8000-000000000002', 't1000000-0000-4000-8000-000000000001', 'Container Yard A', 'yard', 20),
('z1000000-0000-4000-8000-000000000003', 't1000000-0000-4000-8000-000000000001', 'Gate In', 'gate', 10),
('z1000000-0000-4000-8000-000000000004', 't1000000-0000-4000-8000-000000000001', 'Gate Out', 'gate', 10),
('z1000000-0000-4000-8000-000000000005', 't1000000-0000-4000-8000-000000000001', 'Customs Inspection', 'warehouse', 25),
('z1000000-0000-4000-8000-000000000006', 't1000000-0000-4000-8000-000000000001', 'Reefer Zone', 'yard', 15),
('z1000000-0000-4000-8000-000000000007', 't1000000-0000-4000-8000-000000000001', 'Restricted Quayside', 'restricted', 5);

-- 8 sensors for Felixstowe
INSERT INTO sensor_nodes (id, zone_id, label, model, health, last_ping_at) VALUES
('s1000000-0000-4000-8000-000000000001', 'z1000000-0000-4000-8000-000000000001', 'FXT-S001', 'Hesai JT128', 'ONLINE', NOW() - INTERVAL '10 seconds'),
('s1000000-0000-4000-8000-000000000002', 'z1000000-0000-4000-8000-000000000001', 'FXT-S002', 'Hesai JT128', 'ONLINE', NOW() - INTERVAL '15 seconds'),
('s1000000-0000-4000-8000-000000000003', 'z1000000-0000-4000-8000-000000000002', 'FXT-S003', 'Ouster OS1-128', 'ONLINE', NOW() - INTERVAL '8 seconds'),
('s1000000-0000-4000-8000-000000000004', 'z1000000-0000-4000-8000-000000000003', 'FXT-S004', 'Ouster OS1-128', 'ONLINE', NOW() - INTERVAL '5 seconds'),
('s1000000-0000-4000-8000-000000000005', 'z1000000-0000-4000-8000-000000000004', 'FXT-S005', 'Hesai JT128', 'DEGRADED', NOW() - INTERVAL '3 minutes'),
('s1000000-0000-4000-8000-000000000006', 'z1000000-0000-4000-8000-000000000005', 'FXT-S006', 'Hesai JT128', 'ONLINE', NOW() - INTERVAL '20 seconds'),
('s1000000-0000-4000-8000-000000000007', 'z1000000-0000-4000-8000-000000000006', 'FXT-S007', 'Ouster OS1-128', 'ONLINE', NOW() - INTERVAL '12 seconds'),
('s1000000-0000-4000-8000-000000000008', 'z1000000-0000-4000-8000-000000000007', 'FXT-S008', 'Hesai JT128', 'ONLINE', NOW() - INTERVAL '7 seconds');

-- Seaport KPIs
INSERT INTO kpi_definitions (id, facility_type, key, label, unit, direction, default_target) VALUES
(uuid_generate_v4(), 'SEAPORT', 'vessel_turnaround_mins', 'Vessel Turnaround Time', 'minutes', 'lower_better', 480),
(uuid_generate_v4(), 'SEAPORT', 'container_dwell_hrs', 'Container Dwell Time', 'hours', 'lower_better', 72),
(uuid_generate_v4(), 'SEAPORT', 'gate_throughput_per_hr', 'Gate Throughput', 'vehicles/hr', 'higher_better', 60),
(uuid_generate_v4(), 'SEAPORT', 'crane_moves_per_hr', 'Crane Moves per Hour', 'moves/hr', 'higher_better', 30),
(uuid_generate_v4(), 'SEAPORT', 'security_incident_rate', 'Security Incident Rate', 'per_1000_moves', 'lower_better', 0.5);

-- Seaport operators
INSERT INTO operators (id, airport_id, name, email, password_hash, role, team) VALUES
('op100000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000001', 'Tom H.', 'tom.h@soterion.io', '$2b$12$LJ3m4ys3Lf0ZVh4fKJQfNOkHZP8Fk4fGSQj8MJvXrQl5b0GNjKWe', 'operator', 'Quay'),
('op100000-0000-4000-8000-000000000002', 'f1000000-0000-4000-8000-000000000001', 'Sarah M.', 'sarah.m@soterion.io', '$2b$12$LJ3m4ys3Lf0ZVh4fKJQfNOkHZP8Fk4fGSQj8MJvXrQl5b0GNjKWe', 'supervisor', 'Quay');

------------------------------------------------------------
-- 2. STADIUM — Wembley Stadium
------------------------------------------------------------
INSERT INTO facilities (id, name, type, short_code, address, country_code, timezone, config)
VALUES (
    'f2000000-0000-4000-8000-000000000001',
    'Wembley Stadium',
    'STADIUM',
    'WEM',
    'Wembley, London HA9 0WS, United Kingdom',
    'GB',
    'Europe/London',
    '{
        "capacity": 90000,
        "stands": 4,
        "turnstiles": 166,
        "concourses": 6
    }'::jsonb
);

INSERT INTO terminals (id, airport_id, name) VALUES
('t2000000-0000-4000-8000-000000000001', 'f2000000-0000-4000-8000-000000000001', 'Main Bowl');

INSERT INTO zones (id, terminal_id, name, type, sla_wait_mins) VALUES
('z2000000-0000-4000-8000-000000000001', 't2000000-0000-4000-8000-000000000001', 'Turnstile Bank A', 'entrance', 8),
('z2000000-0000-4000-8000-000000000002', 't2000000-0000-4000-8000-000000000001', 'North Concourse', 'concourse', 15),
('z2000000-0000-4000-8000-000000000003', 't2000000-0000-4000-8000-000000000001', 'South Stand', 'seating', 20),
('z2000000-0000-4000-8000-000000000004', 't2000000-0000-4000-8000-000000000001', 'Pitch Perimeter', 'seating', 5),
('z2000000-0000-4000-8000-000000000005', 't2000000-0000-4000-8000-000000000001', 'Concession Level 2', 'concession', 10),
('z2000000-0000-4000-8000-000000000006', 't2000000-0000-4000-8000-000000000001', 'Club Wembley VIP', 'concourse', 15),
('z2000000-0000-4000-8000-000000000007', 't2000000-0000-4000-8000-000000000001', 'Emergency Exit NW', 'entrance', 3);

-- 12 sensors for Wembley
INSERT INTO sensor_nodes (id, zone_id, label, model, health, last_ping_at) VALUES
('s2000000-0000-4000-8000-000000000001', 'z2000000-0000-4000-8000-000000000001', 'WEM-S001', 'Hesai JT128', 'ONLINE', NOW() - INTERVAL '5 seconds'),
('s2000000-0000-4000-8000-000000000002', 'z2000000-0000-4000-8000-000000000001', 'WEM-S002', 'Hesai JT128', 'ONLINE', NOW() - INTERVAL '8 seconds'),
('s2000000-0000-4000-8000-000000000003', 'z2000000-0000-4000-8000-000000000002', 'WEM-S003', 'Ouster OS1-128', 'ONLINE', NOW() - INTERVAL '12 seconds'),
('s2000000-0000-4000-8000-000000000004', 'z2000000-0000-4000-8000-000000000002', 'WEM-S004', 'Ouster OS1-128', 'ONLINE', NOW() - INTERVAL '3 seconds'),
('s2000000-0000-4000-8000-000000000005', 'z2000000-0000-4000-8000-000000000003', 'WEM-S005', 'Hesai JT128', 'ONLINE', NOW() - INTERVAL '15 seconds'),
('s2000000-0000-4000-8000-000000000006', 'z2000000-0000-4000-8000-000000000003', 'WEM-S006', 'Hesai JT128', 'DEGRADED', NOW() - INTERVAL '2 minutes'),
('s2000000-0000-4000-8000-000000000007', 'z2000000-0000-4000-8000-000000000004', 'WEM-S007', 'Ouster OS1-128', 'ONLINE', NOW() - INTERVAL '7 seconds'),
('s2000000-0000-4000-8000-000000000008', 'z2000000-0000-4000-8000-000000000005', 'WEM-S008', 'Hesai JT128', 'ONLINE', NOW() - INTERVAL '10 seconds'),
('s2000000-0000-4000-8000-000000000009', 'z2000000-0000-4000-8000-000000000005', 'WEM-S009', 'Hesai JT128', 'ONLINE', NOW() - INTERVAL '20 seconds'),
('s2000000-0000-4000-8000-000000000010', 'z2000000-0000-4000-8000-000000000006', 'WEM-S010', 'Ouster OS1-128', 'ONLINE', NOW() - INTERVAL '6 seconds'),
('s2000000-0000-4000-8000-000000000011', 'z2000000-0000-4000-8000-000000000007', 'WEM-S011', 'Hesai JT128', 'ONLINE', NOW() - INTERVAL '4 seconds'),
('s2000000-0000-4000-8000-000000000012', 'z2000000-0000-4000-8000-000000000007', 'WEM-S012', 'Hesai JT128', 'ONLINE', NOW() - INTERVAL '9 seconds');

-- Stadium KPIs
INSERT INTO kpi_definitions (id, facility_type, key, label, unit, direction, default_target) VALUES
(uuid_generate_v4(), 'STADIUM', 'ingress_rate_per_min', 'Ingress Rate', 'people/min', 'higher_better', 500),
(uuid_generate_v4(), 'STADIUM', 'crowd_density_pct', 'Crowd Density', 'percent', 'lower_better', 80),
(uuid_generate_v4(), 'STADIUM', 'egress_clearance_mins', 'Egress Clearance Time', 'minutes', 'lower_better', 20),
(uuid_generate_v4(), 'STADIUM', 'turnstile_throughput', 'Turnstile Throughput', 'people/min/gate', 'higher_better', 15),
(uuid_generate_v4(), 'STADIUM', 'concession_queue_mins', 'Concession Queue Time', 'minutes', 'lower_better', 5);

-- Stadium operators
INSERT INTO operators (id, airport_id, name, email, password_hash, role, team) VALUES
('op200000-0000-4000-8000-000000000001', 'f2000000-0000-4000-8000-000000000001', 'Dave R.', 'dave.r@soterion.io', '$2b$12$LJ3m4ys3Lf0ZVh4fKJQfNOkHZP8Fk4fGSQj8MJvXrQl5b0GNjKWe', 'operator', 'North'),
('op200000-0000-4000-8000-000000000002', 'f2000000-0000-4000-8000-000000000001', 'Lisa K.', 'lisa.k@soterion.io', '$2b$12$LJ3m4ys3Lf0ZVh4fKJQfNOkHZP8Fk4fGSQj8MJvXrQl5b0GNjKWe', 'operator', 'South'),
('op200000-0000-4000-8000-000000000003', 'f2000000-0000-4000-8000-000000000001', 'Mark T.', 'mark.t@soterion.io', '$2b$12$LJ3m4ys3Lf0ZVh4fKJQfNOkHZP8Fk4fGSQj8MJvXrQl5b0GNjKWe', 'supervisor', 'Control');

------------------------------------------------------------
-- 3. TRANSIT HUB — King's Cross Station
------------------------------------------------------------
INSERT INTO facilities (id, name, type, short_code, address, country_code, timezone, config)
VALUES (
    'f3000000-0000-4000-8000-000000000001',
    'King''s Cross Station',
    'TRANSIT_HUB',
    'KGX',
    'Euston Road, London N1 9AL, United Kingdom',
    'GB',
    'Europe/London',
    '{
        "platforms": 12,
        "daily_passengers": 170000,
        "underground_lines": 6,
        "interchange_stations": 3
    }'::jsonb
);

INSERT INTO terminals (id, airport_id, name) VALUES
('t3000000-0000-4000-8000-000000000001', 'f3000000-0000-4000-8000-000000000001', 'Main Concourse');

INSERT INTO zones (id, terminal_id, name, type, sla_wait_mins) VALUES
('z3000000-0000-4000-8000-000000000001', 't3000000-0000-4000-8000-000000000001', 'Platform 1-4', 'platform', 5),
('z3000000-0000-4000-8000-000000000002', 't3000000-0000-4000-8000-000000000001', 'Main Concourse', 'concourse', 10),
('z3000000-0000-4000-8000-000000000003', 't3000000-0000-4000-8000-000000000001', 'Ticket Hall', 'ticketing', 8),
('z3000000-0000-4000-8000-000000000004', 't3000000-0000-4000-8000-000000000001', 'Fare Barrier East', 'entrance', 3),
('z3000000-0000-4000-8000-000000000005', 't3000000-0000-4000-8000-000000000001', 'Underground Interchange', 'concourse', 8),
('z3000000-0000-4000-8000-000000000006', 't3000000-0000-4000-8000-000000000001', 'Trackside Zone', 'platform', 2);

-- 8 sensors for King's Cross
INSERT INTO sensor_nodes (id, zone_id, label, model, health, last_ping_at) VALUES
('s3000000-0000-4000-8000-000000000001', 'z3000000-0000-4000-8000-000000000001', 'KGX-S001', 'Hesai JT128', 'ONLINE', NOW() - INTERVAL '5 seconds'),
('s3000000-0000-4000-8000-000000000002', 'z3000000-0000-4000-8000-000000000001', 'KGX-S002', 'Hesai JT128', 'ONLINE', NOW() - INTERVAL '8 seconds'),
('s3000000-0000-4000-8000-000000000003', 'z3000000-0000-4000-8000-000000000002', 'KGX-S003', 'Ouster OS1-128', 'ONLINE', NOW() - INTERVAL '3 seconds'),
('s3000000-0000-4000-8000-000000000004', 'z3000000-0000-4000-8000-000000000003', 'KGX-S004', 'Ouster OS1-128', 'ONLINE', NOW() - INTERVAL '12 seconds'),
('s3000000-0000-4000-8000-000000000005', 'z3000000-0000-4000-8000-000000000004', 'KGX-S005', 'Hesai JT128', 'ONLINE', NOW() - INTERVAL '6 seconds'),
('s3000000-0000-4000-8000-000000000006', 'z3000000-0000-4000-8000-000000000004', 'KGX-S006', 'Hesai JT128', 'DEGRADED', NOW() - INTERVAL '4 minutes'),
('s3000000-0000-4000-8000-000000000007', 'z3000000-0000-4000-8000-000000000005', 'KGX-S007', 'Ouster OS1-128', 'ONLINE', NOW() - INTERVAL '10 seconds'),
('s3000000-0000-4000-8000-000000000008', 'z3000000-0000-4000-8000-000000000006', 'KGX-S008', 'Hesai JT128', 'ONLINE', NOW() - INTERVAL '7 seconds');

-- Transit Hub KPIs
INSERT INTO kpi_definitions (id, facility_type, key, label, unit, direction, default_target) VALUES
(uuid_generate_v4(), 'TRANSIT_HUB', 'platform_density_pct', 'Platform Density', 'percent', 'lower_better', 70),
(uuid_generate_v4(), 'TRANSIT_HUB', 'barrier_throughput_per_min', 'Barrier Throughput', 'people/min', 'higher_better', 25),
(uuid_generate_v4(), 'TRANSIT_HUB', 'interchange_flow_rate', 'Interchange Flow Rate', 'people/min', 'higher_better', 200),
(uuid_generate_v4(), 'TRANSIT_HUB', 'platform_dwell_secs', 'Platform Dwell Time', 'seconds', 'lower_better', 180),
(uuid_generate_v4(), 'TRANSIT_HUB', 'trackside_intrusion_count', 'Trackside Intrusions', 'events/day', 'lower_better', 0);

-- Transit Hub operators
INSERT INTO operators (id, airport_id, name, email, password_hash, role, team) VALUES
('op300000-0000-4000-8000-000000000001', 'f3000000-0000-4000-8000-000000000001', 'Raj P.', 'raj.p@soterion.io', '$2b$12$LJ3m4ys3Lf0ZVh4fKJQfNOkHZP8Fk4fGSQj8MJvXrQl5b0GNjKWe', 'operator', 'Mainline'),
('op300000-0000-4000-8000-000000000002', 'f3000000-0000-4000-8000-000000000001', 'Emma W.', 'emma.w@soterion.io', '$2b$12$LJ3m4ys3Lf0ZVh4fKJQfNOkHZP8Fk4fGSQj8MJvXrQl5b0GNjKWe', 'supervisor', 'Control');

------------------------------------------------------------
-- 4. HOSPITAL — St Thomas' Hospital
------------------------------------------------------------
INSERT INTO facilities (id, name, type, short_code, address, country_code, timezone, config)
VALUES (
    'f4000000-0000-4000-8000-000000000001',
    'St Thomas'' Hospital',
    'HOSPITAL',
    'STH',
    'Westminster Bridge Road, London SE1 7EH, United Kingdom',
    'GB',
    'Europe/London',
    '{
        "beds": 840,
        "departments": 42,
        "wards": 28,
        "emergency_bays": 60
    }'::jsonb
);

INSERT INTO terminals (id, airport_id, name) VALUES
('t4000000-0000-4000-8000-000000000001', 'f4000000-0000-4000-8000-000000000001', 'North Wing');

INSERT INTO zones (id, terminal_id, name, type, sla_wait_mins) VALUES
('z4000000-0000-4000-8000-000000000001', 't4000000-0000-4000-8000-000000000001', 'Emergency Department', 'er', 5),
('z4000000-0000-4000-8000-000000000002', 't4000000-0000-4000-8000-000000000001', 'Ward 6 - Cardiology', 'ward', 15),
('z4000000-0000-4000-8000-000000000003', 't4000000-0000-4000-8000-000000000001', 'Main Reception', 'lobby', 10),
('z4000000-0000-4000-8000-000000000004', 't4000000-0000-4000-8000-000000000001', 'Operating Theatre 3', 'restricted', 3),
('z4000000-0000-4000-8000-000000000005', 't4000000-0000-4000-8000-000000000001', 'Pharmacy', 'pharmacy', 12),
('z4000000-0000-4000-8000-000000000006', 't4000000-0000-4000-8000-000000000001', 'Car Park B', 'parking', 20),
('z4000000-0000-4000-8000-000000000007', 't4000000-0000-4000-8000-000000000001', 'Main Corridor E2', 'lobby', 10);

-- 6 sensors for St Thomas'
INSERT INTO sensor_nodes (id, zone_id, label, model, health, last_ping_at) VALUES
('s4000000-0000-4000-8000-000000000001', 'z4000000-0000-4000-8000-000000000001', 'STH-S001', 'Hesai JT128', 'ONLINE', NOW() - INTERVAL '3 seconds'),
('s4000000-0000-4000-8000-000000000002', 'z4000000-0000-4000-8000-000000000001', 'STH-S002', 'Hesai JT128', 'ONLINE', NOW() - INTERVAL '10 seconds'),
('s4000000-0000-4000-8000-000000000003', 'z4000000-0000-4000-8000-000000000003', 'STH-S003', 'Ouster OS1-128', 'ONLINE', NOW() - INTERVAL '5 seconds'),
('s4000000-0000-4000-8000-000000000004', 'z4000000-0000-4000-8000-000000000004', 'STH-S004', 'Hesai JT128', 'ONLINE', NOW() - INTERVAL '7 seconds'),
('s4000000-0000-4000-8000-000000000005', 'z4000000-0000-4000-8000-000000000005', 'STH-S005', 'Ouster OS1-128', 'DEGRADED', NOW() - INTERVAL '5 minutes'),
('s4000000-0000-4000-8000-000000000006', 'z4000000-0000-4000-8000-000000000006', 'STH-S006', 'Hesai JT128', 'ONLINE', NOW() - INTERVAL '15 seconds');

-- Hospital KPIs
INSERT INTO kpi_definitions (id, facility_type, key, label, unit, direction, default_target) VALUES
(uuid_generate_v4(), 'HOSPITAL', 'emergency_wait_mins', 'Emergency Wait Time', 'minutes', 'lower_better', 15),
(uuid_generate_v4(), 'HOSPITAL', 'restricted_access_events', 'Restricted Access Events', 'events/day', 'lower_better', 0),
(uuid_generate_v4(), 'HOSPITAL', 'asset_location_accuracy', 'Asset Location Accuracy', 'percent', 'higher_better', 95),
(uuid_generate_v4(), 'HOSPITAL', 'corridor_density_pct', 'Corridor Density', 'percent', 'lower_better', 60),
(uuid_generate_v4(), 'HOSPITAL', 'pharmacy_queue_mins', 'Pharmacy Queue Time', 'minutes', 'lower_better', 10);

-- Hospital operators
INSERT INTO operators (id, airport_id, name, email, password_hash, role, team) VALUES
('op400000-0000-4000-8000-000000000001', 'f4000000-0000-4000-8000-000000000001', 'Dr. Kim N.', 'kim.n@soterion.io', '$2b$12$LJ3m4ys3Lf0ZVh4fKJQfNOkHZP8Fk4fGSQj8MJvXrQl5b0GNjKWe', 'supervisor', 'Security'),
('op400000-0000-4000-8000-000000000002', 'f4000000-0000-4000-8000-000000000001', 'Alex B.', 'alex.b@soterion.io', '$2b$12$LJ3m4ys3Lf0ZVh4fKJQfNOkHZP8Fk4fGSQj8MJvXrQl5b0GNjKWe', 'operator', 'Security');

------------------------------------------------------------
-- 5. Compliance Frameworks per Vertical
------------------------------------------------------------

-- SEAPORT: ISO 28000 + ISPS Code
INSERT INTO compliance_frameworks (id, facility_type, framework_key, label, rules) VALUES
(uuid_generate_v4(), 'SEAPORT', 'ISO_28000',
 'ISO 28000 — Supply Chain Security',
 '[
    {"rule": "4.4.1", "description": "Operational control of security management"},
    {"rule": "4.4.6", "description": "Security threat assessment and scenario planning"},
    {"rule": "4.5.1", "description": "Security performance monitoring and measurement"}
  ]'::jsonb),
(uuid_generate_v4(), 'SEAPORT', 'ISPS_CODE',
 'ISPS Code — International Ship and Port Facility Security',
 '[
    {"rule": "Part A 14", "description": "Port facility security assessment"},
    {"rule": "Part A 16", "description": "Port facility security plan"},
    {"rule": "Part B 16.3", "description": "Restricted area monitoring and access control"}
  ]'::jsonb);

-- STADIUM: Green Guide + UEFA Safety Regulations
INSERT INTO compliance_frameworks (id, facility_type, framework_key, label, rules) VALUES
(uuid_generate_v4(), 'STADIUM', 'GREEN_GUIDE',
 'Guide to Safety at Sports Grounds (Green Guide)',
 '[
    {"rule": "Chapter 2", "description": "Capacity and flow rate calculations"},
    {"rule": "Chapter 9", "description": "Stewarding and safety management"},
    {"rule": "Chapter 11", "description": "Emergency planning and evacuation procedures"}
  ]'::jsonb),
(uuid_generate_v4(), 'STADIUM', 'UEFA_SAFETY',
 'UEFA Safety and Security Regulations',
 '[
    {"rule": "Art. 30", "description": "Structural safety of stadiums"},
    {"rule": "Art. 35", "description": "Spectator safety inside the stadium"},
    {"rule": "Art. 38", "description": "Evacuation planning and crowd management"}
  ]'::jsonb);

-- TRANSIT_HUB: Railway Safety + NR Standards
INSERT INTO compliance_frameworks (id, facility_type, framework_key, label, rules) VALUES
(uuid_generate_v4(), 'TRANSIT_HUB', 'ROGS_2006',
 'Railways and Other Guided Transport Systems (Safety) Regulations 2006',
 '[
    {"rule": "Reg. 5", "description": "Safety management system requirements"},
    {"rule": "Reg. 19", "description": "Risk assessment for station operations"},
    {"rule": "Reg. 22", "description": "Safety verification of new works and equipment"}
  ]'::jsonb),
(uuid_generate_v4(), 'TRANSIT_HUB', 'NR_STANDARDS',
 'Network Rail Station Standards',
 '[
    {"rule": "NR/L2/CIV/003", "description": "Platform edge safety and gap monitoring"},
    {"rule": "NR/L3/MTC/0220", "description": "Station crowd management procedures"},
    {"rule": "NR/GN/CIV/300", "description": "Guidance on station safety barriers"}
  ]'::jsonb);

-- HOSPITAL: CQC + NHS Security
INSERT INTO compliance_frameworks (id, facility_type, framework_key, label, rules) VALUES
(uuid_generate_v4(), 'HOSPITAL', 'CQC',
 'Care Quality Commission Standards',
 '[
    {"rule": "Reg. 12", "description": "Safe care and treatment"},
    {"rule": "Reg. 13", "description": "Safeguarding service users from abuse"},
    {"rule": "Reg. 15", "description": "Premises and equipment safety"}
  ]'::jsonb),
(uuid_generate_v4(), 'HOSPITAL', 'NHS_PROTECT',
 'NHS Security Standards',
 '[
    {"rule": "Standard 1.1", "description": "Security management director appointment"},
    {"rule": "Standard 3.2", "description": "Lone worker protection policy"},
    {"rule": "Standard 4.1", "description": "Physical security of controlled drugs and assets"}
  ]'::jsonb);

------------------------------------------------------------
-- 6. ML Model Registry Stubs per Vertical
------------------------------------------------------------
INSERT INTO ml_model_registry (id, facility_type, model_key, onnx_s3_key, version, active, deployed_at) VALUES
-- SEAPORT
(uuid_generate_v4(), 'SEAPORT', 'vessel_proximity_detector', 's3://soterion-models/seaport/vessel_proximity_v1.onnx', '1.0.0', TRUE, NOW()),
(uuid_generate_v4(), 'SEAPORT', 'container_anomaly_classifier', 's3://soterion-models/seaport/container_anomaly_v1.onnx', '1.0.0', TRUE, NOW()),
(uuid_generate_v4(), 'SEAPORT', 'vehicle_intrusion_detector', 's3://soterion-models/seaport/vehicle_intrusion_v1.onnx', '1.0.0', TRUE, NOW()),

-- STADIUM
(uuid_generate_v4(), 'STADIUM', 'crowd_density_estimator', 's3://soterion-models/stadium/crowd_density_v1.onnx', '1.0.0', TRUE, NOW()),
(uuid_generate_v4(), 'STADIUM', 'stampede_risk_classifier', 's3://soterion-models/stadium/stampede_risk_v1.onnx', '1.0.0', TRUE, NOW()),
(uuid_generate_v4(), 'STADIUM', 'pitch_intrusion_detector', 's3://soterion-models/stadium/pitch_intrusion_v1.onnx', '1.0.0', TRUE, NOW()),

-- TRANSIT_HUB
(uuid_generate_v4(), 'TRANSIT_HUB', 'platform_edge_detector', 's3://soterion-models/transit/platform_edge_v1.onnx', '1.0.0', TRUE, NOW()),
(uuid_generate_v4(), 'TRANSIT_HUB', 'crowd_flow_analyzer', 's3://soterion-models/transit/crowd_flow_v1.onnx', '1.0.0', TRUE, NOW()),
(uuid_generate_v4(), 'TRANSIT_HUB', 'abandoned_bag_detector', 's3://soterion-models/transit/abandoned_bag_v1.onnx', '1.0.0', TRUE, NOW()),

-- HOSPITAL
(uuid_generate_v4(), 'HOSPITAL', 'restricted_area_monitor', 's3://soterion-models/hospital/restricted_area_v1.onnx', '1.0.0', TRUE, NOW()),
(uuid_generate_v4(), 'HOSPITAL', 'patient_fall_detector', 's3://soterion-models/hospital/patient_fall_v1.onnx', '1.0.0', TRUE, NOW()),
(uuid_generate_v4(), 'HOSPITAL', 'asset_tracker', 's3://soterion-models/hospital/asset_tracker_v1.onnx', '1.0.0', TRUE, NOW());

------------------------------------------------------------
-- 7. Vertical-Specific Badge Definitions
------------------------------------------------------------
INSERT INTO badge_definitions (id, key, name, description, icon, category) VALUES
-- SEAPORT
(uuid_generate_v4(), 'IRON_QUAY',
 'Iron Quay', 'Zero vehicle incidents across quayside zones for an entire shift', 'anchor', 'vertical'),
(uuid_generate_v4(), 'GATE_MASTER',
 'Gate Master', 'Maintained gate throughput above target for 24 consecutive hours', 'gate', 'vertical'),

-- STADIUM
(uuid_generate_v4(), 'CROWD_GUARDIAN',
 'Crowd Guardian', 'Crowd density maintained below threshold across all zones during a full event', 'users', 'vertical'),
(uuid_generate_v4(), 'SAFE_EGRESS',
 'Safe Egress', 'Egress clearance time under target for 5 consecutive events', 'log-out', 'vertical'),

-- TRANSIT_HUB
(uuid_generate_v4(), 'PLATFORM_ZERO',
 'Platform Zero', 'Zero platform edge incidents during a full shift', 'train', 'vertical'),
(uuid_generate_v4(), 'FLOW_KEEPER',
 'Flow Keeper', 'Interchange flow rate above target for 8 consecutive hours', 'git-merge', 'vertical'),

-- HOSPITAL
(uuid_generate_v4(), 'WARD_PROTECTOR',
 'Ward Protector', 'Zero restricted access breaches during a full shift', 'heart-pulse', 'vertical'),
(uuid_generate_v4(), 'RAPID_RESPONSE',
 'Rapid Response', 'All emergency zone alerts acknowledged within 30 seconds for an entire shift', 'activity', 'vertical');

------------------------------------------------------------
-- 8. Zone Type Definitions for additional zone types
-- (Extending seed.sql which already has base zone types)
------------------------------------------------------------

-- Additional SEAPORT zone types
INSERT INTO zone_type_definitions (id, facility_type, key, label, default_sla) VALUES
(uuid_generate_v4(), 'SEAPORT', 'customs', 'Customs Inspection', '{"wait_mins": 25}'),
(uuid_generate_v4(), 'SEAPORT', 'reefer', 'Reefer Zone', '{"wait_mins": 15}'),
(uuid_generate_v4(), 'SEAPORT', 'quayside', 'Quayside', '{"wait_mins": 10}')
ON CONFLICT (facility_type, key) DO NOTHING;

-- Additional STADIUM zone types
INSERT INTO zone_type_definitions (id, facility_type, key, label, default_sla) VALUES
(uuid_generate_v4(), 'STADIUM', 'pitch_perimeter', 'Pitch Perimeter', '{"wait_mins": 5}'),
(uuid_generate_v4(), 'STADIUM', 'vip', 'VIP Area', '{"wait_mins": 15}'),
(uuid_generate_v4(), 'STADIUM', 'emergency_exit', 'Emergency Exit', '{"wait_mins": 3}'),
(uuid_generate_v4(), 'STADIUM', 'turnstile', 'Turnstile Bank', '{"wait_mins": 8}')
ON CONFLICT (facility_type, key) DO NOTHING;

-- Additional TRANSIT_HUB zone types
INSERT INTO zone_type_definitions (id, facility_type, key, label, default_sla) VALUES
(uuid_generate_v4(), 'TRANSIT_HUB', 'fare_barrier', 'Fare Barrier', '{"wait_mins": 3}'),
(uuid_generate_v4(), 'TRANSIT_HUB', 'interchange', 'Interchange', '{"wait_mins": 8}'),
(uuid_generate_v4(), 'TRANSIT_HUB', 'trackside', 'Trackside Zone', '{"wait_mins": 2}')
ON CONFLICT (facility_type, key) DO NOTHING;

-- Additional HOSPITAL zone types
INSERT INTO zone_type_definitions (id, facility_type, key, label, default_sla) VALUES
(uuid_generate_v4(), 'HOSPITAL', 'theatre', 'Operating Theatre', '{"wait_mins": 3}'),
(uuid_generate_v4(), 'HOSPITAL', 'corridor', 'Corridor', '{"wait_mins": 10}'),
(uuid_generate_v4(), 'HOSPITAL', 'car_park', 'Car Park', '{"wait_mins": 20}'),
(uuid_generate_v4(), 'HOSPITAL', 'reception', 'Reception', '{"wait_mins": 10}')
ON CONFLICT (facility_type, key) DO NOTHING;
