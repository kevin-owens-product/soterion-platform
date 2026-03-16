-- 006_facilities.sql
-- Multi-vertical facility abstraction layer

-- Generic facility record (airport, seaport, stadium, etc.)
CREATE TABLE facilities (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            TEXT NOT NULL,
    type            TEXT NOT NULL,
    short_code      TEXT UNIQUE NOT NULL,
    address         TEXT,
    country_code    CHAR(2),
    timezone        TEXT NOT NULL DEFAULT 'UTC',
    config          JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Zone type definitions per facility vertical
CREATE TABLE zone_type_definitions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    facility_type   TEXT NOT NULL,
    key             TEXT NOT NULL,
    label           TEXT NOT NULL,
    default_sla     JSONB,
    UNIQUE (facility_type, key)
);

-- KPI definitions per facility vertical
CREATE TABLE kpi_definitions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    facility_type   TEXT NOT NULL,
    key             TEXT NOT NULL,
    label           TEXT NOT NULL,
    unit            TEXT,
    direction       TEXT NOT NULL CHECK (direction IN ('lower_better', 'higher_better')),
    default_target  NUMERIC,
    UNIQUE (facility_type, key)
);

-- ML model registry per vertical
CREATE TABLE ml_model_registry (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    facility_type   TEXT NOT NULL,
    model_key       TEXT NOT NULL,
    onnx_s3_key     TEXT,
    version         TEXT NOT NULL,
    active          BOOLEAN NOT NULL DEFAULT TRUE,
    deployed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (facility_type, model_key, version)
);

-- Compliance / regulatory frameworks per vertical
CREATE TABLE compliance_frameworks (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    facility_type   TEXT NOT NULL,
    framework_key   TEXT NOT NULL,
    label           TEXT NOT NULL,
    rules           JSONB NOT NULL DEFAULT '[]',
    UNIQUE (facility_type, framework_key)
);
