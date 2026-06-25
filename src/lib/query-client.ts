// ═══════════════════════════════════════════════════════════════
// TANSTACK QUERY — Server State Management
// Optimized for UptimeOps real-time incident data
// ═══════════════════════════════════════════════════════════════

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Global defaults
      staleTime: 30 * 1000,        // 30s before data is considered stale
      gcTime: 5 * 60 * 1000,       // 5min cache garbage collection
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchOnMount: true,
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors (client errors)
        if (error instanceof Error && error.message.includes('4')) {
          return false;
        }
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 30000),
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
});

// Query key factory for type-safe cache keys
export const queryKeys = {
  // Auth
  auth: {
    session: ['auth', 'session'] as const,
    user: ['auth', 'user'] as const,
  },
  // Incidents
  incidents: {
    all: (filter?: string) => ['incidents', 'all', filter] as const,
    byId: (id: string) => ['incidents', 'detail', id] as const,
    queue: ['incidents', 'queue'] as const,
    myQueue: ['incidents', 'my-queue'] as const,
  },
  // Customers
  customers: {
    all: ['customers', 'all'] as const,
    byId: (id: string) => ['customers', 'detail', id] as const,
    vault: (id: string) => ['customers', 'vault', id] as const,
  },
  // Subscriptions
  subscriptions: {
    all: ['subscriptions', 'all'] as const,
    byId: (id: string) => ['subscriptions', 'detail', id] as const,
    mrr: ['subscriptions', 'mrr'] as const,
  },
  // Engineers
  engineers: {
    all: ['engineers', 'all'] as const,
    online: ['engineers', 'online'] as const,
  },
  // Audit
  audit: {
    all: (filters?: Record<string, string>) => ['audit', 'all', filters] as const,
  },
  // Communications
  communications: {
    byIncident: (id: string) => ['communications', 'incident', id] as const,
    templates: ['communications', 'templates'] as const,
  },
  // Pipeline
  pipeline: {
    byId: (id: string) => ['pipeline', id] as const,
  },
  // Dashboard metrics
  metrics: {
    overview: ['metrics', 'overview'] as const,
    revenue: ['metrics', 'revenue'] as const,
    aiCosts: ['metrics', 'ai-costs'] as const,
    uptime: ['metrics', 'uptime'] as const,
  },
};

// Prefetch helpers for common data patterns
export const prefetchers = {
  async incidentList(filter?: string) {
    // Prefetch first page
    await queryClient.prefetchQuery({
      queryKey: queryKeys.incidents.all(filter),
      staleTime: 10 * 1000,
    });
  },

  async engineerList() {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.engineers.online,
      staleTime: 60 * 1000,
    });
  },
};
