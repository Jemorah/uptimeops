-- ═══════════════════════════════════════════════════════════════
-- MIGRATION 004: Functions, Cron Jobs, Storage, Realtime
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════
-- CRON JOBS (pg_cron extension)
-- ═══════════════════════════════════════════

-- Enable pg_cron if available (managed Supabase has this)
-- Note: On self-hosted, may need: CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Daily subscription management (9:00 AM UTC)
SELECT cron.schedule('subscription-daily', '0 9 * * *', $$
  SELECT
    net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/subscription-manager',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := '{"action": "daily_cron"}'
    ) AS request_id;
$$);

-- Engineer availability check every 2 minutes
SELECT cron.schedule('engineer-check', '*/2 * * * *', $$
  SELECT
    net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/engineer-availability',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := '{"action": "cron_check"}'
    ) AS request_id;
$$);

-- Cleanup expired temporary links every 6 hours
SELECT cron.schedule('cleanup-links', '0 */6 * * *', $$
  SELECT
    net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/temporary-link-generator',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := '{"action": "cleanup_expired"}'
    ) AS request_id;
$$);

-- Archive old temporary links daily at 3 AM
SELECT cron.schedule('archive-links', '0 3 * * *', $$
  SELECT
    net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/temporary-link-generator',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := '{"action": "archive_old"}'
    ) AS request_id;
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

-- Win-back email sequence: 30 days
SELECT cron.schedule('winback-30d', '0 10 * * *', $$
  UPDATE churn_events
  SET win_back_sent_30d = true
  WHERE win_back_sent_30d = false
    AND churned_at < now() - interval '30 days'
    AND churned_at > now() - interval '31 days';
$$);

-- Win-back email sequence: 60 days
SELECT cron.schedule('winback-60d', '0 10 * * *', $$
  UPDATE churn_events
  SET win_back_sent_60d = true
  WHERE win_back_sent_60d = false
    AND churned_at < now() - interval '60 days'
    AND churned_at > now() - interval '61 days';
$$);

-- Win-back email sequence: 90 days
SELECT cron.schedule('winback-90d', '0 10 * * *', $$
  UPDATE churn_events
  SET win_back_sent_90d = true
  WHERE win_back_sent_90d = false
    AND churned_at < now() - interval '90 days'
    AND churned_at > now() - interval '91 days';
$$);

-- ═══════════════════════════════════════════
-- STORAGE BUCKETS
-- ═══════════════════════════════════════════

-- Create storage buckets if they don't exist
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES
  ('reports', 'reports', false, false, 10485760, array['application/pdf', 'text/csv', 'application/json']),
  ('screenshots', 'screenshots', false, false, 5242880, array['image/png', 'image/jpeg', 'image/webp']),
  ('exports', 'exports', false, false, 10485760, array['application/pdf', 'text/csv', 'application/json']),
  ('backups', 'backups', false, false, 52428800, array['application/gzip', 'application/zip'])
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
CREATE POLICY reports_admin ON storage.objects
  FOR ALL USING (
    bucket_id = 'reports' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY screenshots_admin ON storage.objects
  FOR ALL USING (
    bucket_id = 'screenshots' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY exports_admin ON storage.objects
  FOR ALL USING (
    bucket_id = 'exports' AND
    auth.role() = 'authenticated'
  );

-- ═══════════════════════════════════════════
-- REALTIME CONFIGURATION
-- ═══════════════════════════════════════════

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE incidents;
ALTER PUBLICATION supabase_realtime ADD TABLE human_escalations;
ALTER PUBLICATION supabase_realtime ADD TABLE pipeline_states;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE audit_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE engineer_profiles;

-- ═══════════════════════════════════════════
-- HELPER FUNCTIONS
-- ═══════════════════════════════════════════

-- Get dashboard metrics for HQ
CREATE OR REPLACE FUNCTION get_dashboard_metrics()
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'active_incidents', (SELECT count(*) FROM incidents WHERE status NOT IN ('resolved', 'closed')),
    'p1_waiting', (SELECT count(*) FROM incidents WHERE priority = 'P1_CRITICAL' AND status NOT IN ('resolved', 'closed')),
    'ai_success_rate', (
      SELECT CASE WHEN count(*) > 0
        THEN round((count(*) FILTER (WHERE status = 'completed') * 100.0 / count(*)), 1)
        ELSE 0 END
      FROM pipeline_states
      WHERE created_at > now() - interval '24 hours'
    ),
    'engineers_online', (SELECT count(*) FROM engineer_profiles WHERE is_on_call = true AND last_heartbeat_at > now() - interval '5 minutes'),
    'revenue_today', (SELECT COALESCE(SUM(amount_paid), 0) FROM one_time_fixes WHERE paid_at > now() - interval '24 hours' AND status = 'paid'),
    'mrr', (SELECT COALESCE(SUM(price_cents), 0) / 100.0 FROM subscriptions WHERE status IN ('active', 'trialing')),
    'customers_total', (SELECT count(*) FROM customers WHERE status = 'active'),
    'incidents_24h', (SELECT count(*) FROM incidents WHERE created_at > now() - interval '24 hours'),
    'avg_resolution_minutes', (SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/60), 0)::int FROM incidents WHERE resolved_at IS NOT NULL AND created_at > now() - interval '24 hours')::int
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get engineer performance report
CREATE OR REPLACE FUNCTION get_engineer_performance(p_days integer DEFAULT 30)
RETURNS TABLE (
  engineer_id uuid,
  name text,
  resolved_count bigint,
  avg_resolution_minutes numeric,
  p1_count bigint,
  customer_satisfaction numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ep.id,
    ep.name,
    COUNT(i.id) FILTER (WHERE i.resolved_at IS NOT NULL) as resolved_count,
    ROUND(AVG(EXTRACT(EPOCH FROM (i.resolved_at - i.created_at))/60), 1) as avg_resolution_minutes,
    COUNT(i.id) FILTER (WHERE i.priority = 'P1_CRITICAL') as p1_count,
    ep.satisfaction_score
  FROM engineer_profiles ep
  LEFT JOIN incidents i ON i.assigned_engineer_id = ep.id
    AND i.created_at > now() - (p_days || ' days')::interval
  GROUP BY ep.id, ep.name, ep.satisfaction_score
  ORDER BY resolved_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get customer health score
CREATE OR REPLACE FUNCTION get_customer_health(p_customer_id uuid)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
  incident_count integer;
  avg_response numeric;
  days_since_last integer;
  score integer;
BEGIN
  SELECT count(*) INTO incident_count FROM incidents WHERE customer_id = p_customer_id;
  SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/60), 0)
    INTO avg_response FROM incidents WHERE customer_id = p_customer_id AND resolved_at IS NOT NULL;
  SELECT COALESCE(EXTRACT(DAY FROM (now() - MAX(created_at)))::int, 999)
    INTO days_since_last FROM incidents WHERE customer_id = p_customer_id;

  -- Health score: 0-100
  score := GREATEST(0, LEAST(100,
    100
    - (incident_count * 5)           -- -5 per incident
    - (CASE WHEN avg_response > 60 THEN 20 ELSE 0 END)  -- -20 if avg response > 1hr
    - (CASE WHEN days_since_last < 7 THEN 15 ELSE 0 END) -- -15 if incident in last week
  ));

  SELECT jsonb_build_object(
    'health_score', score,
    'incident_count', incident_count,
    'avg_response_minutes', ROUND(avg_response, 1),
    'days_since_last_incident', days_since_last,
    'status', CASE
      WHEN score >= 80 THEN 'healthy'
      WHEN score >= 50 THEN 'at_risk'
      ELSE 'critical'
    END
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Archive expired temporary links
CREATE OR REPLACE FUNCTION archive_expired_links()
RETURNS integer AS $$
DECLARE
  archived_count integer;
BEGIN
  WITH expired AS (
    DELETE FROM temporary_links
    WHERE status IN ('expired', 'revoked', 'used')
      AND created_at < now() - interval '30 days'
    RETURNING *
  )
  INSERT INTO temporary_links_archive
  SELECT *, now() FROM expired;

  GET DIAGNOSTICS archived_count = ROW_COUNT;
  RETURN archived_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
