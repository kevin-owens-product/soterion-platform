-- 002_core_tables.sql
-- Core relational tables: airports, terminals, zones, sensor_nodes, operators

-- Airports
CREATE TABLE airports (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        TEXT NOT NULL,
    iata_code   CHAR(3) UNIQUE NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Terminals within an airport
CREATE TABLE terminals (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    airport_id  UUID NOT NULL REFERENCES airports(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    floor_plan  JSONB  -- GeoJSON representation of the floor plan
);

-- Zones within a terminal
CREATE TABLE zones (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    terminal_id     UUID NOT NULL REFERENCES terminals(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    type            TEXT NOT NULL CHECK (type IN ('security', 'gate', 'baggage', 'curb', 'lounge', 'retail', 'restricted')),
    boundary        JSONB,
    sla_wait_mins   INT NOT NULL DEFAULT 15
);

-- LiDAR / sensor nodes deployed in zones
CREATE TABLE sensor_nodes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    zone_id         UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
    label           TEXT NOT NULL,
    model           TEXT NOT NULL,
    coords          JSONB,
    fov_degrees     NUMERIC NOT NULL DEFAULT 360,
    range_meters    NUMERIC NOT NULL DEFAULT 50,
    health          TEXT NOT NULL DEFAULT 'ONLINE' CHECK (health IN ('ONLINE', 'DEGRADED', 'OFFLINE')),
    last_ping_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Platform operators / users
CREATE TABLE operators (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    airport_id      UUID NOT NULL REFERENCES airports(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    email           TEXT UNIQUE NOT NULL,
    password_hash   TEXT NOT NULL,
    role            TEXT NOT NULL CHECK (role IN ('operator', 'supervisor', 'admin')),
    team            TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
