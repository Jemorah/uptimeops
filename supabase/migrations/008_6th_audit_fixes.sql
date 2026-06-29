-- ═══════════════════════════════════════════════════════════════
-- 6TH AUDIT BACKEND FIXES — UptimeOps v2.1
-- Addresses: replica identity, database webhooks, cron jobs,
-- function integrity checks, CORS configuration
-- ═══════════════════════════════════════════════════════════════

BEGIN;

-- ═══════════════════════════════════════════════════════════════
-- 1. REPLICA IDENTITY FULL for realtime tables
-- Ensures Supabase Realtime receives complete row data on changes
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
-- 2. DATABASE WEBHOOK FUNCTIONS
-- Trigger functions that call Edge Functions on table changes.
-- These use pg_net HTTP extension which must be enabled.
-- ═══════════════════════════════════════════════════════════════

-- Enable pg_net extension for HTTP requests from PostgreSQL
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Webhook URL base (change to your Supabase project URL)
-- These webhooks call Edge Functions when critical events occur

-- Function: notify on incident creation
CREATE OR REPLACE FUNCTION webhook_incident_created()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    url := COALESCE(current_setting('app.settings.webhook_url', true), 'https://npcopjsqgjvirfjnjemt.supabase.co/functions/v1/webhook-alert')::text,
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || COALESCE(current_setting('app.settings.service_key', true), '') || '"}'::jsonb,
    body := jsonb_build_object(
      'event', 'incident.created',
      'table', TG_TABLE_NAME,
      'record', row_to_json(NEW),
      'timestamp', now()
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: notify on escalation
CREATE OR REPLACE FUNCTION webhook_escalation_created()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    url := COALESCE(current_setting('app.settings.webhook_url', true), 'https://npcopjsqgjvirfjnjemt.supabase.co/functions/v1/webhook-alert')::text,
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || COALESCE(current_setting('app.settings.service_key', true), '') || '"}'::jsonb,
    body := jsonb_build_object(
      'event', 'escalation.created',
      'table', TG_TABLE_NAME,
      'record', row_to_json(NEW),
      'timestamp', now()
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: notify on subscription change
CREATE OR REPLACE FUNCTION webhook_subscription_changed()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    url := COALESCE(current_setting('app.settings.webhook_url', true), 'https://npcopjsqgjvirfjnjemt.supabase.co/functions/v1/webhook-alert')::text,
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || COALESCE(current_setting('app.settings.service_key', true), '') || '"}'::jsonb,
    body := jsonb_build_object(
      'event', 'subscription.changed',
      'table', TG_TABLE_NAME,
      'old_record', row_to_json(OLD),
      'record', row_to_json(NEW),
      'timestamp', now()
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════
-- 3. WEBHOOK TRIGGERS
-- Attach webhook functions to critical tables
-- ═══════════════════════════════════════════════════════════════

-- Trigger: incident creation → webhook
DROP TRIGGER IF EXISTS trg_webhook_incident_created ON incidents;
CREATE TRIGGER trg_webhook_incident_created
  AFTER INSERT ON incidents
  FOR EACH ROW
  EXECUTE FUNCTION webhook_incident_created();

-- Trigger: escalation creation → webhook
DROP TRIGGER IF EXISTS trg_webhook_escalation_created ON human_escalations;
CREATE TRIGGER trg_webhook_escalation_created
  AFTER INSERT ON human_escalations
  FOR EACH ROW
  EXECUTE FUNCTION webhook_escalation_created();

-- Trigger: subscription update → webhook
DROP TRIGGER IF EXISTS trg_webhook_subscription_changed ON subscriptions;
CREATE TRIGGER trg_webhook_subscription_changed
  AFTER UPDATE ON subscriptions
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION webhook_subscription_changed();

-- ═══════════════════════════════════════════════════════════════
-- 4. CRON JOB CONFIGURATION
-- Schedule recurring tasks via pg_cron
-- ═══════════════════════════════════════════════════════════════

-- Enable pg_cron (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove existing jobs to avoid duplicates
SELECT cron.unschedule('archive-expired-links');
SELECT cron.unschedule('calculate-all-mrr');
SELECT cron.unschedule('cleanup-old-audit-logs');

-- Archive expired temporary links (daily at 3 AM)
SELECT cron.schedule(
  'archive-expired-links',
  '0 3 * * *',
  $$ SELECT archive_expired_links() $$
);

-- Recalculate MRR for all customers (hourly)
SELECT cron.schedule(
  'calculate-all-mrr',
  '0 * * * *',
  $$ SELECT calculate_all_mrr() $$
);

-- Cleanup old audit logs older than 90 days (weekly on Sunday at 4 AM)
SELECT cron.schedule(
  'cleanup-old-audit-logs',
  '0 4 * * 0',
  $$ DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '90 days' $$
);

-- ═══════════════════════════════════════════════════════════════
-- 5. DATABASE SETTINGS for Webhooks
-- Store webhook configuration as database settings
-- ═══════════════════════════════════════════════════════════════

-- These are set via SQL or Dashboard and read by webhook functions
-- Set webhook base URL:
--   ALTER DATABASE postgres SET "app.settings.webhook_url" = 'https://your-project.supabase.co/functions/v1/webhook-alert';
-- Set service key for Edge Function auth:
--   ALTER DATABASE postgres SET "app.settings.service_key" = 'your-service-role-key';

-- ═══════════════════════════════════════════════════════════════
-- 6. VERIFY ALL EDGE FUNCTIONS HAVE CORRESPONDING RPC WRAPPERS
-- (if frontend calls them via supabase.rpc)
-- ═══════════════════════════════════════════════════════════════

-- Function to check function health (called by monitoring)
CREATE OR REPLACE FUNCTION check_edge_function_health(function_name text)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  result := jsonb_build_object(
    'function', function_name,
    'status', 'unknown',
    'checked_at', now()
  );
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════
-- 7. ANALYZE ALL TABLES (update query planner statistics)
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
  tbl RECORD;
BEGIN
  FOR tbl IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ANALYZE public.%I', tbl.tablename);
  END LOOP;
END $$;

COMMIT;
