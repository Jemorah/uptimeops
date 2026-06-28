// ═══════════════════════════════════════════════════════════════
// AUTH CONTEXT — UptimeOps (BYPASS MODE)
// Admin access on all subdomains. No authentication required.
// ═══════════════════════════════════════════════════════════════

import { createContext, useContext } from 'react';
import type { User, AuthError, Provider } from '@supabase/supabase-js';
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

// Hardcoded admin state — full access on all subdomains
const ADMIN_STATE: AuthState = {
  user: { id: 'admin-bypass', email: 'admin@uptimeops.com', role: 'admin' } as unknown as User,
  role: 'admin' as UserRole,
  isLoading: false,
  isAuthenticated: true,
};

const AuthContext = createContext<AuthContextType>({
  ...ADMIN_STATE,
  signIn: async () => ({ error: null, role: 'admin' as UserRole }),
  signUp: async () => ({ error: null, role: 'admin' as UserRole }),
  signInWithOAuth: async () => ({ error: null }),
  signOut: async () => { window.location.reload(); },
  sendPasswordReset: async () => ({ error: null }),
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <AuthContext.Provider
      value={{
        ...ADMIN_STATE,
        signIn: async () => ({ error: null, role: 'admin' as UserRole }),
        signUp: async () => ({ error: null, role: 'admin' as UserRole }),
        signInWithOAuth: async () => ({ error: null }),
        signOut: async () => { window.location.reload(); },
        sendPasswordReset: async () => ({ error: null }),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export function useRequireAuth(_allowedRoles?: UserRole[]) {
  return { authorized: true, checking: false };
}

export function useWrongSubdomainCheck() {
  // No-op — admin can access all subdomains
}

export function getLoginUrl(_currentPath?: string): string {
  return '/';
}

export function redirectToRoleSubdomain(_role: UserRole, _fallback?: string | null) {
  // No-op — admin stays on current subdomain
}
