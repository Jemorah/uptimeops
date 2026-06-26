-- ═══════════════════════════════════════════════════════════════
-- UPTIMEOPS REALTIME SETUP
-- Enable live database subscriptions for dashboard updates
-- Paste into Supabase SQL Editor → Click Run
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════
-- REALTIME: Enable for key tables
-- ═══════════════════════════════════════════

DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'incidents',
    'human_escalations',
    'pipeline_states',
    'notifications',
    'vm_sessions',
    'audit_logs',
    'communications_log'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables
  LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', tbl);
      RAISE NOTICE 'Realtime enabled for: %', tbl;
    EXCEPTION
      WHEN duplicate_object THEN
        RAISE NOTICE 'Already in realtime: %', tbl;
      WHEN OTHERS THEN
        RAISE NOTICE 'Skipping realtime for %: %', tbl, SQLERRM;
    END;
  END LOOP;
END $$;

-- Verify
SELECT tablename FROM pg_tables WHERE schemaname = 'pg_catalog' AND tablename LIKE '%realtime%';
