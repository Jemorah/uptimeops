-- ═══════════════════════════════════════════════════════════════
-- UPTIMEOPS AUTH TRIGGERS
-- Auto-creates customer record on signup, handles role assignment
-- ═══════════════════════════════════════════════════════════════

-- ============================================================
-- 1. AUTO-CREATE CUSTOMER ON AUTH SIGNUP
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user_signup()
RETURNS TRIGGER AS $$
BEGIN
  -- Create customer record from auth user data
  INSERT INTO customers (
    id,
    email,
    full_name,
    subscription_status,
    subscription_tier,
    lead_source,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    'none',
    'none',
    COALESCE(NEW.raw_user_meta_data->>'lead_source', 'auth_signup'),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  -- Log the signup
  INSERT INTO audit_logs (
    entity_type,
    entity_id,
    action,
    performed_by,
    performed_by_type,
    metadata
  )
  VALUES (
    'customer',
    NEW.id,
    'customer_created_from_auth',
    NEW.id,
    'customer',
    jsonb_build_object(
      'email', NEW.email,
      'auth_provider', COALESCE(NEW.raw_app_meta_data->>'provider', 'email'),
      'lead_source', COALESCE(NEW.raw_user_meta_data->>'lead_source', 'auth_signup')
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to auth.users
DO $$ BEGIN
  CREATE TRIGGER tr_auth_user_signup
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user_signup();
EXCEPTION WHEN duplicate_object THEN
  -- Drop and recreate to ensure latest version
  DROP TRIGGER tr_auth_user_signup ON auth.users;
  CREATE TRIGGER tr_auth_user_signup
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user_signup();
END $$;

-- ============================================================
-- 2. SYNC CUSTOMER EMAIL ON AUTH EMAIL CHANGE
-- ============================================================

CREATE OR REPLACE FUNCTION handle_auth_email_change()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE customers
  SET email = NEW.email,
      updated_at = NOW()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$ BEGIN
  CREATE TRIGGER tr_auth_email_change
    AFTER UPDATE OF email ON auth.users
    FOR EACH ROW
    WHEN (OLD.email IS DISTINCT FROM NEW.email)
    EXECUTE FUNCTION handle_auth_email_change();
EXCEPTION WHEN duplicate_object THEN
  DROP TRIGGER tr_auth_email_change ON auth.users;
  CREATE TRIGGER tr_auth_email_change
    AFTER UPDATE OF email ON auth.users
    FOR EACH ROW
    WHEN (OLD.email IS DISTINCT FROM NEW.email)
    EXECUTE FUNCTION handle_auth_email_change();
END $$;

-- ============================================================
-- 3. ROLE DETECTION FUNCTION
-- Used by the frontend to determine user role
-- ============================================================

CREATE OR REPLACE FUNCTION get_user_role(p_user_id uuid)
RETURNS text AS $$
DECLARE
  v_role text;
BEGIN
  -- Check coordinator first (highest privilege)
  SELECT 'coordinator'::text INTO v_role
  FROM coordinators
  WHERE user_id = p_user_id
  LIMIT 1;

  IF v_role IS NOT NULL THEN
    RETURN v_role;
  END IF;

  -- Check engineer
  SELECT 'engineer'::text INTO v_role
  FROM engineers
  WHERE id = p_user_id
  LIMIT 1;

  IF v_role IS NOT NULL THEN
    RETURN v_role;
  END IF;

  -- Default to customer
  RETURN 'customer';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 4. GET USER WITH ROLE (helper for auth hook)
-- ============================================================

CREATE OR REPLACE FUNCTION get_user_with_role(p_user_id uuid)
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text,
  role text,
  subscription_status customer_subscription_status,
  subscription_tier subscription_tier,
  customer_id uuid
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    au.id,
    au.email,
    COALESCE(c.full_name, split_part(au.email, '@', 1)),
    get_user_role(au.id),
    COALESCE(c.subscription_status, 'none'::customer_subscription_status),
    COALESCE(c.subscription_tier, 'none'::subscription_tier),
    c.id
  FROM auth.users au
  LEFT JOIN customers c ON c.id = au.id
  WHERE au.id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 5. CLEANUP ON USER DELETE
-- ============================================================

CREATE OR REPLACE FUNCTION handle_user_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Soft-delete: mark customer as cancelled
  UPDATE customers
  SET subscription_status = 'cancelled',
      updated_at = NOW()
  WHERE id = OLD.id;

  -- Log deletion
  INSERT INTO audit_logs (entity_type, entity_id, action, performed_by_type, metadata)
  VALUES ('customer', OLD.id, 'customer_deleted', 'system', '{}'::jsonb);

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$ BEGIN
  CREATE TRIGGER tr_auth_user_delete
    BEFORE DELETE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_user_delete();
EXCEPTION WHEN duplicate_object THEN
  DROP TRIGGER tr_auth_user_delete ON auth.users;
  CREATE TRIGGER tr_auth_user_delete
    BEFORE DELETE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_user_delete();
END $$;

-- ============================================================
-- 6. PASSWORD RESET TOKEN CLEANUP
-- Auto-expire password reset tokens after 1 hour
-- ============================================================

CREATE OR REPLACE FUNCTION cleanup_expired_password_resets()
RETURNS void AS $$
BEGIN
  -- Supabase handles this natively, but we log it
  INSERT INTO audit_logs (entity_type, entity_id, action, performed_by_type, metadata)
  VALUES (
    'customer',
    '00000000-0000-0000-0000-000000000000'::uuid,
    'password_reset_cleanup',
    'system',
    jsonb_build_object('message', 'Expired reset tokens cleaned by Supabase')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 7. MAGIC LINK USAGE TRACKING
-- Track when magic links are consumed
-- ============================================================

CREATE OR REPLACE FUNCTION handle_magic_link_used()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (entity_type, entity_id, action, performed_by_type, metadata)
  VALUES (
    'customer',
    NEW.id,
    'magic_link_login',
    'customer',
    jsonb_build_object(
      'email', NEW.email,
      'last_sign_in', NEW.last_sign_in_at
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$ BEGIN
  CREATE TRIGGER tr_magic_link_used
    AFTER UPDATE OF last_sign_in_at ON auth.users
    FOR EACH ROW
    WHEN (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at)
    EXECUTE FUNCTION handle_magic_link_used();
EXCEPTION WHEN duplicate_object THEN
  DROP TRIGGER tr_magic_link_used ON auth.users;
  CREATE TRIGGER tr_magic_link_used
    AFTER UPDATE OF last_sign_in_at ON auth.users
    FOR EACH ROW
    WHEN (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at)
    EXECUTE FUNCTION handle_magic_link_used();
END $$;

-- ============================================================
-- 8. COORDINATOR PROMOTION FUNCTION
-- Promote a customer to coordinator
-- ============================================================

CREATE OR REPLACE FUNCTION promote_to_coordinator(
  p_user_id uuid,
  p_role coordinator_role DEFAULT 'coordinator'
)
RETURNS boolean AS $$
BEGIN
  -- Create coordinator record
  INSERT INTO coordinators (user_id, email, full_name, role)
  SELECT
    au.id,
    au.email,
    COALESCE(c.full_name, split_part(au.email, '@', 1)),
    p_role
  FROM auth.users au
  LEFT JOIN customers c ON c.id = au.id
  WHERE au.id = p_user_id
  ON CONFLICT (user_id) DO NOTHING;

  -- Log promotion
  INSERT INTO audit_logs (entity_type, entity_id, action, performed_by_type, metadata)
  VALUES (
    'customer',
    p_user_id,
    'promoted_to_' || p_role::text,
    'coordinator',
    jsonb_build_object('new_role', p_role)
  );

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 9. SETUP COORDINATOR HELPER
-- Run this to set your first coordinator after signing up
-- Example: SELECT make_me_coordinator('your-auth-user-id-uuid');
-- ============================================================

CREATE OR REPLACE FUNCTION make_me_coordinator(p_user_id uuid)
RETURNS text AS $$
DECLARE
  v_email text;
  v_name text;
BEGIN
  SELECT email, COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1))
  INTO v_email, v_name
  FROM auth.users WHERE id = p_user_id;

  INSERT INTO coordinators (user_id, email, full_name, role, permissions)
  VALUES (p_user_id, v_email, v_name, 'super_admin', '{"all": true}'::jsonb)
  ON CONFLICT (user_id) DO UPDATE
  SET role = 'super_admin',
      permissions = '{"all": true}'::jsonb,
      updated_at = NOW();

  RETURN 'User ' || v_email || ' is now super_admin coordinator';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
