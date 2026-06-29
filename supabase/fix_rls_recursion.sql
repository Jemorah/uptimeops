-- ═══════════════════════════════════════════════════════════════
-- FIX: RLS infinite recursion on user_roles
-- ═══════════════════════════════════════════════════════════════
-- Problem: Admin policies on tables X check user_roles, but
-- user_roles itself has an admin policy that checks user_roles.
-- This creates infinite recursion.
-- Fix: Use SECURITY DEFINER function that bypasses RLS.
-- ═══════════════════════════════════════════════════════════════

-- 1. Create helper function that checks role with SECURITY DEFINER
-- (runs as owner, bypassing RLS recursion)
CREATE OR REPLACE FUNCTION is_admin_or_coordinator(p_uid uuid)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_uid AND role IN ('coordinator', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Drop the recursive admin policy on user_roles itself
-- (it checks user_roles within user_roles = infinite loop)
DROP POLICY IF EXISTS admin_all_user_roles ON user_roles;

-- 3. Drop all old admin policies (they have the recursive EXISTS check)
DROP POLICY IF EXISTS admin_all_customers ON customers;
DROP POLICY IF EXISTS admin_all_incidents ON incidents;
DROP POLICY IF EXISTS admin_all_engineers ON engineer_profiles;
DROP POLICY IF EXISTS admin_all_escalations ON human_escalations;
DROP POLICY IF EXISTS admin_all_subscriptions ON subscriptions;
DROP POLICY IF EXISTS admin_all_audit ON audit_logs;
DROP POLICY IF EXISTS admin_all_comms ON communications_log;
DROP POLICY IF EXISTS admin_all_opsgenie ON opsgenie_sync;
DROP POLICY IF EXISTS admin_all_oncall ON oncall_schedules;
DROP POLICY IF EXISTS admin_all_vm ON vm_sessions;
DROP POLICY IF EXISTS admin_all_credentials ON credentials_vault;
DROP POLICY IF EXISTS admin_all_scanner ON scanner_registry;
DROP POLICY IF EXISTS admin_all_audit_reports ON audit_reports;
DROP POLICY IF EXISTS admin_all_hash_chain ON audit_hash_chain;
DROP POLICY IF EXISTS churn_admin ON churn_events;
DROP POLICY IF EXISTS invitations_admin ON engineer_invitations;
DROP POLICY IF EXISTS guidelines_admin ON custom_guidelines;
DROP POLICY IF EXISTS tla_admin ON temporary_links_archive;

-- 4. Recreate admin policies using the non-recursive function
CREATE POLICY admin_all_customers ON customers FOR ALL
  USING (is_admin_or_coordinator(auth.uid()));
CREATE POLICY admin_all_incidents ON incidents FOR ALL
  USING (is_admin_or_coordinator(auth.uid()));
CREATE POLICY admin_all_engineers ON engineer_profiles FOR ALL
  USING (is_admin_or_coordinator(auth.uid()));
CREATE POLICY admin_all_escalations ON human_escalations FOR ALL
  USING (is_admin_or_coordinator(auth.uid()));
CREATE POLICY admin_all_subscriptions ON subscriptions FOR ALL
  USING (is_admin_or_coordinator(auth.uid()));
CREATE POLICY admin_all_audit ON audit_logs FOR ALL
  USING (is_admin_or_coordinator(auth.uid()));
CREATE POLICY admin_all_comms ON communications_log FOR ALL
  USING (is_admin_or_coordinator(auth.uid()));
CREATE POLICY admin_all_opsgenie ON opsgenie_sync FOR ALL
  USING (is_admin_or_coordinator(auth.uid()));
CREATE POLICY admin_all_oncall ON oncall_schedules FOR ALL
  USING (is_admin_or_coordinator(auth.uid()));
CREATE POLICY admin_all_vm ON vm_sessions FOR ALL
  USING (is_admin_or_coordinator(auth.uid()));
CREATE POLICY admin_all_credentials ON credentials_vault FOR ALL
  USING (is_admin_or_coordinator(auth.uid()));
CREATE POLICY admin_all_scanner ON scanner_registry FOR ALL
  USING (is_admin_or_coordinator(auth.uid()));
CREATE POLICY admin_all_audit_reports ON audit_reports FOR ALL
  USING (is_admin_or_coordinator(auth.uid()));
CREATE POLICY admin_all_hash_chain ON audit_hash_chain FOR ALL
  USING (is_admin_or_coordinator(auth.uid()));
CREATE POLICY churn_admin ON churn_events FOR ALL
  USING (is_admin_or_coordinator(auth.uid()));
CREATE POLICY invitations_admin ON engineer_invitations FOR ALL
  USING (is_admin_or_coordinator(auth.uid()));
CREATE POLICY guidelines_admin ON custom_guidelines FOR ALL
  USING (is_admin_or_coordinator(auth.uid()));
CREATE POLICY tla_admin ON temporary_links_archive FOR ALL
  USING (is_admin_or_coordinator(auth.uid()));

-- 5. Keep the user_roles_own policy (direct user check, not recursive)
-- and add a simple admin bypass using the function
CREATE POLICY admin_user_roles ON user_roles FOR ALL
  USING (is_admin_or_coordinator(auth.uid()));
