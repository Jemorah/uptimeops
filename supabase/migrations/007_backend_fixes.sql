-- ═══════════════════════════════════════════════════════════════
-- 5TH AUDIT BACKEND FIXES — UptimeOps v2.1
-- Addresses: missing indexes, extensions, storage buckets, realtime
-- ═══════════════════════════════════════════════════════════════

BEGIN;

-- ═══════════════════════════════════════════════════════════════
-- 1. CRITICAL EXTENSIONS
-- ═══════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- pgcrypto provides gen_random_uuid() used in all PRIMARY KEY DEFAULTs

-- ═══════════════════════════════════════════════════════════════
-- 2. MISSING INDEXES (8 tables had zero indexes)
-- ═══════════════════════════════════════════════════════════════

-- coordinator_profiles
CREATE INDEX IF NOT EXISTS idx_coordinator_user ON coordinator_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_coordinator_email ON coordinator_profiles(email);

-- custom_guidelines
CREATE INDEX IF NOT EXISTS idx_guidelines_customer ON custom_guidelines(customer_id);
CREATE INDEX IF NOT EXISTS idx_guidelines_severity ON custom_guidelines(severity);

-- engineer_invitations
CREATE INDEX IF NOT EXISTS idx_invitations_email ON engineer_invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON engineer_invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON engineer_invitations(token);

-- opsgenie_sync
CREATE INDEX IF NOT EXISTS idx_opsgenie_engineer ON opsgenie_sync(engineer_id);
CREATE INDEX IF NOT EXISTS idx_opsgenie_status ON opsgenie_sync(sync_status);

-- projects
CREATE INDEX IF NOT EXISTS idx_projects_customer ON projects(customer_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

-- repair_patches
CREATE INDEX IF NOT EXISTS idx_repair_incident ON repair_patches(incident_id);
CREATE INDEX IF NOT EXISTS idx_repair_pipeline ON repair_patches(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_repair_status ON repair_patches(status);

-- scanner_registry
CREATE INDEX IF NOT EXISTS idx_scanner_name ON scanner_registry(name);
CREATE INDEX IF NOT EXISTS idx_scanner_category ON scanner_registry(category);
CREATE INDEX IF NOT EXISTS idx_scanner_active ON scanner_registry(is_active);

-- temporary_links_archive
CREATE INDEX IF NOT EXISTS idx_tla_customer ON temporary_links_archive(customer_id);
CREATE INDEX IF NOT EXISTS idx_tla_archived ON temporary_links_archive(archived_at);

-- ═══════════════════════════════════════════════════════════════
-- 3. STORAGE BUCKET CREATION + RLS POLICIES
-- ═══════════════════════════════════════════════════════════════

-- Insert buckets (will silently fail if already exist)
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('session-recordings', 'session-recordings', false),
  ('audit-evidence', 'audit-evidence', false)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DO $$ BEGIN
  DROP POLICY IF EXISTS session_recordings_read ON storage.objects;
  DROP POLICY IF EXISTS session_recordings_insert ON storage.objects;
  DROP POLICY IF EXISTS session_recordings_delete ON storage.objects;
  DROP POLICY IF EXISTS audit_evidence_read ON storage.objects;
  DROP POLICY IF EXISTS audit_evidence_insert ON storage.objects;
  DROP POLICY IF EXISTS audit_evidence_delete ON storage.objects;
  DROP POLICY IF EXISTS buckets_read ON storage.buckets;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Session recordings bucket policies
CREATE POLICY "session_recordings_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'session-recordings');

CREATE POLICY "session_recordings_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'session-recordings');

CREATE POLICY "session_recordings_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'session-recordings');

-- Audit evidence bucket policies
CREATE POLICY "audit_evidence_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'audit-evidence');

CREATE POLICY "audit_evidence_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'audit-evidence');

CREATE POLICY "audit_evidence_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'audit-evidence');

-- Allow reading bucket list
CREATE POLICY "buckets_read" ON storage.buckets
  FOR SELECT USING (true);

-- ═══════════════════════════════════════════════════════════════
-- 4. REALTIME CONFIGURATION
-- Enable realtime for key tables that frontend subscribes to
-- ═══════════════════════════════════════════════════════════════

-- Ensure supabase_realtime publication exists
DO $$ BEGIN
  CREATE PUBLICATION supabase_realtime;
EXCEPTION WHEN duplicate_object THEN
  -- Publication already exists, that's fine
  NULL;
END $$;

-- Add tables to realtime publication
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE incidents;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE pipeline_states;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE scan_results;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE human_escalations;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE engineer_profiles;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE subscriptions;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE customers;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE audit_hash_chain;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE audit_logs;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE communications_log;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE credentials_vault;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE vm_sessions;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE vm_commands;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE repair_patches;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE audit_reports;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 5. DATABASE ROLES
-- Ensure anon and authenticated roles have proper access
-- ═══════════════════════════════════════════════════════════════

-- Grant schema usage
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant table access (RLS policies handle row-level filtering)
DO $$
DECLARE
  tbl RECORD;
BEGIN
  FOR tbl IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', tbl.tablename);
    EXECUTE format('GRANT SELECT ON public.%I TO anon', tbl.tablename);
  END LOOP;
END $$;

-- Grant sequence access for authenticated users
DO $$
DECLARE
  seq RECORD;
BEGIN
  FOR seq IN
    SELECT sequencename FROM pg_sequences WHERE schemaname = 'public'
  LOOP
    EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE public.%I TO authenticated', seq.sequencename);
  END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 6. ANALYZE TABLES (update statistics for query planner)
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
