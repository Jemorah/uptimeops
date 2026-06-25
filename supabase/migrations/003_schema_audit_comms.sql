-- ═══════════════════════════════════════════════════════════════
-- MIGRATION 003: Audit Logs, Communications, Profiles, Links
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════
-- TABLE: audit_logs (IMMUTABLE)
-- Append-only, no UPDATE/DELETE allowed
-- ═══════════════════════════════════════════
CREATE TABLE audit_logs (
  id                  bigserial PRIMARY KEY,
  created_at          timestamptz NOT NULL DEFAULT now(),
  table_name          text,
  record_id           text,
  operation           text,  -- INSERT, UPDATE, DELETE
  entity_type         text,
  entity_id           text,
  action              text NOT NULL,
  performed_by_type   text NOT NULL DEFAULT 'system',
  performed_by_id     uuid,
  old_values          jsonb,
  new_values          jsonb,
  metadata            jsonb,
  ip_address          text,
  user_agent          text,
  sha256_hash         text  -- chain of custody hash
);

-- Critical indexes for audit log queries
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_actor ON audit_logs(performed_by_id) WHERE performed_by_id IS NOT NULL;
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_composite ON audit_logs(entity_type, created_at DESC);

-- ═══════════════════════════════════════════
-- TABLE: communications_log
-- ═══════════════════════════════════════════
CREATE TABLE communications_log (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id     uuid REFERENCES customers(id) ON DELETE CASCADE,
  type            text NOT NULL,
  channel         comm_channel NOT NULL,
  entity_type     text,
  entity_id       text,
  subject         text,
  body            text,
  delivery_status text DEFAULT 'sent',
  retry_count     integer DEFAULT 0,
  metadata        jsonb DEFAULT '{}',
  sent_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_comms_customer ON communications_log(customer_id);
CREATE INDEX idx_comms_entity ON communications_log(entity_type, entity_id);
CREATE INDEX idx_comms_sent ON communications_log(sent_at DESC);

-- ═══════════════════════════════════════════
-- TABLE: notifications (in-app dashboard)
-- ═══════════════════════════════════════════
CREATE TABLE notifications (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id     uuid REFERENCES customers(id) ON DELETE CASCADE,
  user_id         uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  type            text NOT NULL,
  message         text NOT NULL,
  entity_type     text,
  entity_id       text,
  metadata        jsonb DEFAULT '{}',
  read            boolean DEFAULT false,
  read_at         timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_notifications_customer ON notifications(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX idx_notifications_unread ON notifications(read) WHERE read = false;
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- ═══════════════════════════════════════════
-- TABLE: temporary_links
-- ═══════════════════════════════════════════
CREATE TABLE temporary_links (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  token_hash      text NOT NULL UNIQUE,
  entity_type     text NOT NULL,
  entity_id       text NOT NULL,
  customer_id     uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  expires_at      timestamptz NOT NULL,
  access_count    integer DEFAULT 0,
  status          text DEFAULT 'active',
  created_at      timestamptz NOT NULL DEFAULT now(),
  revoked_at      timestamptz,
  last_accessed_at timestamptz
);

CREATE INDEX idx_temp_customer ON temporary_links(customer_id);
CREATE INDEX idx_temp_hash ON temporary_links(token_hash);
CREATE INDEX idx_temp_expires ON temporary_links(expires_at) WHERE status = 'active';

-- Archive table for expired temporary links
CREATE TABLE temporary_links_archive (
  LIKE temporary_links INCLUDING ALL,
  archived_at timestamptz NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════
-- TABLE: engineer_profiles
-- ═══════════════════════════════════════════
CREATE TABLE engineer_profiles (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name            text,
  email           text,
  phone           text,
  level           text DEFAULT 'L1',
  timezone        text DEFAULT 'UTC',
  is_on_call      boolean DEFAULT false,
  can_rollback    boolean DEFAULT false,
  active_incident_count integer DEFAULT 0,
  total_resolved  integer DEFAULT 0,
  avg_resolution_minutes integer,
  satisfaction_score numeric(3,2),
  last_heartbeat_at   timestamptz,
  last_assigned_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_engineer_user ON engineer_profiles(user_id);
CREATE INDEX idx_engineer_oncall ON engineer_profiles(is_on_call);
CREATE INDEX idx_engineer_heartbeat ON engineer_profiles(last_heartbeat_at);

-- ═══════════════════════════════════════════
-- TABLE: coordinator_profiles
-- ═══════════════════════════════════════════
CREATE TABLE coordinator_profiles (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name            text,
  email           text,
  phone           text,
  is_lead         boolean DEFAULT false,
  can_rollback    boolean DEFAULT true,
  timezone        text DEFAULT 'UTC',
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════
-- TABLE: churn_events
-- ═══════════════════════════════════════════
CREATE TABLE churn_events (
  id                      uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  stripe_subscription_id  text NOT NULL,
  customer_id             uuid REFERENCES customers(id) ON DELETE SET NULL,
  churned_at              timestamptz NOT NULL DEFAULT now(),
  reason                  text,
  feedback                text,
  win_back_sent_30d       boolean DEFAULT false,
  win_back_sent_60d       boolean DEFAULT false,
  win_back_sent_90d       boolean DEFAULT false
);

CREATE INDEX idx_churn_customer ON churn_events(customer_id);

-- ═══════════════════════════════════════════
-- RLS POLICIES
-- ═══════════════════════════════════════════

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE communications_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE temporary_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE engineer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE coordinator_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE churn_events ENABLE ROW LEVEL SECURITY;

-- audit_logs: IMMUTABLE — no one can modify, read based on role
CREATE POLICY audit_admin ON audit_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('coordinator', 'admin'))
  );
CREATE POLICY audit_engineer ON audit_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'engineer')
  );
CREATE POLICY service_audit ON audit_logs FOR ALL USING (true) WITH CHECK (true);

-- communications_log: admin/coordinator can manage, customer can see own
CREATE POLICY comms_own ON communications_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM customers WHERE id = communications_log.customer_id AND user_id = auth.uid())
  );
CREATE POLICY comms_admin ON communications_log
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('coordinator', 'admin'))
  );
CREATE POLICY service_comms ON communications_log FOR ALL USING (true) WITH CHECK (true);

-- notifications: own records
CREATE POLICY notif_own ON notifications
  FOR ALL USING (user_id = auth.uid());
CREATE POLICY notif_admin ON notifications
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('coordinator', 'admin'))
  );
CREATE POLICY service_notif ON notifications FOR ALL USING (true) WITH CHECK (true);

-- temporary_links: own + admin
CREATE POLICY temp_own ON temporary_links
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM customers WHERE id = temporary_links.customer_id AND user_id = auth.uid())
  );
CREATE POLICY temp_admin ON temporary_links
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('coordinator', 'admin'))
  );
CREATE POLICY service_temp ON temporary_links FOR ALL USING (true) WITH CHECK (true);

-- engineer_profiles: self read + coordinator/admin manage
CREATE POLICY eng_self ON engineer_profiles
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY eng_admin ON engineer_profiles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('coordinator', 'admin'))
  );
CREATE POLICY service_eng ON engineer_profiles FOR ALL USING (true) WITH CHECK (true);

-- coordinator_profiles: coordinator self read + admin manage
CREATE POLICY coord_self ON coordinator_profiles
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY coord_admin ON coordinator_profiles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );
CREATE POLICY service_coord ON coordinator_profiles FOR ALL USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════
-- FUNCTIONS & TRIGGERS
-- ═══════════════════════════════════════════

-- Prevent UPDATE/DELETE on audit_logs (immutable)
CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is immutable: % operations are not allowed', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_no_update
  BEFORE UPDATE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();

CREATE TRIGGER trg_audit_no_delete
  BEFORE DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();

-- Auto-calculate SHA-256 hash for audit log chain
CREATE OR REPLACE FUNCTION calculate_audit_hash()
RETURNS TRIGGER AS $$
DECLARE
  prev_hash text;
  payload text;
BEGIN
  SELECT sha256_hash INTO prev_hash
  FROM audit_logs
  ORDER BY id DESC
  LIMIT 1;

  payload := COALESCE(prev_hash, '') || '|' ||
             NEW.action || '|' ||
             NEW.performed_by_type || '|' ||
             NEW.entity_type || '|' ||
             NEW.entity_id || '|' ||
             EXTRACT(EPOCH FROM NEW.created_at)::text;

  NEW.sha256_hash := encode(digest(payload, 'sha256'), 'hex');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_hash
  BEFORE INSERT ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION calculate_audit_hash();

-- Auto-log table changes to audit_logs
CREATE OR REPLACE FUNCTION log_table_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (
    table_name, record_id, operation,
    entity_type, entity_id, action,
    performed_by_type, performed_by_id,
    old_values, new_values,
    metadata
  ) VALUES (
    TG_TABLE_NAME,
    CASE WHEN TG_OP = 'DELETE' THEN OLD.id::text ELSE NEW.id::text END,
    TG_OP,
    TG_TABLE_NAME,
    CASE WHEN TG_OP = 'DELETE' THEN OLD.id::text ELSE NEW.id::text END,
    TG_TABLE_NAME || '_' || lower(TG_OP),
    'system',
    NULL,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    jsonb_build_object('trigger_name', TG_NAME, 'trigger_when', TG_WHEN)
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════
-- SEED DATA
-- ═══════════════════════════════════════════

INSERT INTO engineer_profiles (id, user_id, name, email, level, is_on_call, total_resolved, avg_resolution_minutes, satisfaction_score) VALUES
  ('33333333-3333-3333-3333-333333333331', '00000000-0000-0000-0000-000000000003', 'Alex Chen', 'alex@uptimeops.com', 'L2', true, 142, 22, 4.8),
  ('33333333-3333-3333-3333-333333333332', NULL, 'Jordan Smith', 'jordan@uptimeops.com', 'L1', true, 89, 35, 4.5),
  ('33333333-3333-3333-3333-333333333333', NULL, 'Riley Park', 'riley@uptimeops.com', 'L3', false, 234, 18, 4.9);

INSERT INTO coordinator_profiles (id, user_id, name, email, is_lead, can_rollback) VALUES
  ('44444444-4444-4444-4444-444444444441', '00000000-0000-0000-0000-000000000002', 'Morgan Lee', 'morgan@uptimeops.com', true, true),
  ('44444444-4444-4444-4444-444444444442', NULL, 'Casey Jones', 'casey@uptimeops.com', false, true);

INSERT INTO audit_logs (table_name, entity_type, entity_id, action, performed_by_type, new_values) VALUES
  ('system', 'platform', 'uptimeops', 'platform_initialized', 'system', '{"version": "1.0.0"}'::jsonb);

INSERT INTO communications_log (customer_id, type, channel, entity_type, entity_id, subject, body) VALUES
  ('11111111-1111-1111-1111-111111111111', 'incident_created', 'email', 'incident', '22222222-2222-2222-2222-222222222221',
   '[UptimeOps] Incident Detected — acme-corp.com',
   'We\'ve detected an issue with acme-corp.com. Our AI is already investigating.');
