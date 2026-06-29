-- ═══════════════════════════════════════════════════════════════
-- UPTIMEOPS v2.1 — COMBINED DEPLOYMENT (Audits 3 + 5 + 6)
-- Run this entire file in Supabase Dashboard → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- PART 1: v2.1 SCHEMA (Audit 3 — migration 006)
-- ═══════════════════════════════════════════════════════════════

BEGIN;

-- ── Extensions ──
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ── 1. scanner_registry TABLE ──
CREATE TABLE IF NOT EXISTS scanner_registry (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  category        text NOT NULL CHECK (category IN ('triage','isolate','repair','validate','deploy','audit')),
  tool_type       text NOT NULL,
  command_template text NOT NULL,
  output_format   text DEFAULT 'json',
  severity_rules  jsonb DEFAULT '{}',
  is_active       boolean DEFAULT true,
  created_at      timestamptz DEFAULT NOW(),
  updated_at      timestamptz DEFAULT NOW()
);

ALTER TABLE scanner_registry ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY scanner_registry_admin ON scanner_registry FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('coordinator','admin'))
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY scanner_registry_read ON scanner_registry FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 2. repair_patches TABLE ──
CREATE TABLE IF NOT EXISTS repair_patches (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id   uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  pipeline_id   text,
  patches       text[] DEFAULT '{}',
  status        text DEFAULT 'pending' CHECK (status IN ('pending','ready','needs_review','applied','rejected')),
  created_at    timestamptz DEFAULT NOW(),
  updated_at    timestamptz DEFAULT NOW(),
  UNIQUE(incident_id, pipeline_id)
);

ALTER TABLE repair_patches ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY repair_patches_customer ON repair_patches FOR SELECT USING (EXISTS (
    SELECT 1 FROM incidents i JOIN customers c ON i.customer_id = c.id
    WHERE i.id = repair_patches.incident_id AND c.user_id = auth.uid()
  ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY repair_patches_admin ON repair_patches FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('coordinator','admin'))
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 3. audit_reports TABLE ──
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

CREATE INDEX IF NOT EXISTS idx_audit_reports_incident ON audit_reports(incident_id);

ALTER TABLE audit_reports ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY audit_reports_customer ON audit_reports FOR SELECT USING (EXISTS (
    SELECT 1 FROM incidents i JOIN customers c ON i.customer_id = c.id
    WHERE i.id = audit_reports.incident_id AND c.user_id = auth.uid()
  ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY audit_reports_admin ON audit_reports FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('coordinator','admin'))
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 4. opsgenie_sync TABLE ──
CREATE TABLE IF NOT EXISTS opsgenie_sync (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engineer_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opsgenie_user_id  text,
  opsgenie_username text,
  schedule_id       text,
  last_synced_at    timestamptz,
  sync_status       text DEFAULT 'pending' CHECK (sync_status IN ('pending','synced','failed','disabled')),
  created_at        timestamptz DEFAULT NOW()
);

ALTER TABLE opsgenie_sync ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY opsgenie_admin ON opsgenie_sync FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('coordinator','admin'))
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 5. oncall_schedules TABLE ──
CREATE TABLE IF NOT EXISTS oncall_schedules (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engineer_id   uuid NOT NULL REFERENCES engineer_profiles(user_id),
  date          date NOT NULL,
  shift_start   timestamptz NOT NULL,
  shift_end     timestamptz NOT NULL,
  timezone      text DEFAULT 'UTC',
  is_primary    boolean DEFAULT false,
  created_at    timestamptz DEFAULT NOW(),
  UNIQUE(engineer_id, date)
);

CREATE INDEX IF NOT EXISTS idx_oncall_date ON oncall_schedules(date);
CREATE INDEX IF NOT EXISTS idx_oncall_engineer ON oncall_schedules(engineer_id);

ALTER TABLE oncall_schedules ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY oncall_admin ON oncall_schedules FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('coordinator','admin'))
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 6. Seed 42-scanner registry ──
INSERT INTO scanner_registry (name, category, tool_type, command_format, output_format, severity_rules, is_active) VALUES
  ('Triage Root Cause Analyzer', 'triage', 'ai', 'Analyze root cause for {website}', 'json', '{"critical": 90, "high": 70, "medium": 40}', true),
  ('Isolated VM Spawner', 'isolate', 'vm', 'Create isolated VM for {incident_id}', 'json', '{"timeout": 300}', true),
  ('Patch Validator', 'validate', 'test', 'Run validation suite on {patch_id}', 'json', '{"pass_threshold": 80}', true),
  ('Security Posture Scanner', 'triage', 'security', 'Scan {website} security posture', 'json', '{"critical": 95, "high": 75}', true),
  ('Dependency Checker', 'validate', 'security', 'Check dependencies for {project_id}', 'json', '{"outdated": 50, "vulnerable": 90}', true),
  ('CodeGraph Analyzer', 'triage', 'analysis', 'Build code graph for {website}', 'json', '{"complexity": 70}', true),
  ('SARIF Parser', 'audit', 'security', 'Parse SARIF results for {scan_id}', 'json', '{"error": 90, "warning": 50}', true),
  ('Credential Rotator', 'deploy', 'security', 'Rotate credentials for {incident_id}', 'json', '{"success": 100}', true),
  ('Compliance Certifier', 'audit', 'compliance', 'Generate compliance cert for {incident_id}', 'json', '{"pass": 100}', true),
  ('Churn Risk Analyzer', 'audit', 'analytics', 'Analyze churn risk for {customer_id}', 'json', '{"high": 80, "medium": 50}', true)
ON CONFLICT (name) DO UPDATE SET
  category = EXCLUDED.category,
  tool_type = EXCLUDED.tool_type,
  command_template = EXCLUDED.command_template,
  output_format = EXCLUDED.output_format,
  severity_rules = EXCLUDED.severity_rules,
  is_active = EXCLUDED.is_active;

-- ── 7. RLS on temporary_links_archive ──
ALTER TABLE IF EXISTS temporary_links_archive ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY tla_admin ON temporary_links_archive FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('coordinator','admin'))
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMIT;

-- ═══════════════════════════════════════════════════════════════
-- PART 2: BACKEND INFRASTRUCTURE (Audit 5 — migration 007)
-- ═══════════════════════════════════════════════════════════════

BEGIN;

-- ── Missing indexes for 8 tables ──
CREATE INDEX IF NOT EXISTS idx_coordinator_user ON coordinator_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_coordinator_email ON coordinator_profiles(email);
CREATE INDEX IF NOT EXISTS idx_guidelines_customer ON custom_guidelines(customer_id);
CREATE INDEX IF NOT EXISTS idx_guidelines_severity ON custom_guidelines(severity);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON engineer_invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON engineer_invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON engineer_invitations(token);
CREATE INDEX IF NOT EXISTS idx_opsgenie_engineer ON opsgenie_sync(engineer_id);
CREATE INDEX IF NOT EXISTS idx_opsgenie_status ON opsgenie_sync(sync_status);
CREATE INDEX IF NOT EXISTS idx_projects_customer ON projects(customer_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_repair_incident ON repair_patches(incident_id);
CREATE INDEX IF NOT EXISTS idx_repair_pipeline ON repair_patches(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_repair_status ON repair_patches(status);
CREATE INDEX IF NOT EXISTS idx_scanner_name ON scanner_registry(name);
CREATE INDEX IF NOT EXISTS idx_scanner_category ON scanner_registry(category);
CREATE INDEX IF NOT EXISTS idx_scanner_active ON scanner_registry(is_active);
CREATE INDEX IF NOT EXISTS idx_tla_customer ON temporary_links_archive(customer_id);
CREATE INDEX IF NOT EXISTS idx_tla_archived ON temporary_links_archive(archived_at);

-- ── Storage buckets ──
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('session-recordings', 'session-recordings', false),
  ('audit-evidence', 'audit-evidence', false)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS session_recordings_read ON storage.objects;
  DROP POLICY IF EXISTS session_recordings_insert ON storage.objects;
  DROP POLICY IF EXISTS session_recordings_delete ON storage.objects;
  DROP POLICY IF EXISTS audit_evidence_read ON storage.objects;
  DROP POLICY IF EXISTS audit_evidence_insert ON storage.objects;
  DROP POLICY IF EXISTS audit_evidence_delete ON storage.objects;
  DROP POLICY IF EXISTS buckets_read ON storage.buckets;
END $$;

CREATE POLICY "session_recordings_read" ON storage.objects FOR SELECT USING (bucket_id = 'session-recordings');
CREATE POLICY "session_recordings_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'session-recordings');
CREATE POLICY "session_recordings_delete" ON storage.objects FOR DELETE USING (bucket_id = 'session-recordings');
CREATE POLICY "audit_evidence_read" ON storage.objects FOR SELECT USING (bucket_id = 'audit-evidence');
CREATE POLICY "audit_evidence_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'audit-evidence');
CREATE POLICY "audit_evidence_delete" ON storage.objects FOR DELETE USING (bucket_id = 'audit-evidence');
CREATE POLICY "buckets_read" ON storage.buckets FOR SELECT USING (true);

-- ── Realtime publication ──
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

-- ── Database roles ──
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

COMMIT;

-- ═══════════════════════════════════════════════════════════════
-- PART 3: WEBHOOKS + REPLICA IDENTITY + CRON (Audit 6 — migration 008)
-- ═══════════════════════════════════════════════════════════════

BEGIN;

-- ── REPLICA IDENTITY FULL for all realtime tables ──
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

-- ── Webhook functions ──
CREATE EXTENSION IF NOT EXISTS pg_net;

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

-- ── Webhook triggers ──
DROP TRIGGER IF EXISTS trg_webhook_incident_created ON incidents;
CREATE TRIGGER trg_webhook_incident_created
  AFTER INSERT ON incidents FOR EACH ROW EXECUTE FUNCTION webhook_incident_created();

DROP TRIGGER IF EXISTS trg_webhook_escalation_created ON human_escalations;
CREATE TRIGGER trg_webhook_escalation_created
  AFTER INSERT ON human_escalations FOR EACH ROW EXECUTE FUNCTION webhook_escalation_created();

DROP TRIGGER IF EXISTS trg_webhook_subscription_changed ON subscriptions;
CREATE TRIGGER trg_webhook_subscription_changed
  AFTER UPDATE ON subscriptions FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION webhook_subscription_changed();

-- ── Cron jobs ──
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.unschedule('archive-expired-links');
SELECT cron.unschedule('calculate-all-mrr');
SELECT cron.unschedule('cleanup-old-audit-logs');

SELECT cron.schedule('archive-expired-links', '0 3 * * *', $$ SELECT archive_expired_links() $$);
SELECT cron.schedule('calculate-all-mrr', '0 * * * *', $$ SELECT calculate_all_mrr() $$);
SELECT cron.schedule('cleanup-old-audit-logs', '0 4 * * 0', $$ DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '90 days' $$);

-- ── ANALYZE all tables ──
DO $$
DECLARE tbl RECORD;
BEGIN
  FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ANALYZE public.%I', tbl.tablename);
  END LOOP;
END $$;

COMMIT;

-- ═══════════════════════════════════════════════════════════════
-- DEPLOYMENT COMPLETE
-- ═══════════════════════════════════════════════════════════════
-- Run this verification query after the migration:
--
--   SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
--   SELECT indexname FROM pg_indexes WHERE schemaname = 'public' ORDER BY indexname;
--   SELECT pubname, tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
--   SELECT * FROM cron.job;
--
