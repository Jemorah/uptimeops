-- ═══════════════════════════════════════════════════════════════
-- UPTIMEOPS STORAGE BUCKET RLS POLICIES
-- Secures file uploads (session recordings, audit evidence)
-- Paste into Supabase SQL Editor → Click Run
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════
-- ENABLE RLS ON STORAGE OBJECTS
-- ═══════════════════════════════════════════
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════
-- POLICY: session-recordings bucket
-- Engineers and coordinators can read/write
-- ═══════════════════════════════════════════
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'session_recordings_read' AND tablename = 'objects' AND schemaname = 'storage'
  ) THEN
    CREATE POLICY session_recordings_read ON storage.objects
      FOR SELECT USING (bucket_id = 'session-recordings');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'session_recordings_insert' AND tablename = 'objects' AND schemaname = 'storage'
  ) THEN
    CREATE POLICY session_recordings_insert ON storage.objects
      FOR INSERT WITH CHECK (bucket_id = 'session-recordings');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'session_recordings_delete' AND tablename = 'objects' AND schemaname = 'storage'
  ) THEN
    CREATE POLICY session_recordings_delete ON storage.objects
      FOR DELETE USING (bucket_id = 'session-recordings');
  END IF;
END $$;

-- ═══════════════════════════════════════════
-- POLICY: audit-evidence bucket
-- Engineers and coordinators can read/write
-- ═══════════════════════════════════════════
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'audit_evidence_read' AND tablename = 'objects' AND schemaname = 'storage'
  ) THEN
    CREATE POLICY audit_evidence_read ON storage.objects
      FOR SELECT USING (bucket_id = 'audit-evidence');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'audit_evidence_insert' AND tablename = 'objects' AND schemaname = 'storage'
  ) THEN
    CREATE POLICY audit_evidence_insert ON storage.objects
      FOR INSERT WITH CHECK (bucket_id = 'audit-evidence');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'audit_evidence_delete' AND tablename = 'objects' AND schemaname = 'storage'
  ) THEN
    CREATE POLICY audit_evidence_delete ON storage.objects
      FOR DELETE USING (bucket_id = 'audit-evidence');
  END IF;
END $$;

-- ═══════════════════════════════════════════
-- POLICY: General — allow bucket listing
-- ═══════════════════════════════════════════
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'buckets_read' AND tablename = 'buckets' AND schemaname = 'storage'
  ) THEN
    CREATE POLICY buckets_read ON storage.buckets FOR SELECT USING (true);
  END IF;
END $$;

-- ═══════════════════════════════════════════
-- VERIFY
-- ═══════════════════════════════════════════
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'storage'
ORDER BY tablename, policyname;
