// ═══════════════════════════════════════════════════════════════
// AUTH CONTEXT — UptimeOps
// Complete authentication provider with role-based routing
// ═══════════════════════════════════════════════════════════════

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, AuthError, Provider } from '@supabase/supabase-js';
import { supabase, getUserRole } from '@/lib/supabase/client';
import type { UserRole } from '@/lib/supabase/client';

interface AuthState {
  user: User | null;
  role: UserRole;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, metadata?: { full_name?: string }) => Promise<{ error: AuthError | null }>;
  signInWithOAuth: (provider: Provider) => Promise<void>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: 'public',
  isLoading: true,
  isAuthenticated: false,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signInWithOAuth: async () => {},
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

  // Load session on mount
  useEffect(() => {
    let mounted = true;

    async function init() {
      // Check for existing session
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;

      if (session?.user) {
        const role = await getUserRole(session.user.id);
        if (mounted) {
          setState({
            user: session.user,
            role,
            isLoading: false,
            isAuthenticated: true,
          });
        }
      } else {
        if (mounted) setState(s => ({ ...s, isLoading: false }));
      }
    }

    init();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;
        const user = session?.user ?? null;
        if (user) {
          const role = await getUserRole(user.id);
          if (mounted) {
            setState({ user, role, isLoading: false, isAuthenticated: true });
          }
        } else {
          if (mounted) {
            setState({ user: null, role: 'public', isLoading: false, isAuthenticated: false });
          }
        }
      }
    );

    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }, []);

  const signUp = useCallback(async (email: string, password: string, metadata?: { full_name?: string }) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata || {},
        emailRedirectTo: `${window.location.origin}/#/login`,
      },
    });
    return { error };
  }, []);

  const signInWithOAuth = useCallback(async (provider: Provider) => {
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/#/auth/callback`,
      },
    });
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setState({ user: null, role: 'public', isLoading: false, isAuthenticated: false });
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

export function useAuth() {
  return useContext(AuthContext);
}

// ── Route guard hook ──
export function useRequireAuth(allowedRoles?: UserRole[]) {
  const { isAuthenticated, role, isLoading } = useAuth();

  if (isLoading) return { authorized: false, checking: true };
  if (!isAuthenticated) return { authorized: false, checking: false };
  if (allowedRoles && !allowedRoles.includes(role)) return { authorized: false, checking: false };
  return { authorized: true, checking: false };
}

// ── Role-based redirect ──
export function getRoleRedirectPath(role: UserRole): string {
  switch (role) {
    case 'coordinator': return '/hq';
    case 'engineer': return '/engineer';
    case 'admin': return '/hq';
    case 'customer': return '/customer';
    default: return '/';
  }
}
