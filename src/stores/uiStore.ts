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

import type { StoreApi } from 'zustand';

type SetFunc = StoreApi<UIState>['setState'];
type GetFunc = StoreApi<UIState>['getState'];

export const useUIStore = create<UIState>()(
  persist(
    (set: SetFunc, get: GetFunc) => ({
      isNotificationsOpen: false,
      isMobileMenuOpen: false,
      isSidebarCollapsed: false,
      activeModal: null,
      modalData: null,
      toasts: [],
      isGlobalLoading: false,
      globalLoadingMessage: '',

      toggleNotifications: () =>
        set((s: UIState) => ({ isNotificationsOpen: !s.isNotificationsOpen })),

      setNotificationsOpen: (open: boolean) => set({ isNotificationsOpen: open }),

      toggleMobileMenu: () =>
        set((s: UIState) => ({ isMobileMenuOpen: !s.isMobileMenuOpen })),

      toggleSidebar: () =>
        set((s: UIState) => ({ isSidebarCollapsed: !s.isSidebarCollapsed })),

      openModal: (modal: string, data?: Record<string, unknown>) => set({ activeModal: modal, modalData: data || null }),

      closeModal: () => set({ activeModal: null, modalData: null }),

      addToast: (toast: Omit<Toast, 'id'>) => {
        const id = `toast-${++toastCounter}-${Date.now()}`;
        const newToast: Toast = { ...toast, id };
        set((s: UIState) => ({ toasts: [...s.toasts, newToast] }));
        setTimeout(() => { get().removeToast(id); }, toast.duration);
      },

      removeToast: (id: string) =>
        set((s: UIState) => ({ toasts: s.toasts.filter((t: Toast) => t.id !== id) })),

      setGlobalLoading: (loading: boolean, message = '') =>
        set({ isGlobalLoading: loading, globalLoadingMessage: message }),
    }),
    {
      name: 'uptimeops-ui',
      partialize: (state: UIState) => ({
        isSidebarCollapsed: state.isSidebarCollapsed,
      }),
    }
  )
);
