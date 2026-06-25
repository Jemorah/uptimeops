-- ═══════════════════════════════════════════════════════════════
-- UPTIMEOPS COMPLETE DATABASE SCHEMA
-- Supabase PostgreSQL + Realtime + RLS
-- 11 Tables, 15+ Enums, Full RLS Policies, Triggers, Indexes
-- ═══════════════════════════════════════════════════════════════

-- ============================================================
-- 1. EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 2. ENUM TYPES
-- ============================================================

-- Customer subscription status
DO $$ BEGIN
  CREATE TYPE customer_subscription_status AS ENUM ('none', 'active', 'paused', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Subscription tiers
DO $$ BEGIN
  CREATE TYPE subscription_tier AS ENUM ('none', 'guardian', 'sentinel', 'fortress');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- One-time fix status (full AI pipeline + payment states)
DO $$ BEGIN
  CREATE TYPE one_time_fix_status AS ENUM (
    'pending_payment', 'paid', 'triage', 'isolating', 'repairing',
    'validating', 'coordinator_review', 'deploying', 'completed',
    'failed', 'refunded'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- One-time fix tier (severity-based pricing)
DO $$ BEGIN
  CREATE TYPE one_time_fix_tier AS ENUM ('rapid', 'critical', 'catastrophic');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Issue categories
DO $$ BEGIN
  CREATE TYPE issue_category AS ENUM (
    'malware', 'plugin_conflict', 'broken_code', 'ddos',
    'firewall', 'performance', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Subscription status
DO $$ BEGIN
  CREATE TYPE sub_status AS ENUM ('active', 'paused', 'cancelled', 'past_due');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Incident status
DO $$ BEGIN
  CREATE TYPE incident_status AS ENUM (
    'open', 'in_progress', 'ai_repairing', 'human_escalated',
    'coordinator_review', 'deployed', 'verified_closed',
    'auto_rolled_back', 'failed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Incident severity
DO $$ BEGIN
  CREATE TYPE incident_severity AS ENUM (
    'p1_critical', 'p2_high', 'p3_medium', 'p4_low'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- VM session status
DO $$ BEGIN
  CREATE TYPE vm_session_status AS ENUM (
    'spawning', 'cloned', 'diagnosing', 'repairing', 'testing',
    'approved', 'deployed', 'destroyed', 'failed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Engineer role & status
DO $$ BEGIN
  CREATE TYPE engineer_role AS ENUM (
    'l1_support', 'l2_specialist', 'l3_architect', 'security_expert'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE engineer_status AS ENUM ('online', 'on_call', 'offline', 'busy');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Coordinator role
DO $$ BEGIN
  CREATE TYPE coordinator_role AS ENUM (
    'super_admin', 'coordinator', 'billing_admin'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Audit entity types
DO $$ BEGIN
  CREATE TYPE audit_entity_type AS ENUM (
    'customer', 'incident', 'vm_session', 'one_time_fix',
    'subscription', 'engineer_action'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE performer_type AS ENUM (
    'ai_agent', 'engineer', 'coordinator', 'customer', 'system'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Communication channels
DO $$ BEGIN
  CREATE TYPE comm_channel AS ENUM ('email', 'sms', 'dashboard');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE comm_status AS ENUM ('queued', 'sent', 'delivered', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Deployment approval status
DO $$ BEGIN
  CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 3. TABLES (in dependency order)
-- ============================================================

-- TABLE 1: customers
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  full_name text,
  company_name text,
  phone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  subscription_status customer_subscription_status DEFAULT 'none',
  subscription_tier subscription_tier DEFAULT 'none',
  stripe_customer_id text,
  marketing_consent boolean DEFAULT false,
  lead_source text DEFAULT 'landing_page',

  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- TABLE 6: engineers (no FK dependencies)
CREATE TABLE IF NOT EXISTS engineers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role engineer_role DEFAULT 'l1_support',
  status engineer_status DEFAULT 'offline',
  specialties text[] DEFAULT '{}',
  current_session_id uuid,
  last_active_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),

  CONSTRAINT valid_engineer_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- TABLE 7: coordinators
CREATE TABLE IF NOT EXISTS coordinators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role coordinator_role DEFAULT 'coordinator',
  permissions jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),

  CONSTRAINT valid_coord_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- TABLE 2: one_time_fixes
CREATE TABLE IF NOT EXISTS one_time_fixes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  status one_time_fix_status DEFAULT 'pending_payment',
  tier one_time_fix_tier DEFAULT 'rapid',
  website_url text NOT NULL,
  issue_description text,
  issue_category issue_category DEFAULT 'other',
  payment_intent_id text,
  amount_paid numeric(10, 2),
  temporary_access_token text UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  temporary_link_expires_at timestamptz DEFAULT (now() + interval '72 hours'),
  vm_session_id text,
  ai_confidence_score numeric(5, 2) CHECK (ai_confidence_score BETWEEN 0 AND 100),
  escalated_to_engineer boolean DEFAULT false,
  engineer_id uuid REFERENCES engineers(id) ON DELETE SET NULL,
  coordinator_approved boolean DEFAULT false,
  coordinator_id uuid REFERENCES coordinators(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  completed_at timestamptz,

  CONSTRAINT valid_url CHECK (website_url ~* '^https?://')
);

-- TABLE 3: subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  tier subscription_tier NOT NULL,
  status sub_status DEFAULT 'active',
  stripe_subscription_id text,
  current_period_start timestamptz NOT NULL,
  current_period_end timestamptz NOT NULL,
  monthly_incident_allowance integer NOT NULL DEFAULT 5,
  incidents_used_this_period integer DEFAULT 0,
  auto_renew boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  CONSTRAINT positive_allowance CHECK (monthly_incident_allowance > 0),
  CONSTRAINT non_negative_used CHECK (incidents_used_this_period >= 0),
  UNIQUE (customer_id)
);

-- TABLE 4: incidents
CREATE TABLE IF NOT EXISTS incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid REFERENCES subscriptions(id) ON DELETE SET NULL,
  one_time_fix_id uuid REFERENCES one_time_fixes(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  status incident_status DEFAULT 'open',
  severity incident_severity NOT NULL,
  title text NOT NULL,
  description text,
  website_url text NOT NULL,
  vm_session_id text,
  ai_confidence_score numeric(5, 2) CHECK (ai_confidence_score BETWEEN 0 AND 100),
  escalation_reason text,
  engineer_id uuid REFERENCES engineers(id) ON DELETE SET NULL,
  coordinator_id uuid REFERENCES coordinators(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  resolved_at timestamptz,

  CONSTRAINT has_source CHECK (
    (subscription_id IS NOT NULL) OR (one_time_fix_id IS NOT NULL)
  )
);

-- TABLE 5: vm_sessions
CREATE TABLE IF NOT EXISTS vm_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid REFERENCES incidents(id) ON DELETE CASCADE,
  one_time_fix_id uuid REFERENCES one_time_fixes(id) ON DELETE SET NULL,
  session_status vm_session_status DEFAULT 'spawning',
  clone_url text,
  isolated_environment_id text,
  ai_agent_logs jsonb DEFAULT '[]',
  test_results jsonb DEFAULT '{}',
  confidence_score numeric(5, 2) CHECK (confidence_score BETWEEN 0 AND 100),
  rollback_snapshot_id text,
  deployment_approved_by uuid REFERENCES coordinators(id) ON DELETE SET NULL,
  deployment_approved_at timestamptz,
  destroyed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- TABLE 8: audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type audit_entity_type NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  performed_by uuid,
  performed_by_type performer_type NOT NULL DEFAULT 'system',
  ip_address inet,
  user_agent text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- TABLE 9: credentials_vault
CREATE TABLE IF NOT EXISTS credentials_vault (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  incident_id uuid REFERENCES incidents(id) ON DELETE CASCADE,
  one_time_fix_id uuid REFERENCES one_time_fixes(id) ON DELETE CASCADE,
  encrypted_payload text NOT NULL,
  public_key_fingerprint text NOT NULL,
  session_key_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  revoked_by uuid REFERENCES coordinators(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),

  CONSTRAINT has_context CHECK (
    (incident_id IS NOT NULL) OR (one_time_fix_id IS NOT NULL)
  )
);

-- TABLE 10: communications
CREATE TABLE IF NOT EXISTS communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  incident_id uuid REFERENCES incidents(id) ON DELETE SET NULL,
  channel comm_channel NOT NULL,
  template_id text,
  status comm_status DEFAULT 'queued',
  content text NOT NULL,
  sent_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- TABLE 11: deployment_approvals
CREATE TABLE IF NOT EXISTS deployment_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vm_session_id uuid REFERENCES vm_sessions(id) ON DELETE CASCADE NOT NULL,
  coordinator_id uuid REFERENCES coordinators(id) ON DELETE CASCADE NOT NULL,
  approval_status approval_status DEFAULT 'pending',
  rejection_reason text,
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),

  UNIQUE (vm_session_id, coordinator_id)
);

-- ============================================================
-- 4. INDEXES (performance)
-- ============================================================

-- Customers
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(subscription_status);
CREATE INDEX IF NOT EXISTS idx_customers_created ON customers(created_at DESC);

-- One-time fixes
CREATE INDEX IF NOT EXISTS idx_fixes_customer ON one_time_fixes(customer_id);
CREATE INDEX IF NOT EXISTS idx_fixes_status ON one_time_fixes(status);
CREATE INDEX IF NOT EXISTS idx_fixes_token ON one_time_fixes(temporary_access_token);
CREATE INDEX IF NOT EXISTS idx_fixes_engineer ON one_time_fixes(engineer_id);

-- Subscriptions
CREATE INDEX IF NOT EXISTS idx_subs_customer ON subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_subs_status ON subscriptions(status);

-- Incidents
CREATE INDEX IF NOT EXISTS idx_incidents_customer ON incidents(customer_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);
CREATE INDEX IF NOT EXISTS idx_incidents_engineer ON incidents(engineer_id);
CREATE INDEX IF NOT EXISTS idx_incidents_created ON incidents(created_at DESC);

-- VM Sessions
CREATE INDEX IF NOT EXISTS idx_vm_incident ON vm_sessions(incident_id);
CREATE INDEX IF NOT EXISTS idx_vm_status ON vm_sessions(session_status);

-- Engineers
CREATE INDEX IF NOT EXISTS idx_engineers_status ON engineers(status);
CREATE INDEX IF NOT EXISTS idx_engineers_email ON engineers(email);

-- Audit Logs
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_performer ON audit_logs(performed_by);

-- Credentials Vault
CREATE INDEX IF NOT EXISTS idx_creds_customer ON credentials_vault(customer_id);
CREATE INDEX IF NOT EXISTS idx_creds_expires ON credentials_vault(expires_at);

-- Communications
CREATE INDEX IF NOT EXISTS idx_comm_customer ON communications(customer_id);
CREATE INDEX IF NOT EXISTS idx_comm_status ON communications(status);

-- Deployment Approvals
CREATE INDEX IF NOT EXISTS idx_approvals_vm ON deployment_approvals(vm_session_id);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON deployment_approvals(approval_status);

-- ============================================================
-- 5. TRIGGERS (updated_at automation)
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
DO $$ BEGIN
  CREATE TRIGGER tr_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER tr_fixes_updated_at
    BEFORE UPDATE ON one_time_fixes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER tr_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER tr_incidents_updated_at
    BEFORE UPDATE ON incidents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Auto-complete one_time_fix when VM session reaches deployed/destroyed
CREATE OR REPLACE FUNCTION handle_vm_session_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- When VM session is deployed, update the associated one-time fix
  IF NEW.session_status = 'deployed' AND NEW.one_time_fix_id IS NOT NULL THEN
    UPDATE one_time_fixes
    SET status = 'deploying',
        updated_at = now()
    WHERE id = NEW.one_time_fix_id;
  END IF;

  -- When VM session is destroyed/completed, mark fix as completed
  IF NEW.session_status = 'destroyed' AND NEW.one_time_fix_id IS NOT NULL THEN
    UPDATE one_time_fixes
    SET status = 'completed',
        completed_at = now(),
        updated_at = now()
    WHERE id = NEW.one_time_fix_id;
  END IF;

  -- Auto-log to audit_logs
  INSERT INTO audit_logs (entity_type, entity_id, action, performed_by_type, metadata)
  VALUES (
    'vm_session',
    NEW.id,
    'status_change_' || NEW.session_status::text,
    'system',
    jsonb_build_object(
      'previous_status', OLD.session_status,
      'new_status', NEW.session_status,
      'confidence_score', NEW.confidence_score
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER tr_vm_session_status
    AFTER UPDATE ON vm_sessions
    FOR EACH ROW
    WHEN (OLD.session_status IS DISTINCT FROM NEW.session_status)
    EXECUTE FUNCTION handle_vm_session_status_change();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Auto-log incident status changes
CREATE OR REPLACE FUNCTION handle_incident_status_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (entity_type, entity_id, action, performed_by_type, metadata)
  VALUES (
    'incident',
    NEW.id,
    'status_change_' || NEW.status::text,
    'system',
    jsonb_build_object(
      'previous_status', OLD.status,
      'new_status', NEW.status,
      'customer_id', NEW.customer_id
    )
  );

  -- Auto-escalation: when incident moves to human_escalated, notify
  IF NEW.status = 'human_escalated' AND OLD.status != 'human_escalated' THEN
    INSERT INTO communications (customer_id, incident_id, channel, content, status)
    VALUES (
      NEW.customer_id,
      NEW.id,
      'dashboard',
      'Your incident has been escalated to a human engineer due to AI confidence below threshold.',
      'queued'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER tr_incident_status
    AFTER UPDATE ON incidents
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION handle_incident_status_change();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Auto-create audit log on new incident
CREATE OR REPLACE FUNCTION log_new_incident()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (entity_type, entity_id, action, performed_by_type, metadata)
  VALUES (
    'incident',
    NEW.id,
    'incident_created',
    'system',
    jsonb_build_object(
      'severity', NEW.severity,
      'title', NEW.title,
      'customer_id', NEW.customer_id,
      'source', CASE
        WHEN NEW.subscription_id IS NOT NULL THEN 'subscription'
        WHEN NEW.one_time_fix_id IS NOT NULL THEN 'one_time_fix'
        ELSE 'unknown'
      END
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER tr_incident_created
    AFTER INSERT ON incidents
    FOR EACH ROW EXECUTE FUNCTION log_new_incident();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Auto-create audit log on new one-time fix
CREATE OR REPLACE FUNCTION log_new_fix()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (entity_type, entity_id, action, performed_by_type, metadata)
  VALUES (
    'one_time_fix',
    NEW.id,
    'fix_created',
    'customer',
    jsonb_build_object(
      'tier', NEW.tier,
      'website_url', NEW.website_url,
      'issue_category', NEW.issue_category,
      'customer_id', NEW.customer_id
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER tr_fix_created
    AFTER INSERT ON one_time_fixes
    FOR EACH ROW EXECUTE FUNCTION log_new_fix();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Auto-create VM session when incident is created
CREATE OR REPLACE FUNCTION auto_create_vm_session()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO vm_sessions (incident_id, session_status, clone_url)
  VALUES (
    NEW.id,
    'spawning',
    NEW.website_url
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER tr_auto_vm_session
    AFTER INSERT ON incidents
    FOR EACH ROW EXECUTE FUNCTION auto_create_vm_session();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Clean up expired credentials
CREATE OR REPLACE FUNCTION revoke_expired_credentials()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE credentials_vault
  SET revoked_at = now()
  WHERE expires_at < now() AND revoked_at IS NULL;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER tr_cleanup_expired_creds
    AFTER INSERT OR UPDATE ON credentials_vault
    FOR EACH STATEMENT EXECUTE FUNCTION revoke_expired_credentials();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE one_time_fixes ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE vm_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE engineers ENABLE ROW LEVEL SECURITY;
ALTER TABLE coordinators ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE credentials_vault ENABLE ROW LEVEL SECURITY;
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployment_approvals ENABLE ROW LEVEL SECURITY;

-- customers: users can read/update their own record
CREATE POLICY customers_own ON customers
  FOR ALL USING (
    auth.uid() IN (
      SELECT user_id FROM coordinators WHERE user_id = auth.uid()
      UNION
      SELECT id FROM auth.users WHERE email = customers.email
    )
  );

-- one_time_fixes: customers see their own, engineers see assigned, coordinators see all
CREATE POLICY fixes_own ON one_time_fixes
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE email = auth.email())
    OR engineer_id IN (SELECT id FROM engineers WHERE email = auth.email())
    OR EXISTS (SELECT 1 FROM coordinators WHERE user_id = auth.uid())
  );

CREATE POLICY fixes_insert ON one_time_fixes
  FOR INSERT WITH CHECK (
    customer_id IN (SELECT id FROM customers WHERE email = auth.email())
  );

CREATE POLICY fixes_update ON one_time_fixes
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM coordinators WHERE user_id = auth.uid())
    OR engineer_id IN (SELECT id FROM engineers WHERE email = auth.email())
  );

-- subscriptions: customers see their own
CREATE POLICY subs_own ON subscriptions
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE email = auth.email())
    OR EXISTS (SELECT 1 FROM coordinators WHERE user_id = auth.uid())
  );

-- incidents: customers see their own, engineers see assigned, coordinators see all
CREATE POLICY incidents_access ON incidents
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE email = auth.email())
    OR engineer_id IN (SELECT id FROM engineers WHERE email = auth.email())
    OR EXISTS (SELECT 1 FROM coordinators WHERE user_id = auth.uid())
  );

CREATE POLICY incidents_insert ON incidents
  FOR INSERT WITH CHECK (
    customer_id IN (SELECT id FROM customers WHERE email = auth.email())
    OR EXISTS (SELECT 1 FROM coordinators WHERE user_id = auth.uid())
  );

CREATE POLICY incidents_update ON incidents
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM coordinators WHERE user_id = auth.uid())
    OR engineer_id IN (SELECT id FROM engineers WHERE email = auth.email())
  );

-- vm_sessions: accessible via incident ownership
CREATE POLICY vm_via_incident ON vm_sessions
  FOR SELECT USING (
    incident_id IN (
      SELECT id FROM incidents WHERE
        customer_id IN (SELECT id FROM customers WHERE email = auth.email())
        OR engineer_id IN (SELECT id FROM engineers WHERE email = auth.email())
        OR EXISTS (SELECT 1 FROM coordinators WHERE user_id = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM coordinators WHERE user_id = auth.uid())
  );

-- engineers: read-only for authenticated users, full for coordinators
CREATE POLICY engineers_read ON engineers
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY engineers_admin ON engineers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM coordinators WHERE user_id = auth.uid() AND role = 'super_admin')
  );

-- coordinators: full access for super_admins
CREATE POLICY coordinators_read ON coordinators
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM coordinators WHERE user_id = auth.uid() AND role = 'super_admin')
  );

-- audit_logs: no direct customer access, engineers see their own actions, coordinators see all
CREATE POLICY audit_logs_access ON audit_logs
  FOR SELECT USING (
    performed_by IN (SELECT id FROM engineers WHERE email = auth.email())
    OR EXISTS (SELECT 1 FROM coordinators WHERE user_id = auth.uid())
  );

-- credentials_vault: only if session is active and not revoked
CREATE POLICY creds_active ON credentials_vault
  FOR SELECT USING (
    (revoked_at IS NULL AND expires_at > now())
    AND (
      customer_id IN (SELECT id FROM customers WHERE email = auth.email())
      OR EXISTS (SELECT 1 FROM coordinators WHERE user_id = auth.uid())
    )
  );

CREATE POLICY creds_insert ON credentials_vault
  FOR INSERT WITH CHECK (
    customer_id IN (SELECT id FROM customers WHERE email = auth.email())
  );

-- communications: customers see their own
CREATE POLICY comms_own ON communications
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE email = auth.email())
    OR EXISTS (SELECT 1 FROM coordinators WHERE user_id = auth.uid())
  );

-- deployment_approvals: coordinators see all, engineers see their incident approvals
CREATE POLICY approvals_access ON deployment_approvals
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM coordinators WHERE user_id = auth.uid())
    OR vm_session_id IN (
      SELECT id FROM vm_sessions WHERE incident_id IN (
        SELECT id FROM incidents WHERE engineer_id IN (
          SELECT id FROM engineers WHERE email = auth.email()
        )
      )
    )
  );

-- ============================================================
-- 7. REALTIME ENABLEMENT
-- ============================================================

-- Enable realtime on the tables
DO $$ BEGIN
  PERFORM realtime.topic_add('realtime:incidents');
  PERFORM realtime.topic_add('realtime:vm_sessions');
  PERFORM realtime.topic_add('realtime:audit_logs');
  PERFORM realtime.topic_add('realtime:deployment_approvals');
  PERFORM realtime.topic_add('realtime:engineers');
END $$;

-- Add tables to the realtime publication
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE incidents;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE vm_sessions;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE audit_logs;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE deployment_approvals;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE engineers;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE one_time_fixes;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 8. FUNCTIONS (helper functions)
-- ============================================================

-- Get customer incidents with full details
CREATE OR REPLACE FUNCTION get_customer_incidents(p_customer_id uuid)
RETURNS TABLE (
  incident_id uuid,
  title text,
  status incident_status,
  severity incident_severity,
  created_at timestamptz,
  ai_confidence numeric,
  vm_status vm_session_status
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id,
    i.title,
    i.status,
    i.severity,
    i.created_at,
    i.ai_confidence_score,
    vs.session_status
  FROM incidents i
  LEFT JOIN vm_sessions vs ON vs.incident_id = i.id
  WHERE i.customer_id = p_customer_id
  ORDER BY i.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get AI pipeline stats for dashboard
CREATE OR REPLACE FUNCTION get_pipeline_stats(hours_ago integer DEFAULT 24)
RETURNS TABLE (
  agent_name text,
  total_runs bigint,
  avg_confidence numeric,
  success_rate numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    'TRIAGE'::text as agent_name,
    COUNT(*)::bigint,
    COALESCE(AVG(ai_confidence_score), 0)::numeric,
    COALESCE(
      (COUNT(*) FILTER (WHERE status IN ('completed', 'deploying')) * 100.0 / NULLIF(COUNT(*), 0)),
      0
    )::numeric
  FROM one_time_fixes
  WHERE created_at > now() - (hours_ago || ' hours')::interval

  UNION ALL

  SELECT
    'REPAIR'::text,
    COUNT(*)::bigint,
    COALESCE(AVG(ai_confidence_score), 0)::numeric,
    COALESCE(
      (COUNT(*) FILTER (WHERE status IN ('completed', 'deploying', 'verified_closed')) * 100.0 / NULLIF(COUNT(*), 0)),
      0
    )::numeric
  FROM incidents
  WHERE created_at > now() - (hours_ago || ' hours')::interval;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if temporary fix link is valid
CREATE OR REPLACE FUNCTION is_fix_link_valid(p_token text)
RETURNS boolean AS $$
DECLARE
  v_valid boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM one_time_fixes
    WHERE temporary_access_token = p_token
      AND temporary_link_expires_at > now()
      AND status NOT IN ('completed', 'failed', 'refunded')
  ) INTO v_valid;
  RETURN v_valid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 9. SEED DATA (development only)
-- ============================================================

-- Seed engineers
INSERT INTO engineers (id, email, full_name, role, status, specialties, created_at)
VALUES
  (gen_random_uuid(), 'alex.chen@uptimeops.io', 'Alex Chen', 'l3_architect', 'on_call', ARRAY['database', 'performance', 'security'], now()),
  (gen_random_uuid(), 'jordan.smith@uptimeops.io', 'Jordan Smith', 'l2_specialist', 'online', ARRAY['frontend', 'wordpress', 'ecommerce'], now()),
  (gen_random_uuid(), 'morgan.lee@uptimeops.io', 'Morgan Lee', 'security_expert', 'online', ARRAY['security', 'malware', 'firewall'], now()),
  (gen_random_uuid(), 'sam.rivera@uptimeops.io', 'Sam Rivera', 'l1_support', 'offline', ARRAY['general'], now())
ON CONFLICT DO NOTHING;

-- Seed sample customer (will be linked to auth user in production)
INSERT INTO customers (id, email, full_name, company_name, subscription_status, subscription_tier, created_at)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'demo@uptimeops.io', 'Demo User', 'Acme Corp', 'active', 'sentinel', now()),
  ('00000000-0000-0000-0000-000000000002', 'test@startup.io', 'Test Account', 'Startup Inc', 'active', 'guardian', now())
ON CONFLICT DO NOTHING;

-- Seed sample subscriptions
INSERT INTO subscriptions (customer_id, tier, status, current_period_start, current_period_end, monthly_incident_allowance, incidents_used_this_period)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'sentinel', 'active', now() - interval '10 days', now() + interval '20 days', 25, 8),
  ('00000000-0000-0000-0000-000000000002', 'guardian', 'active', now() - interval '5 days', now() + interval '25 days', 10, 3)
ON CONFLICT DO NOTHING;

-- Seed sample incidents
INSERT INTO incidents (customer_id, subscription_id, status, severity, title, description, website_url, ai_confidence_score, created_at)
SELECT
  '00000000-0000-0000-0000-000000000001',
  (SELECT id FROM subscriptions WHERE customer_id = '00000000-0000-0000-0000-000000000001' LIMIT 1),
  'ai_repairing',
  'p2_high',
  'WordPress plugin conflict causing 500 errors',
  'After updating WooCommerce to 8.2, the checkout page returns 500 error. Error logs indicate conflict with custom payment gateway plugin.',
  'https://shop.acme-corp.com',
  87.5,
  now() - interval '2 hours'
WHERE NOT EXISTS (SELECT 1 FROM incidents WHERE title = 'WordPress plugin conflict causing 500 errors');

INSERT INTO incidents (customer_id, subscription_id, status, severity, title, description, website_url, ai_confidence_score, created_at)
SELECT
  '00000000-0000-0000-0000-000000000001',
  (SELECT id FROM subscriptions WHERE customer_id = '00000000-0000-0000-0000-000000000001' LIMIT 1),
  'deployed',
  'p3_medium',
  'SSL certificate expiry warning',
  'Lets Encrypt certificate expires in 3 days. Auto-renewal appears to have failed.',
  'https://api.acme-corp.com',
  98.2,
  now() - interval '1 day'
WHERE NOT EXISTS (SELECT 1 FROM incidents WHERE title = 'SSL certificate expiry warning');

INSERT INTO incidents (customer_id, subscription_id, status, severity, title, description, website_url, ai_confidence_score, created_at)
SELECT
  '00000000-0000-0000-0000-000000000002',
  (SELECT id FROM subscriptions WHERE customer_id = '00000000-0000-0000-0000-000000000002' LIMIT 1),
  'human_escalated',
  'p1_critical',
  'Database connection pool exhausted',
  'All available database connections are in use. Site completely unresponsive. Error: "Too many connections" in application logs.',
  'https://startup.io',
  62.0,
  now() - interval '30 minutes'
WHERE NOT EXISTS (SELECT 1 FROM incidents WHERE title = 'Database connection pool exhausted');

-- Seed sample one-time fix
INSERT INTO one_time_fixes (customer_id, status, tier, website_url, issue_description, issue_category, amount_paid, ai_confidence_score, created_at)
SELECT
  '00000000-0000-0000-0000-000000000001',
  'repairing',
  'critical',
  'https://emergency-site.com',
  'Site completely down after plugin update. White screen of death.',
  'plugin_conflict',
  299.00,
  78.5,
  now() - interval '45 minutes'
WHERE NOT EXISTS (SELECT 1 FROM one_time_fixes WHERE website_url = 'https://emergency-site.com');

-- Seed sample audit logs
INSERT INTO audit_logs (entity_type, entity_id, action, performed_by_type, metadata, created_at)
VALUES
  ('incident', '00000000-0000-0000-0000-000000000001', 'incident_created', 'system', '{"severity": "p2_high", "title": "WordPress plugin conflict"}'::jsonb, now() - interval '2 hours'),
  ('incident', '00000000-0000-0000-0000-000000000001', 'status_change_ai_repairing', 'ai_agent', '{"confidence": 87.5}'::jsonb, now() - interval '1 hour 50 minutes'),
  ('vm_session', '00000000-0000-0000-0000-000000000001', 'vm_spawned', 'system', '{"vm_id": "vm-4821", "region": "us-east-1"}'::jsonb, now() - interval '1 hour 48 minutes'),
  ('vm_session', '00000000-0000-0000-0000-000000000001', 'site_cloned', 'system', '{"clone_time_ms": 4200}'::jsonb, now() - interval '1 hour 45 minutes');

-- ============================================================
-- 10. STORAGE BUCKET SETUP
-- ============================================================

-- Session recordings bucket (for engineer session recordings)
INSERT INTO storage.buckets (id, name, public)
VALUES ('session-recordings', 'session-recordings', false)
ON CONFLICT DO NOTHING;

-- Audit artifacts bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('audit-artifacts', 'audit-artifacts', false)
ON CONFLICT DO NOTHING;

-- Customer uploads (screenshots, logs)
INSERT INTO storage.buckets (id, name, public)
VALUES ('customer-uploads', 'customer-uploads', false)
ON CONFLICT DO NOTHING;

-- VM snapshots (rollback points)
INSERT INTO storage.buckets (id, name, public)
VALUES ('vm-snapshots', 'vm-snapshots', false)
ON CONFLICT DO NOTHING;

-- ============================================================
-- COMPLETE
-- ═══════════════════════════════════════════════════════════════
