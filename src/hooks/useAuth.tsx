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
  signInWithOAuth: (provider: Provider) => Promise<{ error: AuthError | null }>;
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
  signInWithOAuth: async () => ({ error: null }),
  signOut: async () => {},
  sendPasswordReset: async () => ({ error: null }),
});

// Human-readable provider names
const PROVIDER_NAMES: Record<string, string> = {
  google: 'Google',
  github: 'GitHub',
  email: 'Email',
};

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

  // After a successful sign-in, immediately load user + role into state
  // so ProtectedRoute sees isAuthenticated=true when navigation happens.
  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        let friendlyMessage = error.message;
        if (error.message.includes('Invalid login credentials')) {
          friendlyMessage = 'Invalid email or password. Please try again.';
        } else if (error.message.includes('Email not confirmed')) {
          friendlyMessage = 'Please confirm your email address before signing in.';
        }
        return { error: { ...error, message: friendlyMessage } as AuthError };
      }
      if (!data.session?.user) {
        return { error: { message: 'No session created. Please try again.', name: 'AuthError', status: 400 } as AuthError };
      }

      // Load role and update state BEFORE returning so the caller
      // can navigate without a race condition.
      const role = await getUserRole(data.session.user.id);
      setState({
        user: data.session.user,
        role,
        isLoading: false,
        isAuthenticated: true,
      });

      return { error: null };
    } catch (err: any) {
      return { error: { message: err?.message || 'An unexpected error occurred. Please try again.', name: 'AuthError', status: 500 } as AuthError };
    }
  }, []);

  // After signup with auto-confirm, a session is returned.
  // Load the user into state just like signIn.
  const signUp = useCallback(async (email: string, password: string, metadata?: { full_name?: string }) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata || {},
          emailRedirectTo: `${window.location.origin}/#/login`,
        },
      });
      if (error) {
        return { error };
      }

      // If auto-confirm is on, a session is created immediately.
      if (data.session?.user) {
        const role = await getUserRole(data.session.user.id);
        setState({
          user: data.session.user,
          role,
          isLoading: false,
          isAuthenticated: true,
        });
      }

      return { error: null };
    } catch (err: any) {
      return { error: { message: err?.message || 'Signup failed. Please try again.', name: 'AuthError', status: 500 } as AuthError };
    }
  }, []);

  const signInWithOAuth = useCallback(async (provider: Provider) => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/#/auth/callback`,
        },
      });

      if (error) {
        if (error.message?.includes('provider is not enabled') ||
            error.message?.includes('Unsupported provider') ||
            error.code === 'validation_failed') {
          const providerName = PROVIDER_NAMES[provider] || provider;
          return {
            error: {
              message: `${providerName} login is not enabled. Please sign in with email or contact support.`,
              name: 'AuthError',
              status: 400,
            } as AuthError,
          };
        }
        return { error };
      }

      if (!data?.url) {
        return {
          error: {
            message: 'OAuth redirect URL not received. Please try again or use email login.',
            name: 'AuthError',
            status: 400,
          } as AuthError,
        };
      }

      window.location.href = data.url;
      return { error: null };
    } catch (err: any) {
      return {
        error: {
          message: err?.message || 'OAuth sign-in failed. Please try email login instead.',
          name: 'AuthError',
          status: 500,
        } as AuthError,
      };
    }
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setState({ user: null, role: 'public', isLoading: false, isAuthenticated: false });
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/#/reset-password`,
      });
      return { error };
    } catch (err: any) {
      return { error: { message: err?.message || 'Failed to send reset email.', name: 'AuthError', status: 500 } as AuthError };
    }
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
