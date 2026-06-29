// ═══════════════════════════════════════════════════════════════
// AUTH STORE — Zustand
// Role is ALWAYS derived from the user — never persisted.
// This prevents stale roles when switching accounts.
// ═══════════════════════════════════════════════════════════════

import { create } from 'zustand';
import type { User, Session } from '@supabase/supabase-js';

export type UserRole = 'public' | 'customer' | 'engineer' | 'coordinator' | 'admin';

interface AuthState {
  user: User | null;
  session: Session | null;
  role: UserRole;
  isLoading: boolean;
  isInitialized: boolean;

  setUser: (user: User | null, session: Session | null) => void;
  setRole: (role: UserRole) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  clear: () => void;
}

const ADMIN_EMAILS = ['cumouat@gmail.com'];

export function getRoleFromUser(user: User | null): UserRole {
  if (!user) return 'public';
  if (ADMIN_EMAILS.includes(user.email || '')) return 'admin';
  const metadataRole = user.user_metadata?.role as string;
  if (metadataRole === 'admin' || metadataRole === 'coordinator') return metadataRole as UserRole;
  if (metadataRole === 'engineer') return 'engineer';
  if (metadataRole === 'customer') return 'customer';
  return 'customer';
}

// Clear any stale persisted role from localStorage
if (typeof window !== 'undefined') {
  try { localStorage.removeItem('uptimeops-auth'); } catch { /* ignore */ }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  role: 'public',
  isLoading: true,
  isInitialized: false,

  setUser: (user, session) =>
    set({
      user,
      session,
      role: getRoleFromUser(user),
    }),

  setRole: (role) => set({ role }),

  setLoading: (isLoading) => set({ isLoading }),

  setInitialized: (isInitialized) => set({ isInitialized }),

  clear: () =>
    set({
      user: null,
      session: null,
      role: 'public',
      isLoading: false,
    }),
}));

// ── Keep auth store in sync with Supabase auth state ──
import { supabase } from '@/lib/supabase/client';

let authSubscription: ReturnType<typeof supabase.auth.onAuthStateChange> | null = null;

export function initAuthStore() {
  if (authSubscription) return;

  useAuthStore.getState().setLoading(true);

  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session?.user) {
      useAuthStore.getState().setUser(session.user, session);
    }
    useAuthStore.getState().setInitialized(true);
    useAuthStore.getState().setLoading(false);
  });

  authSubscription = supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      useAuthStore.getState().setUser(session.user, session);
    } else if (event === 'SIGNED_OUT') {
      useAuthStore.getState().clear();
    } else if (event === 'TOKEN_REFRESHED' && session) {
      useAuthStore.getState().setUser(session.user, session);
    }
  });
}

export function isAdminEmail(email: string | undefined): boolean {
  return !!email && ADMIN_EMAILS.includes(email);
}
