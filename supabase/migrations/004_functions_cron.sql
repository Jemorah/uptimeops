-- ═══════════════════════════════════════════════════════════════
-- MIGRATION 004: Functions, Cron Jobs, Storage, Realtime
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════
-- HELPER: HTTP POST via pg_net (if available)
-- These cron jobs call Edge Functions. They use pg_net which
-- must be enabled in your Supabase project (Database > Extensions).
-- If pg_net is not available, the cron jobs will log a notice.
-- ═══════════════════════════════════════════

-- Enable pg_net extension for HTTP calls (ignore if not available)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Helper function for Edge Function HTTP calls
-- Uses Vault secrets for service role key (set via Dashboard > Vault)
CREATE OR REPLACE FUNCTION cron_http_post(
  endpoint text,
  payload jsonb DEFAULT '{}'::jsonb
) RETURNS bigint AS $$
DECLARE
  svc_key text;
  project_ref text;
  full_url text;
BEGIN
  -- Try to get service role key from Vault (preferred)
  BEGIN
    SELECT decrypted_secret INTO svc_key
    FROM vault.decrypted_secrets
    WHERE name = 'service_role_key'
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    svc_key := NULL;
  END;

  -- Fallback: try current_setting
  IF svc_key IS NULL THEN
    BEGIN
      svc_key := current_setting('app.service_role_key', true);
    EXCEPTION WHEN OTHERS THEN
      svc_key := NULL;
    END;
  END IF;

  -- Try to get project ref for URL construction
  BEGIN
    SELECT decrypted_secret INTO project_ref
    FROM vault.decrypted_secrets
    WHERE name = 'project_ref'
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    project_ref := current_setting('app.supabase_url', true);
  END;

  IF project_ref IS NULL THEN
    RAISE NOTICE '[UptimeOps] Skipping cron job: project URL not configured. Set Vault secret or app.supabase_url';
    RETURN 0;
  END IF;

  -- Build full URL (handle both full URLs and project refs)
  IF project_ref LIKE 'http%' THEN
    full_url := project_ref || '/functions/v1/' || endpoint;
  ELSE
    full_url := 'https://' || project_ref || '.supabase.co/functions/v1/' || endpoint;
  END IF;

  -- Check pg_net availability
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    RAISE NOTICE '[UptimeOps] pg_net extension not available. Install it via Database > Extensions to enable cron HTTP jobs.';
    RETURN 0;
  END IF;

  -- Make HTTP POST call via pg_net
  RETURN net.http_post(
    url := full_url,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || COALESCE(svc_key, ''),
      'Content-Type', 'application/json'
    ),
    body := payload
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════
-- CRON JOBS
-- Note: pg_cron is pre-installed on managed Supabase.
-- These jobs gracefully degrade if pg_net or secrets are unavailable.
-- ═══════════════════════════════════════════

-- Daily subscription management (9:00 AM UTC)
SELECT cron.schedule('subscription-daily', '0 9 * * *', $$
  SELECT cron_http_post('subscription-manager', '{"action": "daily_cron"}'::jsonb) AS request_id;
$$);

-- Engineer availability check every 2 minutes
SELECT cron.schedule('engineer-check', '*/2 * * * *', $$
  SELECT cron_http_post('engineer-availability', '{"action": "cron_check"}'::jsonb) AS request_id;
$$);

-- Cleanup expired temporary links every 6 hours
SELECT cron.schedule('cleanup-links', '0 */6 * * *', $$
  SELECT cron_http_post('temporary-link-generator', '{"action": "cleanup_expired"}'::jsonb) AS request_id;
$$);

-- Archive old temporary links daily at 3 AM
SELECT cron.schedule('archive-links', '0 3 * * *', $$
  SELECT cron_http_post('temporary-link-generator', '{"action": "archive_old"}'::jsonb) AS request_id;
$$);

-- Auto-cleanup expired VM sessions every hour
SELECT cron.schedule('cleanup-vms', '0 * * * *', $$
  UPDATE vm_sessions
  SET status = 'timeout',
      destroyed_at = now(),
      destroy_reason = 'auto_timeout_4h'
  WHERE status = 'running'
    AND created_at < now() - interval '4 hours';
$$);

-- Auto-cleanup expired credential vault entries daily
SELECT cron.schedule('cleanup-credentials', '0 4 * * *', $$
  UPDATE credentials_vault
  SET revoked_at = now()
  WHERE revoked_at IS NULL
    AND expires_at < now();
$$);

-- ═══════════════════════════════════════════
-- STORAGE BUCKETS
-- ═══════════════════════════════════════════

-- Session recordings bucket (auto-cleanup after 90 days via lifecycle)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'session-recordings',
  'session-recordings',
  false,
  524288000,  -- 500MB max per file
  ARRAY['video/webm', 'video/mp4', 'application/octet-stream']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Gap Seal audit evidence bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'audit-evidence',
  'audit-evidence',
  false,
  104857600,  -- 100MB max per file
  ARRAY['image/png', 'image/jpeg', 'application/pdf', 'text/plain']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════
-- REALTIME CONFIGURATION
-- ═══════════════════════════════════════════

-- Enable realtime for key tables
DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'incidents', 'pipeline_states', 'human_escalations',
    'vm_sessions', 'audit_logs', 'communications_log', 'notifications'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables
  LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', tbl);
    EXCEPTION WHEN OTHERS THEN
      -- Table may already be in publication, ignore
      NULL;
    END;
  END LOOP;
END $$;

-- ═══════════════════════════════════════════
-- SUPABASE VAULT SECRET TEMPLATE
-- ═══════════════════════════════════════════
-- Run these via SQL Editor AFTER deployment to store secrets securely:
--
-- SELECT vault.create_secret('your-service-role-key', 'service_role_key');
-- SELECT vault.create_secret('your-project-ref', 'project_ref');
-- SELECT vault.create_secret('sk-...', 'stripe_secret_key');
-- SELECT vault.create_secret('re_...', 'resend_api_key');
-- SELECT vault.create_secret('your-antigravity-sdk-key', 'antigravity_api_key');
--
-- Replace with your actual secret values before running.
-- ═══════════════════════════════════════════
