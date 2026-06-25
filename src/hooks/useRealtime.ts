// ═══════════════════════════════════════════════════════════════
// HOOK: useRealtime
// Subscribe to Supabase Realtime changes with React integration
// Auto-subscribe on mount, cleanup on unmount
// ═══════════════════════════════════════════════════════════════

import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useStore } from '@/lib/store';

interface RealtimeOptions {
  table: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
  enabled?: boolean;
}

/**
 * Subscribe to real-time database changes
 * Usage:
 *   useRealtime({
 *     table: 'incidents',
 *     event: 'UPDATE',
 *     filter: `id=eq.${incidentId}`,
 *   }, (payload) => {
 *     console.log('Incident updated:', payload.new);
 *   });
 */
export function useRealtime(
  options: RealtimeOptions,
  onChange: (payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }) => void
) {
  const { table, event = '*', filter, enabled = true } = options;
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const callbackRef = useRef(onChange);

  // Keep callback ref fresh without re-subscribing
  callbackRef.current = onChange;

  useEffect(() => {
    if (!enabled) return;

    const channelName = `rt-${table}-${event}-${filter || 'all'}-${Date.now()}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes' as never,
        {
          event,
          schema: 'public',
          table,
          filter,
        },
        (payload) => {
          callbackRef.current({
            eventType: payload.eventType,
            new: payload.new as Record<string, unknown>,
            old: payload.old as Record<string, unknown>,
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Successfully subscribed
        }
        if (status === 'CHANNEL_ERROR') {
          console.error(`[Realtime] Channel error on ${table}`);
        }
        if (status === 'TIMED_OUT') {
          console.warn(`[Realtime] Subscribe timeout on ${table}`);
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [table, event, filter, enabled]);
}

/**
 * Hook: Subscribe to incident updates and auto-refresh state
 */
export function useIncidentRealtime(incidentId: string | null) {
  const updateIncident = useStore((s) => s.updateIncident);

  useRealtime(
    {
      table: 'incidents',
      event: 'UPDATE',
      filter: incidentId ? `id=eq.${incidentId}` : undefined,
      enabled: !!incidentId,
    },
    useCallback(
      (payload) => {
        if (incidentId && payload.eventType === 'UPDATE') {
          updateIncident(incidentId, payload.new as Partial<{ status: string; ai_confidence: number }>);
        }
      },
      [incidentId, updateIncident]
    )
  );
}

/**
 * Hook: Subscribe to the incident queue (for engineer dashboards)
 */
export function useIncidentQueueRealtime() {
  const addIncident = useStore((s) => s.addIncident);
  const addNotification = useStore((s) => s.addNotification);

  useRealtime(
    { table: 'incidents', event: 'INSERT', enabled: true },
    useCallback(
      (payload) => {
        if (payload.eventType === 'INSERT') {
          addIncident(payload.new as unknown as Parameters<typeof addIncident>[0]);
          addNotification({
            id: `notif-${Date.now()}`,
            type: 'new_incident',
            message: `New incident: ${payload.new.title || 'Unknown'}`,
            read: false,
            created_at: new Date().toISOString(),
            entity_type: 'incident',
            entity_id: payload.new.id as string,
          });
        }
      },
      [addIncident, addNotification]
    )
  );
}

/**
 * Hook: Subscribe to audit log insertions (for HQ dashboard)
 */
export function useAuditLogRealtime() {
  useRealtime(
    { table: 'audit_logs', event: 'INSERT', enabled: true },
    useCallback((payload) => {
      // Dispatch a custom event that components can listen to
      window.dispatchEvent(
        new CustomEvent('audit-log-insert', {
          detail: payload.new,
        })
      );
    }, [])
  );
}

/**
 * Hook: Subscribe to engineer presence updates
 */
export function useEngineerPresenceRealtime() {
  const updatePresence = useStore((s) => s.updatePresence);

  useRealtime(
    { table: 'engineer_profiles', event: 'UPDATE', enabled: true },
    useCallback(
      (payload) => {
        if (payload.eventType === 'UPDATE') {
          const userId = payload.new.id as string;
          const status = payload.new.is_on_call
            ? 'online'
            : payload.new.last_heartbeat_at
            ? 'away'
            : 'offline';
          updatePresence(userId, status as 'online' | 'away' | 'offline');
        }
      },
      [updatePresence]
    )
  );
}
