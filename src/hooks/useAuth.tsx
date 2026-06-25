import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { supabase, type Customer, type UserRole } from '@/lib/supabase/client';
import type { User, AuthError, Provider } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  profile: Customer | null;
  role: UserRole;
  isLoading: boolean;
  isAuthenticated: boolean;
  // Email + Password
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: AuthError | null; data: any }>;
  // Magic Link (OTP)
  sendMagicLink: (email: string) => Promise<{ error: AuthError | null }>;
  verifyOtp: (email: string, token: string) => Promise<{ error: AuthError | null }>;
  // OAuth
  signInWithOAuth: (provider: Provider) => Promise<{ error: AuthError | null; url: string | null }>;
  // Password Reset
  sendPasswordReset: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (password: string) => Promise<{ error: AuthError | null }>;
  // Session
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  role: 'public',
  isLoading: true,
  isAuthenticated: false,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null, data: null }),
  sendMagicLink: async () => ({ error: null }),
  verifyOtp: async () => ({ error: null }),
  signInWithOAuth: async () => ({ error: null, url: null }),
  sendPasswordReset: async () => ({ error: null }),
  updatePassword: async () => ({ error: null }),
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Customer | null>(null);
  const [role, setRole] = useState<UserRole>('public');
  const [isLoading, setIsLoading] = useState(true);

  // ── Role Detection ──
  const determineRole = useCallback(async (authUser: User): Promise<UserRole> => {
    // Priority: coordinator > engineer > customer > public
    const { data: coord } = await supabase
      .from('coordinators')
      .select('id')
      .eq('user_id', authUser.id)
      .maybeSingle();
    if (coord) return 'coordinator';

    const { data: eng } = await supabase
      .from('engineers')
      .select('id')
      .eq('email', authUser.email)
      .maybeSingle();
    if (eng) return 'engineer';

    // Check if customer exists
    const { data: cust } = await supabase
      .from('customers')
      .select('id')
      .eq('id', authUser.id)
      .maybeSingle();
    if (cust) return 'customer';

    // User authenticated but no customer record yet (trigger may still be running)
    return 'customer';
  }, []);

  // ── Profile Loading ──
  const fetchProfile = useCallback(async (authUser: User) => {
    const detectedRole = await determineRole(authUser);
    setRole(detectedRole);

    // Load customer profile for all authenticated users
    const { data: customer } = await supabase
      .from('customers')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();

    if (customer) {
      setProfile(customer as Customer);
    } else {
      // Fallback: create minimal profile from auth data
      setProfile({
        id: authUser.id,
        email: authUser.email || '',
        full_name: authUser.user_metadata?.full_name || null,
        company_name: null,
        phone: null,
        created_at: authUser.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        subscription_status: 'none',
        subscription_tier: 'none',
        stripe_customer_id: null,
        marketing_consent: false,
        lead_source: 'auth_signup',
      });
    }
  }, [determineRole]);

  // ── Session Initialization ──
  useEffect(() => {
    let mounted = true;

    // Check for existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user).then(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user);
        } else {
          setProfile(null);
          setRole('public');
        }
        setIsLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  // ── Auth Methods ──

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          lead_source: 'dashboard_signup',
        },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });
    return { error, data };
  }, []);

  const sendMagicLink = useCallback(async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { error };
  }, []);

  const verifyOtp = useCallback(async (email: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });
    return { error };
  }, []);

  const signInWithOAuth = useCallback(async (provider: Provider) => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { error, url: data?.url };
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setRole('public');
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user);
    }
  }, [user, fetchProfile]);

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        isLoading,
        isAuthenticated,
        signIn,
        signUp,
        sendMagicLink,
        verifyOtp,
        signInWithOAuth,
        sendPasswordReset,
        updatePassword,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

// ── Route Guard Hook ──
export function useRequireAuth(allowedRoles?: UserRole[]) {
  const { isAuthenticated, role, isLoading } = useAuth();
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      setAuthorized(false);
      setChecking(false);
      return;
    }

    if (allowedRoles && !allowedRoles.includes(role)) {
      setAuthorized(false);
      setChecking(false);
      return;
    }

    setAuthorized(true);
    setChecking(false);
  }, [isAuthenticated, role, isLoading, allowedRoles]);

  return { authorized, checking };
}

// ── Role-based redirect path ──
export function getRoleRedirectPath(role: UserRole, subscriptionStatus?: string): string {
  switch (role) {
    case 'coordinator':
      return '/hq';
    case 'engineer':
      return '/engineer';
    case 'customer':
      if (subscriptionStatus === 'none' || subscriptionStatus === 'cancelled') {
        return '/pricing';
      }
      return '/customer';
    default:
      return '/';
  }
}
