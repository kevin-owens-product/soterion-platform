-- 005_gamification.sql
-- Operator gamification: shift scores, badges, missions

-- Per-shift composite scoring
CREATE TABLE shift_scores (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operator_id         UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
    airport_id          UUID NOT NULL REFERENCES airports(id) ON DELETE CASCADE,
    shift_date          DATE NOT NULL,
    shift_start         TIMESTAMPTZ NOT NULL,
    shift_end           TIMESTAMPTZ NOT NULL,
    total_score         INT NOT NULL,
    security_score      INT NOT NULL,
    flow_score          INT NOT NULL,
    response_score      INT NOT NULL,
    compliance_score    INT NOT NULL,
    uptime_score        INT NOT NULL,
    streak_multiplier   NUMERIC NOT NULL DEFAULT 1.0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (operator_id, shift_date)
);

-- Badge catalogue
CREATE TABLE badge_definitions (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key         TEXT UNIQUE NOT NULL,
    name        TEXT NOT NULL,
    description TEXT,
    icon        TEXT,
    category    TEXT
);

-- Badges earned by operators
CREATE TABLE operator_badges (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
    badge_id    UUID NOT NULL REFERENCES badge_definitions(id) ON DELETE CASCADE,
    earned_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (operator_id, badge_id)
);

-- Time-boxed missions / challenges
CREATE TABLE missions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    airport_id      UUID NOT NULL REFERENCES airports(id) ON DELETE CASCADE,
    title           TEXT NOT NULL,
    description     TEXT,
    metric_key      TEXT NOT NULL,
    target_value    NUMERIC NOT NULL,
    reward_type     TEXT,
    reward_value    NUMERIC,
    resets_at       TIMESTAMPTZ,
    active          BOOLEAN NOT NULL DEFAULT TRUE
);

-- Operator progress toward missions
CREATE TABLE mission_progress (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operator_id     UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
    mission_id      UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
    progress        NUMERIC NOT NULL DEFAULT 0,
    completed       BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at    TIMESTAMPTZ,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (operator_id, mission_id)
);
