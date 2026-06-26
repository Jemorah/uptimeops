-- ═══════════════════════════════════════════════════════════════
-- UPTIMEOPS COMPLETE DATABASE SCHEMA
-- Single-file migration — paste into Supabase SQL Editor → Click Run
-- Combines: 001_core + 002_incidents + 003_audit + 004_cron + 005_seed
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- UPTIMEOPS MIGRATION 001: Core Schema
-- Tables: user_roles, customers, subscriptions, one_time_fixes,
--         credentials_vault, payment_methods
-- Enums: 10 types
-- Paste into Supabase SQL Editor → Click Run
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════
-- EXTENSIONS
-- ═══════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ═══════════════════════════════════════════
-- ENUMS: Safe creation (re-runnable)
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
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'comm_type') THEN
    CREATE TYPE comm_type AS ENUM (
      'incident_created', 'incident_resolved', 'approval_required',
      'payment_succeeded', 'payment_failed', 'dunning_email',
      'invoice_paid', 'credential_approval_request', 'credential_approved',
      'credential_denied', 'ai_escalation', 'rollback_executed',
      'renewal_reminder', 'exit_survey', 'overage_alert',
      'temporary_access_granted', 'engineer_timeout', 'incident_assigned',
      'fix_submitted', 'smoke_test_passed', 'smoke_test_failed'
    );
  END IF;
END $$;

-- ═══════════════════════════════════════════
-- HELPER FUNCTION: Auto-update updated_at
-- ═══════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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
  id                      uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                 uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  email                   text NOT NULL UNIQUE,
  full_name               text,
  company_name            text,
  website                 text,
  phone                   text,
  plan                    plan_tier DEFAULT 'guardian',
  status                  text DEFAULT 'active',
  mrr                     numeric(10,2) DEFAULT 0,
  stripe_customer_id      text UNIQUE,
  stripe_subscription_id  text,
  subscription_status     subscription_status DEFAULT 'trialing',
  incidents_used          integer DEFAULT 0,
  incidents_allowance     integer DEFAULT 3,
  churn_risk_score        integer,
  churn_risk_reasons      text[],
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customers_user ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_plan ON customers(plan);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_stripe ON customers(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

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
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON subscriptions(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_period ON subscriptions(current_period_end) WHERE status = 'active';

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
CREATE INDEX IF NOT EXISTS idx_onetime_payment ON one_time_fixes(payment_intent_id) WHERE payment_intent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_onetime_status ON one_time_fixes(status);

-- ═══════════════════════════════════════════
-- TABLE: credentials_vault
-- Zero-knowledge: server only stores encrypted payload
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
CREATE INDEX IF NOT EXISTS idx_credentials_expires ON credentials_vault(expires_at) WHERE revoked_at IS NULL;

-- ═══════════════════════════════════════════
-- TABLE: payment_methods
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS payment_methods (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id         uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  stripe_payment_method_id  text UNIQUE NOT NULL,
  card_brand          text,
  card_last4          text,
  card_exp_month      integer,
  card_exp_year       integer,
  is_default          boolean DEFAULT false,
  billing_email       text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_methods_customer ON payment_methods(customer_id);

-- ═══════════════════════════════════════════
-- TRIGGERS: Auto-update updated_at
-- ═══════════════════════════════════════════
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_customers_updated') THEN
    CREATE TRIGGER trg_customers_updated
      BEFORE UPDATE ON customers
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_subscriptions_updated') THEN
    CREATE TRIGGER trg_subscriptions_updated
      BEFORE UPDATE ON subscriptions
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_user_roles_updated') THEN
    CREATE TRIGGER trg_user_roles_updated
      BEFORE UPDATE ON user_roles
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_onetime_fixes_updated') THEN
    CREATE TRIGGER trg_onetime_fixes_updated
      BEFORE UPDATE ON one_time_fixes
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ═══════════════════════════════════════════
-- RLS: Enable and create policies
-- ═══════════════════════════════════════════

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE one_time_fixes ENABLE ROW LEVEL SECURITY;
ALTER TABLE credentials_vault ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- user_roles
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_roles_own' AND tablename = 'user_roles') THEN
    CREATE POLICY user_roles_own ON user_roles FOR SELECT USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_roles_admin' AND tablename = 'user_roles') THEN
    CREATE POLICY user_roles_admin ON user_roles FOR ALL USING (
      EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('coordinator', 'admin'))
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_user_roles' AND tablename = 'user_roles') THEN
    CREATE POLICY service_user_roles ON user_roles FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- customers
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'customers_own' AND tablename = 'customers') THEN
    CREATE POLICY customers_own ON customers FOR SELECT USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'customers_admin' AND tablename = 'customers') THEN
    CREATE POLICY customers_admin ON customers FOR ALL USING (
      EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('coordinator', 'admin'))
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_customers' AND tablename = 'customers') THEN
    CREATE POLICY service_customers ON customers FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- subscriptions
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'subscriptions_own' AND tablename = 'subscriptions') THEN
    CREATE POLICY subscriptions_own ON subscriptions FOR SELECT USING (
      EXISTS (SELECT 1 FROM customers WHERE id = subscriptions.customer_id AND user_id = auth.uid())
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'subscriptions_admin' AND tablename = 'subscriptions') THEN
    CREATE POLICY subscriptions_admin ON subscriptions FOR ALL USING (
      EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('coordinator', 'admin'))
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_subscriptions' AND tablename = 'subscriptions') THEN
    CREATE POLICY service_subscriptions ON subscriptions FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- one_time_fixes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'onetime_own' AND tablename = 'one_time_fixes') THEN
    CREATE POLICY onetime_own ON one_time_fixes FOR SELECT USING (
      EXISTS (SELECT 1 FROM customers WHERE id = one_time_fixes.customer_id AND user_id = auth.uid())
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'onetime_admin' AND tablename = 'one_time_fixes') THEN
    CREATE POLICY onetime_admin ON one_time_fixes FOR ALL USING (
      EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('coordinator', 'admin'))
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_onetime' AND tablename = 'one_time_fixes') THEN
    CREATE POLICY service_onetime ON one_time_fixes FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- credentials_vault
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'creds_own' AND tablename = 'credentials_vault') THEN
    CREATE POLICY creds_own ON credentials_vault FOR SELECT USING (
      EXISTS (SELECT 1 FROM customers WHERE id = credentials_vault.customer_id AND user_id = auth.uid())
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'creds_admin' AND tablename = 'credentials_vault') THEN
    CREATE POLICY creds_admin ON credentials_vault FOR ALL USING (
      EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('coordinator', 'admin'))
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_creds' AND tablename = 'credentials_vault') THEN
    CREATE POLICY service_creds ON credentials_vault FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- payment_methods
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'payment_methods_own' AND tablename = 'payment_methods') THEN
    CREATE POLICY payment_methods_own ON payment_methods FOR ALL USING (
      EXISTS (SELECT 1 FROM customers WHERE id = payment_methods.customer_id AND user_id = auth.uid())
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'payment_methods_admin' AND tablename = 'payment_methods') THEN
    CREATE POLICY payment_methods_admin ON payment_methods FOR ALL USING (
      EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('coordinator', 'admin'))
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_payment_methods' AND tablename = 'payment_methods') THEN
    CREATE POLICY service_payment_methods ON payment_methods FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ═══════════════════════════════════════════
-- HELPER FUNCTIONS
-- ═══════════════════════════════════════════

-- Get user's role
CREATE OR REPLACE FUNCTION get_user_role(p_user_id uuid)
RETURNS user_role AS $$
  SELECT role FROM user_roles WHERE user_id = p_user_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Update customer MRR
CREATE OR REPLACE FUNCTION update_customer_mrr(p_customer_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE customers
  SET mrr = COALESCE((
    SELECT SUM(price_cents) / 100.0
    FROM subscriptions
    WHERE customer_id = p_customer_id AND status IN ('active', 'trialing')
  ), 0)
  WHERE id = p_customer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Calculate all MRR (HQ dashboard)
CREATE OR REPLACE FUNCTION calculate_all_mrr()
RETURNS numeric AS $$
  SELECT COALESCE(SUM(price_cents), 0) / 100.0
  FROM subscriptions
  WHERE status IN ('active', 'trialing');
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ═══════════════════════════════════════════
-- SEED DATA
-- ═══════════════════════════════════════════
-- NOTE: user_roles are auto-created by the auth trigger (handle_new_user)
-- when real users sign up. Do NOT seed fake UUIDs — they don't exist in auth.users.

INSERT INTO customers (id, email, full_name, company_name, website, plan, status, mrr) VALUES
  ('11111111-1111-1111-1111-111111111111', 'demo@acme-corp.com', 'Demo Customer', 'Acme Corp', 'acme-corp.com', 'sentinel', 'active', 249.00),
  ('11111111-1111-1111-1111-111111111112', 'lead1@techflow.io', NULL, 'TechFlow', 'techflow.io', 'guardian', 'lead', 0),
  ('11111111-1111-1111-1111-111111111113', 'lead2@datavault.net', NULL, 'DataVault', 'datavault.net', 'fortress', 'lead', 0)
ON CONFLICT DO NOTHING;

INSERT INTO subscriptions (customer_id, plan, price_cents, incidents_allowance, current_period_start, current_period_end) VALUES
  ('11111111-1111-1111-1111-111111111111', 'sentinel', 24900, 10, now(), now() + interval '30 days')
ON CONFLICT DO NOTHING;


-- ═══════════════════════════════════════════════════════════════
-- ═══════════════════════════════════════════════════════════════
-- UPTIMEOPS MIGRATION 002: Incidents, Pipeline, VM Sessions
-- Tables: incidents, pipeline_states, human_escalations,
--         vm_sessions, vm_commands, deployment_snapshots, smoke_tests
-- Paste into Supabase SQL Editor → Click Run
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════
-- TABLE: incidents
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS incidents (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id         uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  source_type         text NOT NULL DEFAULT 'subscription',
  source_id           uuid,
  title               text NOT NULL,
  description         text,
  website_url         text,
  status              incident_status NOT NULL DEFAULT 'lead_capture',
  priority            incident_priority NOT NULL DEFAULT 'P3_MEDIUM',
  ai_confidence       integer,
  assigned_engineer_id uuid,
  resolved_at         timestamptz,
  closed_at           timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_incidents_customer ON incidents(customer_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_priority ON incidents(priority);
CREATE INDEX IF NOT EXISTS idx_incidents_engineer ON incidents(assigned_engineer_id) WHERE assigned_engineer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_incidents_created ON incidents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_active ON incidents(status) WHERE status NOT IN ('resolved', 'closed');
CREATE INDEX IF NOT EXISTS idx_incidents_composite ON incidents(status, priority, created_at DESC);

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
  created_at      timestamptz NOT NULL DEFAULT now(),
  error_count     integer DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_pipeline_incident ON pipeline_states(incident_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_fix ON pipeline_states(fix_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_status ON pipeline_states(status);
CREATE INDEX IF NOT EXISTS idx_pipeline_active ON pipeline_states(created_at DESC) WHERE status IN ('running', 'awaiting_approval');

-- ═══════════════════════════════════════════
-- TABLE: human_escalations
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS human_escalations (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id           uuid REFERENCES incidents(id) ON DELETE CASCADE,
  fix_id                uuid REFERENCES one_time_fixes(id) ON DELETE CASCADE,
  pipeline_id           text REFERENCES pipeline_states(pipeline_id) ON DELETE SET NULL,
  trigger_reason        text NOT NULL,
  failed_step           text,
  assigned_engineer_id  uuid,
  status                escalation_status NOT NULL DEFAULT 'pending_assignment',
  reason                text,
  metadata              jsonb DEFAULT '{}',
  assigned_at           timestamptz,
  acknowledged_at       timestamptz,
  resolved_at           timestamptz,
  reassigned_at         timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_escalations_incident ON human_escalations(incident_id);
CREATE INDEX IF NOT EXISTS idx_escalations_engineer ON human_escalations(assigned_engineer_id) WHERE assigned_engineer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_escalations_status ON human_escalations(status);
CREATE INDEX IF NOT EXISTS idx_escalations_pending ON human_escalations(created_at) WHERE status = 'pending_assignment';

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
CREATE INDEX IF NOT EXISTS idx_vm_running ON vm_sessions(created_at) WHERE status = 'running';

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
  completed_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_commands_vm ON vm_commands(vm_session_id);
CREATE INDEX IF NOT EXISTS idx_commands_status ON vm_commands(status);

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

CREATE INDEX IF NOT EXISTS idx_snapshots_incident ON deployment_snapshots(incident_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_status ON deployment_snapshots(status);

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
  run_at          timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_smoke_incident ON smoke_tests(incident_id);

-- ═══════════════════════════════════════════
-- TRIGGERS: Auto-update updated_at
-- ═══════════════════════════════════════════
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_incidents_updated') THEN
    CREATE TRIGGER trg_incidents_updated
      BEFORE UPDATE ON incidents
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_pipeline_updated') THEN
    CREATE TRIGGER trg_pipeline_updated
      BEFORE UPDATE ON pipeline_states
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ═══════════════════════════════════════════
-- RLS: Enable and create policies
-- ═══════════════════════════════════════════

ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE human_escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE vm_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vm_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployment_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE smoke_tests ENABLE ROW LEVEL SECURITY;

-- incidents
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'incidents_own' AND tablename = 'incidents') THEN
    CREATE POLICY incidents_own ON incidents FOR SELECT USING (
      EXISTS (SELECT 1 FROM customers WHERE id = incidents.customer_id AND user_id = auth.uid())
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'incidents_engineer' AND tablename = 'incidents') THEN
    CREATE POLICY incidents_engineer ON incidents FOR SELECT USING (
      assigned_engineer_id IS NOT NULL AND
      EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('engineer', 'coordinator', 'admin'))
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'incidents_admin' AND tablename = 'incidents') THEN
    CREATE POLICY incidents_admin ON incidents FOR ALL USING (
      EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('coordinator', 'admin'))
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_incidents' AND tablename = 'incidents') THEN
    CREATE POLICY service_incidents ON incidents FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- pipeline_states
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'pipeline_engineer' AND tablename = 'pipeline_states') THEN
    CREATE POLICY pipeline_engineer ON pipeline_states FOR SELECT USING (
      EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('engineer', 'coordinator', 'admin'))
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'pipeline_admin' AND tablename = 'pipeline_states') THEN
    CREATE POLICY pipeline_admin ON pipeline_states FOR ALL USING (
      EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('coordinator', 'admin'))
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_pipeline' AND tablename = 'pipeline_states') THEN
    CREATE POLICY service_pipeline ON pipeline_states FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- human_escalations
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'escalations_engineer' AND tablename = 'human_escalations') THEN
    CREATE POLICY escalations_engineer ON human_escalations FOR SELECT USING (
      assigned_engineer_id IS NOT NULL AND
      EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('engineer', 'coordinator', 'admin'))
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'escalations_admin' AND tablename = 'human_escalations') THEN
    CREATE POLICY escalations_admin ON human_escalations FOR ALL USING (
      EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('coordinator', 'admin'))
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_escalations' AND tablename = 'human_escalations') THEN
    CREATE POLICY service_escalations ON human_escalations FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- vm_sessions
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'vm_engineer' AND tablename = 'vm_sessions') THEN
    CREATE POLICY vm_engineer ON vm_sessions FOR ALL USING (
      EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('engineer', 'coordinator', 'admin'))
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_vm' AND tablename = 'vm_sessions') THEN
    CREATE POLICY service_vm ON vm_sessions FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- vm_commands
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'vm_commands_engineer' AND tablename = 'vm_commands') THEN
    CREATE POLICY vm_commands_engineer ON vm_commands FOR ALL USING (
      EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('engineer', 'coordinator', 'admin'))
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_vm_commands' AND tablename = 'vm_commands') THEN
    CREATE POLICY service_vm_commands ON vm_commands FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- deployment_snapshots
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'snapshots_engineer' AND tablename = 'deployment_snapshots') THEN
    CREATE POLICY snapshots_engineer ON deployment_snapshots FOR ALL USING (
      EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('engineer', 'coordinator', 'admin'))
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_snapshots' AND tablename = 'deployment_snapshots') THEN
    CREATE POLICY service_snapshots ON deployment_snapshots FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- smoke_tests
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'smoke_engineer' AND tablename = 'smoke_tests') THEN
    CREATE POLICY smoke_engineer ON smoke_tests FOR ALL USING (
      EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('engineer', 'coordinator', 'admin'))
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_smoke' AND tablename = 'smoke_tests') THEN
    CREATE POLICY service_smoke ON smoke_tests FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ═══════════════════════════════════════════
-- SEED DATA
-- ═══════════════════════════════════════════
INSERT INTO incidents (id, customer_id, source_type, title, description, website_url, status, priority, ai_confidence) VALUES
  ('22222222-2222-2222-2222-222222222221', '11111111-1111-1111-1111-111111111111', 'subscription',
   'Database connection pool exhaustion on acme-corp.com',
   'PostgreSQL rejecting connections with "too many clients already". Affects checkout flow, user authentication, and order processing.',
   'acme-corp.com', 'triage', 'P1_CRITICAL', 72),
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'subscription',
   'SSL certificate expired on api.acme-corp.com',
   'SSL certificate expired 14 hours ago. API endpoints returning CERT_EXPIRED errors.',
   'api.acme-corp.com', 'resolved', 'P2_HIGH', 95)
ON CONFLICT DO NOTHING;

INSERT INTO pipeline_states (pipeline_id, incident_id, current_step, confidence, status) VALUES
  ('pl-2024-001-abc', '22222222-2222-2222-2222-222222222221', 'validate', 72, 'awaiting_approval')
ON CONFLICT DO NOTHING;

INSERT INTO human_escalations (incident_id, pipeline_id, trigger_reason, failed_step, status, reason) VALUES
  ('22222222-2222-2222-2222-222222222221', 'pl-2024-001-abc', 'ai_pipeline_failure', 'validate', 'pending_assignment',
   'AI confidence 72% below 90% auto-deploy threshold. Validation failed on 2/5 tests. Memory leak detected.')
ON CONFLICT DO NOTHING;


-- ═══════════════════════════════════════════════════════════════
-- ═══════════════════════════════════════════════════════════════
-- UPTIMEOPS MIGRATION 003: Audit Logs, Communications, Profiles
-- Tables: audit_logs, communications_log, notifications,
--         temporary_links, engineer_profiles, coordinator_profiles,
--         churn_events
-- Paste into Supabase SQL Editor → Click Run
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════
-- TABLE: audit_logs (IMMUTABLE)
-- Append-only, no UPDATE/DELETE allowed
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
  user_agent          text,
  sha256_hash         text
);

CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(performed_by_id) WHERE performed_by_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_composite ON audit_logs(entity_type, created_at DESC);

-- ═══════════════════════════════════════════
-- TABLE: communications_log
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS communications_log (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id     uuid REFERENCES customers(id) ON DELETE CASCADE,
  type            comm_type NOT NULL,
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
CREATE INDEX IF NOT EXISTS idx_comms_entity ON communications_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_comms_sent ON communications_log(sent_at DESC);

-- ═══════════════════════════════════════════
-- TABLE: notifications (in-app dashboard)
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
CREATE INDEX IF NOT EXISTS idx_notifications_customer ON notifications(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(read) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

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

CREATE INDEX IF NOT EXISTS idx_temp_customer ON temporary_links(customer_id);
CREATE INDEX IF NOT EXISTS idx_temp_hash ON temporary_links(token_hash);
CREATE INDEX IF NOT EXISTS idx_temp_expires ON temporary_links(expires_at) WHERE status = 'active';

-- ═══════════════════════════════════════════
-- TABLE: temporary_links_archive
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS temporary_links_archive (
  LIKE temporary_links INCLUDING ALL,
  archived_at timestamptz NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════
-- TABLE: engineer_profiles
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS engineer_profiles (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name                  text,
  email                 text,
  phone                 text,
  level                 text DEFAULT 'L1',
  timezone              text DEFAULT 'UTC',
  is_on_call            boolean DEFAULT false,
  can_rollback          boolean DEFAULT false,
  active_incident_count integer DEFAULT 0,
  total_resolved        integer DEFAULT 0,
  avg_resolution_minutes integer,
  satisfaction_score    numeric(3,2),
  last_heartbeat_at     timestamptz,
  last_assigned_at      timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_engineer_user ON engineer_profiles(user_id);
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

CREATE INDEX IF NOT EXISTS idx_churn_customer ON churn_events(customer_id);

-- ═══════════════════════════════════════════
-- FUNCTIONS: Audit log protection
-- ═══════════════════════════════════════════

-- Prevent UPDATE/DELETE on audit_logs (immutable)
CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is immutable: % operations are not allowed', TG_OP;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_no_update') THEN
    CREATE TRIGGER trg_audit_no_update
      BEFORE UPDATE ON audit_logs
      FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_no_delete') THEN
    CREATE TRIGGER trg_audit_no_delete
      BEFORE DELETE ON audit_logs
      FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();
  END IF;
END $$;

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

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_hash') THEN
    CREATE TRIGGER trg_audit_hash
      BEFORE INSERT ON audit_logs
      FOR EACH ROW EXECUTE FUNCTION calculate_audit_hash();
  END IF;
END $$;

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
-- RLS: Enable and create policies
-- ═══════════════════════════════════════════

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE communications_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE temporary_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE engineer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE coordinator_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE churn_events ENABLE ROW LEVEL SECURITY;

-- audit_logs
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'audit_admin' AND tablename = 'audit_logs') THEN
    CREATE POLICY audit_admin ON audit_logs FOR SELECT USING (
      EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('coordinator', 'admin'))
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'audit_engineer' AND tablename = 'audit_logs') THEN
    CREATE POLICY audit_engineer ON audit_logs FOR SELECT USING (
      EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'engineer')
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_audit' AND tablename = 'audit_logs') THEN
    CREATE POLICY service_audit ON audit_logs FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- communications_log
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'comms_own' AND tablename = 'communications_log') THEN
    CREATE POLICY comms_own ON communications_log FOR SELECT USING (
      EXISTS (SELECT 1 FROM customers WHERE id = communications_log.customer_id AND user_id = auth.uid())
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'comms_admin' AND tablename = 'communications_log') THEN
    CREATE POLICY comms_admin ON communications_log FOR ALL USING (
      EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('coordinator', 'admin'))
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_comms' AND tablename = 'communications_log') THEN
    CREATE POLICY service_comms ON communications_log FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- notifications
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'notif_own' AND tablename = 'notifications') THEN
    CREATE POLICY notif_own ON notifications FOR ALL USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'notif_admin' AND tablename = 'notifications') THEN
    CREATE POLICY notif_admin ON notifications FOR ALL USING (
      EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('coordinator', 'admin'))
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_notif' AND tablename = 'notifications') THEN
    CREATE POLICY service_notif ON notifications FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- temporary_links
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'temp_own' AND tablename = 'temporary_links') THEN
    CREATE POLICY temp_own ON temporary_links FOR SELECT USING (
      EXISTS (SELECT 1 FROM customers WHERE id = temporary_links.customer_id AND user_id = auth.uid())
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'temp_admin' AND tablename = 'temporary_links') THEN
    CREATE POLICY temp_admin ON temporary_links FOR ALL USING (
      EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('coordinator', 'admin'))
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_temp' AND tablename = 'temporary_links') THEN
    CREATE POLICY service_temp ON temporary_links FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- engineer_profiles
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'eng_self' AND tablename = 'engineer_profiles') THEN
    CREATE POLICY eng_self ON engineer_profiles FOR SELECT USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'eng_admin' AND tablename = 'engineer_profiles') THEN
    CREATE POLICY eng_admin ON engineer_profiles FOR ALL USING (
      EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('coordinator', 'admin'))
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_eng' AND tablename = 'engineer_profiles') THEN
    CREATE POLICY service_eng ON engineer_profiles FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- coordinator_profiles
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'coord_self' AND tablename = 'coordinator_profiles') THEN
    CREATE POLICY coord_self ON coordinator_profiles FOR SELECT USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'coord_admin' AND tablename = 'coordinator_profiles') THEN
    CREATE POLICY coord_admin ON coordinator_profiles FOR ALL USING (
      EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_coord' AND tablename = 'coordinator_profiles') THEN
    CREATE POLICY service_coord ON coordinator_profiles FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- churn_events
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'churn_admin' AND tablename = 'churn_events') THEN
    CREATE POLICY churn_admin ON churn_events FOR ALL USING (
      EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('coordinator', 'admin'))
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_churn' AND tablename = 'churn_events') THEN
    CREATE POLICY service_churn ON churn_events FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ═══════════════════════════════════════════
-- SEED DATA
-- ═══════════════════════════════════════════
INSERT INTO engineer_profiles (id, name, email, level, is_on_call, total_resolved, avg_resolution_minutes, satisfaction_score) VALUES
  ('33333333-3333-3333-3333-333333333331', 'Alex Chen', 'alex@uptimeops.com', 'L2', true, 142, 22, 4.8),
  ('33333333-3333-3333-3333-333333333332', 'Jordan Smith', 'jordan@uptimeops.com', 'L1', true, 89, 35, 4.5),
  ('33333333-3333-3333-3333-333333333333', 'Riley Park', 'riley@uptimeops.com', 'L3', false, 234, 18, 4.9)
ON CONFLICT DO NOTHING;

INSERT INTO coordinator_profiles (id, name, email, is_lead, can_rollback) VALUES
  ('44444444-4444-4444-4444-444444444441', 'Morgan Lee', 'morgan@uptimeops.com', true, true),
  ('44444444-4444-4444-4444-444444444442', 'Casey Jones', 'casey@uptimeops.com', false, true)
ON CONFLICT DO NOTHING;

INSERT INTO audit_logs (table_name, entity_type, entity_id, action, performed_by_type, new_values) VALUES
  ('system', 'platform', 'uptimeops', 'platform_initialized', 'system', '{"version": "1.0.0"}'::jsonb)
ON CONFLICT DO NOTHING;

INSERT INTO communications_log (customer_id, type, channel, entity_type, entity_id, subject, body) VALUES
  ('11111111-1111-1111-1111-111111111111', 'incident_created', 'email', 'incident', '22222222-2222-2222-2222-222222222221',
   '[UptimeOps] Incident Detected — acme-corp.com',
   'We''ve detected an issue with acme-corp.com. Our AI is already investigating.')
ON CONFLICT DO NOTHING;


-- ═══════════════════════════════════════════════════════════════
-- ═══════════════════════════════════════════════════════════════
-- UPTIMEOPS MIGRATION 004: Functions, Cron Jobs, Storage
-- Paste into Supabase SQL Editor → Click Run
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════
-- DASHBOARD HELPER FUNCTIONS
-- ═══════════════════════════════════════════

-- HQ Dashboard KPI aggregation
CREATE OR REPLACE FUNCTION get_dashboard_metrics()
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_customers', (SELECT count(*) FROM customers),
    'active_subscriptions', (SELECT count(*) FROM subscriptions WHERE status IN ('active', 'trialing')),
    'total_mrr', calculate_all_mrr(),
    'open_incidents', (SELECT count(*) FROM incidents WHERE status NOT IN ('resolved', 'closed')),
    'critical_incidents', (SELECT count(*) FROM incidents WHERE priority = 'P1_CRITICAL' AND status NOT IN ('resolved', 'closed')),
    'pending_escalations', (SELECT count(*) FROM human_escalations WHERE status = 'pending_assignment'),
    'running_vms', (SELECT count(*) FROM vm_sessions WHERE status = 'running'),
    'active_engineers', (SELECT count(*) FROM engineer_profiles WHERE is_on_call = true),
    'avg_resolution_minutes', (SELECT COALESCE(AVG(avg_resolution_minutes), 0) FROM engineer_profiles WHERE avg_resolution_minutes IS NOT NULL),
    'churned_this_month', (SELECT count(*) FROM churn_events WHERE churned_at > date_trunc('month', now()))
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Engineer performance report
CREATE OR REPLACE FUNCTION get_engineer_performance(p_engineer_id uuid)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'engineer_id', p_engineer_id,
    'name', (SELECT name FROM engineer_profiles WHERE id = p_engineer_id),
    'total_resolved', ep.total_resolved,
    'avg_resolution_minutes', ep.avg_resolution_minutes,
    'satisfaction_score', ep.satisfaction_score,
    'active_incidents', ep.active_incident_count,
    'is_on_call', ep.is_on_call,
    'recent_incidents', (
      SELECT jsonb_agg(jsonb_build_object(
        'id', i.id,
        'title', i.title,
        'status', i.status,
        'priority', i.priority,
        'created_at', i.created_at
      ))
      FROM incidents i
      WHERE i.assigned_engineer_id = p_engineer_id
      ORDER BY i.created_at DESC
      LIMIT 10
    )
  ) INTO result
  FROM engineer_profiles ep
  WHERE ep.id = p_engineer_id;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Customer health scoring (0-100)
CREATE OR REPLACE FUNCTION get_customer_health(p_customer_id uuid)
RETURNS jsonb AS $$ BEGIN
  RETURN jsonb_build_object(
    'customer_id', p_customer_id,
    'health_score', GREATEST(0, 100
      - (SELECT count(*) * 10 FROM incidents WHERE customer_id = p_customer_id AND status NOT IN ('resolved', 'closed'))
      - CASE WHEN (SELECT status FROM subscriptions WHERE customer_id = p_customer_id ORDER BY created_at DESC LIMIT 1) = 'past_due' THEN 30 ELSE 0 END
      - CASE WHEN (SELECT churn_risk_score FROM customers WHERE id = p_customer_id) > 70 THEN 20 ELSE 0 END
    ),
    'open_incidents', (SELECT count(*) FROM incidents WHERE customer_id = p_customer_id AND status NOT IN ('resolved', 'closed')),
    'subscription_status', (SELECT status FROM subscriptions WHERE customer_id = p_customer_id ORDER BY created_at DESC LIMIT 1),
    'days_since_last_incident', (SELECT EXTRACT(DAY FROM now() - MAX(created_at))::int FROM incidents WHERE customer_id = p_customer_id),
    'incidents_this_month', (SELECT count(*) FROM incidents WHERE customer_id = p_customer_id AND created_at > date_trunc('month', now()))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Archive expired temporary links
CREATE OR REPLACE FUNCTION archive_expired_links()
RETURNS integer AS $$
DECLARE
  archived_count integer;
BEGIN
  INSERT INTO temporary_links_archive
  SELECT *, now() as archived_at
  FROM temporary_links
  WHERE status = 'active'
    AND expires_at < now();

  GET DIAGNOSTICS archived_count = ROW_COUNT;

  UPDATE temporary_links
  SET status = 'archived'
  WHERE status = 'active'
    AND expires_at < now();

  RETURN archived_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════
-- CRON JOBS
-- pg_cron is required. Enable it via:
--   Supabase Dashboard → Database → Extensions → pg_cron
-- If pg_cron is not available, cron jobs will be skipped safely.
-- ═══════════════════════════════════════════

-- Try to enable pg_cron (may require superuser on some instances)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Schedule jobs only if cron schema exists
DO $DO$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'cron') THEN
    PERFORM cron.schedule('cleanup-vms', '0 * * * *',
      'UPDATE vm_sessions SET status = ''timeout'', destroyed_at = now(), destroy_reason = ''auto_timeout_4h'' WHERE status = ''running'' AND created_at < now() - interval ''4 hours'';'
    );

    PERFORM cron.schedule('cleanup-credentials', '0 4 * * *',
      'UPDATE credentials_vault SET revoked_at = now() WHERE revoked_at IS NULL AND expires_at < now();'
    );

    PERFORM cron.schedule('archive-links', '0 3 * * *',
      'SELECT archive_expired_links();'
    );

    PERFORM cron.schedule('reset-allowances', '0 0 1 * *',
      'UPDATE subscriptions SET incidents_used_this_period = 0 WHERE status IN (''active'', ''trialing'');'
    );

    PERFORM cron.schedule('engineer-heartbeat', '*/5 * * * *',
      'UPDATE engineer_profiles SET is_on_call = false WHERE is_on_call = true AND last_heartbeat_at < now() - interval ''5 minutes'';'
    );

    PERFORM cron.schedule('auto-close', '0 */6 * * *',
      'UPDATE incidents SET status = ''closed'', closed_at = now() WHERE status = ''resolved'' AND resolved_at < now() - interval ''24 hours'';'
    );

    PERFORM cron.schedule('subscription-reminders', '0 9 * * *',
      'INSERT INTO notifications (customer_id, type, message) SELECT customer_id, ''renewal_reminder'', ''Your subscription expires in '' || EXTRACT(DAY FROM current_period_end - now())::text || '' days.'' FROM subscriptions WHERE status = ''active'' AND current_period_end BETWEEN now() AND now() + interval ''7 days'';'
    );
  ELSE
    RAISE NOTICE 'pg_cron not available. Enable via Dashboard → Database → Extensions → pg_cron';
  END IF;
END $DO$;

-- ═══════════════════════════════════════════
-- STORAGE BUCKETS
-- ═══════════════════════════════════════════
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'session-recordings', 'session-recordings', false, 524288000,
  ARRAY['video/webm', 'video/mp4', 'application/octet-stream']::text[]
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'audit-evidence', 'audit-evidence', false, 104857600,
  ARRAY['image/png', 'image/jpeg', 'application/pdf', 'text/plain']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════
-- NOTE: REALTIME ENABLEMENT
-- Enable via Supabase Dashboard → Database → Replication
-- Toggle ON for these tables:
--   incidents, human_escalations, pipeline_states,
--   notifications, engineer_profiles, vm_sessions,
--   audit_logs, communications_log
--
-- NOTE: HTTP WEBHOOKS
-- For incident-created / approval-needed / resolved webhooks,
-- configure Supabase Database Webhooks via the Dashboard.
-- This avoids pg_net dependency in SQL migrations.
-- ═══════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════
-- ═══════════════════════════════════════════════════════════════
-- UPTIMEOPS MIGRATION 005: Final Seed Data + Validation
-- Paste into Supabase SQL Editor → Click Run
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════
-- AUTO-LOG TRIGGERS for key tables
-- ═══════════════════════════════════════════
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_log_incidents') THEN
    CREATE TRIGGER trg_log_incidents
      AFTER INSERT OR UPDATE OR DELETE ON incidents
      FOR EACH ROW EXECUTE FUNCTION log_table_change();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_log_subscriptions') THEN
    CREATE TRIGGER trg_log_subscriptions
      AFTER INSERT OR UPDATE OR DELETE ON subscriptions
      FOR EACH ROW EXECUTE FUNCTION log_table_change();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_log_credentials') THEN
    CREATE TRIGGER trg_log_credentials
      AFTER INSERT OR UPDATE OR DELETE ON credentials_vault
      FOR EACH ROW EXECUTE FUNCTION log_table_change();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_log_escalations') THEN
    CREATE TRIGGER trg_log_escalations
      AFTER INSERT OR UPDATE ON human_escalations
      FOR EACH ROW EXECUTE FUNCTION log_table_change();
  END IF;
END $$;

-- ═══════════════════════════════════════════
-- COMPREHENSIVE SEED DATA
-- ═══════════════════════════════════════════

-- More customers
INSERT INTO customers (id, email, full_name, company_name, website, phone, plan, status, mrr) VALUES
  ('11111111-1111-1111-1111-111111111114', 'admin@techflow.io', 'Sarah Kim', 'TechFlow', 'techflow.io', '+1-555-0101', 'guardian', 'active', 99.00),
  ('11111111-1111-1111-1111-111111111115', 'ops@datavault.net', 'Mike Torres', 'DataVault', 'datavault.net', '+1-555-0102', 'fortress', 'active', 599.00),
  ('11111111-1111-1111-1111-111111111116', 'dev@cloudspire.io', NULL, 'CloudSpire', 'cloudspire.io', NULL, 'sentinel', 'active', 249.00),
  ('11111111-1111-1111-1111-111111111117', 'cto@nexustrack.com', 'Priya Sharma', 'NexusTrack', 'nexustrack.com', '+1-555-0103', 'guardian', 'lead', 0),
  ('11111111-1111-1111-1111-111111111118', 'founder@devmesh.co', NULL, 'DevMesh', 'devmesh.co', NULL, 'guardian', 'churned', 0)
ON CONFLICT DO NOTHING;

-- More subscriptions
INSERT INTO subscriptions (customer_id, plan, price_cents, incidents_allowance, current_period_start, current_period_end) VALUES
  ('11111111-1111-1111-1111-111111111114', 'guardian', 9900, 3, now(), now() + interval '30 days'),
  ('11111111-1111-1111-1111-111111111115', 'fortress', 59900, 999, now(), now() + interval '30 days'),
  ('11111111-1111-1111-1111-111111111116', 'sentinel', 24900, 10, now(), now() + interval '30 days')
ON CONFLICT DO NOTHING;

-- More incidents
INSERT INTO incidents (id, customer_id, source_type, title, description, website_url, status, priority, ai_confidence, assigned_engineer_id) VALUES
  ('22222222-2222-2222-2222-222222222223', '11111111-1111-1111-1111-111111111114', 'subscription',
   'Nginx config error causing 502s on techflow.io',
   'Upstream timeout misconfiguration causing intermittent 502 errors on all API endpoints.',
   'techflow.io', 'resolved', 'P2_HIGH', 95, '33333333-3333-3333-3333-333333333331'),
  ('22222222-2222-2222-2222-222222222224', '11111111-1111-1111-1111-111111111115', 'subscription',
   'Redis memory exhaustion on datavault.net',
   'Redis instance reached maxmemory limit, causing cache eviction and performance degradation.',
   'datavault.net', 'triage', 'P1_CRITICAL', 88, NULL),
  ('22222222-2222-2222-2222-222222222225', '11111111-1111-1111-1111-111111111116', 'subscription',
   'Docker container restart loop on cloudspire.io',
   'Container health check failing, causing infinite restart loop. Application unreachable.',
   'cloudspire.io', 'repair', 'P2_HIGH', 82, '33333333-3333-3333-3333-333333333332'),
  ('22222222-2222-2222-2222-222222222226', '11111111-1111-1111-1111-111111111111', 'subscription',
   'Certificate auto-renewal failed on acme-corp.com',
   'Let''s Encrypt renewal failed due to DNS challenge timeout. SSL expires in 3 days.',
   'acme-corp.com', 'coordinator_approval', 'P3_MEDIUM', 91, NULL),
  ('22222222-2222-2222-2222-222222222227', '11111111-1111-1111-1111-111111111114', 'subscription',
   'Database slow query causing timeouts',
   'Missing index on orders.created_at causing sequential scans. Query time >8s.',
   'techflow.io', 'smoke_test', 'P2_HIGH', 94, '33333333-3333-3333-3333-333333333333'),
  ('22222222-2222-2222-2222-222222222228', '11111111-1111-1111-1111-111111111115', 'subscription',
   'Load balancer misrouting traffic',
   'AWS ALB routing to unhealthy targets. 40% of requests failing.',
   'datavault.net', 'triage', 'P1_CRITICAL', NULL, NULL)
ON CONFLICT DO NOTHING;

-- One-time fixes
INSERT INTO one_time_fixes (customer_id, status, amount_paid, website_url, issue_description) VALUES
  ('11111111-1111-1111-1111-111111111117', 'paid', 249.00, 'nexustrack.com', 'Complete site down — database corruption after failed migration.'),
  ('11111111-1111-1111-1111-111111111118', 'payment_failed', NULL, 'devmesh.co', 'SSL expired + mixed content errors on checkout flow.'),
  ('11111111-1111-1111-1111-111111111111', 'paid', 99.00, 'acme-corp.com', 'API returning 500 errors — suspected middleware issue.')
ON CONFLICT DO NOTHING;

-- Pipeline states
INSERT INTO pipeline_states (pipeline_id, incident_id, current_step, confidence, status) VALUES
  ('pl-2024-002-def', '22222222-2222-2222-2222-222222222224', 'validate', 88, 'awaiting_approval'),
  ('pl-2024-003-ghi', '22222222-2222-2222-2222-222222222225', 'repair', 82, 'running')
ON CONFLICT DO NOTHING;

-- Human escalations for new incidents
INSERT INTO human_escalations (incident_id, trigger_reason, failed_step, status, reason) VALUES
  ('22222222-2222-2222-2222-222222222224', 'ai_low_confidence', 'validate', 'pending_assignment', 'AI confidence 88% below 90% auto-deploy threshold for Redis fix.'),
  ('22222222-2222-2222-2222-222222222228', 'no_engineer_available', 'triage', 'pending_assignment', 'No L2+ engineers currently on call for P1 incident.')
ON CONFLICT DO NOTHING;

-- Communications
INSERT INTO communications_log (customer_id, type, channel, entity_type, entity_id, subject, delivery_status) VALUES
  ('11111111-1111-1111-1111-111111111114', 'incident_created', 'email', 'incident', '22222222-2222-2222-2222-222222222223', '[UptimeOps] Incident Detected', 'delivered'),
  ('11111111-1111-1111-1111-111111111114', 'incident_created', 'sms', 'incident', '22222222-2222-2222-2222-222222222223', 'UptimeOps: Incident on techflow.io', 'delivered'),
  ('11111111-1111-1111-1111-111111111114', 'incident_resolved', 'email', 'incident', '22222222-2222-2222-2222-222222222223', '[UptimeOps] Resolved — techflow.io', 'delivered')
ON CONFLICT DO NOTHING;

-- Notifications
INSERT INTO notifications (customer_id, type, message, entity_type, entity_id) VALUES
  ('11111111-1111-1111-1111-111111111111', 'incident_update', 'New incident detected on acme-corp.com. AI is investigating.', 'incident', '22222222-2222-2222-2222-222222222221'),
  ('11111111-1111-1111-1111-111111111114', 'incident_resolved', 'Your incident on techflow.io has been resolved. Please verify.', 'incident', '22222222-2222-2222-2222-222222222223')
ON CONFLICT DO NOTHING;

-- Temporary links
INSERT INTO temporary_links (token_hash, entity_type, entity_id, customer_id, expires_at, access_count, status) VALUES
  ('a1b2c3d4e5f6789012345678901234567890abcd1234ef5678901234567890ab', 'incident', '22222222-2222-2222-2222-222222222223', '11111111-1111-1111-1111-111111111114', now() + interval '72 hours', 3, 'active'),
  ('b2c3d4e5f6789012345678901234567890abcd1234ef5678901234567890abc1', 'one_time_fix', (SELECT id FROM one_time_fixes WHERE website_url = 'nexustrack.com' LIMIT 1), '11111111-1111-1111-1111-111111111117', now() - interval '1 hour', 12, 'expired')
ON CONFLICT DO NOTHING;

-- VM sessions
INSERT INTO vm_sessions (id, incident_id, provider_vm_id, ip_address, status) VALUES
  ('55555555-5555-5555-5555-555555555551', '22222222-2222-2222-2222-222222222221', 'vm-7f3a9e2d', '203.0.113.47', 'running'),
  ('55555555-5555-5555-5555-555555555552', '22222222-2222-2222-2222-222222222224', 'vm-8b4c1f3a', '203.0.113.48', 'running')
ON CONFLICT DO NOTHING;

-- VM commands
INSERT INTO vm_commands (vm_session_id, command, status, output, exit_code) VALUES
  ('55555555-5555-5555-5555-555555555551', 'psql -c "SELECT count(*) FROM pg_stat_activity;"', 'completed', ' active_connections: 47/100', 0),
  ('55555555-5555-5555-5555-555555555551', 'cat /var/log/postgresql/postgresql-14.log | tail -50', 'completed', ' FATAL: sorry, too many clients already', 1),
  ('55555555-5555-5555-5555-555555555552', 'redis-cli INFO memory', 'completed', ' used_memory_human: 1.92G\n maxmemory_human: 2.00G', 0)
ON CONFLICT DO NOTHING;

-- Smoke tests
INSERT INTO smoke_tests (vm_session_id, incident_id, pipeline_id, results, overall_passed) VALUES
  ('55555555-5555-5555-5555-555555555551', '22222222-2222-2222-2222-222222222221', 'pl-2024-001-abc',
   '[{"test": "homepage_load", "passed": true, "duration_ms": 234}, {"test": "api_health", "passed": true, "duration_ms": 89}, {"test": "ssl_valid", "passed": true, "duration_ms": 12}]'::jsonb,
   true),
  ('55555555-5555-5555-5555-555555555552', '22222222-2222-2222-2222-222222222224', 'pl-2024-002-def',
   '[{"test": "redis_ping", "passed": false, "duration_ms": 5001, "error": "Connection timeout"}]'::jsonb,
   false)
ON CONFLICT DO NOTHING;

-- Deployment snapshots
INSERT INTO deployment_snapshots (incident_id, vm_session_id, status, metadata) VALUES
  ('22222222-2222-2222-2222-222222222221', '55555555-5555-5555-5555-555555555551', 'used',
   '{"snapshot_time": "2024-01-15T09:23:00Z", "nginx_config_sha": "a1b2c3d4", "pre_deploy_checks": "all_passed"}'::jsonb)
ON CONFLICT DO NOTHING;

-- Churn events
INSERT INTO churn_events (stripe_subscription_id, customer_id, reason) VALUES
  ('sub_churned_001', '11111111-1111-1111-1111-111111111118', 'price_too_high')
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════
-- VALIDATION: Verify schema integrity
-- ═══════════════════════════════════════════
SELECT
  'UPTIMEOPS SCHEMA COMPLETE' as status,
  (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE') as table_count,
  (SELECT count(*) FROM pg_policies WHERE schemaname = 'public') as policy_count,
  (SELECT count(*) FROM information_schema.triggers WHERE trigger_schema = 'public') as trigger_count,
  (SELECT count(*) FROM pg_indexes WHERE schemaname = 'public') as index_count,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'cron')
    THEN (SELECT count(*) FROM cron.job)
    ELSE 0
  END as cron_job_count;


-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- FINAL VALIDATION
-- ═══════════════════════════════════════════════════════════════
SELECT
  'UPTIMEOPS COMPLETE' as status,
  (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE') as tables,
  (SELECT count(*) FROM pg_policies WHERE schemaname = 'public') as rls_policies,
  (SELECT count(*) FROM information_schema.triggers WHERE trigger_schema = 'public') as triggers,
  (SELECT count(*) FROM pg_indexes WHERE schemaname = 'public') as indexes,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'cron')
    THEN (SELECT count(*) FROM cron.job)
    ELSE 0
  END as cron_jobs;
