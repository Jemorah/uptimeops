-- ═══════════════════════════════════════════════════════════════
-- UPTIMEOPS STORAGE BUCKET RLS POLICIES
-- If this fails with "must be owner of table objects",
-- set policies via Supabase Dashboard → Storage → Policies instead.
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════
-- OPTION A: Try direct SQL (may fail on some plans)
-- ═══════════════════════════════════════════

-- Enable RLS on storage.objects
DO $$
BEGIN
  ALTER TABLE IF EXISTS storage.objects ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'Cannot enable RLS via SQL. Use Dashboard → Storage → Policies instead.';
END $$;

-- session-recordings bucket policies
DO $$
BEGIN
  CREATE POLICY "session_recordings_read" ON storage.objects
    FOR SELECT USING (bucket_id = 'session-recordings');
EXCEPTION WHEN duplicate_object THEN NULL;
          WHEN insufficient_privilege THEN RAISE NOTICE 'Skipping session_recordings_read: insufficient privilege';
END $$;

DO $$
BEGIN
  CREATE POLICY "session_recordings_insert" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'session-recordings');
EXCEPTION WHEN duplicate_object THEN NULL;
          WHEN insufficient_privilege THEN RAISE NOTICE 'Skipping session_recordings_insert: insufficient privilege';
END $$;

DO $$
BEGIN
  CREATE POLICY "session_recordings_delete" ON storage.objects
    FOR DELETE USING (bucket_id = 'session-recordings');
EXCEPTION WHEN duplicate_object THEN NULL;
          WHEN insufficient_privilege THEN RAISE NOTICE 'Skipping session_recordings_delete: insufficient privilege';
END $$;

-- audit-evidence bucket policies
DO $$
BEGIN
  CREATE POLICY "audit_evidence_read" ON storage.objects
    FOR SELECT USING (bucket_id = 'audit-evidence');
EXCEPTION WHEN duplicate_object THEN NULL;
          WHEN insufficient_privilege THEN RAISE NOTICE 'Skipping audit_evidence_read: insufficient privilege';
END $$;

DO $$
BEGIN
  CREATE POLICY "audit_evidence_insert" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'audit-evidence');
EXCEPTION WHEN duplicate_object THEN NULL;
          WHEN insufficient_privilege THEN RAISE NOTICE 'Skipping audit_evidence_insert: insufficient privilege';
END $$;

DO $$
BEGIN
  CREATE POLICY "audit_evidence_delete" ON storage.objects
    FOR DELETE USING (bucket_id = 'audit-evidence');
EXCEPTION WHEN duplicate_object THEN NULL;
          WHEN insufficient_privilege THEN RAISE NOTICE 'Skipping audit_evidence_delete: insufficient privilege';
END $$;

-- buckets listing
DO $$
BEGIN
  CREATE POLICY "buckets_read" ON storage.buckets
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
          WHEN insufficient_privilege THEN RAISE NOTICE 'Skipping buckets_read: insufficient privilege';
END $$;

-- ═══════════════════════════════════════════
-- OPTION B: Manual setup via Dashboard
-- If SQL above fails, do this instead:
--
-- 1. Supabase Dashboard → Storage
-- 2. Click "Policies" tab
-- 3. For bucket "session-recordings", add:
--    - SELECT: bucket_id = 'session-recordings'
--    - INSERT: bucket_id = 'session-recordings'
--    - DELETE: bucket_id = 'session-recordings'
-- 4. For bucket "audit-evidence", add:
--    - SELECT: bucket_id = 'audit-evidence'
--    - INSERT: bucket_id = 'audit-evidence'
--    - DELETE: bucket_id = 'audit-evidence'
-- ═══════════════════════════════════════════

-- Verify what we have
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'storage'
ORDER BY tablename, policyname;
