// ═══════════════════════════════════════════════════════════════
// INCIDENT STORE — Zustand, survives page navigation
// Manages selected incident, filters, workspace state.
// ═══════════════════════════════════════════════════════════════

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface IncidentFilters {
  status: string[];
  priority: string[];
  search: string;
  dateRange: string | null;
}

interface IncidentState {
  // Selected incident (persists across page nav)
  selectedIncidentId: string | null;

  // Filters
  filters: IncidentFilters;

  // Workspace state
  activeWorkspaceTab: string;
  activeAgentStage: string;

  // Pagination
  page: number;
  pageSize: number;

  // Actions
  setSelectedIncident: (id: string | null) => void;
  setFilters: (filters: Partial<IncidentFilters>) => void;
  clearFilters: () => void;
  setActiveWorkspaceTab: (tab: string) => void;
  setActiveAgentStage: (stage: string) => void;
  setPage: (page: number) => void;
}

export const useIncidentStore = create<IncidentState>()(
  persist(
    (set) => ({
      selectedIncidentId: null,
      filters: {
        status: [],
        priority: [],
        search: '',
        dateRange: null,
      },
      activeWorkspaceTab: 'overview',
      activeAgentStage: 'triage',
      page: 1,
      pageSize: 25,

      setSelectedIncident: (id) => set({ selectedIncidentId: id }),

      setFilters: (filters) =>
        set((s) => ({ filters: { ...s.filters, ...filters } })),

      clearFilters: () =>
        set({
          filters: {
            status: [],
            priority: [],
            search: '',
            dateRange: null,
          },
          page: 1,
        }),

      setActiveWorkspaceTab: (tab) => set({ activeWorkspaceTab: tab }),

      setActiveAgentStage: (stage) => set({ activeAgentStage: stage }),

      setPage: (page) => set({ page }),
    }),
    {
      name: 'uptimeops-incidents',
      partialize: (state) => ({
        selectedIncidentId: state.selectedIncidentId,
        filters: state.filters,
        activeWorkspaceTab: state.activeWorkspaceTab,
      }),
    }
  )
);
