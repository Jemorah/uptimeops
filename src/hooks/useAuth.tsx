// ═══════════════════════════════════════════════════════════════
// AUTH CONTEXT — UptimeOps
// Single source of truth for auth state. Syncs with Supabase.
// Admin (cumouat@gmail.com) gets admin role on all portals.
// ═══════════════════════════════════════════════════════════════

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, AuthError } from '@supabase/supabase-js';
import { supabase, isAdminEmail } from '@/lib/supabase/client';
import type { UserRole } from '@/lib/supabase/client';

// ── Types ──
interface AuthState {
  user: User | null;
  role: UserRole;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null; role?: UserRole }>;
  signUp: (email: string, password: string, metadata?: { full_name?: string }) => Promise<{ error: AuthError | null; role?: UserRole }>;
  signInWithOAuth: (provider: 'google' | 'github') => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<{ error: AuthError | null }>;
}

// ── Resolve role for a user (used everywhere) ──
function resolveRole(user: User | null): UserRole {
  if (!user) return 'public';
  if (isAdminEmail(user.email)) return 'admin';
  return 'customer'; // Default for all non-admin users
}

// ── Context ──
const AuthContext = createContext<AuthContextType>({
  user: null, role: 'public', isLoading: true, isAuthenticated: false,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signInWithOAuth: async () => ({ error: null }),
  signOut: async () => {},
  sendPasswordReset: async () => ({ error: null }),
});

// ── Provider ──
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    role: 'public',
    isLoading: true,
    isAuthenticated: false,
  });

  // ── Initialize: check for existing session on mount ──
  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (!mounted) return;

        if (error) {
          console.error('[Auth] getSession error:', error.message);
          setState({ user: null, role: 'public', isLoading: false, isAuthenticated: false });
          return;
        }

        if (session?.user) {
          const role = resolveRole(session.user);
          console.log('[Auth] Session restored:', session.user.email, 'role:', role);
          setState({ user: session.user, role, isLoading: false, isAuthenticated: true });
        } else {
          console.log('[Auth] No session');
          setState({ user: null, role: 'public', isLoading: false, isAuthenticated: false });
        }
      } catch (err: any) {
        console.error('[Auth] init exception:', err?.message);
        if (mounted) {
          setState({ user: null, role: 'public', isLoading: false, isAuthenticated: false });
        }
      }
    }

    init();

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      const user = session?.user ?? null;
      const role = resolveRole(user);
      console.log('[Auth] onAuthStateChange:', event, 'email:', user?.email, 'role:', role);
      setState({ user, role, isLoading: false, isAuthenticated: !!user });
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  // ── Sign In (email/password) ──
  // State update is handled by onAuthStateChange — we just return the result
  const signIn = useCallback(async (email: string, password: string) => {
    console.log('[Auth] signIn:', email);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        const msg = error.message.includes('Invalid login credentials')
          ? 'Invalid email or password.'
          : error.message;
        return { error: { ...error, message: msg } as AuthError };
      }

      if (!data.session?.user) {
        return { error: { message: 'No session created.', name: 'AuthError', status: 400 } as AuthError };
      }

      const role = resolveRole(data.session.user);
      console.log('[Auth] Signed in:', data.session.user.email, 'role:', role);
      // onAuthStateChange will update state — don't double-set here
      return { error: null, role };
    } catch (err: any) {
      console.error('[Auth] signIn exception:', err?.message);
      return { error: { message: err?.message || 'Sign in failed.', name: 'AuthError', status: 500 } as AuthError };
    }
  }, []);

  // ── Sign Up ──
  const signUp = useCallback(async (email: string, password: string, metadata?: { full_name?: string }) => {
    console.log('[Auth] signUp:', email);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: metadata, emailRedirectTo: `${window.location.origin}/#/login` },
      });

      if (error) return { error };

      if (data.session?.user) {
        const role = resolveRole(data.session.user);
        return { error: null, role };
      }

      return { error: null }; // Email confirmation required
    } catch (err: any) {
      console.error('[Auth] signUp exception:', err?.message);
      return { error: { message: err?.message || 'Sign up failed.', name: 'AuthError', status: 500 } as AuthError };
    }
  }, []);

  // ── Sign In with OAuth ──
  const signInWithOAuth = useCallback(async (provider: 'google' | 'github') => {
    console.log('[Auth] OAuth:', provider);
    try {
      const redirectTo = `${window.location.origin}/#/auth/callback`;
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo },
      });

      if (error) {
        const msg = error.message?.includes('provider is not enabled')
          ? `${provider} login is not enabled in Supabase.`
          : error.message;
        return { error: { ...error, message: msg } as AuthError };
      }

      if (data?.url) {
        window.location.href = data.url;
      }

      return { error: null };
    } catch (err: any) {
      console.error('[Auth] OAuth exception:', err?.message);
      return { error: { message: err?.message || 'OAuth failed.', name: 'AuthError', status: 500 } as AuthError };
    }
  }, []);

  // ── Sign Out ──
  const signOut = useCallback(async () => {
    console.log('[Auth] signOut');
    await supabase.auth.signOut();
    setState({ user: null, role: 'public', isLoading: false, isAuthenticated: false });
  }, []);

  // ── Password Reset ──
  const sendPasswordReset = useCallback(async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/#/reset-password`,
      });
      return { error };
    } catch (err: any) {
      return { error: { message: err?.message, name: 'AuthError', status: 500 } as AuthError };
    }
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, signIn, signUp, signInWithOAuth, signOut, sendPasswordReset }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ──
export function useAuth() {
  return useContext(AuthContext);
}
