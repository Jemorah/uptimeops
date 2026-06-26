-- ═══════════════════════════════════════════════════════════════
-- UPTIMEOPS MIGRATION 005: Final Seed Data + Validation
-- Paste into Supabase SQL Editor → Click Run
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════
-- AUTO-LOG TRIGGERS for key tables
-- ═══════════════════════════════════════════
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_log_incidents') THEN
    CREATE TRIGGER trg_log_incidents
      AFTER INSERT OR UPDATE OR DELETE ON incidents
      FOR EACH ROW EXECUTE FUNCTION log_table_change();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_log_subscriptions') THEN
    CREATE TRIGGER trg_log_subscriptions
      AFTER INSERT OR UPDATE OR DELETE ON subscriptions
      FOR EACH ROW EXECUTE FUNCTION log_table_change();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_log_credentials') THEN
    CREATE TRIGGER trg_log_credentials
      AFTER INSERT OR UPDATE OR DELETE ON credentials_vault
      FOR EACH ROW EXECUTE FUNCTION log_table_change();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_log_escalations') THEN
    CREATE TRIGGER trg_log_escalations
      AFTER INSERT OR UPDATE ON human_escalations
      FOR EACH ROW EXECUTE FUNCTION log_table_change();
  END IF;
END $$;

-- ═══════════════════════════════════════════
-- COMPREHENSIVE SEED DATA
-- ═══════════════════════════════════════════

-- More customers
INSERT INTO customers (id, email, full_name, company_name, website, phone, plan, status, mrr) VALUES
  ('11111111-1111-1111-1111-111111111114', 'admin@techflow.io', 'Sarah Kim', 'TechFlow', 'techflow.io', '+1-555-0101', 'guardian', 'active', 99.00),
  ('11111111-1111-1111-1111-111111111115', 'ops@datavault.net', 'Mike Torres', 'DataVault', 'datavault.net', '+1-555-0102', 'fortress', 'active', 599.00),
  ('11111111-1111-1111-1111-111111111116', 'dev@cloudspire.io', NULL, 'CloudSpire', 'cloudspire.io', NULL, 'sentinel', 'active', 249.00),
  ('11111111-1111-1111-1111-111111111117', 'cto@nexustrack.com', 'Priya Sharma', 'NexusTrack', 'nexustrack.com', '+1-555-0103', 'guardian', 'lead', 0),
  ('11111111-1111-1111-1111-111111111118', 'founder@devmesh.co', NULL, 'DevMesh', 'devmesh.co', NULL, 'guardian', 'churned', 0)
ON CONFLICT DO NOTHING;

-- More subscriptions
INSERT INTO subscriptions (customer_id, plan, price_cents, incidents_allowance, current_period_start, current_period_end) VALUES
  ('11111111-1111-1111-1111-111111111114', 'guardian', 9900, 3, now(), now() + interval '30 days'),
  ('11111111-1111-1111-1111-111111111115', 'fortress', 59900, 999, now(), now() + interval '30 days'),
  ('11111111-1111-1111-1111-111111111116', 'sentinel', 24900, 10, now(), now() + interval '30 days')
ON CONFLICT DO NOTHING;

-- More incidents
INSERT INTO incidents (id, customer_id, source_type, title, description, website_url, status, priority, ai_confidence, assigned_engineer_id) VALUES
  ('22222222-2222-2222-2222-222222222223', '11111111-1111-1111-1111-111111111114', 'subscription',
   'Nginx config error causing 502s on techflow.io',
   'Upstream timeout misconfiguration causing intermittent 502 errors on all API endpoints.',
   'techflow.io', 'resolved', 'P2_HIGH', 95, '33333333-3333-3333-3333-333333333331'),
  ('22222222-2222-2222-2222-222222222224', '11111111-1111-1111-1111-111111111115', 'subscription',
   'Redis memory exhaustion on datavault.net',
   'Redis instance reached maxmemory limit, causing cache eviction and performance degradation.',
   'datavault.net', 'triage', 'P1_CRITICAL', 88, NULL),
  ('22222222-2222-2222-2222-222222222225', '11111111-1111-1111-1111-111111111116', 'subscription',
   'Docker container restart loop on cloudspire.io',
   'Container health check failing, causing infinite restart loop. Application unreachable.',
   'cloudspire.io', 'repair', 'P2_HIGH', 82, '33333333-3333-3333-3333-333333333332'),
  ('22222222-2222-2222-2222-222222222226', '11111111-1111-1111-1111-111111111111', 'subscription',
   'Certificate auto-renewal failed on acme-corp.com',
   'Let''s Encrypt renewal failed due to DNS challenge timeout. SSL expires in 3 days.',
   'acme-corp.com', 'coordinator_approval', 'P3_MEDIUM', 91, NULL),
  ('22222222-2222-2222-2222-222222222227', '11111111-1111-1111-1111-111111111114', 'subscription',
   'Database slow query causing timeouts',
   'Missing index on orders.created_at causing sequential scans. Query time >8s.',
   'techflow.io', 'smoke_test', 'P2_HIGH', 94, '33333333-3333-3333-3333-333333333333'),
  ('22222222-2222-2222-2222-222222222228', '11111111-1111-1111-1111-111111111115', 'subscription',
   'Load balancer misrouting traffic',
   'AWS ALB routing to unhealthy targets. 40% of requests failing.',
   'datavault.net', 'pending_assignment', 'P1_CRITICAL', NULL, NULL)
ON CONFLICT DO NOTHING;

-- One-time fixes
INSERT INTO one_time_fixes (customer_id, status, amount_paid, website_url, issue_description) VALUES
  ('11111111-1111-1111-1111-111111111117', 'paid', 249.00, 'nexustrack.com', 'Complete site down — database corruption after failed migration.'),
  ('11111111-1111-1111-1111-111111111118', 'payment_failed', NULL, 'devmesh.co', 'SSL expired + mixed content errors on checkout flow.'),
  ('11111111-1111-1111-1111-111111111111', 'paid', 99.00, 'acme-corp.com', 'API returning 500 errors — suspected middleware issue.')
ON CONFLICT DO NOTHING;

-- Pipeline states
INSERT INTO pipeline_states (pipeline_id, incident_id, current_step, confidence, status) VALUES
  ('pl-2024-002-def', '22222222-2222-2222-2222-222222222224', 'validate', 88, 'awaiting_approval'),
  ('pl-2024-003-ghi', '22222222-2222-2222-2222-222222222225', 'repair', 82, 'running')
ON CONFLICT DO NOTHING;

-- Human escalations for new incidents
INSERT INTO human_escalations (incident_id, trigger_reason, failed_step, status, reason) VALUES
  ('22222222-2222-2222-2222-222222222224', 'ai_low_confidence', 'validate', 'pending_assignment', 'AI confidence 88% below 90% auto-deploy threshold for Redis fix.'),
  ('22222222-2222-2222-2222-222222222228', 'no_engineer_available', 'triage', 'pending_assignment', 'No L2+ engineers currently on call for P1 incident.')
ON CONFLICT DO NOTHING;

-- Communications
INSERT INTO communications_log (customer_id, type, channel, entity_type, entity_id, subject, delivery_status) VALUES
  ('11111111-1111-1111-1111-111111111114', 'incident_created', 'email', 'incident', '22222222-2222-2222-2222-222222222223', '[UptimeOps] Incident Detected', 'delivered'),
  ('11111111-1111-1111-1111-111111111114', 'incident_created', 'sms', 'incident', '22222222-2222-2222-2222-222222222223', 'UptimeOps: Incident on techflow.io', 'delivered'),
  ('11111111-1111-1111-1111-111111111114', 'incident_resolved', 'email', 'incident', '22222222-2222-2222-2222-222222222223', '[UptimeOps] Resolved — techflow.io', 'delivered')
ON CONFLICT DO NOTHING;

-- Notifications
INSERT INTO notifications (customer_id, type, message, entity_type, entity_id) VALUES
  ('11111111-1111-1111-1111-111111111111', 'incident_update', 'New incident detected on acme-corp.com. AI is investigating.', 'incident', '22222222-2222-2222-2222-222222222221'),
  ('11111111-1111-1111-1111-111111111114', 'incident_resolved', 'Your incident on techflow.io has been resolved. Please verify.', 'incident', '22222222-2222-2222-2222-222222222223')
ON CONFLICT DO NOTHING;

-- Temporary links
INSERT INTO temporary_links (token_hash, entity_type, entity_id, customer_id, expires_at, access_count, status) VALUES
  ('a1b2c3d4e5f6789012345678901234567890abcd1234ef5678901234567890ab', 'incident', '22222222-2222-2222-2222-222222222223', '11111111-1111-1111-1111-111111111114', now() + interval '72 hours', 3, 'active'),
  ('b2c3d4e5f6789012345678901234567890abcd1234ef5678901234567890abc1', 'one_time_fix', (SELECT id FROM one_time_fixes WHERE website_url = 'nexustrack.com' LIMIT 1), '11111111-1111-1111-1111-111111111117', now() - interval '1 hour', 12, 'expired')
ON CONFLICT DO NOTHING;

-- VM sessions
INSERT INTO vm_sessions (id, incident_id, provider_vm_id, ip_address, status) VALUES
  ('55555555-5555-5555-5555-555555555551', '22222222-2222-2222-2222-222222222221', 'vm-7f3a9e2d', '203.0.113.47', 'running'),
  ('55555555-5555-5555-5555-555555555552', '22222222-2222-2222-2222-222222222224', 'vm-8b4c1f3a', '203.0.113.48', 'running')
ON CONFLICT DO NOTHING;

-- VM commands
INSERT INTO vm_commands (vm_session_id, command, status, output, exit_code) VALUES
  ('55555555-5555-5555-5555-555555555551', 'psql -c "SELECT count(*) FROM pg_stat_activity;"', 'completed', ' active_connections: 47/100', 0),
  ('55555555-5555-5555-5555-555555555551', 'cat /var/log/postgresql/postgresql-14.log | tail -50', 'completed', ' FATAL: sorry, too many clients already', 1),
  ('55555555-5555-5555-5555-555555555552', 'redis-cli INFO memory', 'completed', ' used_memory_human: 1.92G\n maxmemory_human: 2.00G', 0)
ON CONFLICT DO NOTHING;

-- Smoke tests
INSERT INTO smoke_tests (vm_session_id, incident_id, pipeline_id, results, overall_passed) VALUES
  ('55555555-5555-5555-5555-555555555551', '22222222-2222-2222-2222-222222222221', 'pl-2024-001-abc',
   '[{"test": "homepage_load", "passed": true, "duration_ms": 234}, {"test": "api_health", "passed": true, "duration_ms": 89}, {"test": "ssl_valid", "passed": true, "duration_ms": 12}]'::jsonb,
   true),
  ('55555555-5555-5555-5555-555555555552', '22222222-2222-2222-2222-222222222224', 'pl-2024-002-def',
   '[{"test": "redis_ping", "passed": false, "duration_ms": 5001, "error": "Connection timeout"}]'::jsonb,
   false)
ON CONFLICT DO NOTHING;

-- Deployment snapshots
INSERT INTO deployment_snapshots (incident_id, vm_session_id, status, metadata) VALUES
  ('22222222-2222-2222-2222-222222222221', '55555555-5555-5555-5555-555555555551', 'used',
   '{"snapshot_time": "2024-01-15T09:23:00Z", "nginx_config_sha": "a1b2c3d4", "pre_deploy_checks": "all_passed"}'::jsonb)
ON CONFLICT DO NOTHING;

-- Churn events
INSERT INTO churn_events (stripe_subscription_id, customer_id, reason) VALUES
  ('sub_churned_001', '11111111-1111-1111-1111-111111111118', 'price_too_high')
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════
-- VALIDATION: Verify schema integrity
-- ═══════════════════════════════════════════
SELECT
  'UPTIMEOPS SCHEMA COMPLETE' as status,
  (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE') as table_count,
  (SELECT count(*) FROM pg_policies WHERE schemaname = 'public') as policy_count,
  (SELECT count(*) FROM information_schema.triggers WHERE trigger_schema = 'public') as trigger_count,
  (SELECT count(*) FROM pg_indexes WHERE schemaname = 'public') as index_count,
  (SELECT count(*) FROM cron.job) as cron_job_count;
