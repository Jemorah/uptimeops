// ═══════════════════════════════════════════════════════════════
// AUTH CONTEXT — UptimeOps v2.1
// Fixed: detectSessionInUrl=false, onAuthStateChange filters events,
// guards against session-clearing race conditions.
// ═══════════════════════════════════════════════════════════════

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { User, AuthError } from '@supabase/supabase-js';
import { supabase, isAdminEmail } from '@/lib/supabase/client';
import type { UserRole } from '@/lib/supabase/client';

interface AuthContextType {
  user: User | null;
  role: UserRole;
  loading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null; role?: UserRole }>;
  signUp: (email: string, password: string, metadata?: { full_name?: string }) => Promise<{ error: AuthError | null; role?: UserRole }>;
  signInWithOAuth: (provider: 'google' | 'github') => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<{ error: AuthError | null }>;
}

function resolveRole(user: User | null): UserRole {
  if (!user) return 'public';
  if (isAdminEmail(user.email)) return 'admin';
  return 'customer';
}

const AuthContext = createContext<AuthContextType>({
  user: null, role: 'public', loading: true, isAuthenticated: false,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signInWithOAuth: async () => ({ error: null }),
  signOut: async () => {},
  sendPasswordReset: async () => ({ error: null }),
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>('public');
  const [loading, setLoading] = useState(true);
  // Guard: prevents onAuthStateChange from clearing a valid session
  // during the initial sign-in race window.
  const isSigningInRef = useRef(false);

  // ── Initial session check on mount ──
  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (session?.user) {
        setUser(session.user);
        setRole(resolveRole(session.user));
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      const u = session?.user ?? null;

      switch (event) {
        case 'SIGNED_IN':
          // Sign-in complete — set user and clear guard
          isSigningInRef.current = false;
          setUser(u);
          setRole(resolveRole(u));
          setLoading(false);
          break;

        case 'TOKEN_REFRESHED':
          // Token refreshed — update user if present
          if (u) {
            setUser(u);
            setRole(resolveRole(u));
          }
          break;

        case 'USER_UPDATED':
          // User metadata updated
          if (u) {
            setUser(u);
            setRole(resolveRole(u));
          }
          break;

        case 'SIGNED_OUT':
          // Only clear if we're not in the middle of signing in
          // (prevents race where SIGNED_OUT fires immediately after SIGNED_IN)
          if (!isSigningInRef.current) {
            setUser(null);
            setRole('public');
            setLoading(false);
          }
          break;

        case 'INITIAL_SESSION':
          // Only set if we have a user — NEVER clear an existing session.
          // With detectSessionInUrl=false, this fires once on init with
          // whatever is in localStorage. If it's null, we keep whatever
          // state we already have (from getSession above).
          if (u) {
            setUser(u);
            setRole(resolveRole(u));
          }
          setLoading(false);
          break;

        // Ignore PASSWORD_RECOVERY, MFA_CHALLENGE_VERIFIED, etc.
        default:
          break;
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    isSigningInRef.current = true;
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        isSigningInRef.current = false;
        setLoading(false);
        const msg = error.message.includes('Invalid login')
          ? 'Invalid email or password'
          : error.message;
        return { error: { ...error, message: msg } as AuthError };
      }

      if (!data.session?.user) {
        isSigningInRef.current = false;
        setLoading(false);
        return { error: { message: 'No session', name: 'AuthError', status: 400 } as AuthError };
      }

      const r = resolveRole(data.session.user);
      setUser(data.session.user);
      setRole(r);
      setLoading(false);
      // Guard stays true — onAuthStateChange SIGNED_IN will clear it
      return { error: null, role: r };
    } catch (err: any) {
      isSigningInRef.current = false;
      setLoading(false);
      return { error: { message: err?.message || 'Sign in failed', name: 'AuthError', status: 500 } as AuthError };
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, metadata?: { full_name?: string }) => {
    isSigningInRef.current = true;
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: metadata, emailRedirectTo: window.location.origin + '/#/login' },
    });
    if (error) {
      isSigningInRef.current = false;
      return { error };
    }
    if (data.session?.user) {
      const r = resolveRole(data.session.user);
      setUser(data.session.user);
      setRole(r);
      setLoading(false);
      return { error: null, role: r };
    }
    isSigningInRef.current = false;
    return { error: null };
  }, []);

  const signInWithOAuth = useCallback(async (provider: 'google' | 'github') => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin + '/#/auth/callback' },
    });
    if (error) return { error: { ...error, message: error.message || `${provider} not enabled` } as AuthError };
    if (data?.url) window.location.href = data.url;
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole('public');
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/#/reset-password',
    });
    return { error };
  }, []);

  return (
    <AuthContext.Provider value={{
      user, role, loading,
      isAuthenticated: !!user,
      signIn, signUp, signInWithOAuth, signOut, sendPasswordReset
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
