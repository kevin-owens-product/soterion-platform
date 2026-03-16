-- seed_demo.sql
-- Populates Soterion dashboard with 24 hours of realistic time-series demo data.
-- Runs AFTER seed.sql. References UUIDs created by seed.sql.
-- Idempotent: uses DELETE before INSERT or ON CONFLICT DO NOTHING.

------------------------------------------------------------
-- 1. Zone Density — 5 zones, every 30s for 24 hours
--    Time-of-day traffic patterns mimic a real airport
------------------------------------------------------------
DELETE FROM zone_density
WHERE time >= NOW() - INTERVAL '24 hours';

INSERT INTO zone_density (time, zone_id, count, density_pct, avg_dwell_secs)
SELECT
  ts,
  zid,
  GREATEST(1, (base_density * 2)::int)          AS count,
  ROUND((base_density + (random() * 10 - 5))::numeric, 1) AS density_pct,
  ROUND((30 + random() * 120)::numeric, 1)      AS avg_dwell_secs
FROM (
  SELECT
    ts,
    zid,
    CASE
      WHEN EXTRACT(hour FROM ts) BETWEEN 0  AND 5  THEN 15 + random() * 10
      WHEN EXTRACT(hour FROM ts) BETWEEN 6  AND 8  THEN 35 + random() * 35
      WHEN EXTRACT(hour FROM ts) BETWEEN 9  AND 11 THEN 65 + random() * 20
      WHEN EXTRACT(hour FROM ts) BETWEEN 12 AND 13 THEN 45 + random() * 15
      WHEN EXTRACT(hour FROM ts) BETWEEN 14 AND 17 THEN 60 + random() * 20
      WHEN EXTRACT(hour FROM ts) BETWEEN 18 AND 21 THEN 35 + random() * 15
      ELSE 18 + random() * 12
    END AS base_density
  FROM
    generate_series(
      NOW() - INTERVAL '24 hours',
      NOW(),
      INTERVAL '30 seconds'
    ) AS ts
  CROSS JOIN (
    VALUES
      ('c0000000-0000-4000-8000-000000000001'::uuid),
      ('c0000000-0000-4000-8000-000000000002'::uuid),
      ('c0000000-0000-4000-8000-000000000003'::uuid),
      ('c0000000-0000-4000-8000-000000000004'::uuid),
      ('c0000000-0000-4000-8000-000000000005'::uuid)
  ) AS zones(zid)
) sub;

------------------------------------------------------------
-- 2. Queue Metrics — Security Checkpoint A only, every 30s
------------------------------------------------------------
DELETE FROM queue_metrics
WHERE time >= NOW() - INTERVAL '24 hours'
  AND zone_id = 'c0000000-0000-4000-8000-000000000001';

INSERT INTO queue_metrics (time, zone_id, queue_depth, wait_time_mins, throughput_per_hr, sla_met)
SELECT
  zd.time,
  zd.zone_id,
  GREATEST(0, (zd.density_pct / 3)::int)                                     AS queue_depth,
  ROUND((GREATEST(0, (zd.density_pct / 3)::numeric) * 0.8)::numeric, 1)      AS wait_time_mins,
  GREATEST(50, (300 - zd.density_pct * 1.5 + random() * 40)::int)            AS throughput_per_hr,
  (GREATEST(0, (zd.density_pct / 3)::numeric) * 0.8) < 15                    AS sla_met
FROM zone_density zd
WHERE zd.zone_id = 'c0000000-0000-4000-8000-000000000001'
  AND zd.time >= NOW() - INTERVAL '24 hours';

------------------------------------------------------------
-- 3. Anomaly Events — 40 events spread across 24 hours
------------------------------------------------------------
DELETE FROM anomaly_events
WHERE created_at >= NOW() - INTERVAL '24 hours'
  AND airport_id = 'a0000000-0000-4000-8000-000000000001';

-- Helper: insert anomaly events using a generate_series of 40 rows
INSERT INTO anomaly_events (
  airport_id, zone_id, type, severity, confidence,
  track_ids, acknowledged, acknowledged_by, acknowledged_at, created_at
)
SELECT
  'a0000000-0000-4000-8000-000000000001'::uuid AS airport_id,

  -- Distribute across zones
  (ARRAY[
    'c0000000-0000-4000-8000-000000000001',
    'c0000000-0000-4000-8000-000000000002',
    'c0000000-0000-4000-8000-000000000003',
    'c0000000-0000-4000-8000-000000000004',
    'c0000000-0000-4000-8000-000000000005'
  ]::uuid[])[1 + (i % 5)] AS zone_id,

  -- Type distribution: 20 LOITERING, 8 CROWD_SURGE, 5 INTRUSION, 4 ABANDONED_OBJECT, 3 PERIMETER_BREACH
  CASE
    WHEN i <= 20 THEN 'LOITERING'
    WHEN i <= 28 THEN 'CROWD_SURGE'
    WHEN i <= 33 THEN 'INTRUSION'
    WHEN i <= 37 THEN 'ABANDONED_OBJECT'
    ELSE              'PERIMETER_BREACH'
  END AS type,

  -- Severity: mostly 2-3, some 4, a couple 5
  CASE
    WHEN i IN (1, 15)              THEN 5
    WHEN i IN (5, 10, 25, 30, 35)  THEN 4
    WHEN i % 3 = 0                 THEN 3
    ELSE                                2
  END AS severity,

  ROUND((0.70 + random() * 0.28)::numeric, 2) AS confidence,

  ARRAY[uuid_generate_v4(), uuid_generate_v4()] AS track_ids,

  -- Half acknowledged, half pending
  CASE WHEN i % 2 = 0 THEN TRUE ELSE FALSE END AS acknowledged,

  -- Acknowledged by a random operator (only for acknowledged rows)
  CASE WHEN i % 2 = 0 THEN
    (ARRAY[
      'e0000000-0000-4000-8000-000000000001',
      'e0000000-0000-4000-8000-000000000002',
      'e0000000-0000-4000-8000-000000000003',
      'e0000000-0000-4000-8000-000000000004',
      'e0000000-0000-4000-8000-000000000005'
    ]::uuid[])[1 + (i % 5)]
  ELSE NULL END AS acknowledged_by,

  CASE WHEN i % 2 = 0 THEN
    NOW() - (INTERVAL '24 hours') * (1.0 - i::numeric / 40.0) + INTERVAL '2 minutes'
  ELSE NULL END AS acknowledged_at,

  -- Spread created_at across 24 hours with some randomness
  NOW() - (INTERVAL '24 hours') * (1.0 - i::numeric / 40.0) + (random() * INTERVAL '15 minutes')
  AS created_at

FROM generate_series(1, 40) AS i;

------------------------------------------------------------
-- 4. Shift Scores — 14 days, all 5 operators
------------------------------------------------------------
DELETE FROM shift_scores
WHERE shift_date >= (CURRENT_DATE - 14)
  AND airport_id = 'a0000000-0000-4000-8000-000000000001';

-- Amara O. — top performer
INSERT INTO shift_scores (
  operator_id, airport_id, shift_date, shift_start, shift_end,
  total_score, security_score, flow_score, response_score, compliance_score, uptime_score,
  streak_multiplier
)
SELECT
  'e0000000-0000-4000-8000-000000000001'::uuid,
  'a0000000-0000-4000-8000-000000000001'::uuid,
  d::date,
  d + INTERVAL '6 hours',
  d + INTERVAL '14 hours',
  ROUND((880 + random() * 60)::numeric, 0),
  ROUND((900 + random() * 60)::numeric, 0),
  ROUND((860 + random() * 60)::numeric, 0),
  ROUND((880 + random() * 60)::numeric, 0),
  ROUND((900 + random() * 50)::numeric, 0),
  ROUND((950 + random() * 40)::numeric, 0),
  1.60
FROM generate_series(CURRENT_DATE - 14, CURRENT_DATE - 1, INTERVAL '1 day') AS d
ON CONFLICT (operator_id, shift_date) DO NOTHING;

-- James W.
INSERT INTO shift_scores (
  operator_id, airport_id, shift_date, shift_start, shift_end,
  total_score, security_score, flow_score, response_score, compliance_score, uptime_score,
  streak_multiplier
)
SELECT
  'e0000000-0000-4000-8000-000000000002'::uuid,
  'a0000000-0000-4000-8000-000000000001'::uuid,
  d::date,
  d + INTERVAL '6 hours',
  d + INTERVAL '14 hours',
  ROUND((840 + random() * 70)::numeric, 0),
  ROUND((850 + random() * 60)::numeric, 0),
  ROUND((830 + random() * 60)::numeric, 0),
  ROUND((840 + random() * 60)::numeric, 0),
  ROUND((860 + random() * 50)::numeric, 0),
  ROUND((920 + random() * 50)::numeric, 0),
  1.45
FROM generate_series(CURRENT_DATE - 14, CURRENT_DATE - 1, INTERVAL '1 day') AS d
ON CONFLICT (operator_id, shift_date) DO NOTHING;

-- Priya S.
INSERT INTO shift_scores (
  operator_id, airport_id, shift_date, shift_start, shift_end,
  total_score, security_score, flow_score, response_score, compliance_score, uptime_score,
  streak_multiplier
)
SELECT
  'e0000000-0000-4000-8000-000000000003'::uuid,
  'a0000000-0000-4000-8000-000000000001'::uuid,
  d::date,
  d + INTERVAL '7 hours',
  d + INTERVAL '15 hours',
  ROUND((860 + random() * 60)::numeric, 0),
  ROUND((870 + random() * 50)::numeric, 0),
  ROUND((850 + random() * 60)::numeric, 0),
  ROUND((860 + random() * 50)::numeric, 0),
  ROUND((880 + random() * 40)::numeric, 0),
  ROUND((940 + random() * 40)::numeric, 0),
  1.35
FROM generate_series(CURRENT_DATE - 14, CURRENT_DATE - 1, INTERVAL '1 day') AS d
ON CONFLICT (operator_id, shift_date) DO NOTHING;

-- Chen L.
INSERT INTO shift_scores (
  operator_id, airport_id, shift_date, shift_start, shift_end,
  total_score, security_score, flow_score, response_score, compliance_score, uptime_score,
  streak_multiplier
)
SELECT
  'e0000000-0000-4000-8000-000000000004'::uuid,
  'a0000000-0000-4000-8000-000000000001'::uuid,
  d::date,
  d + INTERVAL '14 hours',
  d + INTERVAL '22 hours',
  ROUND((780 + random() * 110)::numeric, 0),
  ROUND((790 + random() * 100)::numeric, 0),
  ROUND((770 + random() * 100)::numeric, 0),
  ROUND((780 + random() * 100)::numeric, 0),
  ROUND((800 + random() * 90)::numeric, 0),
  ROUND((880 + random() * 80)::numeric, 0),
  1.25
FROM generate_series(CURRENT_DATE - 14, CURRENT_DATE - 1, INTERVAL '1 day') AS d
ON CONFLICT (operator_id, shift_date) DO NOTHING;

-- Admin User
INSERT INTO shift_scores (
  operator_id, airport_id, shift_date, shift_start, shift_end,
  total_score, security_score, flow_score, response_score, compliance_score, uptime_score,
  streak_multiplier
)
SELECT
  'e0000000-0000-4000-8000-000000000005'::uuid,
  'a0000000-0000-4000-8000-000000000001'::uuid,
  d::date,
  d + INTERVAL '8 hours',
  d + INTERVAL '16 hours',
  ROUND((800 + random() * 60)::numeric, 0),
  ROUND((810 + random() * 50)::numeric, 0),
  ROUND((790 + random() * 50)::numeric, 0),
  ROUND((800 + random() * 50)::numeric, 0),
  ROUND((820 + random() * 40)::numeric, 0),
  ROUND((900 + random() * 60)::numeric, 0),
  1.00
FROM generate_series(CURRENT_DATE - 14, CURRENT_DATE - 1, INTERVAL '1 day') AS d
ON CONFLICT (operator_id, shift_date) DO NOTHING;

------------------------------------------------------------
-- 5. Operator Badges
--    Badge definitions use uuid_generate_v4() in seed.sql,
--    so we look them up by key.
------------------------------------------------------------

-- Amara: FIRST_DETECT, SEVEN_DAY_STREAK, FAST_RESPONDER, ZERO_FALSE_POSITIVES
INSERT INTO operator_badges (operator_id, badge_id, earned_at)
SELECT
  'e0000000-0000-4000-8000-000000000001'::uuid,
  bd.id,
  NOW() - (INTERVAL '1 day' * (4 - row_number() OVER (ORDER BY bd.key)))
FROM badge_definitions bd
WHERE bd.key IN ('FIRST_DETECT', 'SEVEN_DAY_STREAK', 'FAST_RESPONDER', 'ZERO_FALSE_POSITIVES')
ON CONFLICT (operator_id, badge_id) DO NOTHING;

-- James: FIRST_DETECT, SEVEN_DAY_STREAK, FAST_RESPONDER
INSERT INTO operator_badges (operator_id, badge_id, earned_at)
SELECT
  'e0000000-0000-4000-8000-000000000002'::uuid,
  bd.id,
  NOW() - (INTERVAL '1 day' * (3 - row_number() OVER (ORDER BY bd.key)))
FROM badge_definitions bd
WHERE bd.key IN ('FIRST_DETECT', 'SEVEN_DAY_STREAK', 'FAST_RESPONDER')
ON CONFLICT (operator_id, badge_id) DO NOTHING;

-- Priya: FIRST_DETECT, SEVEN_DAY_STREAK
INSERT INTO operator_badges (operator_id, badge_id, earned_at)
SELECT
  'e0000000-0000-4000-8000-000000000003'::uuid,
  bd.id,
  NOW() - (INTERVAL '1 day' * (2 - row_number() OVER (ORDER BY bd.key)))
FROM badge_definitions bd
WHERE bd.key IN ('FIRST_DETECT', 'SEVEN_DAY_STREAK')
ON CONFLICT (operator_id, badge_id) DO NOTHING;

-- Chen: FIRST_DETECT
INSERT INTO operator_badges (operator_id, badge_id, earned_at)
SELECT
  'e0000000-0000-4000-8000-000000000004'::uuid,
  bd.id,
  NOW() - INTERVAL '10 days'
FROM badge_definitions bd
WHERE bd.key = 'FIRST_DETECT'
ON CONFLICT (operator_id, badge_id) DO NOTHING;

-- Admin: FIRST_DETECT
INSERT INTO operator_badges (operator_id, badge_id, earned_at)
SELECT
  'e0000000-0000-4000-8000-000000000005'::uuid,
  bd.id,
  NOW() - INTERVAL '12 days'
FROM badge_definitions bd
WHERE bd.key = 'FIRST_DETECT'
ON CONFLICT (operator_id, badge_id) DO NOTHING;

------------------------------------------------------------
-- 6. Mission Progress
--    Missions use uuid_generate_v4() in seed.sql,
--    so we look them up by title.
------------------------------------------------------------
INSERT INTO mission_progress (operator_id, mission_id, progress, completed, updated_at)
SELECT
  op.id AS operator_id,
  m.id  AS mission_id,
  ROUND((40 + random() * 40)::numeric, 1) AS progress,
  FALSE AS completed,
  NOW() - (random() * INTERVAL '6 hours') AS updated_at
FROM (
  VALUES
    ('e0000000-0000-4000-8000-000000000001'::uuid),
    ('e0000000-0000-4000-8000-000000000002'::uuid),
    ('e0000000-0000-4000-8000-000000000003'::uuid),
    ('e0000000-0000-4000-8000-000000000004'::uuid),
    ('e0000000-0000-4000-8000-000000000005'::uuid)
) AS op(id)
CROSS JOIN missions m
WHERE m.airport_id = 'a0000000-0000-4000-8000-000000000001'
  AND m.active = TRUE
ON CONFLICT (operator_id, mission_id) DO NOTHING;
