// ═══════════════════════════════════════════════════════════════
// AUTH CONTEXT — UptimeOps
// Session stored in localStorage. No page reloads on login.
// LoginPage watches isAuthenticated and navigates via React Router.
// ═══════════════════════════════════════════════════════════════

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, AuthError } from '@supabase/supabase-js';
import { supabase, isAdminEmail } from '@/lib/supabase/client';
import type { UserRole } from '@/lib/supabase/client';

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

function resolveRole(user: User | null): UserRole {
  if (!user) return 'public';
  if (isAdminEmail(user.email)) return 'admin';
  return 'customer';
}

const AuthContext = createContext<AuthContextType>({
  user: null, role: 'public', isLoading: true, isAuthenticated: false,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signInWithOAuth: async () => ({ error: null }),
  signOut: async () => {},
  sendPasswordReset: async () => ({ error: null }),
});

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
        console.log('[Auth] init() — calling getSession()...');
        const { data: { session }, error } = await supabase.auth.getSession();
        if (!mounted) return;

        if (error) {
          console.error('[Auth] getSession error:', error.message);
          setState({ user: null, role: 'public', isLoading: false, isAuthenticated: false });
          return;
        }

        if (session?.user) {
          const role = resolveRole(session.user);
          console.log('[Auth] Session found:', session.user.email, 'role:', role);
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

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      const user = session?.user ?? null;
      const role = resolveRole(user);
      console.log('[Auth] onAuthStateChange:', event, 'email:', user?.email, 'role:', role);
      setState({ user, role, isLoading: false, isAuthenticated: !!user });
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  // ── Sign In — returns result, NO redirect (caller handles navigation) ──
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
        return { error: { message: 'No session.', name: 'AuthError', status: 400 } as AuthError };
      }

      const role = resolveRole(data.session.user);
      console.log('[Auth] Sign in success:', data.session.user.email, 'role:', role);
      // onAuthStateChange will update React state
      // LoginPage watches isAuthenticated and navigates
      return { error: null, role };
    } catch (err: any) {
      console.error('[Auth] signIn exception:', err?.message);
      return { error: { message: err?.message || 'Failed.', name: 'AuthError', status: 500 } as AuthError };
    }
  }, []);

  // ── Sign Up ──
  const signUp = useCallback(async (email: string, password: string, metadata?: { full_name?: string }) => {
    console.log('[Auth] signUp:', email);
    try {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { data: metadata, emailRedirectTo: `${window.location.origin}/#/login` },
      });
      if (error) return { error };
      if (data.session?.user) {
        return { error: null, role: resolveRole(data.session.user) };
      }
      return { error: null };
    } catch (err: any) {
      return { error: { message: err?.message || 'Failed.', name: 'AuthError', status: 500 } as AuthError };
    }
  }, []);

  // ── OAuth — browser redirects to provider, no return ──
  const signInWithOAuth = useCallback(async (provider: 'google' | 'github') => {
    console.log('[Auth] OAuth:', provider);
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/#/auth/callback` },
    });
    if (error) return { error: { ...error, message: error.message || `${provider} failed` } as AuthError };
    if (data?.url) window.location.href = data.url;
    return { error: null };
  }, []);

  // ── Sign Out ──
  const signOut = useCallback(async () => {
    console.log('[Auth] signOut');
    await supabase.auth.signOut();
    setState({ user: null, role: 'public', isLoading: false, isAuthenticated: false });
  }, []);

  // ── Password Reset ──
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

export function useAuth() {
  return useContext(AuthContext);
}
