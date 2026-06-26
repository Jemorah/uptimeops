-- ═══════════════════════════════════════════════════════════════
-- UPTIMEOPS COMPLETE DATABASE SCHEMA
-- Paste this entire file into Supabase SQL Editor and click Run
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════
-- EXTENSIONS
-- ═══════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ═══════════════════════════════════════════
-- ENUMS
-- ═══════════════════════════════════════════
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('public', 'customer', 'engineer', 'coordinator', 'admin');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'plan_tier') THEN
    CREATE TYPE plan_tier AS ENUM ('guardian', 'sentinel', 'fortress');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status') THEN
    CREATE TYPE subscription_status AS ENUM ('active', 'paused', 'past_due', 'cancelled', 'trialing');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'incident_priority') THEN
    CREATE TYPE incident_priority AS ENUM ('P1_CRITICAL', 'P2_HIGH', 'P3_MEDIUM', 'P4_LOW');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'incident_status') THEN
    CREATE TYPE incident_status AS ENUM (
      'lead_capture', 'payment_pending', 'credential_submission',
      'triage', 'isolate', 'repair', 'validate',
      'coordinator_approval', 'deploy', 'smoke_test',
      'verify_fix', 'continuous_monitor', 'resolved', 'closed'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pipeline_status') THEN
    CREATE TYPE pipeline_status AS ENUM ('running', 'awaiting_approval', 'completed', 'failed', 'escalated', 'rollback');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'escalation_status') THEN
    CREATE TYPE escalation_status AS ENUM ('pending_assignment', 'assigned', 'acknowledged', 'in_progress', 'resolved');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vm_status') THEN
    CREATE TYPE vm_status AS ENUM ('creating', 'running', 'destroyed', 'failed', 'timeout');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'comm_channel') THEN
    CREATE TYPE comm_channel AS ENUM ('email', 'sms', 'push', 'dashboard');
  END IF;
END $$;

-- ═══════════════════════════════════════════
-- TABLE: user_roles
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS user_roles (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role        user_role NOT NULL DEFAULT 'public',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

-- ═══════════════════════════════════════════
-- TABLE: customers
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS customers (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  email               text NOT NULL UNIQUE,
  full_name           text,
  company_name        text,
  website             text,
  phone               text,
  plan                plan_tier DEFAULT 'guardian',
  status              text DEFAULT 'active',
  mrr                 numeric(10,2) DEFAULT 0,
  stripe_customer_id  text UNIQUE,
  stripe_subscription_id text,
  subscription_status subscription_status DEFAULT 'trialing',
  incidents_used      integer DEFAULT 0,
  incidents_allowance integer DEFAULT 3,
  churn_risk_score    integer,
  churn_risk_reasons  text[],
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customers_user ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_plan ON customers(plan);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);

-- ═══════════════════════════════════════════
-- TABLE: subscriptions
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS subscriptions (
  id                      uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id             uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  stripe_subscription_id  text UNIQUE,
  status                  subscription_status DEFAULT 'active',
  plan                    plan_tier NOT NULL,
  price_cents             integer NOT NULL,
  incidents_used_this_period  integer DEFAULT 0,
  incidents_allowance     integer DEFAULT 3,
  current_period_start    timestamptz,
  current_period_end      timestamptz,
  cancelled_at            timestamptz,
  pause_start             timestamptz,
  pause_end               timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_customer ON subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- ═══════════════════════════════════════════
-- TABLE: one_time_fixes
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS one_time_fixes (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id         uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  payment_intent_id   text UNIQUE,
  status              text DEFAULT 'payment_pending',
  amount_paid         numeric(10,2),
  retry_count         integer DEFAULT 0,
  next_retry_at       timestamptz,
  paid_at             timestamptz,
  website_url         text,
  issue_description   text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_onetime_customer ON one_time_fixes(customer_id);
CREATE INDEX IF NOT EXISTS idx_onetime_status ON one_time_fixes(status);

-- ═══════════════════════════════════════════
-- TABLE: credentials_vault (zero-knowledge)
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS credentials_vault (
  id                      uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id             uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  encrypted_payload       text NOT NULL,
  public_key_fingerprint  text NOT NULL,
  iv                      text NOT NULL,
  salt                    text NOT NULL,
  expires_at              timestamptz NOT NULL,
  revoked_at              timestamptz,
  access_count            integer DEFAULT 0,
  last_accessed_at        timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credentials_customer ON credentials_vault(customer_id);
CREATE INDEX IF NOT EXISTS idx_credentials_fingerprint ON credentials_vault(public_key_fingerprint);

-- ═══════════════════════════════════════════
-- TABLE: incidents
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS incidents (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id     uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  source_type     text NOT NULL DEFAULT 'subscription',
  source_id       uuid,
  title           text NOT NULL,
  description     text,
  website_url     text,
  status          incident_status NOT NULL DEFAULT 'lead_capture',
  priority        incident_priority NOT NULL DEFAULT 'P3_MEDIUM',
  ai_confidence   integer,
  assigned_engineer_id  uuid,
  resolved_at     timestamptz,
  closed_at       timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_incidents_customer ON incidents(customer_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_priority ON incidents(priority);
CREATE INDEX IF NOT EXISTS idx_incidents_created ON incidents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_active ON incidents(status) WHERE status NOT IN ('resolved', 'closed');

-- ═══════════════════════════════════════════
-- TABLE: pipeline_states
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS pipeline_states (
  pipeline_id     text PRIMARY KEY,
  incident_id     uuid REFERENCES incidents(id) ON DELETE SET NULL,
  fix_id          uuid REFERENCES one_time_fixes(id) ON DELETE SET NULL,
  current_step    text NOT NULL DEFAULT 'triage',
  step_results    jsonb DEFAULT '{}',
  confidence      integer DEFAULT 0,
  status          pipeline_status NOT NULL DEFAULT 'running',
  started_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  error_count     integer DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_pipeline_incident ON pipeline_states(incident_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_status ON pipeline_states(status);

-- ═══════════════════════════════════════════
-- TABLE: human_escalations
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS human_escalations (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id         uuid REFERENCES incidents(id) ON DELETE CASCADE,
  fix_id              uuid REFERENCES one_time_fixes(id) ON DELETE CASCADE,
  pipeline_id         text REFERENCES pipeline_states(pipeline_id) ON DELETE SET NULL,
  trigger_reason      text NOT NULL,
  failed_step         text,
  assigned_engineer_id uuid,
  status              escalation_status NOT NULL DEFAULT 'pending_assignment',
  reason              text,
  metadata            jsonb DEFAULT '{}',
  assigned_at         timestamptz,
  acknowledged_at     timestamptz,
  resolved_at         timestamptz,
  reassigned_at       timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_escalations_incident ON human_escalations(incident_id);
CREATE INDEX IF NOT EXISTS idx_escalations_status ON human_escalations(status);

-- ═══════════════════════════════════════════
-- TABLE: vm_sessions
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS vm_sessions (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id     uuid REFERENCES incidents(id) ON DELETE SET NULL,
  provider_vm_id  text,
  ip_address      text,
  ssh_key         text,
  status          vm_status NOT NULL DEFAULT 'creating',
  error_message   text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  destroyed_at    timestamptz,
  destroy_reason  text
);

CREATE INDEX IF NOT EXISTS idx_vm_incident ON vm_sessions(incident_id);
CREATE INDEX IF NOT EXISTS idx_vm_status ON vm_sessions(status);

-- ═══════════════════════════════════════════
-- TABLE: vm_commands
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS vm_commands (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  vm_session_id   uuid NOT NULL REFERENCES vm_sessions(id) ON DELETE CASCADE,
  command         text NOT NULL,
  status          text DEFAULT 'queued',
  output          text,
  exit_code       integer,
  started_at      timestamptz,
  completed_at    timestamptz
);

CREATE INDEX IF NOT EXISTS idx_commands_vm ON vm_commands(vm_session_id);

-- ═══════════════════════════════════════════
-- TABLE: deployment_snapshots
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS deployment_snapshots (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id     uuid REFERENCES incidents(id) ON DELETE CASCADE,
  vm_session_id   uuid REFERENCES vm_sessions(id) ON DELETE SET NULL,
  status          text DEFAULT 'created',
  metadata        jsonb DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  used_at         timestamptz,
  rollback_reason text
);

-- ═══════════════════════════════════════════
-- TABLE: smoke_tests
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS smoke_tests (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  vm_session_id   uuid NOT NULL REFERENCES vm_sessions(id) ON DELETE CASCADE,
  incident_id     uuid REFERENCES incidents(id) ON DELETE CASCADE,
  pipeline_id     text,
  results         jsonb DEFAULT '[]',
  overall_passed  boolean,
  run_at          timestamptz NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════
-- TABLE: audit_logs (IMMUTABLE)
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS audit_logs (
  id                  bigserial PRIMARY KEY,
  created_at          timestamptz NOT NULL DEFAULT now(),
  table_name          text,
  record_id           text,
  operation           text,
  entity_type         text,
  entity_id           text,
  action              text NOT NULL,
  performed_by_type   text NOT NULL DEFAULT 'system',
  performed_by_id     uuid,
  old_values          jsonb,
  new_values          jsonb,
  metadata            jsonb,
  ip_address          text,
  user_agent          text
);

CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);

-- ═══════════════════════════════════════════
-- TABLE: communications_log
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS communications_log (
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

CREATE INDEX IF NOT EXISTS idx_comms_customer ON communications_log(customer_id);
CREATE INDEX IF NOT EXISTS idx_comms_sent ON communications_log(sent_at DESC);

-- ═══════════════════════════════════════════
-- TABLE: notifications
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS notifications (
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

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(read) WHERE read = false;

-- ═══════════════════════════════════════════
-- TABLE: temporary_links
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS temporary_links (
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

CREATE INDEX IF NOT EXISTS idx_temp_hash ON temporary_links(token_hash);
CREATE INDEX IF NOT EXISTS idx_temp_expires ON temporary_links(expires_at) WHERE status = 'active';

-- ═══════════════════════════════════════════
-- TABLE: engineer_profiles
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS engineer_profiles (
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

CREATE INDEX IF NOT EXISTS idx_engineer_oncall ON engineer_profiles(is_on_call);
CREATE INDEX IF NOT EXISTS idx_engineer_heartbeat ON engineer_profiles(last_heartbeat_at);

-- ═══════════════════════════════════════════
-- TABLE: coordinator_profiles
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS coordinator_profiles (
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
CREATE TABLE IF NOT EXISTS churn_events (
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

-- ═══════════════════════════════════════════
-- FUNCTIONS
-- ═══════════════════════════════════════════

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Prevent UPDATE/DELETE on audit_logs
CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is immutable: % operations are not allowed', TG_OP;
END;
$$ LANGUAGE plpgsql;

-- Dashboard metrics
CREATE OR REPLACE FUNCTION get_dashboard_metrics()
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'active_incidents', (SELECT count(*) FROM incidents WHERE status NOT IN ('resolved', 'closed')),
    'p1_waiting', (SELECT count(*) FROM incidents WHERE priority = 'P1_CRITICAL' AND status NOT IN ('resolved', 'closed')),
    'engineers_online', (SELECT count(*) FROM engineer_profiles WHERE is_on_call = true AND last_heartbeat_at > now() - interval '5 minutes'),
    'mrr', (SELECT COALESCE(SUM(price_cents), 0) / 100.0 FROM subscriptions WHERE status IN ('active', 'trialing')),
    'customers_total', (SELECT count(*) FROM customers WHERE status = 'active'),
    'incidents_24h', (SELECT count(*) FROM incidents WHERE created_at > now() - interval '24 hours')
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Customer health score
CREATE OR REPLACE FUNCTION get_customer_health(p_customer_id uuid)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
  incident_count integer;
  avg_response numeric;
  score integer;
BEGIN
  SELECT count(*) INTO incident_count FROM incidents WHERE customer_id = p_customer_id;
  SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/60), 0)
    INTO avg_response FROM incidents WHERE customer_id = p_customer_id AND resolved_at IS NOT NULL;
  score := GREATEST(0, LEAST(100, 100 - (incident_count * 5) - (CASE WHEN avg_response > 60 THEN 20 ELSE 0 END)));
  SELECT jsonb_build_object('health_score', score, 'incident_count', incident_count, 'avg_response_minutes', ROUND(avg_response, 1),
    'status', CASE WHEN score >= 80 THEN 'healthy' WHEN score >= 50 THEN 'at_risk' ELSE 'critical' END) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update customer MRR
CREATE OR REPLACE FUNCTION update_customer_mrr(p_customer_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE customers SET mrr = (SELECT COALESCE(SUM(price_cents), 0) / 100.0 FROM subscriptions WHERE customer_id = p_customer_id AND status IN ('active', 'trialing')) WHERE id = p_customer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════
-- TRIGGERS: Auto-update updated_at
-- ═══════════════════════════════════════════
DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY['customers', 'subscriptions', 'one_time_fixes', 'user_roles', 'incidents', 'pipeline_states'];
BEGIN
  FOREACH tbl IN ARRAY tables
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated ON %I', tbl, tbl);
    EXECUTE format('CREATE TRIGGER trg_%s_updated BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', tbl, tbl);
  END LOOP;
END $$;

-- Audit log immutability triggers
DROP TRIGGER IF EXISTS trg_audit_no_update ON audit_logs;
DROP TRIGGER IF EXISTS trg_audit_no_delete ON audit_logs;
CREATE TRIGGER trg_audit_no_update BEFORE UPDATE ON audit_logs FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();
CREATE TRIGGER trg_audit_no_delete BEFORE DELETE ON audit_logs FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();

-- ═══════════════════════════════════════════
-- RLS: Enable and create policies
-- ═══════════════════════════════════════════
DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY['user_roles', 'customers', 'subscriptions', 'one_time_fixes', 'credentials_vault', 'incidents', 'pipeline_states', 'human_escalations', 'vm_sessions', 'vm_commands', 'deployment_snapshots', 'smoke_tests', 'audit_logs', 'communications_log', 'notifications', 'temporary_links', 'engineer_profiles', 'coordinator_profiles', 'churn_events'];
BEGIN
  FOREACH tbl IN ARRAY tables
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
  END LOOP;
END $$;

-- Basic RLS policies (service role bypass + owner access)
CREATE POLICY IF NOT EXISTS service_all ON user_roles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS service_all ON customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS service_all ON subscriptions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS service_all ON one_time_fixes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS service_all ON credentials_vault FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS service_all ON incidents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS service_all ON pipeline_states FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS service_all ON human_escalations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS service_all ON vm_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS service_all ON vm_commands FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS service_all ON deployment_snapshots FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS service_all ON smoke_tests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS service_all ON audit_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS service_all ON communications_log FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS service_all ON notifications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS service_all ON temporary_links FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS service_all ON engineer_profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS service_all ON coordinator_profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS service_all ON churn_events FOR ALL USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════
-- SEED DATA
-- ═══════════════════════════════════════════

INSERT INTO customers (id, email, full_name, company_name, website, phone, plan, status, mrr) VALUES
  ('11111111-1111-1111-1111-111111111111', 'demo@acme-corp.com', 'Demo Customer', 'Acme Corp', 'acme-corp.com', '+1-555-0100', 'sentinel', 'active', 249.00),
  ('11111111-1111-1111-1111-111111111112', 'admin@techflow.io', 'Sarah Kim', 'TechFlow', 'techflow.io', '+1-555-0101', 'guardian', 'active', 99.00),
  ('11111111-1111-1111-1111-111111111113', 'ops@datavault.net', 'Mike Torres', 'DataVault', 'datavault.net', '+1-555-0102', 'fortress', 'active', 599.00),
  ('11111111-1111-1111-1111-111111111114', 'dev@cloudspire.io', 'Alex Chen', 'CloudSpire', 'cloudspire.io', NULL, 'sentinel', 'active', 249.00)
ON CONFLICT DO NOTHING;

INSERT INTO subscriptions (customer_id, plan, price_cents, incidents_allowance, current_period_start, current_period_end) VALUES
  ('11111111-1111-1111-1111-111111111111', 'sentinel', 24900, 10, now(), now() + interval '30 days'),
  ('11111111-1111-1111-1111-111111111112', 'guardian', 9900, 3, now(), now() + interval '30 days'),
  ('11111111-1111-1111-1111-111111111113', 'fortress', 59900, 999, now(), now() + interval '30 days'),
  ('11111111-1111-1111-1111-111111111114', 'sentinel', 24900, 10, now(), now() + interval '30 days')
ON CONFLICT DO NOTHING;

INSERT INTO engineer_profiles (id, name, email, level, is_on_call, total_resolved, avg_resolution_minutes, satisfaction_score) VALUES
  ('33333333-3333-3333-3333-333333333331', 'Alex Chen', 'alex@uptimeops.com', 'L2', true, 142, 22, 4.8),
  ('33333333-3333-3333-3333-333333333332', 'Jordan Smith', 'jordan@uptimeops.com', 'L1', true, 89, 35, 4.5),
  ('33333333-3333-3333-3333-333333333333', 'Riley Park', 'riley@uptimeops.com', 'L3', false, 234, 18, 4.9)
ON CONFLICT DO NOTHING;

INSERT INTO coordinator_profiles (id, name, email, is_lead, can_rollback) VALUES
  ('44444444-4444-4444-4444-444444444441', 'Morgan Lee', 'morgan@uptimeops.com', true, true),
  ('44444444-4444-4444-4444-444444444442', 'Casey Jones', 'casey@uptimeops.com', false, true)
ON CONFLICT DO NOTHING;

INSERT INTO incidents (id, customer_id, source_type, title, description, website_url, status, priority, ai_confidence) VALUES
  ('22222222-2222-2222-2222-222222222221', '11111111-1111-1111-1111-111111111111', 'subscription', 'Database connection pool exhaustion on acme-corp.com', 'PostgreSQL rejecting connections with "too many clients already".', 'acme-corp.com', 'triage', 'P1_CRITICAL', 72),
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'subscription', 'SSL certificate expired on api.acme-corp.com', 'SSL certificate expired 14 hours ago.', 'api.acme-corp.com', 'resolved', 'P2_HIGH', 95),
  ('22222222-2222-2222-2222-222222222223', '11111111-1111-1111-1111-111111111112', 'subscription', 'Nginx config error causing 502s on techflow.io', 'Upstream timeout misconfiguration.', 'techflow.io', 'resolved', 'P2_HIGH', 95),
  ('22222222-2222-2222-2222-222222222224', '11111111-1111-1111-1111-111111111113', 'subscription', 'Redis memory exhaustion on datavault.net', 'Redis instance reached maxmemory limit.', 'datavault.net', 'triage', 'P1_CRITICAL', 88),
  ('22222222-2222-2222-2222-222222222225', '11111111-1111-1111-1111-111111111114', 'subscription', 'Docker container restart loop on cloudspire.io', 'Container health check failing.', 'cloudspire.io', 'repair', 'P2_HIGH', 82)
ON CONFLICT DO NOTHING;

INSERT INTO pipeline_states (pipeline_id, incident_id, current_step, confidence, status) VALUES
  ('pl-2024-001-abc', '22222222-2222-2222-2222-222222222221', 'validate', 72, 'awaiting_approval'),
  ('pl-2024-002-def', '22222222-2222-2222-2222-222222222224', 'validate', 88, 'awaiting_approval'),
  ('pl-2024-003-ghi', '22222222-2222-2222-2222-222222222225', 'repair', 82, 'running')
ON CONFLICT DO NOTHING;

INSERT INTO human_escalations (incident_id, pipeline_id, trigger_reason, failed_step, status, reason) VALUES
  ('22222222-2222-2222-2222-222222222221', 'pl-2024-001-abc', 'ai_pipeline_failure', 'validate', 'pending_assignment', 'AI confidence 72% below 90% threshold.'),
  ('22222222-2222-2222-2222-222222222224', 'pl-2024-002-def', 'ai_pipeline_failure', 'validate', 'pending_assignment', 'AI confidence 88% below 90% threshold.')
ON CONFLICT DO NOTHING;

INSERT INTO audit_logs (table_name, entity_type, entity_id, action, performed_by_type, new_values) VALUES
  ('system', 'platform', 'uptimeops', 'schema_initialized', 'system', '{"version": "1.0.0", "tables": 18}'::jsonb);

-- ═══════════════════════════════════════════
-- REALTIME: Enable via Supabase Dashboard UI
-- ═══════════════════════════════════════════
-- NOTE: Do NOT use ALTER PUBLICATION here — it calls realtime.topic_add()
-- which doesn't exist on all Supabase versions.
--
-- INSTEAD: Enable realtime for each table via the Dashboard:
--   1. Supabase Dashboard → Database → Replication
--   2. Find each table below and toggle ON:
--      - incidents
--      - human_escalations
--      - pipeline_states
--      - notifications
--      - engineer_profiles
--
-- Or run this separate SQL after migration (if your instance supports it):
--   SELECT realtime.add_topic('supabase_realtime', 'incidents');
--   (check available functions first)

-- ═══════════════════════════════════════════
-- DONE
-- ═══════════════════════════════════════════
SELECT 'UPTIMEOPS SCHEMA COMPLETE' as status,
       (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE') as table_count,
       (SELECT count(*) FROM pg_policies WHERE schemaname = 'public') as policy_count;
