-- 003_time_series.sql
-- Time-series tables for high-frequency sensor and analytics data.
-- Uses TimescaleDB hypertables when available, falls back to regular tables.

-- Real-time object tracks from LiDAR sensors
CREATE TABLE track_objects (
    time            TIMESTAMPTZ NOT NULL,
    track_id        UUID NOT NULL,
    sensor_id       UUID NOT NULL REFERENCES sensor_nodes(id) ON DELETE CASCADE,
    zone_id         UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
    centroid        JSONB,
    velocity_ms     NUMERIC,
    classification  TEXT NOT NULL CHECK (classification IN ('PERSON', 'VEHICLE', 'OBJECT', 'UNKNOWN')),
    behavior_score  INT CHECK (behavior_score >= 0 AND behavior_score <= 100),
    dwell_secs      NUMERIC
);

DO $$
BEGIN
  PERFORM create_hypertable('track_objects', 'time');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'create_hypertable(track_objects) skipped — TimescaleDB not available';
END $$;

CREATE INDEX idx_track_objects_zone_time
    ON track_objects (zone_id, time DESC);

-- Aggregated zone density snapshots
CREATE TABLE zone_density (
    time            TIMESTAMPTZ NOT NULL,
    zone_id         UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
    count           INT NOT NULL,
    density_pct     NUMERIC,
    avg_dwell_secs  NUMERIC
);

DO $$
BEGIN
  PERFORM create_hypertable('zone_density', 'time');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'create_hypertable(zone_density) skipped — TimescaleDB not available';
END $$;

-- Queue performance metrics
CREATE TABLE queue_metrics (
    time                TIMESTAMPTZ NOT NULL,
    zone_id             UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
    queue_depth         INT NOT NULL,
    wait_time_mins      NUMERIC,
    throughput_per_hr   NUMERIC,
    sla_met             BOOLEAN NOT NULL DEFAULT TRUE
);

DO $$
BEGIN
  PERFORM create_hypertable('queue_metrics', 'time');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'create_hypertable(queue_metrics) skipped — TimescaleDB not available';
END $$;
