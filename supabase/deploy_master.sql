-- ═══════════════════════════════════════════════════════════════
-- UPTIMEOPS v2.1 — MASTER DEPLOYMENT
-- 32 tables, 148+ indexes, 14 enums, 27 functions, 18 triggers,
-- 2 storage buckets, 19 realtime tables, 3 webhooks, 3 cron jobs
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- SECTION 1: EXTENSIONS
-- ═══════════════════════════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ═══════════════════════════════════════════════════════════════
-- SECTION 2: ENUM TYPES
-- ═══════════════════════════════════════════════════════════════
DO $$ BEGIN CREATE TYPE public.user_role AS ENUM ('public','customer','engineer','coordinator','admin'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.incident_status AS ENUM ('open','in_progress','resolved','closed','escalated'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.incident_priority AS ENUM ('low','medium','high','critical'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.agent_stage AS ENUM ('triage','isolate','repair','validate','deploy','audit'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.scanner_category AS ENUM ('triage','isolate','repair','validate','deploy','audit'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.escalation_reason AS ENUM ('ai_low_confidence','security_concern','customer_request','auto_retry_exhausted','cost_threshold'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.communication_channel AS ENUM ('email','sms','slack','discord','webhook'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.compliance_framework AS ENUM ('soc2','iso27001','gdpr','hipaa','pci_dss'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.credential_type AS ENUM ('api_key','oauth_token','basic_auth','ssh_key','database_url'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.subscription_tier AS ENUM ('starter','professional','enterprise'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.payment_status AS ENUM ('pending','completed','failed','refunded'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.vm_status AS ENUM ('creating','running','stopped','error','terminated'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.patch_status AS ENUM ('pending','ready','needs_review','applied','rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.notification_type AS ENUM ('info','success','warning','error'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ═══════════════════════════════════════════════════════════════
-- SECTION 3: CORE TABLES (001_schema_core)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS user_roles (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       public.user_role NOT NULL DEFAULT 'customer',
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW(),
  UNIQUE(user_id, role)
);

CREATE TABLE IF NOT EXISTS customers (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email                   text NOT NULL UNIQUE,
  name                    text,
  website_url             text,
  stripe_customer_id      text,
  subscription_status     text DEFAULT 'trial',
  subscription_tier       public.subscription_tier,
  current_plan            text,
  mrr_cents               integer DEFAULT 0,
  ai_allowance_used       integer DEFAULT 0,
  ai_allowance_limit      integer DEFAULT 100,
  billing_cycle_start     timestamptz,
  last_login              timestamptz,
  created_at              timestamptz DEFAULT NOW(),
  updated_at              timestamptz DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coordinator_profiles (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email         text NOT NULL,
  full_name     text,
  timezone      text DEFAULT 'UTC',
  is_active     boolean DEFAULT true,
  created_at    timestamptz DEFAULT NOW(),
  updated_at    timestamptz DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS engineer_profiles (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email               text NOT NULL,
  full_name           text,
  specialization      text[],
  is_available        boolean DEFAULT true,
  active_incident_count integer DEFAULT 0,
  max_concurrent      integer DEFAULT 3,
  timezone            text DEFAULT 'UTC',
  opsgenie_user_id    text,
  last_heartbeat      timestamptz,
  is_active           boolean DEFAULT true,
  created_at          timestamptz DEFAULT NOW(),
  updated_at          timestamptz DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS engineer_invitations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email           text NOT NULL,
  token           text NOT NULL UNIQUE,
  invited_by      uuid NOT NULL REFERENCES auth.users(id),
  specialization  text[],
  status          text DEFAULT 'pending',
  expires_at      timestamptz NOT NULL,
  created_at      timestamptz DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projects (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  name        text NOT NULL,
  repo_url    text,
  stack_type  text,
  created_at  timestamptz DEFAULT NOW(),
  updated_at  timestamptz DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS custom_guidelines (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  rule_name         text NOT NULL,
  rule_pattern      text,
  language          text,
  severity          text,
  auto_fix_template text,
  description       text,
  is_active         boolean DEFAULT true,
  created_at        timestamptz DEFAULT NOW(),
  updated_at        timestamptz DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- SECTION 4: INCIDENT PIPELINE TABLES (002_schema_incidents)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS incidents (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id         uuid NOT NULL REFERENCES customers(id),
  title               text NOT NULL,
  description         text,
  website_url         text,
  status              public.incident_status DEFAULT 'open',
  priority            public.incident_priority DEFAULT 'medium',
  assigned_engineer   uuid REFERENCES engineer_profiles(user_id),
  ai_confidence       integer,
  security_score      integer,
  estimated_cost      numeric(10,2),
  actual_cost         numeric(10,2),
  root_cause          text,
  fix_description     text,
  created_at          timestamptz DEFAULT NOW(),
  updated_at          timestamptz DEFAULT NOW(),
  resolved_at         timestamptz
);

CREATE TABLE IF NOT EXISTS pipeline_states (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id     uuid NOT NULL UNIQUE REFERENCES incidents(id) ON DELETE CASCADE,
  current_step    public.agent_stage DEFAULT 'triage',
  status          text DEFAULT 'running',
  confidence      integer DEFAULT 0,
  step_results    jsonb DEFAULT '{}',
  started_at      timestamptz DEFAULT NOW(),
  updated_at      timestamptz DEFAULT NOW(),
  completed_at    timestamptz
);

CREATE TABLE IF NOT EXISTS scan_results (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id         uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  agent_stage         public.agent_stage NOT NULL,
  scanner_name        text NOT NULL,
  status              text DEFAULT 'pending',
  confidence_score    integer,
  raw_output          text,
  parsed_output       jsonb,
  findings            jsonb DEFAULT '[]',
  severity_counts     jsonb DEFAULT '{}',
  execution_time_ms   integer,
  created_at          timestamptz DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS human_escalations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id     uuid NOT NULL REFERENCES incidents(id),
  reason          public.escalation_reason,
  escalated_by    uuid,
  notes           text,
  status          text DEFAULT 'open',
  created_at      timestamptz DEFAULT NOW(),
  resolved_at     timestamptz
);

CREATE TABLE IF NOT EXISTS repair_patches (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id   uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  pipeline_id   text,
  patches       text[] DEFAULT '{}',
  status        public.patch_status DEFAULT 'pending',
  created_at    timestamptz DEFAULT NOW(),
  updated_at    timestamptz DEFAULT NOW(),
  UNIQUE(incident_id, pipeline_id)
);

CREATE TABLE IF NOT EXISTS deployment_snapshots (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id   uuid NOT NULL UNIQUE REFERENCES incidents(id) ON DELETE CASCADE,
  status        text DEFAULT 'pending',
  metadata      jsonb DEFAULT '{}',
  created_at    timestamptz DEFAULT NOW(),
  updated_at    timestamptz DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS smoke_tests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id     uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  test_name       text NOT NULL,
  status          text DEFAULT 'pending',
  duration_ms     integer,
  error_message   text,
  created_at      timestamptz DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS codegraph_snapshots (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id     uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  graph_data      jsonb DEFAULT '{}',
  metrics         jsonb DEFAULT '{}',
  created_at      timestamptz DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- SECTION 5: AUDIT & COMMS TABLES (003_schema_audit_comms)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS audit_hash_chain (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id     uuid NOT NULL REFERENCES incidents(id),
  block_index     integer NOT NULL,
  previous_hash   text NOT NULL,
  current_hash    text NOT NULL,
  timestamp       timestamptz DEFAULT NOW(),
  data            jsonb DEFAULT '{}',
  created_at      timestamptz DEFAULT NOW(),
  UNIQUE(incident_id, block_index)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name      text NOT NULL,
  record_id       text,
  operation       text NOT NULL,
  performed_by_type text,
  performed_by_id   uuid,
  metadata        jsonb DEFAULT '{}',
  ip_address      text,
  user_agent      text,
  created_at      timestamptz DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_reports (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id             uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  report_data             jsonb DEFAULT '{}',
  generated_at            timestamptz DEFAULT NOW(),
  total_duration_minutes  integer,
  total_cost              numeric(10,2),
  root_cause              text,
  fix_description         text,
  compliance_certificate_id text,
  files_modified          integer DEFAULT 0,
  tests_passed            integer DEFAULT 0,
  tests_failed            integer DEFAULT 0,
  created_at              timestamptz DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS communications_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id   uuid REFERENCES customers(id),
  incident_id   uuid REFERENCES incidents(id),
  channel       public.communication_channel NOT NULL,
  direction     text DEFAULT 'outbound',
  subject       text,
  content       text NOT NULL,
  status        text DEFAULT 'pending',
  sent_at       timestamptz,
  created_at    timestamptz DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id   uuid REFERENCES customers(id),
  type          text,
  message       text NOT NULL,
  entity_type   text,
  entity_id     text,
  read          boolean DEFAULT false,
  metadata      jsonb DEFAULT '{}',
  created_at    timestamptz DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS credentials_vault (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id         uuid NOT NULL REFERENCES customers(id),
  credential_type     public.credential_type NOT NULL,
  encrypted_data      text NOT NULL,
  fingerprint         text,
  rotation_due_at     timestamptz,
  last_rotated_at     timestamptz,
  is_active           boolean DEFAULT true,
  created_at          timestamptz DEFAULT NOW(),
  updated_at          timestamptz DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- SECTION 6: PAYMENT & SUBSCRIPTION TABLES
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS subscriptions (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id             uuid NOT NULL REFERENCES customers(id),
  stripe_subscription_id  text UNIQUE,
  tier                    public.subscription_tier NOT NULL,
  status                  text DEFAULT 'active',
  current_period_start    timestamptz,
  current_period_end      timestamptz,
  cancelled_at            timestamptz,
  created_at              timestamptz DEFAULT NOW(),
  updated_at              timestamptz DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_methods (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id         uuid NOT NULL REFERENCES customers(id),
  stripe_payment_method_id text,
  type                text,
  last_four           text,
  expiry_month        integer,
  expiry_year         integer,
  is_default          boolean DEFAULT false,
  created_at          timestamptz DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS one_time_fixes (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id         uuid NOT NULL REFERENCES customers(id),
  incident_id         uuid REFERENCES incidents(id),
  payment_intent_id   text,
  amount_cents        integer NOT NULL,
  status              public.payment_status DEFAULT 'pending',
  amount_paid         numeric(10,2),
  paid_at             timestamptz,
  retry_count         integer DEFAULT 0,
  next_retry_at       timestamptz,
  created_at          timestamptz DEFAULT NOW(),
  updated_at          timestamptz DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS churn_events (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_subscription_id  text,
  customer_id             uuid REFERENCES customers(id),
  reason                  text,
  created_at              timestamptz DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- SECTION 7: OPSGENIE & VM TABLES
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS opsgenie_sync (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engineer_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opsgenie_user_id  text,
  opsgenie_username text,
  schedule_id       text,
  last_synced_at    timestamptz,
  sync_status       text DEFAULT 'pending',
  created_at        timestamptz DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS oncall_schedules (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engineer_id   uuid NOT NULL REFERENCES engineer_profiles(user_id),
  schedule_date date,
  is_on_call    boolean DEFAULT false,
  opsgenie_schedule_id text,
  created_at    timestamptz DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vm_sessions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id     uuid NOT NULL REFERENCES incidents(id),
  vm_id           text,
  status          public.vm_status DEFAULT 'creating',
  ip_address      text,
  connection_url  text,
  started_at      timestamptz DEFAULT NOW(),
  ended_at        timestamptz
);

CREATE TABLE IF NOT EXISTS vm_commands (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid NOT NULL REFERENCES vm_sessions(id) ON DELETE CASCADE,
  command     text NOT NULL,
  output      text,
  exit_code   integer,
  executed_at timestamptz DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- SECTION 8: UTILITY TABLES
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS temporary_links (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id   uuid NOT NULL REFERENCES customers(id),
  token         text NOT NULL UNIQUE,
  expires_at    timestamptz NOT NULL,
  used_at       timestamptz,
  created_at    timestamptz DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS temporary_links_archive (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id   uuid REFERENCES customers(id),
  token_hash    text,
  original_url  text,
  accessed_at   timestamptz,
  archived_at   timestamptz DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scanner_registry (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text NOT NULL UNIQUE,
  category          public.scanner_category NOT NULL,
  tool_type         text NOT NULL,
  command_template  text NOT NULL,
  output_format     text DEFAULT 'json',
  severity_rules    jsonb DEFAULT '{}',
  is_active         boolean DEFAULT true,
  created_at        timestamptz DEFAULT NOW(),
  updated_at        timestamptz DEFAULT NOW()
);


-- ═══════════════════════════════════════════════════════════════
-- SECTION 9: ALL INDEXES (148+)
-- ═══════════════════════════════════════════════════════════════

-- Core table indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);
CREATE INDEX IF NOT EXISTS idx_customers_user ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_stripe ON customers(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(subscription_status);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_coordinator_user ON coordinator_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_coordinator_email ON coordinator_profiles(email);
CREATE INDEX IF NOT EXISTS idx_engineer_user ON engineer_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_engineer_available ON engineer_profiles(is_available);
CREATE INDEX IF NOT EXISTS idx_engineer_active ON engineer_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON engineer_invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON engineer_invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON engineer_invitations(token);
CREATE INDEX IF NOT EXISTS idx_projects_customer ON projects(customer_id);
CREATE INDEX IF NOT EXISTS idx_guidelines_project ON custom_guidelines(project_id);
CREATE INDEX IF NOT EXISTS idx_guidelines_severity ON custom_guidelines(severity);

-- Incident pipeline indexes
CREATE INDEX IF NOT EXISTS idx_incidents_customer ON incidents(customer_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_priority ON incidents(priority);
CREATE INDEX IF NOT EXISTS idx_incidents_engineer ON incidents(assigned_engineer);
CREATE INDEX IF NOT EXISTS idx_incidents_created ON incidents(created_at);
CREATE INDEX IF NOT EXISTS idx_pipeline_incident ON pipeline_states(incident_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_step ON pipeline_states(current_step);
CREATE INDEX IF NOT EXISTS idx_scan_incident ON scan_results(incident_id);
CREATE INDEX IF NOT EXISTS idx_scan_stage ON scan_results(agent_stage);
CREATE INDEX IF NOT EXISTS idx_scan_status ON scan_results(status);
CREATE INDEX IF NOT EXISTS idx_scan_created ON scan_results(created_at);
CREATE INDEX IF NOT EXISTS idx_escalation_incident ON human_escalations(incident_id);
CREATE INDEX IF NOT EXISTS idx_escalation_status ON human_escalations(status);
CREATE INDEX IF NOT EXISTS idx_repair_incident ON repair_patches(incident_id);
CREATE INDEX IF NOT EXISTS idx_repair_status ON repair_patches(status);
CREATE INDEX IF NOT EXISTS idx_deployment_incident ON deployment_snapshots(incident_id);
CREATE INDEX IF NOT EXISTS idx_smoke_incident ON smoke_tests(incident_id);
CREATE INDEX IF NOT EXISTS idx_codegraph_incident ON codegraph_snapshots(incident_id);

-- Audit & comms indexes
CREATE INDEX IF NOT EXISTS idx_hash_chain_incident ON audit_hash_chain(incident_id);
CREATE INDEX IF NOT EXISTS idx_hash_chain_index ON audit_hash_chain(block_index);
CREATE INDEX IF NOT EXISTS idx_audit_table ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_record ON audit_logs(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(operation);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(performed_by_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_composite ON audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_reports_incident ON audit_reports(incident_id);
CREATE INDEX IF NOT EXISTS idx_comms_customer ON communications_log(customer_id);
CREATE INDEX IF NOT EXISTS idx_comms_incident ON communications_log(incident_id);
CREATE INDEX IF NOT EXISTS idx_comms_entity ON communications_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_comms_sent ON communications_log(sent_at);
CREATE INDEX IF NOT EXISTS idx_notifications_customer ON notifications(customer_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_credentials_customer ON credentials_vault(customer_id);
CREATE INDEX IF NOT EXISTS idx_credentials_expires ON credentials_vault(rotation_due_at);
CREATE INDEX IF NOT EXISTS idx_credentials_fingerprint ON credentials_vault(fingerprint);

-- Payment indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_customer ON subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_payment_methods_customer ON payment_methods(customer_id);
CREATE INDEX IF NOT EXISTS idx_onetime_customer ON one_time_fixes(customer_id);
CREATE INDEX IF NOT EXISTS idx_onetime_status ON one_time_fixes(status);
CREATE INDEX IF NOT EXISTS idx_churn_customer ON churn_events(customer_id);

-- OpsGenie & VM indexes
CREATE INDEX IF NOT EXISTS idx_opsgenie_engineer ON opsgenie_sync(engineer_id);
CREATE INDEX IF NOT EXISTS idx_opsgenie_status ON opsgenie_sync(sync_status);
CREATE INDEX IF NOT EXISTS idx_oncall_engineer ON oncall_schedules(engineer_id);
CREATE INDEX IF NOT EXISTS idx_oncall_date ON oncall_schedules(schedule_date);
CREATE INDEX IF NOT EXISTS idx_vm_incident ON vm_sessions(incident_id);
CREATE INDEX IF NOT EXISTS idx_vm_status ON vm_sessions(status);
CREATE INDEX IF NOT EXISTS idx_vm_commands_session ON vm_commands(session_id);

-- Utility indexes
CREATE INDEX IF NOT EXISTS idx_temp_customer ON temporary_links(customer_id);
CREATE INDEX IF NOT EXISTS idx_temp_token ON temporary_links(token);
CREATE INDEX IF NOT EXISTS idx_temp_expires ON temporary_links(expires_at);
CREATE INDEX IF NOT EXISTS idx_tla_customer ON temporary_links_archive(customer_id);
CREATE INDEX IF NOT EXISTS idx_tla_archived ON temporary_links_archive(archived_at);
CREATE INDEX IF NOT EXISTS idx_scanner_name ON scanner_registry(name);
CREATE INDEX IF NOT EXISTS idx_scanner_category ON scanner_registry(category);
CREATE INDEX IF NOT EXISTS idx_scanner_active ON scanner_registry(is_active);

-- ═══════════════════════════════════════════════════════════════
-- SECTION 10: RLS POLICIES ON ALL TABLES
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE coordinator_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE engineer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE engineer_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_guidelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE human_escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE repair_patches ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployment_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE smoke_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE codegraph_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_hash_chain ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE communications_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE credentials_vault ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE one_time_fixes ENABLE ROW LEVEL SECURITY;
ALTER TABLE churn_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE opsgenie_sync ENABLE ROW LEVEL SECURITY;
ALTER TABLE oncall_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE vm_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vm_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE temporary_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE temporary_links_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE scanner_registry ENABLE ROW LEVEL SECURITY;

-- Customer access policies
DO $$ BEGIN CREATE POLICY customers_own ON customers FOR ALL USING (user_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY user_roles_own ON user_roles FOR ALL USING (user_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY projects_customer ON projects FOR ALL USING (EXISTS (SELECT 1 FROM customers c WHERE c.id = projects.customer_id AND c.user_id = auth.uid())); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY incidents_customer ON incidents FOR ALL USING (EXISTS (SELECT 1 FROM customers c WHERE c.id = incidents.customer_id AND c.user_id = auth.uid())); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY pipeline_customer ON pipeline_states FOR ALL USING (EXISTS (SELECT 1 FROM incidents i JOIN customers c ON i.customer_id = c.id WHERE i.id = pipeline_states.incident_id AND c.user_id = auth.uid())); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY scan_customer ON scan_results FOR ALL USING (EXISTS (SELECT 1 FROM incidents i JOIN customers c ON i.customer_id = c.id WHERE i.id = scan_results.incident_id AND c.user_id = auth.uid())); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY escalation_customer ON human_escalations FOR ALL USING (EXISTS (SELECT 1 FROM incidents i JOIN customers c ON i.customer_id = c.id WHERE i.id = human_escalations.incident_id AND c.user_id = auth.uid())); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY repair_customer ON repair_patches FOR ALL USING (EXISTS (SELECT 1 FROM incidents i JOIN customers c ON i.customer_id = c.id WHERE i.id = repair_patches.incident_id AND c.user_id = auth.uid())); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY audit_reports_customer ON audit_reports FOR ALL USING (EXISTS (SELECT 1 FROM incidents i JOIN customers c ON i.customer_id = c.id WHERE i.id = audit_reports.incident_id AND c.user_id = auth.uid())); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY comms_customer ON communications_log FOR ALL USING (EXISTS (SELECT 1 FROM customers c WHERE c.id = communications_log.customer_id AND c.user_id = auth.uid())); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY notifications_customer ON notifications FOR ALL USING (EXISTS (SELECT 1 FROM customers c WHERE c.id = notifications.customer_id AND c.user_id = auth.uid())); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY credentials_customer ON credentials_vault FOR ALL USING (EXISTS (SELECT 1 FROM customers c WHERE c.id = credentials_vault.customer_id AND c.user_id = auth.uid())); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY subscriptions_customer ON subscriptions FOR ALL USING (EXISTS (SELECT 1 FROM customers c WHERE c.id = subscriptions.customer_id AND c.user_id = auth.uid())); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY payment_methods_customer ON payment_methods FOR ALL USING (EXISTS (SELECT 1 FROM customers c WHERE c.id = payment_methods.customer_id AND c.user_id = auth.uid())); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY onetime_customer ON one_time_fixes FOR ALL USING (EXISTS (SELECT 1 FROM customers c WHERE c.id = one_time_fixes.customer_id AND c.user_id = auth.uid())); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY temp_links_customer ON temporary_links FOR ALL USING (EXISTS (SELECT 1 FROM customers c WHERE c.id = temporary_links.customer_id AND c.user_id = auth.uid())); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Admin access policies (coordinator + admin roles)
DO $$ BEGIN CREATE POLICY admin_all_user_roles ON user_roles FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('coordinator','admin'))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY admin_all_customers ON customers FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('coordinator','admin'))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY admin_all_incidents ON incidents FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('coordinator','admin'))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY admin_all_engineers ON engineer_profiles FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('coordinator','admin'))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY admin_all_escalations ON human_escalations FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('coordinator','admin'))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY admin_all_subscriptions ON subscriptions FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('coordinator','admin'))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY admin_all_audit ON audit_logs FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('coordinator','admin'))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY admin_all_comms ON communications_log FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('coordinator','admin'))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY admin_all_opsgenie ON opsgenie_sync FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('coordinator','admin'))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY admin_all_oncall ON oncall_schedules FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('coordinator','admin'))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY admin_all_vm ON vm_sessions FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('coordinator','admin'))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY admin_all_credentials ON credentials_vault FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('coordinator','admin'))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY admin_all_scanner ON scanner_registry FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('coordinator','admin'))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY admin_all_audit_reports ON audit_reports FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('coordinator','admin'))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY admin_all_hash_chain ON audit_hash_chain FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('coordinator','admin'))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Public read policies
DO $$ BEGIN CREATE POLICY scanner_public_read ON scanner_registry FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY deployment_customer ON deployment_snapshots FOR ALL USING (EXISTS (SELECT 1 FROM incidents i JOIN customers c ON i.customer_id = c.id WHERE i.id = deployment_snapshots.incident_id AND c.user_id = auth.uid())); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY smoke_customer ON smoke_tests FOR ALL USING (EXISTS (SELECT 1 FROM incidents i JOIN customers c ON i.customer_id = c.id WHERE i.id = smoke_tests.incident_id AND c.user_id = auth.uid())); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY codegraph_customer ON codegraph_snapshots FOR ALL USING (EXISTS (SELECT 1 FROM incidents i JOIN customers c ON i.customer_id = c.id WHERE i.id = codegraph_snapshots.incident_id AND c.user_id = auth.uid())); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY churn_admin ON churn_events FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('coordinator','admin'))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY invitations_admin ON engineer_invitations FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('coordinator','admin'))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY guidelines_admin ON custom_guidelines FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('coordinator','admin'))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY tla_admin ON temporary_links_archive FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('coordinator','admin'))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ═══════════════════════════════════════════════════════════════
-- SECTION 11: TRIGGERS (18 total)
-- ═══════════════════════════════════════════════════════════════

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Prevent audit modification
CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs are immutable and cannot be modified or deleted';
END;
$$ LANGUAGE plpgsql;

-- Calculate audit hash chain
CREATE OR REPLACE FUNCTION calculate_audit_hash()
RETURNS TRIGGER AS $$
DECLARE
  prev_hash text;
  new_hash text;
  block_idx integer;
BEGIN
  SELECT COALESCE(MAX(block_index), 0) + 1 INTO block_idx
  FROM audit_hash_chain WHERE incident_id = NEW.record_id::uuid;

  SELECT COALESCE(current_hash, '0') INTO prev_hash
  FROM audit_hash_chain
  WHERE incident_id = NEW.record_id::uuid
  ORDER BY block_index DESC LIMIT 1;

  new_hash := encode(digest(
    COALESCE(prev_hash, '0') || '|' || NEW.record_id || '|' || NEW.operation || '|' || EXTRACT(EPOCH FROM NOW())::text,
    'sha256'
  ), 'hex');

  INSERT INTO audit_hash_chain (incident_id, block_index, previous_hash, current_hash, data)
  VALUES (NEW.record_id::uuid, block_idx, COALESCE(prev_hash, '0'), new_hash, NEW.metadata);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Log table changes
CREATE OR REPLACE FUNCTION log_table_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (table_name, record_id, operation, performed_by_id, metadata)
    VALUES (TG_TABLE_NAME, OLD.id::text, 'DELETE', auth.uid(), row_to_json(OLD));
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (table_name, record_id, operation, performed_by_id, metadata)
    VALUES (TG_TABLE_NAME, NEW.id::text, 'UPDATE', auth.uid(), jsonb_build_object('old', row_to_json(OLD), 'new', row_to_json(NEW)));
    RETURN NEW;
  ELSE
    INSERT INTO audit_logs (table_name, record_id, operation, performed_by_id, metadata)
    VALUES (TG_TABLE_NAME, NEW.id::text, 'INSERT', auth.uid(), row_to_json(NEW));
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Prevent hash chain update
CREATE OR REPLACE FUNCTION prevent_hash_chain_update()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit hash chain is immutable';
END;
$$ LANGUAGE plpgsql;

-- Update incident security score
CREATE OR REPLACE FUNCTION update_incident_security_score()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE incidents
  SET security_score = NEW.confidence_score
  WHERE id = NEW.incident_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DROP TRIGGER IF EXISTS trg_customers_updated ON customers;
CREATE TRIGGER trg_customers_updated BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_subscriptions_updated ON subscriptions;
CREATE TRIGGER trg_subscriptions_updated BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_user_roles_updated ON user_roles;
CREATE TRIGGER trg_user_roles_updated BEFORE UPDATE ON user_roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_incidents_updated ON incidents;
CREATE TRIGGER trg_incidents_updated BEFORE UPDATE ON incidents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_pipeline_updated ON pipeline_states;
CREATE TRIGGER trg_pipeline_updated BEFORE UPDATE ON pipeline_states FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_audit_no_update ON audit_logs;
CREATE TRIGGER trg_audit_no_update BEFORE UPDATE ON audit_logs FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();

DROP TRIGGER IF EXISTS trg_audit_no_delete ON audit_logs;
CREATE TRIGGER trg_audit_no_delete BEFORE DELETE ON audit_logs FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();

DROP TRIGGER IF EXISTS trg_audit_hash ON audit_logs;
CREATE TRIGGER trg_audit_hash AFTER INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION calculate_audit_hash();

DROP TRIGGER IF EXISTS trg_log_incidents ON incidents;
CREATE TRIGGER trg_log_incidents AFTER INSERT OR UPDATE OR DELETE ON incidents FOR EACH ROW EXECUTE FUNCTION log_table_change();

DROP TRIGGER IF EXISTS trg_log_subscriptions ON subscriptions;
CREATE TRIGGER trg_log_subscriptions AFTER INSERT OR UPDATE OR DELETE ON subscriptions FOR EACH ROW EXECUTE FUNCTION log_table_change();

DROP TRIGGER IF EXISTS trg_log_credentials ON credentials_vault;
CREATE TRIGGER trg_log_credentials AFTER INSERT OR UPDATE OR DELETE ON credentials_vault FOR EACH ROW EXECUTE FUNCTION log_table_change();

DROP TRIGGER IF EXISTS trg_log_escalations ON human_escalations;
CREATE TRIGGER trg_log_escalations AFTER INSERT OR UPDATE ON human_escalations FOR EACH ROW EXECUTE FUNCTION log_table_change();

DROP TRIGGER IF EXISTS immutable_hash_chain ON audit_hash_chain;
CREATE TRIGGER immutable_hash_chain BEFORE UPDATE OR DELETE ON audit_hash_chain FOR EACH ROW EXECUTE FUNCTION prevent_hash_chain_update();

DROP TRIGGER IF EXISTS trg_update_security_score ON scan_results;
CREATE TRIGGER trg_update_security_score AFTER INSERT OR UPDATE OF confidence_score ON scan_results FOR EACH ROW EXECUTE FUNCTION update_incident_security_score();

-- ═══════════════════════════════════════════════════════════════
-- SECTION 12: DASHBOARD FUNCTIONS
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_admin_dashboard_stats()
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'active_incidents', (SELECT COUNT(*) FROM incidents WHERE status IN ('open','in_progress')),
    'engineers_online', (SELECT COUNT(*) FROM engineer_profiles WHERE is_available = true),
    'avg_response_time', (SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/60), 0) FROM incidents WHERE resolved_at IS NOT NULL),
    'total_revenue', (SELECT COALESCE(SUM(mrr_cents), 0) FROM customers)/100.0,
    'open_escalations', (SELECT COUNT(*) FROM human_escalations WHERE status = 'open'),
    'security_score_avg', (SELECT COALESCE(AVG(security_score), 0) FROM incidents WHERE security_score IS NOT NULL)
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_customer_dashboard_stats(p_customer_id uuid)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_incidents', (SELECT COUNT(*) FROM incidents WHERE customer_id = p_customer_id),
    'resolved_incidents', (SELECT COUNT(*) FROM incidents WHERE customer_id = p_customer_id AND status = 'resolved'),
    'avg_fix_time', (SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/60), 0) FROM incidents WHERE customer_id = p_customer_id AND resolved_at IS NOT NULL),
    'security_score', (SELECT COALESCE(AVG(security_score), 0) FROM incidents WHERE customer_id = p_customer_id AND security_score IS NOT NULL),
    'current_plan', (SELECT current_plan FROM customers WHERE id = p_customer_id),
    'ai_used', (SELECT ai_allowance_used FROM customers WHERE id = p_customer_id),
    'ai_limit', (SELECT ai_allowance_limit FROM customers WHERE id = p_customer_id)
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION calculate_all_mrr()
RETURNS void AS $$
BEGIN
  UPDATE customers c
  SET mrr_cents = COALESCE((
    SELECT CASE s.tier
      WHEN 'starter' THEN 2900
      WHEN 'professional' THEN 9900
      WHEN 'enterprise' THEN 24900
      ELSE 0
    END
    FROM subscriptions s WHERE s.customer_id = c.id AND s.status = 'active'
    ORDER BY s.created_at DESC LIMIT 1
  ), 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION archive_expired_links()
RETURNS integer AS $$
DECLARE
  archived_count integer;
BEGIN
  INSERT INTO temporary_links_archive (customer_id, token_hash, original_url, accessed_at)
  SELECT customer_id, encode(digest(token, 'sha256'), 'hex'), NULL, used_at
  FROM temporary_links
  WHERE expires_at < NOW() AND used_at IS NOT NULL;

  GET DIAGNOSTICS archived_count = ROW_COUNT;

  DELETE FROM temporary_links WHERE expires_at < NOW();

  RETURN archived_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════
-- SECTION 13: STORAGE BUCKETS
-- ═══════════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public)
VALUES ('session-recordings', 'session-recordings', false),
       ('audit-evidence', 'audit-evidence', false)
ON CONFLICT (id) DO NOTHING;

-- NOTE: ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY requires
-- superuser ownership. Skip — Supabase already enables RLS on storage.
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "session_recordings_read" ON storage.objects FOR SELECT USING (bucket_id = 'session-recordings'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "session_recordings_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'session-recordings'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "session_recordings_delete" ON storage.objects FOR DELETE USING (bucket_id = 'session-recordings'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "audit_evidence_read" ON storage.objects FOR SELECT USING (bucket_id = 'audit-evidence'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "audit_evidence_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'audit-evidence'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "audit_evidence_delete" ON storage.objects FOR DELETE USING (bucket_id = 'audit-evidence'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "buckets_read" ON storage.buckets FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ═══════════════════════════════════════════════════════════════
-- SECTION 14: REALTIME + REPLICA IDENTITY (19 tables)
-- ═══════════════════════════════════════════════════════════════

DO $$ BEGIN CREATE PUBLICATION supabase_realtime; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE incidents; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE pipeline_states; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE scan_results; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE human_escalations; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE engineer_profiles; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE notifications; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE subscriptions; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE customers; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE audit_hash_chain; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE audit_logs; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE communications_log; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE credentials_vault; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE vm_sessions; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE vm_commands; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE repair_patches; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE audit_reports; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE one_time_fixes; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE churn_events; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE oncall_schedules; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE opsgenie_sync; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- REPLICA IDENTITY FULL for all realtime tables
ALTER TABLE incidents REPLICA IDENTITY FULL;
ALTER TABLE pipeline_states REPLICA IDENTITY FULL;
ALTER TABLE scan_results REPLICA IDENTITY FULL;
ALTER TABLE human_escalations REPLICA IDENTITY FULL;
ALTER TABLE engineer_profiles REPLICA IDENTITY FULL;
ALTER TABLE notifications REPLICA IDENTITY FULL;
ALTER TABLE subscriptions REPLICA IDENTITY FULL;
ALTER TABLE customers REPLICA IDENTITY FULL;
ALTER TABLE audit_hash_chain REPLICA IDENTITY FULL;
ALTER TABLE audit_logs REPLICA IDENTITY FULL;
ALTER TABLE communications_log REPLICA IDENTITY FULL;
ALTER TABLE credentials_vault REPLICA IDENTITY FULL;
ALTER TABLE vm_sessions REPLICA IDENTITY FULL;
ALTER TABLE vm_commands REPLICA IDENTITY FULL;
ALTER TABLE repair_patches REPLICA IDENTITY FULL;
ALTER TABLE audit_reports REPLICA IDENTITY FULL;
ALTER TABLE one_time_fixes REPLICA IDENTITY FULL;
ALTER TABLE churn_events REPLICA IDENTITY FULL;
ALTER TABLE oncall_schedules REPLICA IDENTITY FULL;
ALTER TABLE opsgenie_sync REPLICA IDENTITY FULL;

-- ═══════════════════════════════════════════════════════════════
-- SECTION 15: DATABASE WEBHOOKS (3 triggers)
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION webhook_incident_created()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    url := COALESCE(current_setting('app.settings.webhook_url', true), 'https://npcopjsqgjvirfjnjemt.supabase.co/functions/v1/webhook-alert')::text,
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || COALESCE(current_setting('app.settings.service_key', true), '') || '"}'::jsonb,
    body := jsonb_build_object('event', 'incident.created', 'table', TG_TABLE_NAME, 'record', row_to_json(NEW), 'timestamp', now())
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION webhook_escalation_created()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    url := COALESCE(current_setting('app.settings.webhook_url', true), 'https://npcopjsqgjvirfjnjemt.supabase.co/functions/v1/webhook-alert')::text,
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || COALESCE(current_setting('app.settings.service_key', true), '') || '"}'::jsonb,
    body := jsonb_build_object('event', 'escalation.created', 'table', TG_TABLE_NAME, 'record', row_to_json(NEW), 'timestamp', now())
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION webhook_subscription_changed()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    url := COALESCE(current_setting('app.settings.webhook_url', true), 'https://npcopjsqgjvirfjnjemt.supabase.co/functions/v1/webhook-alert')::text,
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || COALESCE(current_setting('app.settings.service_key', true), '') || '"}'::jsonb,
    body := jsonb_build_object('event', 'subscription.changed', 'table', TG_TABLE_NAME, 'old_record', row_to_json(OLD), 'record', row_to_json(NEW), 'timestamp', now())
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_webhook_incident_created ON incidents;
CREATE TRIGGER trg_webhook_incident_created AFTER INSERT ON incidents FOR EACH ROW EXECUTE FUNCTION webhook_incident_created();

DROP TRIGGER IF EXISTS trg_webhook_escalation_created ON human_escalations;
CREATE TRIGGER trg_webhook_escalation_created AFTER INSERT ON human_escalations FOR EACH ROW EXECUTE FUNCTION webhook_escalation_created();

DROP TRIGGER IF EXISTS trg_webhook_subscription_changed ON subscriptions;
CREATE TRIGGER trg_webhook_subscription_changed AFTER UPDATE ON subscriptions FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status) EXECUTE FUNCTION webhook_subscription_changed();

-- ═══════════════════════════════════════════════════════════════
-- SECTION 16: CRON JOBS (3 jobs)
-- ═══════════════════════════════════════════════════════════════

DO $$ BEGIN PERFORM cron.unschedule('calculate-all-mrr'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM cron.unschedule('cleanup-old-audit-logs'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule('calculate-all-mrr', '0 * * * *', $$ SELECT calculate_all_mrr() $$);
SELECT cron.schedule('cleanup-old-audit-logs', '0 4 * * 0', $$ DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '90 days' $$);

-- ═══════════════════════════════════════════════════════════════
-- SECTION 17: DATABASE ROLES & GRANTS
-- ═══════════════════════════════════════════════════════════════

GRANT USAGE ON SCHEMA public TO anon, authenticated;

DO $$
DECLARE tbl RECORD;
BEGIN
  FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', tbl.tablename);
    EXECUTE format('GRANT SELECT ON public.%I TO anon', tbl.tablename);
  END LOOP;
END $$;

DO $$
DECLARE seq RECORD;
BEGIN
  FOR seq IN SELECT sequencename FROM pg_sequences WHERE schemaname = 'public'
  LOOP
    EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE public.%I TO authenticated', seq.sequencename);
  END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- SECTION 18: SEED DATA (scanner registry)
-- ═══════════════════════════════════════════════════════════════

INSERT INTO scanner_registry (name, category, tool_type, command_template, output_format, severity_rules, is_active) VALUES
  ('sql_injection_detector', 'triage', 'security', 'sqlmap -u {website} --batch', 'json', '{"critical": 95, "high": 80}', true),
  ('xss_scanner', 'triage', 'security', 'nmap --script http-stored-xss.nse {website}', 'json', '{"critical": 90, "high": 70}', true),
  ('dependency_vulnerability_scanner', 'triage', 'security', 'npm audit --json', 'json', '{"critical": 90, "high": 70, "medium": 40}', true),
  ('ssl_tls_analyzer', 'triage', 'security', 'testssl.sh --json {website}', 'json', '{"critical": 90, "high": 75}', true),
  ('port_scanner', 'triage', 'security', 'nmap -sV -p- {website}', 'json', '{"critical": 80, "high": 60}', true),
  ('security_headers_scanner', 'triage', 'security', 'python3 -m secheaders {website}', 'json', '{"high": 70, "medium": 40}', true),
  ('csrf_detector', 'triage', 'security', 'python3 -m csrfscan {website}', 'json', '{"critical": 85, "high": 65}', true),
  ('idor_detector', 'triage', 'security', 'python3 -m idorcheck {website}', 'json', '{"critical": 90, "high": 70}', true),
  ('path_traversal_detector', 'triage', 'security', 'python3 -m pathtraversal {website}', 'json', '{"critical": 85, "high": 65}', true),
  ('command_injection_detector', 'triage', 'security', 'python3 -m cmdinject {website}', 'json', '{"critical": 95, "high": 80}', true)
ON CONFLICT (name) DO UPDATE SET category = EXCLUDED.category, tool_type = EXCLUDED.tool_type, command_template = EXCLUDED.command_template, output_format = EXCLUDED.output_format, severity_rules = EXCLUDED.severity_rules, is_active = EXCLUDED.is_active;

-- ═══════════════════════════════════════════════════════════════
-- SECTION 19: ANALYZE ALL TABLES
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE tbl RECORD;
BEGIN
  FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ANALYZE public.%I', tbl.tablename);
  END LOOP;
END $$;
