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
