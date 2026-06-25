-- ═══════════════════════════════════════════════════════════════
-- MIGRATION 001: Core Schema — Customers, Auth, Roles
-- ═══════════════════════════════════════════════════════════════

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ═══════════════════════════════════════════
-- ENUMS
-- ═══════════════════════════════════════════

CREATE TYPE user_role AS ENUM ('public', 'customer', 'engineer', 'coordinator', 'admin');
CREATE TYPE plan_tier AS ENUM ('guardian', 'sentinel', 'fortress');
CREATE TYPE subscription_status AS ENUM ('active', 'paused', 'past_due', 'cancelled', 'trialing');
CREATE TYPE incident_priority AS ENUM ('P1_CRITICAL', 'P2_HIGH', 'P3_MEDIUM', 'P4_LOW');
CREATE TYPE incident_status AS ENUM (
  'lead_capture', 'payment_pending', 'credential_submission',
  'triage', 'isolate', 'repair', 'validate',
  'coordinator_approval', 'deploy', 'smoke_test',
  'verify_fix', 'continuous_monitor', 'resolved', 'closed'
);
CREATE TYPE pipeline_status AS ENUM ('running', 'awaiting_approval', 'completed', 'failed', 'escalated', 'rollback');
CREATE TYPE escalation_status AS ENUM ('pending_assignment', 'assigned', 'acknowledged', 'in_progress', 'resolved');
CREATE TYPE vm_status AS ENUM ('creating', 'running', 'destroyed', 'failed', 'timeout');
CREATE_TYPE comm_channel AS ENUM ('email', 'sms', 'push', 'dashboard');
CREATE_TYPE comm_type AS ENUM (
  'incident_created', 'incident_resolved', 'approval_required',
  'payment_succeeded', 'payment_failed', 'dunning_email',
  'invoice_paid', 'credential_approval_request', 'credential_approved',
  'credential_denied', 'ai_escalation', 'rollback_executed',
  'renewal_reminder', 'exit_survey', 'overage_alert',
  'temporary_access_granted', 'engineer_timeout', 'incident_assigned',
  'fix_submitted', 'smoke_test_passed', 'smoke_test_failed'
);

-- ═══════════════════════════════════════════
-- TABLE: user_roles
-- ═══════════════════════════════════════════
CREATE TABLE user_roles (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role        user_role NOT NULL DEFAULT 'public',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role);

-- ═══════════════════════════════════════════
-- TABLE: customers
-- ═══════════════════════════════════════════
CREATE TABLE customers (
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

CREATE INDEX idx_customers_user ON customers(user_id);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_plan ON customers(plan);
CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_customers_stripe ON customers(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- ═══════════════════════════════════════════
-- TABLE: subscriptions
-- ═══════════════════════════════════════════
CREATE TABLE subscriptions (
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

CREATE INDEX idx_subscriptions_customer ON subscriptions(customer_id);
CREATE INDEX idx_subscriptions_stripe ON subscriptions(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_period ON subscriptions(current_period_end) WHERE status = 'active';

-- ═══════════════════════════════════════════
-- TABLE: one_time_fixes
-- ═══════════════════════════════════════════
CREATE TABLE one_time_fixes (
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

CREATE INDEX idx_onetime_customer ON one_time_fixes(customer_id);
CREATE INDEX idx_onetime_payment ON one_time_fixes(payment_intent_id) WHERE payment_intent_id IS NOT NULL;
CREATE INDEX idx_onetime_status ON one_time_fixes(status);

-- ═══════════════════════════════════════════
-- TABLE: credentials_vault
-- Zero-knowledge: server only stores encrypted payload
-- ═══════════════════════════════════════════
CREATE TABLE credentials_vault (
  id                      uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id             uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  encrypted_payload       text NOT NULL,  -- AES-256-GCM ciphertext only
  public_key_fingerprint  text NOT NULL,  -- SHA-256 of public key for lookup
  iv                      text NOT NULL,  -- Initialization vector (safe to store)
  salt                    text NOT NULL,  -- Key derivation salt
  expires_at              timestamptz NOT NULL,
  revoked_at              timestamptz,
  access_count            integer DEFAULT 0,
  last_accessed_at        timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_credentials_customer ON credentials_vault(customer_id);
CREATE INDEX idx_credentials_fingerprint ON credentials_vault(public_key_fingerprint);
CREATE INDEX idx_credentials_expires ON credentials_vault(expires_at) WHERE revoked_at IS NULL;

-- ═══════════════════════════════════════════
-- TRIGGERS: Auto-update updated_at
-- ═══════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_customers_updated
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_subscriptions_updated
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_user_roles_updated
  BEFORE UPDATE ON user_roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_onetime_fixes_updated
  BEFORE UPDATE ON one_time_fixes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════
-- RLS POLICIES: Core tables
-- ═══════════════════════════════════════════

-- Enable RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE one_time_fixes ENABLE ROW LEVEL SECURITY;
ALTER TABLE credentials_vault ENABLE ROW LEVEL SECURITY;

-- user_roles: users can read their own role, admins can manage all
CREATE POLICY user_roles_own ON user_roles
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY user_roles_admin ON user_roles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('coordinator', 'admin'))
  );

-- customers: own record + coordinator/admin can manage
CREATE POLICY customers_own ON customers
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY customers_admin ON customers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('coordinator', 'admin'))
  );

-- subscriptions: own + coordinator/admin
CREATE POLICY subscriptions_own ON subscriptions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM customers WHERE id = subscriptions.customer_id AND user_id = auth.uid())
  );
CREATE POLICY subscriptions_admin ON subscriptions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('coordinator', 'admin'))
  );

-- one_time_fixes: own + coordinator/admin
CREATE POLICY onetime_own ON one_time_fixes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM customers WHERE id = one_time_fixes.customer_id AND user_id = auth.uid())
  );
CREATE POLICY onetime_admin ON one_time_fixes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('coordinator', 'admin'))
  );

-- credentials_vault: customer can read own, engineer needs approval flow, coordinator can audit
CREATE POLICY creds_own ON credentials_vault
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM customers WHERE id = credentials_vault.customer_id AND user_id = auth.uid())
  );
CREATE POLICY creds_admin ON credentials_vault
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('coordinator', 'admin'))
  );

-- Allow service role (edge functions) full access
CREATE POLICY service_user_roles ON user_roles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY service_customers ON customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY service_subscriptions ON subscriptions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY service_onetime ON one_time_fixes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY service_creds ON credentials_vault FOR ALL USING (true) WITH CHECK (true);

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
  SET mrr = (
    SELECT COALESCE(SUM(price_cents), 0) / 100.0
    FROM subscriptions
    WHERE customer_id = p_customer_id AND status IN ('active', 'trialing')
  )
  WHERE id = p_customer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Calculate all MRR (for HQ dashboard)
CREATE OR REPLACE FUNCTION calculate_all_mrr()
RETURNS numeric AS $$
  SELECT COALESCE(SUM(price_cents), 0) / 100.0
  FROM subscriptions
  WHERE status IN ('active', 'trialing');
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ═══════════════════════════════════════════
-- SEED DATA
-- ═══════════════════════════════════════════

INSERT INTO user_roles (user_id, role) VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin'),
  ('00000000-0000-0000-0000-000000000002', 'coordinator'),
  ('00000000-0000-0000-0000-000000000003', 'engineer'),
  ('00000000-0000-0000-0000-000000000004', 'customer');

INSERT INTO customers (id, user_id, email, full_name, company_name, website, plan, status, mrr) VALUES
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000004', 'demo@acme-corp.com', 'Demo Customer', 'Acme Corp', 'acme-corp.com', 'sentinel', 'active', 249.00),
  ('11111111-1111-1111-1111-111111111112', NULL, 'lead1@techflow.io', NULL, 'TechFlow', 'techflow.io', 'guardian', 'lead', 0),
  ('11111111-1111-1111-1111-111111111113', NULL, 'lead2@datavault.net', NULL, 'DataVault', 'datavault.net', 'fortress', 'lead', 0);

INSERT INTO subscriptions (customer_id, plan, price_cents, incidents_allowance, current_period_start, current_period_end) VALUES
  ('11111111-1111-1111-1111-111111111111', 'sentinel', 24900, 10, now(), now() + interval '30 days');
