-- 007_security.sql
-- Security, audit, RBAC, API keys, incidents, retention, and vulnerability tracking

------------------------------------------------------------
-- Immutable audit log (append-only via rules)
------------------------------------------------------------
CREATE TABLE audit_log (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_time          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actor_id            UUID,
    actor_email         TEXT,
    actor_ip            INET NOT NULL,
    actor_user_agent    TEXT,
    facility_id         UUID REFERENCES facilities(id),
    action              TEXT NOT NULL,
    resource_type       TEXT,
    resource_id         UUID,
    before_state        JSONB,
    after_state         JSONB,
    outcome             TEXT NOT NULL CHECK (outcome IN ('SUCCESS', 'FAILURE', 'DENIED')),
    session_id          UUID,
    request_id          UUID
);

SELECT create_hypertable('audit_log', 'event_time');

-- Prevent updates and deletes on audit_log to enforce immutability
CREATE RULE audit_no_update AS ON UPDATE TO audit_log DO INSTEAD NOTHING;
CREATE RULE audit_no_delete AS ON DELETE TO audit_log DO INSTEAD NOTHING;

------------------------------------------------------------
-- Operator sessions (JWT tracking)
------------------------------------------------------------
CREATE TABLE operator_sessions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operator_id     UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
    facility_id     UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    jwt_jti         TEXT UNIQUE NOT NULL,
    ip_address      INET,
    user_agent      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ NOT NULL,
    revoked_at      TIMESTAMPTZ,
    revoke_reason   TEXT
);

------------------------------------------------------------
-- Role-based access control (RBAC)
------------------------------------------------------------
CREATE TABLE roles (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    facility_id     UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    description     TEXT,
    is_system       BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE (facility_id, name)
);

CREATE TABLE permissions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource        TEXT NOT NULL,
    action          TEXT NOT NULL,
    description     TEXT,
    UNIQUE (resource, action)
);

CREATE TABLE role_permissions (
    role_id         UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id   UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE operator_roles (
    operator_id     UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
    role_id         UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    granted_by      UUID REFERENCES operators(id),
    granted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (operator_id, role_id)
);

------------------------------------------------------------
-- API keys for service-to-service auth
------------------------------------------------------------
CREATE TABLE api_keys (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    facility_id     UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    label           TEXT NOT NULL,
    key_hash        TEXT UNIQUE NOT NULL,
    key_prefix      CHAR(8) NOT NULL,
    scopes          TEXT[],
    last_used_at    TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ,
    revoked_at      TIMESTAMPTZ,
    created_by      UUID REFERENCES operators(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

------------------------------------------------------------
-- Security incidents
------------------------------------------------------------
CREATE TABLE security_incidents (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    facility_id         UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    title               TEXT NOT NULL,
    severity            TEXT NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    category            TEXT,
    description         TEXT,
    detected_at         TIMESTAMPTZ,
    reported_at         TIMESTAMPTZ,
    contained_at        TIMESTAMPTZ,
    resolved_at         TIMESTAMPTZ,
    root_cause          TEXT,
    remediation         TEXT,
    notified_parties    TEXT[],
    created_by          UUID REFERENCES operators(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

------------------------------------------------------------
-- Data retention policies
------------------------------------------------------------
CREATE TABLE retention_policies (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    facility_id     UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    data_type       TEXT NOT NULL,
    retention_days  INT NOT NULL,
    legal_basis     TEXT,
    auto_purge      BOOLEAN NOT NULL DEFAULT FALSE,
    last_purged_at  TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

------------------------------------------------------------
-- Vulnerability findings
------------------------------------------------------------
CREATE TABLE vulnerability_findings (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source                  TEXT,
    severity                TEXT NOT NULL CHECK (severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL')),
    cve_id                  TEXT,
    title                   TEXT NOT NULL,
    description             TEXT,
    affected_component      TEXT,
    discovered_at           TIMESTAMPTZ,
    remediation_due         TIMESTAMPTZ,
    remediated_at           TIMESTAMPTZ,
    status                  TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_PROGRESS', 'REMEDIATED', 'ACCEPTED', 'FALSE_POSITIVE')),
    risk_acceptance_reason  TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
