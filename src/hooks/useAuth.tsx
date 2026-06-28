// ═══════════════════════════════════════════════════════════════
// AUTH CONTEXT — UptimeOps Multi-Subdomain
// Cookie-based cross-domain auth with role-based redirect.
// cumouat@gmail.com gets admin role on all subdomains.
//
// TWO MODES:
//   1. Subdomain mode (*.uptimeops.org) → window.location.href cross-domain
//   2. Single-domain mode (Vercel, etc)  → client-side navigate() within same domain
// ═══════════════════════════════════════════════════════════════

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, AuthError, Provider } from '@supabase/supabase-js';
import {
  supabase, getUserRole, getSubdomainForRole, getPortalPathForRole,
  getCurrentPortal, SUBDOMAINS, isAdminEmail, isSubdomainMode, isWwwDomain,
} from '@/lib/supabase/client';
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
  signInWithOAuth: (provider: Provider) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType>({
  user: null, role: 'public', isLoading: true, isAuthenticated: false,
  signIn: async () => ({ error: null }), signUp: async () => ({ error: null }),
  signInWithOAuth: async () => ({ error: null }), signOut: async () => {},
  sendPasswordReset: async () => ({ error: null }),
});

const PROVIDER_NAMES: Record<string, string> = { google: 'Google', github: 'GitHub', email: 'Email' };

// ── Admin override ──
function applyAdminOverride(user: User | null, role: UserRole): UserRole {
  if (isAdminEmail(user?.email)) return 'admin';
  return role;
}

// ── Build login URL ──
export function getLoginUrl(currentPath?: string): string {
  const redirectTo = currentPath || (typeof window !== 'undefined' ? window.location.href : '');
  // In single-domain mode, just navigate to /#/login with redirect_to param
  if (!isSubdomainMode()) {
    return `/#/login?redirect_to=${encodeURIComponent(redirectTo)}`;
  }
  // In subdomain mode, go to www subdomain
  const base = isLocalhost() ? `${window.location.origin}` : `https://${SUBDOMAINS.www}`;
  return `${base}/#/login?redirect_to=${encodeURIComponent(redirectTo)}`;
}

function isLocalhost(): boolean {
  if (typeof window === 'undefined') return false;
  const h = window.location.hostname;
  return h === 'localhost' || h === '127.0.0.1';
}

// ── Post-login redirect ──
// Returns the URL/ path the user should go to after login.
// The caller uses this with either navigate() or window.location.href.
export function getPostLoginDestination(role: UserRole, fallbackRedirect?: string | null): string {
  const allowedDomains = Object.values(SUBDOMAINS);
  const isAllowed = fallbackRedirect && allowedDomains.some(d => fallbackRedirect.includes(d));

  // If there's a valid redirect_to, use it
  if (isAllowed && fallbackRedirect) return fallbackRedirect;

  // Single-domain mode: return a client-side path
  if (!isSubdomainMode()) {
    return getPortalPathForRole(role);
  }

  // Subdomain mode: return full URL
  if (role === 'admin' || role === 'coordinator') {
    return `https://${SUBDOMAINS.dashboard}/#/hq`;
  }
  if (role === 'engineer') {
    return `https://${SUBDOMAINS.engineers}/#/engineer`;
  }
  if (role === 'customer') {
    return `https://${SUBDOMAINS.app}/#/customer`;
  }
  return '/';
}

// ── Legacy redirect function (used by AuthCallbackPage) ──
export function redirectToRoleSubdomain(role: UserRole, fallbackRedirect?: string | null) {
  const dest = getPostLoginDestination(role, fallbackRedirect);
  if (!isSubdomainMode()) {
    // Single-domain: client-side hash-based navigation
    window.location.hash = dest;
    window.location.reload();
  } else {
    // Subdomain mode: full page redirect
    window.location.href = dest;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null, role: 'public', isLoading: true, isAuthenticated: false,
  });

  useEffect(() => {
    let mounted = true;
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      if (session?.user) {
        if (isAdminEmail(session.user.email)) {
          setState({ user: session.user, role: 'admin', isLoading: false, isAuthenticated: true });
          return;
        }
        let role = await getUserRole(session.user.id);
        role = applyAdminOverride(session.user, role);
        setState({ user: session.user, role, isLoading: false, isAuthenticated: true });
      } else {
        setState(s => ({ ...s, isLoading: false }));
      }
    }
    init();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      const user = session?.user ?? null;
      if (user) {
        if (isAdminEmail(user.email)) {
          setState({ user, role: 'admin', isLoading: false, isAuthenticated: true });
          return;
        }
        let role = await getUserRole(user.id);
        role = applyAdminOverride(user, role);
        setState({ user, role, isLoading: false, isAuthenticated: true });
      } else {
        setState({ user: null, role: 'public', isLoading: false, isAuthenticated: false });
      }
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        let friendly = error.message;
        if (error.message.includes('Invalid login credentials')) friendly = 'Invalid email or password.';
        else if (error.message.includes('Email not confirmed')) friendly = 'Please confirm your email before signing in.';
        return { error: { ...error, message: friendly } as AuthError };
      }
      if (!data.session?.user) {
        return { error: { message: 'No session.', name: 'AuthError', status: 400 } as AuthError };
      }

      // Admin email bypass
      if (isAdminEmail(data.session.user.email)) {
        setState({ user: data.session.user, role: 'admin', isLoading: false, isAuthenticated: true });
        return { error: null, role: 'admin' as UserRole };
      }

      let role = await getUserRole(data.session.user.id);
      role = applyAdminOverride(data.session.user, role);
      setState({ user: data.session.user, role, isLoading: false, isAuthenticated: true });
      return { error: null, role };
    } catch (err: any) {
      return { error: { message: err?.message || 'Error.', name: 'AuthError', status: 500 } as AuthError };
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, metadata?: { full_name?: string }) => {
    try {
      const redirectBase = isWwwDomain() ? `${window.location.origin}` : `https://${SUBDOMAINS.www}`;
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { data: metadata || {}, emailRedirectTo: `${redirectBase}/#/login` },
      });
      if (error) return { error };
      if (data.session?.user) {
        let role = await getUserRole(data.session.user.id);
        role = applyAdminOverride(data.session.user, role);
        setState({ user: data.session.user, role, isLoading: false, isAuthenticated: true });
        return { error: null, role };
      }
      return { error: null };
    } catch (err: any) {
      return { error: { message: err?.message || 'Signup failed.', name: 'AuthError', status: 500 } as AuthError };
    }
  }, []);

  const signInWithOAuth = useCallback(async (provider: Provider) => {
    try {
      const redirectTo = `${window.location.origin}/#/auth/callback`;
      const { data, error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
      if (error) {
        if (error.message?.includes('provider is not enabled') || error.code === 'validation_failed') {
          return { error: { message: `${PROVIDER_NAMES[provider] || provider} login is not enabled. Please sign in with email.`, name: 'AuthError', status: 400 } as AuthError };
        }
        return { error };
      }
      if (data?.url) { window.location.href = data.url; }
      return { error: null };
    } catch (err: any) {
      return { error: { message: err?.message || 'OAuth failed.', name: 'AuthError', status: 500 } as AuthError };
    }
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setState({ user: null, role: 'public', isLoading: false, isAuthenticated: false });
    const logoutBase = isSubdomainMode()
      ? `https://${SUBDOMAINS.www}`
      : `${window.location.origin}`;
    window.location.href = `${logoutBase}/#/login?signed_out=true`;
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    try {
      const base = isWwwDomain() ? `${window.location.origin}` : `https://${SUBDOMAINS.www}`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${base}/#/reset-password` });
      return { error };
    } catch (err: any) {
      return { error: { message: err?.message || 'Failed.', name: 'AuthError', status: 500 } as AuthError };
    }
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, signIn, signUp, signInWithOAuth, signOut, sendPasswordReset }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }

export function useRequireAuth(allowedRoles?: UserRole[]) {
  const { isAuthenticated, role, isLoading } = useAuth();
  if (isLoading) return { authorized: false, checking: true };
  if (!isAuthenticated) return { authorized: false, checking: false };
  if (allowedRoles && !allowedRoles.includes(role)) return { authorized: false, checking: false };
  return { authorized: true, checking: false };
}

// ── Subdomain check for non-admin users ──
export function useWrongSubdomainCheck() {
  const { isAuthenticated, role, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading || !isAuthenticated || !role || role === 'public') return;
    if (role === 'admin') return; // Admin can access all
    if (!isSubdomainMode()) return; // Only enforce in subdomain mode

    const currentPortal = getCurrentPortal();
    const correctDomain = getSubdomainForRole(role);
    const portalDomainMap: Record<string, string> = {
      app: SUBDOMAINS.app, dashboard: SUBDOMAINS.dashboard, engineers: SUBDOMAINS.engineers,
    };
    const expectedPortal = Object.entries(portalDomainMap).find(([, d]) => d === correctDomain)?.[0];
    if (expectedPortal && currentPortal !== expectedPortal && currentPortal !== 'www') {
      redirectToRoleSubdomain(role, null);
    }
  }, [isLoading, isAuthenticated, role]);
}
