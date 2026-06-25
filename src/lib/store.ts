// ═══════════════════════════════════════════════════════════════
// ZUSTAND — Global State Store
// Slices: auth, incidents, ui, notifications
// ═══════════════════════════════════════════════════════════════

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ── Types ──

interface User {
  id: string;
  email: string;
  role: 'customer' | 'engineer' | 'coordinator' | 'admin';
  name?: string;
  avatar_url?: string;
}

interface Incident {
  id: string;
  title: string;
  status: string;
  priority: string;
  created_at: string;
  website_url?: string;
  ai_confidence?: number;
  assigned_engineer?: string;
}

interface UIState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  theme: 'dark' | 'light' | 'system';
  activeModal: string | null;
  toastQueue: Array<{ id: string; message: string; type: 'success' | 'error' | 'warning' | 'info' }>;
}

interface Notification {
  id: string;
  type: string;
  message: string;
  read: boolean;
  created_at: string;
  entity_type?: string;
  entity_id?: string;
}

// ── Store ──

interface AppState {
  // Auth slice
  user: User | null;
  session: unknown | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setSession: (session: unknown | null) => void;
  setAuthLoading: (loading: boolean) => void;
  logout: () => void;

  // Incident slice
  incidents: Incident[];
  activeIncidentId: string | null;
  incidentFilter: string;
  setIncidents: (incidents: Incident[]) => void;
  addIncident: (incident: Incident) => void;
  updateIncident: (id: string, updates: Partial<Incident>) => void;
  setActiveIncident: (id: string | null) => void;
  setIncidentFilter: (filter: string) => void;

  // UI slice
  ui: UIState;
  setSidebarOpen: (open: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setTheme: (theme: UIState['theme']) => void;
  openModal: (modal: string) => void;
  closeModal: () => void;
  addToast: (toast: Omit<UIState['toastQueue'][0], 'id'>) => void;
  removeToast: (id: string) => void;

  // Notifications slice
  notifications: Notification[];
  unreadCount: number;
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  markNotificationRead: (id: string) => void;
  markAllRead: () => void;

  // Presence slice (engineer/coordinator)
  presence: Record<string, { status: 'online' | 'away' | 'offline'; lastSeen: string }>;
  updatePresence: (userId: string, status: 'online' | 'away' | 'offline') => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // ── Auth ──
      user: null,
      session: null,
      isAuthenticated: false,
      isLoading: true,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setSession: (session) => set({ session }),
      setAuthLoading: (loading) => set({ isLoading: loading }),
      logout: () => set({ user: null, session: null, isAuthenticated: false }),

      // ── Incidents ──
      incidents: [],
      activeIncidentId: null,
      incidentFilter: 'all',
      setIncidents: (incidents: Incident[]) => set({ incidents }),
      addIncident: (incident: Incident) =>
        set((state: AppState) => ({ incidents: [incident, ...state.incidents] })),
      updateIncident: (id: string, updates: Partial<Incident>) =>
        set((state: AppState) => ({
          incidents: state.incidents.map((i: Incident) =>
            i.id === id ? { ...i, ...updates } : i
          ),
        })),
      setActiveIncident: (id: string | null) => set({ activeIncidentId: id }),
      setIncidentFilter: (filter: string) => set({ incidentFilter: filter }),

      // ── UI ──
      ui: {
        sidebarOpen: true,
        sidebarCollapsed: false,
        theme: 'dark',
        activeModal: null,
        toastQueue: [],
      },
      setSidebarOpen: (open: boolean) =>
        set((state: AppState) => ({ ui: { ...state.ui, sidebarOpen: open } })),
      setSidebarCollapsed: (collapsed: boolean) =>
        set((state: AppState) => ({ ui: { ...state.ui, sidebarCollapsed: collapsed } })),
      setTheme: (theme: UIState['theme']) =>
        set((state: AppState) => ({ ui: { ...state.ui, theme } })),
      openModal: (modal: string) =>
        set((state: AppState) => ({ ui: { ...state.ui, activeModal: modal } })),
      closeModal: () =>
        set((state: AppState) => ({ ui: { ...state.ui, activeModal: null } })),
      addToast: (toast: Omit<UIState['toastQueue'][0], 'id'>) => {
        const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
        set((state: AppState) => ({
          ui: { ...state.ui, toastQueue: [...state.ui.toastQueue, { ...toast, id }] },
        }));
        setTimeout(() => get().removeToast(id), 5000);
      },
      removeToast: (id: string) =>
        set((state: AppState) => ({
          ui: {
            ...state.ui,
            toastQueue: state.ui.toastQueue.filter((t: UIState['toastQueue'][0]) => t.id !== id),
          },
        })),

      // ── Notifications ──
      notifications: [],
      unreadCount: 0,
      setNotifications: (notifications: Notification[]) =>
        set({
          notifications,
          unreadCount: notifications.filter((n: Notification) => !n.read).length,
        }),
      addNotification: (notification: Notification) =>
        set((state: AppState) => ({
          notifications: [notification, ...state.notifications],
          unreadCount: state.unreadCount + 1,
        })),
      markNotificationRead: (id: string) =>
        set((state: AppState) => ({
          notifications: state.notifications.map((n: Notification) =>
            n.id === id ? { ...n, read: true } : n
          ),
          unreadCount: Math.max(0, state.unreadCount - 1),
        })),
      markAllRead: () =>
        set((state: AppState) => ({
          notifications: state.notifications.map((n: Notification) => ({ ...n, read: true })),
          unreadCount: 0,
        })),

      // ── Presence ──
      presence: {},
      updatePresence: (userId: string, status: 'online' | 'away' | 'offline') =>
        set((state: AppState) => ({
          presence: {
            ...state.presence,
            [userId]: { status, lastSeen: new Date().toISOString() },
          },
        })),
    }),
    {
      name: 'uptimeops-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist these keys
        user: state.user,
        ui: { theme: state.ui.theme, sidebarCollapsed: state.ui.sidebarCollapsed },
      }),
    }
  )
);

// ── Selectors ──

export const selectUser = (state: AppState) => state.user;
export const selectIsCoordinator = (state: AppState) =>
  state.user?.role === 'coordinator' || state.user?.role === 'admin';
export const selectIsEngineer = (state: AppState) =>
  state.user?.role === 'engineer' || state.user?.role === 'coordinator' || state.user?.role === 'admin';
export const selectActiveIncident = (state: AppState) =>
  state.incidents.find((i) => i.id === state.activeIncidentId);
export const selectUnreadNotifications = (state: AppState) =>
  state.notifications.filter((n) => !n.read);
