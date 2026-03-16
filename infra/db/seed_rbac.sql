-- seed_rbac.sql
-- Default permissions, roles, and role-permission mappings for Soterion Platform
-- Run after 007_security.sql migration

-- ============================================================
-- 1. DEFAULT PERMISSIONS
-- ============================================================
INSERT INTO permissions (resource, action, description) VALUES
  ('alerts',     'read',        'View alerts and alert details'),
  ('alerts',     'acknowledge', 'Acknowledge alerts'),
  ('alerts',     'escalate',    'Escalate alerts to supervisor'),
  ('sensors',    'read',        'View sensor status and metrics'),
  ('sensors',    'write',       'Update sensor configuration'),
  ('leaderboard','read',        'View leaderboard and scores'),
  ('missions',   'read',        'View missions and progress'),
  ('admin',      'access',      'Access admin platform'),
  ('admin',      'facilities',  'Manage facilities'),
  ('admin',      'operators',   'Manage operators'),
  ('admin',      'audit',       'View audit log'),
  ('admin',      'api-keys',    'Manage API keys'),
  ('admin',      'security',    'Manage security incidents and vulnerabilities'),
  ('admin',      'compliance',  'View compliance dashboards')
ON CONFLICT (resource, action) DO NOTHING;

-- ============================================================
-- 2. DEFAULT ROLES (per-facility, using a system facility placeholder)
--    In production, these roles are created per-facility.
--    This seed uses the first facility found, or a placeholder.
-- ============================================================

-- Create system roles for each existing facility
DO $$
DECLARE
  fac RECORD;
  role_operator_id UUID;
  role_supervisor_id UUID;
  role_admin_id UUID;
  role_platform_admin_id UUID;
  perm RECORD;
BEGIN
  FOR fac IN SELECT id FROM facilities LOOP
    -- Operator role
    INSERT INTO roles (facility_id, name, description, is_system)
    VALUES (fac.id, 'operator', 'Standard operator with read access and alert acknowledgement', TRUE)
    ON CONFLICT (facility_id, name) DO UPDATE SET description = EXCLUDED.description
    RETURNING id INTO role_operator_id;

    -- Supervisor role
    INSERT INTO roles (facility_id, name, description, is_system)
    VALUES (fac.id, 'supervisor', 'Supervisor with escalation and sensor write access', TRUE)
    ON CONFLICT (facility_id, name) DO UPDATE SET description = EXCLUDED.description
    RETURNING id INTO role_supervisor_id;

    -- Admin role
    INSERT INTO roles (facility_id, name, description, is_system)
    VALUES (fac.id, 'admin', 'Facility admin with access to admin platform', TRUE)
    ON CONFLICT (facility_id, name) DO UPDATE SET description = EXCLUDED.description
    RETURNING id INTO role_admin_id;

    -- Platform Admin role
    INSERT INTO roles (facility_id, name, description, is_system)
    VALUES (fac.id, 'platform_admin', 'Platform-wide admin with full access', TRUE)
    ON CONFLICT (facility_id, name) DO UPDATE SET description = EXCLUDED.description
    RETURNING id INTO role_platform_admin_id;

    -- ============================================================
    -- 3. ROLE-PERMISSION MAPPINGS
    -- ============================================================

    -- Operator: alerts:read, alerts:acknowledge, sensors:read, leaderboard:read, missions:read
    FOR perm IN
      SELECT id FROM permissions WHERE (resource, action) IN (
        ('alerts', 'read'), ('alerts', 'acknowledge'),
        ('sensors', 'read'), ('leaderboard', 'read'), ('missions', 'read')
      )
    LOOP
      INSERT INTO role_permissions (role_id, permission_id)
      VALUES (role_operator_id, perm.id)
      ON CONFLICT DO NOTHING;
    END LOOP;

    -- Supervisor: all operator permissions + alerts:escalate, sensors:write
    FOR perm IN
      SELECT id FROM permissions WHERE (resource, action) IN (
        ('alerts', 'read'), ('alerts', 'acknowledge'), ('alerts', 'escalate'),
        ('sensors', 'read'), ('sensors', 'write'),
        ('leaderboard', 'read'), ('missions', 'read')
      )
    LOOP
      INSERT INTO role_permissions (role_id, permission_id)
      VALUES (role_supervisor_id, perm.id)
      ON CONFLICT DO NOTHING;
    END LOOP;

    -- Admin: all supervisor + admin:access, admin:facilities, admin:operators
    FOR perm IN
      SELECT id FROM permissions WHERE (resource, action) IN (
        ('alerts', 'read'), ('alerts', 'acknowledge'), ('alerts', 'escalate'),
        ('sensors', 'read'), ('sensors', 'write'),
        ('leaderboard', 'read'), ('missions', 'read'),
        ('admin', 'access'), ('admin', 'facilities'), ('admin', 'operators')
      )
    LOOP
      INSERT INTO role_permissions (role_id, permission_id)
      VALUES (role_admin_id, perm.id)
      ON CONFLICT DO NOTHING;
    END LOOP;

    -- Platform Admin: everything
    FOR perm IN SELECT id FROM permissions LOOP
      INSERT INTO role_permissions (role_id, permission_id)
      VALUES (role_platform_admin_id, perm.id)
      ON CONFLICT DO NOTHING;
    END LOOP;

  END LOOP;
END $$;

-- ============================================================
-- 4. ASSIGN ROLES TO EXISTING OPERATORS (based on their role column)
-- ============================================================
DO $$
DECLARE
  op RECORD;
  target_role_name TEXT;
  target_role_id UUID;
BEGIN
  FOR op IN SELECT id, airport_id, role FROM operators LOOP
    -- Map operator.role column to RBAC role name
    target_role_name := CASE op.role
      WHEN 'operator' THEN 'operator'
      WHEN 'supervisor' THEN 'supervisor'
      WHEN 'admin' THEN 'admin'
      ELSE 'operator'
    END;

    -- Find the role for this operator's facility
    SELECT id INTO target_role_id
    FROM roles
    WHERE facility_id = op.airport_id
      AND name = target_role_name
    LIMIT 1;

    IF target_role_id IS NOT NULL THEN
      INSERT INTO operator_roles (operator_id, role_id)
      VALUES (op.id, target_role_id)
      ON CONFLICT (operator_id, role_id) DO NOTHING;
    END IF;
  END LOOP;
END $$;
