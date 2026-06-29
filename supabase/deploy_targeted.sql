-- ═══════════════════════════════════════════════════════════════
-- UPTIMEOPS v2.1 — TARGETED DEPLOYMENT (only missing items)
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- 1. MISSING INDEXES
-- ═══════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_coordinator_email ON coordinator_profiles(email);
CREATE INDEX IF NOT EXISTS idx_guidelines_customer ON custom_guidelines(customer_id);
CREATE INDEX IF NOT EXISTS idx_guidelines_severity ON custom_guidelines(severity);
CREATE INDEX IF NOT EXISTS idx_opsgenie_engineer ON opsgenie_sync(engineer_id);
CREATE INDEX IF NOT EXISTS idx_opsgenie_status ON opsgenie_sync(sync_status);
CREATE INDEX IF NOT EXISTS idx_projects_customer ON projects(customer_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_repair_status ON repair_patches(status);
CREATE INDEX IF NOT EXISTS idx_scanner_category ON scanner_registry(category);
CREATE INDEX IF NOT EXISTS idx_scanner_active ON scanner_registry(is_active);

-- ═══════════════════════════════════════════════════════════════
-- 2. MISSING REALTIME TABLES
-- ═══════════════════════════════════════════════════════════════

DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE engineer_profiles; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE subscriptions; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE customers; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE audit_hash_chain; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE credentials_vault; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE vm_commands; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE audit_reports; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE scan_results; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE one_time_fixes; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE churn_events; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE oncall_schedules; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE opsgenie_sync; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE vm_sessions; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ═══════════════════════════════════════════════════════════════
-- 3. REPLICA IDENTITY FULL (for complete row data in realtime)
-- ═══════════════════════════════════════════════════════════════

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
-- 4. DATABASE WEBHOOK FUNCTIONS
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

-- ═══════════════════════════════════════════════════════════════
-- 5. WEBHOOK TRIGGERS
-- ═══════════════════════════════════════════════════════════════

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

-- ═══════════════════════════════════════════════════════════════
-- 6. MISSING CRON JOBS
-- ═══════════════════════════════════════════════════════════════

SELECT cron.unschedule('calculate-all-mrr');
SELECT cron.unschedule('cleanup-old-audit-logs');

SELECT cron.schedule('calculate-all-mrr', '0 * * * *', $$ SELECT calculate_all_mrr() $$);
SELECT cron.schedule('cleanup-old-audit-logs', '0 4 * * 0', $$ DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '90 days' $$);

-- ═══════════════════════════════════════════════════════════════
-- 7. ANALYZE ALL TABLES
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE tbl RECORD;
BEGIN
  FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ANALYZE public.%I', tbl.tablename);
  END LOOP;
END $$;
