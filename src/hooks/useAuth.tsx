// ═══════════════════════════════════════════════════════════════
// AUTH CONTEXT — UptimeOps Multi-Subdomain
// Cookie-based cross-domain auth with role-based subdomain redirect.
// Login/signup ONLY on www.uptimeops.org. Portal subdomains redirect there.
// ═══════════════════════════════════════════════════════════════

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, AuthError, Provider } from '@supabase/supabase-js';
import { supabase, getUserRole, getSubdomainForRole, getCurrentPortal, SUBDOMAINS } from '@/lib/supabase/client';
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

const PROVIDER_NAMES: Record<string, string> = { google: 'Google', github: 'GitHub', email: 'Email' };

// ── Is the current page on www (the login domain)? ──
function isWwwDomain(): boolean {
  if (typeof window === 'undefined') return true;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host === 'www.uptimeops.org' || host === 'uptimeops.org';
}

// ── Build login URL on www with redirect back to current subdomain ──
function getLoginUrl(currentPath?: string): string {
  const redirectTo = currentPath || (typeof window !== 'undefined' ? window.location.href : '');
  const base = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? `${window.location.origin}`
    : `https://${SUBDOMAINS.www}`;
  return `${base}/#/login?redirect_to=${encodeURIComponent(redirectTo)}`;
}

// ── Redirect to correct subdomain based on role ──
function redirectToRoleSubdomain(role: UserRole, fallbackRedirect?: string | null) {
  // Validate fallback is an allowed UptimeOps subdomain
  const allowedDomains = Object.values(SUBDOMAINS);
  const isAllowed = fallbackRedirect && allowedDomains.some(d => fallbackRedirect.includes(d));

  if (isAllowed && fallbackRedirect) {
    window.location.href = fallbackRedirect;
    return;
  }

  const domain = getSubdomainForRole(role);
  const base = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? `${window.location.origin}/#` // localhost: all on same origin
    : `https://${domain}/#`;

  switch (role) {
    case 'customer': window.location.href = `${base}/`; break;
    case 'coordinator':
    case 'admin': window.location.href = `${base}/`; break;
    case 'engineer': window.location.href = `${base}/`; break;
    default: window.location.href = base;
  }
}

export { getLoginUrl, redirectToRoleSubdomain };

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
          setState({ user: session.user, role, isLoading: false, isAuthenticated: true });
        }
      } else {
        if (mounted) setState(s => ({ ...s, isLoading: false }));
      }
    }

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;
        const user = session?.user ?? null;
        if (user) {
          const role = await getUserRole(user.id);
          if (mounted) setState({ user, role, isLoading: false, isAuthenticated: true });
        } else {
          if (mounted) setState({ user: null, role: 'public', isLoading: false, isAuthenticated: false });
        }
      }
    );

    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  // ── Email sign in ──
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

      const role = await getUserRole(data.session.user.id);
      setState({ user: data.session.user, role, isLoading: false, isAuthenticated: true });

      // If on www domain, redirect to role's subdomain
      if (isWwwDomain()) {
        const urlParams = new URLSearchParams(window.location.search);
        const redirectTo = urlParams.get('redirect_to');
        redirectToRoleSubdomain(role, redirectTo);
      }

      return { error: null, role };
    } catch (err: any) {
      return { error: { message: err?.message || 'An unexpected error occurred.', name: 'AuthError', status: 500 } as AuthError };
    }
  }, []);

  // ── Sign up ──
  const signUp = useCallback(async (email: string, password: string, metadata?: { full_name?: string }) => {
    try {
      // Always redirect back to www for login after signup
      const redirectBase = isWwwDomain()
        ? `${window.location.origin}`
        : `https://${SUBDOMAINS.www}`;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata || {},
          emailRedirectTo: `${redirectBase}/#/login`,
        },
      });
      if (error) return { error };

      if (data.session?.user) {
        const role = await getUserRole(data.session.user.id);
        setState({ user: data.session.user, role, isLoading: false, isAuthenticated: true });

        if (isWwwDomain()) {
          const urlParams = new URLSearchParams(window.location.search);
          const redirectTo = urlParams.get('redirect_to');
          redirectToRoleSubdomain(role, redirectTo);
        }
        return { error: null, role };
      }

      return { error: null };
    } catch (err: any) {
      return { error: { message: err?.message || 'Signup failed.', name: 'AuthError', status: 500 } as AuthError };
    }
  }, []);

  // ── OAuth sign in ──
  const signInWithOAuth = useCallback(async (provider: Provider) => {
    try {
      // Build redirect URL: always back to the current origin's auth callback
      const redirectTo = `${window.location.origin}/#/auth/callback`;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo },
      });

      if (error) {
        if (error.message?.includes('provider is not enabled') || error.code === 'validation_failed') {
          const providerName = PROVIDER_NAMES[provider] || provider;
          return { error: { message: `${providerName} login is not enabled. Please sign in with email.`, name: 'AuthError', status: 400 } as AuthError };
        }
        return { error };
      }

      if (!data?.url) {
        return { error: { message: 'OAuth redirect URL not received.', name: 'AuthError', status: 400 } as AuthError };
      }

      window.location.href = data.url;
      return { error: null };
    } catch (err: any) {
      return { error: { message: err?.message || 'OAuth failed.', name: 'AuthError', status: 500 } as AuthError };
    }
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setState({ user: null, role: 'public', isLoading: false, isAuthenticated: false });
    // Hard redirect to www after signout so cookie is cleared everywhere
    const logoutBase = typeof window !== 'undefined' && (window.location.hostname === 'localhost')
      ? `${window.location.origin}`
      : `https://${SUBDOMAINS.www}`;
    window.location.href = `${logoutBase}/#/login?signed_out=true`;
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    try {
      const base = isWwwDomain() ? `${window.location.origin}` : `https://${SUBDOMAINS.www}`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${base}/#/reset-password`,
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

// ── Check if current user is on the wrong subdomain ──
export function useWrongSubdomainCheck() {
  const { isAuthenticated, role, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading || !isAuthenticated || !role || role === 'public') return;

    const currentPortal = getCurrentPortal();
    const correctDomain = getSubdomainForRole(role);

    // Map portal to expected domain
    const portalDomainMap: Record<string, string> = {
      app: SUBDOMAINS.app,
      dashboard: SUBDOMAINS.dashboard,
      engineers: SUBDOMAINS.engineers,
    };

    const expectedPortal = Object.entries(portalDomainMap).find(([, d]) => d === correctDomain)?.[0];
    if (expectedPortal && currentPortal !== expectedPortal && currentPortal !== 'www') {
      // Wrong subdomain — redirect to correct one
      redirectToRoleSubdomain(role, null);
    }
  }, [isLoading, isAuthenticated, role]);
}
