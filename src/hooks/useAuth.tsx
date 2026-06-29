// ═══════════════════════════════════════════════════════════════
// AUTH CONTEXT — UptimeOps
// NO page reloads. signIn sets state + navigates directly.
// Debug logging on every step.
// ═══════════════════════════════════════════════════════════════

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { User, AuthError } from '@supabase/supabase-js';
import { supabase, isAdminEmail } from '@/lib/supabase/client';
import type { UserRole } from '@/lib/supabase/client';

interface AuthContextType {
  user: User | null;
  role: UserRole;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null; role?: UserRole }>;
  signUp: (email: string, password: string, metadata?: { full_name?: string }) => Promise<{ error: AuthError | null; role?: UserRole }>;
  signInWithOAuth: (provider: 'google' | 'github') => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<{ error: AuthError | null }>;
  debugLog: string[];
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
  debugLog: [],
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>('public');
  const [isLoading, setIsLoading] = useState(true);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const mountedRef = useRef(true);

  const log = useCallback((msg: string) => {
    console.log(msg);
    setDebugLog(prev => [...prev.slice(-19), msg]);
  }, []);

  // ── Initialize: check existing session ──
  useEffect(() => {
    mountedRef.current = true;

    async function init() {
      log('[Auth] init() starting...');
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (!mountedRef.current) return;

        if (error) {
          log('[Auth] getSession ERROR: ' + error.message);
          setIsLoading(false);
          return;
        }

        if (session?.user) {
          const r = resolveRole(session.user);
          log('[Auth] Session FOUND: ' + session.user.email + ' role=' + r);
          setUser(session.user);
          setRole(r);
          setIsLoading(false);
        } else {
          log('[Auth] No session');
          setIsLoading(false);
        }
      } catch (err: any) {
        log('[Auth] init EXCEPTION: ' + (err?.message || String(err)));
        setIsLoading(false);
      }
    }

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mountedRef.current) return;
      const u = session?.user ?? null;
      const r = resolveRole(u);
      log('[Auth] onAuthStateChange: event=' + event + ' email=' + (u?.email || 'null') + ' role=' + r);
      setUser(u);
      setRole(r);
      setIsLoading(false);
    });

    return () => { mountedRef.current = false; subscription.unsubscribe(); };
  }, [log]);

  // ── Sign In — sets state DIRECTLY, returns role for caller to navigate ──
  const signIn = useCallback(async (email: string, password: string) => {
    log('[Auth] signIn() calling: ' + email);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        log('[Auth] signInWithPassword ERROR: ' + error.message);
        const msg = error.message.includes('Invalid login') ? 'Invalid email or password.' : error.message;
        return { error: { ...error, message: msg } as AuthError };
      }

      if (!data.session?.user) {
        log('[Auth] signInWithPassword returned NO session');
        return { error: { message: 'No session.', name: 'AuthError', status: 400 } as AuthError };
      }

      const r = resolveRole(data.session.user);
      log('[Auth] signIn SUCCESS: ' + data.session.user.email + ' role=' + r);

      // Set state DIRECTLY (don't wait for onAuthStateChange)
      setUser(data.session.user);
      setRole(r);
      setIsLoading(false);

      return { error: null, role: r };
    } catch (err: any) {
      log('[Auth] signIn EXCEPTION: ' + (err?.message || String(err)));
      return { error: { message: err?.message || 'Failed', name: 'AuthError', status: 500 } as AuthError };
    }
  }, [log]);

  // ── Sign Up ──
  const signUp = useCallback(async (email: string, password: string, metadata?: { full_name?: string }) => {
    log('[Auth] signUp(): ' + email);
    try {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: metadata, emailRedirectTo: window.location.origin + '/#/login' } });
      if (error) { log('[Auth] signUp ERROR: ' + error.message); return { error }; }
      if (data.session?.user) {
        const r = resolveRole(data.session.user);
        setUser(data.session.user); setRole(r); setIsLoading(false);
        return { error: null, role: r };
      }
      return { error: null };
    } catch (err: any) {
      return { error: { message: err?.message || 'Failed', name: 'AuthError', status: 500 } as AuthError };
    }
  }, [log]);

  // ── OAuth ──
  const signInWithOAuth = useCallback(async (provider: 'google' | 'github') => {
    log('[Auth] OAuth: ' + provider);
    const { data, error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: window.location.origin + '/#/auth/callback' } });
    if (error) return { error: { ...error, message: error.message || provider + ' failed' } as AuthError };
    if (data?.url) window.location.href = data.url;
    return { error: null };
  }, [log]);

  // ── Sign Out ──
  const signOut = useCallback(async () => {
    log('[Auth] signOut()');
    await supabase.auth.signOut();
    setUser(null); setRole('public'); setIsLoading(false);
  }, [log]);

  // ── Password Reset ──
  const sendPasswordReset = useCallback(async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/#/reset-password',
      });
      return { error };
    } catch (err: any) {
      return { error: { message: err?.message, name: 'AuthError', status: 500 } as AuthError };
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, isLoading, isAuthenticated: !!user, signIn, signUp, signInWithOAuth, signOut, sendPasswordReset, debugLog }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
