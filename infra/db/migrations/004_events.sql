-- 004_events.sql
-- Anomaly and incident event storage

CREATE TABLE anomaly_events (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    airport_id      UUID NOT NULL REFERENCES airports(id) ON DELETE CASCADE,
    zone_id         UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
    type            TEXT NOT NULL CHECK (type IN (
                        'LOITERING', 'INTRUSION', 'CROWD_SURGE',
                        'ABANDONED_OBJECT', 'PERIMETER_BREACH', 'DRONE_DETECTED'
                    )),
    severity        INT NOT NULL CHECK (severity >= 1 AND severity <= 5),
    confidence      NUMERIC NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    track_ids       UUID[],
    snapshot_s3     TEXT,
    acknowledged    BOOLEAN NOT NULL DEFAULT FALSE,
    acknowledged_by UUID REFERENCES operators(id),
    acknowledged_at TIMESTAMPTZ,
    escalated       BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast lookup for dashboard: recent events at an airport
CREATE INDEX idx_anomaly_events_airport_created
    ON anomaly_events (airport_id, created_at DESC);

-- Fast lookup for zone-level triage
CREATE INDEX idx_anomaly_events_zone_severity_ack
    ON anomaly_events (zone_id, severity, acknowledged);
