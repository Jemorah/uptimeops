// ═══════════════════════════════════════════════════════════════
// AUTH CONTEXT — UptimeOps
// One global entry point for login. Redirects based on role after auth.
// Admin (cumouat@gmail.com) gets admin role on all portals.
// ═══════════════════════════════════════════════════════════════

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, AuthError } from '@supabase/supabase-js';
import { supabase, getPortalPathForRole, isAdminEmail } from '@/lib/supabase/client';
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

  // ── Initialize: check for existing session ──
  useEffect(() => {
    let cancelled = false;

    async function init() {
      console.log('[Auth] init() — checking session...');
      const { data: { session }, error } = await supabase.auth.getSession();
      if (cancelled) return;

      if (error) {
        console.error('[Auth] getSession error:', error.message);
        setState({ user: null, role: 'public', isLoading: false, isAuthenticated: false });
        return;
      }

      if (session?.user) {
        const user = session.user;
        const role = resolveRole(user);
        console.log('[Auth] Session restored:', user.email, 'role:', role);
        setState({ user, role, isLoading: false, isAuthenticated: true });
      } else {
        console.log('[Auth] No existing session');
        setState({ user: null, role: 'public', isLoading: false, isAuthenticated: false });
      }
    }

    init();

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      const user = session?.user ?? null;
      if (user) {
        const role = resolveRole(user);
        console.log('[Auth] State change:', _event, user.email, 'role:', role);
        setState({ user, role, isLoading: false, isAuthenticated: true });
      } else {
        console.log('[Auth] State change: signed out');
        setState({ user: null, role: 'public', isLoading: false, isAuthenticated: false });
      }
    });

    return () => { cancelled = true; subscription.unsubscribe(); };
  }, []);

  // ── Sign In (email/password) ──
  const signIn = useCallback(async (email: string, password: string) => {
    console.log('[Auth] signIn:', email);
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
    // State update is handled by onAuthStateChange, but we also set it here for immediate availability
    setState({ user: data.session.user, role, isLoading: false, isAuthenticated: true });
    return { error: null, role };
  }, []);

  // ── Sign Up ──
  const signUp = useCallback(async (email: string, password: string, metadata?: { full_name?: string }) => {
    console.log('[Auth] signUp:', email);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata, emailRedirectTo: `${window.location.origin}/#/login` },
    });

    if (error) return { error };

    if (data.session?.user) {
      const role = resolveRole(data.session.user);
      setState({ user: data.session.user, role, isLoading: false, isAuthenticated: true });
      return { error: null, role };
    }

    return { error: null }; // Email confirmation required
  }, []);

  // ── Sign In with OAuth ──
  const signInWithOAuth = useCallback(async (provider: 'google' | 'github') => {
    console.log('[Auth] OAuth:', provider);
    const redirectTo = `${window.location.origin}/#/auth/callback`;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });

    if (error) {
      const msg = error.message?.includes('provider is not enabled')
        ? `${provider} login is not enabled.`
        : error.message;
      return { error: { ...error, message: msg } as AuthError };
    }

    if (data?.url) {
      window.location.href = data.url; // Redirect to OAuth provider
    }

    return { error: null };
  }, []);

  // ── Sign Out ──
  const signOut = useCallback(async () => {
    console.log('[Auth] signOut');
    await supabase.auth.signOut();
    setState({ user: null, role: 'public', isLoading: false, isAuthenticated: false });
    window.location.href = '/#/login';
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/#/reset-password`,
    });
    return { error };
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, signIn, signUp, signInWithOAuth, signOut, sendPasswordReset }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Resolve role for a user ──
function resolveRole(user: User): UserRole {
  if (isAdminEmail(user.email)) return 'admin';
  // For non-admin users, we could query the database here
  // But for now, default to customer if no role is set
  return 'customer';
}

// ── Hook ──
export function useAuth() {
  return useContext(AuthContext);
}

// ── Get destination after login based on role ──
export function getLoginRedirect(role: UserRole): string {
  return getPortalPathForRole(role);
}
