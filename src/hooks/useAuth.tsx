// ═══════════════════════════════════════════════════════════════
// AUTH CONTEXT — UptimeOps
// Simple: signIn sets user directly. Pages read user to decide.
// ═══════════════════════════════════════════════════════════════

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
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

  // Check existing session on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        setRole(resolveRole(session.user));
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      setRole(resolveRole(u));
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const msg = error.message.includes('Invalid login') ? 'Invalid email or password' : error.message;
      return { error: { ...error, message: msg } as AuthError };
    }
    if (!data.session?.user) return { error: { message: 'No session', name: 'AuthError', status: 400 } as AuthError };
    const r = resolveRole(data.session.user);
    setUser(data.session.user);
    setRole(r);
    setLoading(false);
    return { error: null, role: r };
  }, []);

  const signUp = useCallback(async (email: string, password: string, metadata?: { full_name?: string }) => {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: metadata, emailRedirectTo: window.location.origin + '/#/login' },
    });
    if (error) return { error };
    if (data.session?.user) {
      const r = resolveRole(data.session.user);
      setUser(data.session.user);
      setRole(r);
      setLoading(false);
      return { error: null, role: r };
    }
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
    <AuthContext.Provider value={{ user, role, loading, isAuthenticated: !!user, signIn, signUp, signInWithOAuth, signOut, sendPasswordReset }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
