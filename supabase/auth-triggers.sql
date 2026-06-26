-- ═══════════════════════════════════════════════════════════════
-- UPTIMEOPS AUTH TRIGGERS
-- Auto-assigns roles when users sign up via Supabase Auth
-- Paste into Supabase SQL Editor → Click Run
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════
-- TRIGGER: Auto-assign role on signup
-- ═══════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_role user_role := 'customer';
BEGIN
  -- Insert user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, default_role)
  ON CONFLICT (user_id) DO NOTHING;

  -- Create customer profile for new users (not engineers/coordinators)
  IF NOT EXISTS (
    SELECT 1 FROM public.customers WHERE user_id = NEW.id
  ) AND NEW.email IS NOT NULL THEN
    INSERT INTO public.customers (user_id, email, full_name, status, plan)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', 'active', 'guardian')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to auth.users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

-- ═══════════════════════════════════════════
-- HELPER: Set user role (admin only)
-- ═══════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.set_user_role(target_user_id uuid, new_role user_role)
RETURNS boolean AS $$
BEGIN
  -- Verify caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can set roles';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, new_role)
  ON CONFLICT (user_id) DO UPDATE SET role = new_role;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
