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
