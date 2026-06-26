-- ═══════════════════════════════════════════════════════════════
-- MIGRATION 005: Database Webhooks, Final Seeds, Validation
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════
-- DATABASE WEBHOOKS
-- Trigger edge functions on table changes via pg_net HTTP.
-- Falls back gracefully if pg_net or secrets are not configured.
-- ═══════════════════════════════════════════

-- Helper: Post to Edge Function (shared with 004 migration)
CREATE OR REPLACE FUNCTION webhook_http_post(
  endpoint text,
  payload jsonb DEFAULT '{}'::jsonb
) RETURNS void AS $$
DECLARE
  svc_key text;
  project_ref text;
  full_url text;
BEGIN
  -- Try Vault for service role key
  BEGIN
    SELECT decrypted_secret INTO svc_key
    FROM vault.decrypted_secrets
    WHERE name = 'service_role_key'
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    svc_key := NULL;
  END;

  IF svc_key IS NULL THEN
    BEGIN
      svc_key := current_setting('app.service_role_key', true);
    EXCEPTION WHEN OTHERS THEN
      svc_key := NULL;
    END;
  END IF;

  BEGIN
    SELECT decrypted_secret INTO project_ref
    FROM vault.decrypted_secrets
    WHERE name = 'project_ref'
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    project_ref := current_setting('app.supabase_url', true);
  END;

  IF project_ref IS NULL THEN
    RAISE NOTICE '[UptimeOps Webhook] Skipping: project URL not configured';
    RETURN;
  END IF;

  IF project_ref LIKE 'http%' THEN
    full_url := project_ref || '/functions/v1/' || endpoint;
  ELSE
    full_url := 'https://' || project_ref || '.supabase.co/functions/v1/' || endpoint;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    RAISE NOTICE '[UptimeOps Webhook] pg_net not available. Install via Database > Extensions.';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := full_url,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || COALESCE(svc_key, ''),
      'Content-Type', 'application/json'
    ),
    body := payload
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Webhook: New incident created → trigger AI orchestrator
CREATE OR REPLACE FUNCTION webhook_incident_created()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM webhook_http_post(
    'ai-orchestrator',
    jsonb_build_object(
      'incident_id', NEW.id,
      'trigger', 'incident_created',
      'customer_id', NEW.customer_id
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_webhook_incident
  AFTER INSERT ON incidents
  FOR EACH ROW
  WHEN (NEW.source_type = 'subscription')
  EXECUTE FUNCTION webhook_incident_created();

-- Webhook: Pipeline awaiting approval → notify coordinator
CREATE OR REPLACE FUNCTION webhook_approval_needed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'awaiting_approval' AND OLD.status IS DISTINCT FROM 'awaiting_approval' THEN
    PERFORM webhook_http_post(
      'communication-sender',
      jsonb_build_object(
        'type', 'approval_required',
        'entity_type', 'pipeline',
        'entity_id', NEW.pipeline_id,
        'channel', 'dashboard',
        'metadata', jsonb_build_object(
          'confidence', NEW.confidence,
          'incident_id', NEW.incident_id,
          'threshold', 90
        )
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_webhook_approval
  AFTER UPDATE ON pipeline_states
  FOR EACH ROW
  EXECUTE FUNCTION webhook_approval_needed();

-- Webhook: Incident resolved → send notification + generate temp link
CREATE OR REPLACE FUNCTION webhook_incident_resolved()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'resolved' AND OLD.status IS DISTINCT FROM 'resolved' THEN
    -- Send resolution notification
    PERFORM webhook_http_post(
      'communication-sender',
      jsonb_build_object(
        'type', 'incident_resolved',
        'entity_type', 'incident',
        'entity_id', NEW.id,
        'channel', 'all'
      )
    );

    -- Generate temporary access link
    PERFORM webhook_http_post(
      'temporary-link-generator',
      jsonb_build_object(
        'action', 'generate',
        'incident_id', NEW.id,
        'customer_id', NEW.customer_id
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_webhook_resolved
  AFTER UPDATE ON incidents
  FOR EACH ROW
  EXECUTE FUNCTION webhook_incident_resolved();

-- ═══════════════════════════════════════════
-- AUTO-LOG TRIGGERS for key tables
-- ═══════════════════════════════════════════

CREATE TRIGGER trg_log_incidents
  AFTER INSERT OR UPDATE OR DELETE ON incidents
  FOR EACH ROW EXECUTE FUNCTION log_table_change();

CREATE TRIGGER trg_log_subscriptions
  AFTER INSERT OR UPDATE OR DELETE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION log_table_change();

CREATE TRIGGER trg_log_credentials
  AFTER INSERT OR UPDATE OR DELETE ON credentials_vault
  FOR EACH ROW EXECUTE FUNCTION log_table_change();

CREATE TRIGGER trg_log_escalations
  AFTER INSERT OR UPDATE ON human_escalations
  FOR EACH ROW EXECUTE FUNCTION log_table_change();

-- ═══════════════════════════════════════════
-- COMPREHENSIVE SEED DATA
-- ═══════════════════════════════════════════

-- More customers
INSERT INTO customers (id, email, full_name, company_name, website, phone, plan, status, mrr) VALUES
  ('11111111-1111-1111-1111-111111111114', 'admin@techflow.io', 'Sarah Kim', 'TechFlow', 'techflow.io', '+1-555-0101', 'guardian', 'active', 99.00),
  ('11111111-1111-1111-1111-111111111115', 'ops@datavault.net', 'Mike Torres', 'DataVault', 'datavault.net', '+1-555-0102', 'fortress', 'active', 599.00),
  ('11111111-1111-1111-1111-111111111116', 'dev@cloudspire.io', NULL, 'CloudSpire', 'cloudspire.io', NULL, 'sentinel', 'active', 249.00),
  ('11111111-1111-1111-1111-111111111117', 'cto@nexustrack.com', 'Priya Sharma', 'NexusTrack', 'nexustrack.com', '+1-555-0103', 'guardian', 'lead', 0),
  ('11111111-1111-1111-1111-111111111118', 'founder@devmesh.co', NULL, 'DevMesh', 'devmesh.co', NULL, 'guardian', 'churned', 0);

-- More subscriptions
INSERT INTO subscriptions (customer_id, plan, price_cents, incidents_allowance, current_period_start, current_period_end) VALUES
  ('11111111-1111-1111-1111-111111111114', 'guardian', 9900, 3, now(), now() + interval '30 days'),
  ('11111111-1111-1111-1111-111111111115', 'fortress', 59900, 999, now(), now() + interval '30 days'),
  ('11111111-1111-1111-1111-111111111116', 'sentinel', 24900, 10, now(), now() + interval '30 days');

-- More incidents
INSERT INTO incidents (customer_id, source_type, title, description, website_url, status, priority, ai_confidence, assigned_engineer_id) VALUES
  ('11111111-1111-1111-1111-111111111114', 'subscription', 'Nginx config error causing 502s on techflow.io',
   'Upstream timeout misconfiguration causing intermittent 502 errors on all API endpoints.', 'techflow.io', 'resolved', 'P2_HIGH', 95, '33333333-3333-3333-3333-333333333331'),
  ('11111111-1111-1111-1111-111111111115', 'subscription', 'Redis memory exhaustion on datavault.net',
   'Redis instance reached maxmemory limit, causing cache eviction and performance degradation.', 'datavault.net', 'triage', 'P1_CRITICAL', 88, NULL),
  ('11111111-1111-1111-1111-111111111116', 'subscription', 'Docker container restart loop on cloudspire.io',
   'Container health check failing, causing infinite restart loop. Application unreachable.', 'cloudspire.io', 'repair', 'P2_HIGH', 82, '33333333-3333-3333-3333-333333333332'),
  ('11111111-1111-1111-1111-111111111111', 'subscription', 'Certificate auto-renewal failed on acme-corp.com',
   'Let''s Encrypt renewal failed due to DNS challenge timeout. SSL expires in 3 days.', 'acme-corp.com', 'coordinator_approval', 'P3_MEDIUM', 91, NULL),
  ('11111111-1111-1111-1111-111111111114', 'subscription', 'Database slow query causing timeouts',
   'Missing index on orders.created_at causing sequential scans. Query time >8s.', 'techflow.io', 'smoke_test', 'P2_HIGH', 94, '33333333-3333-3333-3333-333333333333'),
  ('11111111-1111-1111-1111-111111111115', 'subscription', 'Load balancer misrouting traffic',
   'AWS ALB routing to unhealthy targets. 40% of requests failing.', 'datavault.net', 'pending_assignment', 'P1_CRITICAL', NULL, NULL);

-- One-time fixes
INSERT INTO one_time_fixes (customer_id, status, amount_paid, website_url, issue_description) VALUES
  ('11111111-1111-1111-1111-111111111117', 'paid', 249.00, 'nexustrack.com', 'Complete site down — database corruption after failed migration.'),
  ('11111111-1111-1111-1111-111111111118', 'payment_failed', NULL, 'devmesh.co', 'SSL expired + mixed content errors on checkout flow.'),
  ('11111111-1111-1111-1111-111111111111', 'paid', 99.00, 'acme-corp.com', 'API returning 500 errors — suspected middleware issue.');

-- Pipeline states
INSERT INTO pipeline_states (pipeline_id, incident_id, current_step, confidence, status) VALUES
  ('pl-2024-002-def', (SELECT id FROM incidents WHERE title LIKE '%Redis%' LIMIT 1), 'validate', 88, 'awaiting_approval'),
  ('pl-2024-003-ghi', (SELECT id FROM incidents WHERE title LIKE '%Docker%' LIMIT 1), 'repair', 82, 'running');

-- Communications
INSERT INTO communications_log (customer_id, type, channel, entity_type, entity_id, subject, delivery_status) VALUES
  ('11111111-1111-1111-1111-111111111111', 'incident_created', 'email', 'incident', (SELECT id FROM incidents WHERE website_url = 'acme-corp.com' LIMIT 1), '[UptimeOps] Incident Detected', 'delivered'),
  ('11111111-1111-1111-1111-111111111111', 'incident_created', 'sms', 'incident', (SELECT id FROM incidents WHERE website_url = 'acme-corp.com' LIMIT 1), 'UptimeOps: Incident on acme-corp.com', 'delivered'),
  ('11111111-1111-1111-1111-111111111114', 'incident_resolved', 'email', 'incident', (SELECT id FROM incidents WHERE title LIKE '%Nginx%' LIMIT 1), '[UptimeOps] Resolved — techflow.io', 'delivered');

-- Notifications
INSERT INTO notifications (customer_id, type, message, entity_type, entity_id) VALUES
  ('11111111-1111-1111-1111-111111111111', 'incident_update', 'New incident detected on acme-corp.com. AI is investigating.', 'incident', (SELECT id FROM incidents WHERE website_url = 'acme-corp.com' LIMIT 1)),
  ('11111111-1111-1111-1111-111111111114', 'incident_resolved', 'Your incident on techflow.io has been resolved. Please verify.', 'incident', (SELECT id FROM incidents WHERE title LIKE '%Nginx%' LIMIT 1));

-- Temporary links
INSERT INTO temporary_links (token_hash, entity_type, entity_id, customer_id, expires_at, access_count, status) VALUES
  ('a1b2c3d4e5f6789012345678901234567890abcd1234ef5678901234567890ab', 'incident', (SELECT id FROM incidents WHERE title LIKE '%Nginx%' LIMIT 1), '11111111-1111-1111-1111-111111111114', now() + interval '72 hours', 3, 'active'),
  ('b2c3d4e5f6789012345678901234567890abcd1234ef5678901234567890abc1', 'one_time_fix', (SELECT id FROM one_time_fixes WHERE website_url = 'nexustrack.com' LIMIT 1), '11111111-1111-1111-1111-111111111117', now() - interval '1 hour', 12, 'expired');

-- VM sessions
INSERT INTO vm_sessions (id, incident_id, provider_vm_id, ip_address, status) VALUES
  ('55555555-5555-5555-5555-555555555551', (SELECT id FROM incidents WHERE title LIKE '%Database pool%' LIMIT 1), 'vm-7f3a9e2d', '203.0.113.47', 'running'),
  ('55555555-5555-5555-5555-555555555552', (SELECT id FROM incidents WHERE title LIKE '%Redis%' LIMIT 1), 'vm-8b4c1f3a', '203.0.113.48', 'running');

-- ═══════════════════════════════════════════
-- VALIDATION: Verify schema integrity
-- ═══════════════════════════════════════════

DO $$
DECLARE
  table_count integer;
  rls_count integer;
  trigger_count integer;
  index_count integer;
BEGIN
  SELECT count(*) INTO table_count FROM information_schema.tables
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

  SELECT count(*) INTO rls_count FROM pg_policies
  WHERE schemaname = 'public';

  SELECT count(*) INTO trigger_count FROM information_schema.triggers
  WHERE trigger_schema = 'public';

  SELECT count(*) INTO index_count FROM pg_indexes
  WHERE schemaname = 'public';

  RAISE NOTICE '========================================';
  RAISE NOTICE 'UPTIMEOPS SCHEMA VALIDATION COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Tables:      %', table_count;
  RAISE NOTICE 'RLS Policies: %', rls_count;
  RAISE NOTICE 'Triggers:    %', trigger_count;
  RAISE NOTICE 'Indexes:     %', index_count;
  RAISE NOTICE '========================================';
END $$;
