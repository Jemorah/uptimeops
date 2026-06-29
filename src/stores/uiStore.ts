// ═══════════════════════════════════════════════════════════════
// UI STORE — Zustand, survives page navigation
// Manages panels, modals, toasts, sidebar state.
// ═══════════════════════════════════════════════════════════════

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Toast {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration: number;
}

interface UIState {
  // Navigation panels
  isNotificationsOpen: boolean;
  isMobileMenuOpen: boolean;
  isSidebarCollapsed: boolean;

  // Modals
  activeModal: string | null;
  modalData: Record<string, unknown> | null;

  // Toast queue
  toasts: Toast[];

  // Global loading overlay
  isGlobalLoading: boolean;
  globalLoadingMessage: string;

  // Actions
  toggleNotifications: () => void;
  setNotificationsOpen: (open: boolean) => void;
  toggleMobileMenu: () => void;
  toggleSidebar: () => void;
  openModal: (modal: string, data?: Record<string, unknown>) => void;
  closeModal: () => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  setGlobalLoading: (loading: boolean, message?: string) => void;
}

let toastCounter = 0;

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      isNotificationsOpen: false,
      isMobileMenuOpen: false,
      isSidebarCollapsed: false,
      activeModal: null,
      modalData: null,
      toasts: [],
      isGlobalLoading: false,
      globalLoadingMessage: '',

      toggleNotifications: () =>
        set((s) => ({ isNotificationsOpen: !s.isNotificationsOpen })),

      setNotificationsOpen: (open) => set({ isNotificationsOpen: open }),

      toggleMobileMenu: () =>
        set((s) => ({ isMobileMenuOpen: !s.isMobileMenuOpen })),

      toggleSidebar: () =>
        set((s) => ({ isSidebarCollapsed: !s.isSidebarCollapsed })),

      openModal: (modal, data) => set({ activeModal: modal, modalData: data || null }),

      closeModal: () => set({ activeModal: null, modalData: null }),

      addToast: (toast) => {
        const id = `toast-${++toastCounter}-${Date.now()}`;
        const newToast: Toast = { ...toast, id };
        set((s) => ({ toasts: [...s.toasts, newToast] }));
        // Auto-remove
        setTimeout(() => {
          get().removeToast(id);
        }, toast.duration);
      },

      removeToast: (id) =>
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

      setGlobalLoading: (loading, message = '') =>
        set({ isGlobalLoading: loading, globalLoadingMessage: message }),
    }),
    {
      name: 'uptimeops-ui',
      partialize: (state) => ({
        isSidebarCollapsed: state.isSidebarCollapsed,
      }),
    }
  )
);
