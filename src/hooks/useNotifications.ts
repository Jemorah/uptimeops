// ═══════════════════════════════════════════════════════════════
// NOTIFICATIONS HOOK — v2.1
// Real Supabase notifications table. No mock data.
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'alert';
  read: boolean;
  incidentId: string | null;
  createdAt: string;
  actionUrl: string | null;
  actionLabel: string | null;
  customerId: string | null;
}

interface UseNotificationsReturn {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  addNotification: (notif: Omit<AppNotification, 'id' | 'createdAt'>) => Promise<void>;
  dismiss: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useNotifications(customerId?: string | null): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (customerId) {
        query = query.eq('customer_id', customerId);
      }

      const { data, error: dbError } = await query;
      if (dbError) throw dbError;

      const mapped: AppNotification[] = (data || []).map((n: any) => ({
        id: n.id,
        title: n.metadata?.title || n.type?.charAt(0).toUpperCase() + n.type?.slice(1) || 'Notification',
        message: n.message || '',
        type: (n.metadata?.type as AppNotification['type']) || 'info',
        read: n.read || false,
        incidentId: n.entity_id || null,
        createdAt: n.created_at,
        actionUrl: n.metadata?.action_url || null,
        actionLabel: n.metadata?.action_label || null,
        customerId: n.customer_id || null,
      }));

      setNotifications(mapped);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markRead = useCallback(async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllRead = useCallback(async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from('notifications').update({ read: true }).in('id', unreadIds);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, [notifications]);

  const addNotification = useCallback(async (notif: Omit<AppNotification, 'id' | 'createdAt'>) => {
    const { data, error } = await supabase.from('notifications').insert({
      customer_id: notif.customerId,
      type: notif.type,
      message: notif.message,
      entity_type: 'notification',
      entity_id: notif.incidentId,
      read: false,
      metadata: { title: notif.title, type: notif.type, action_url: notif.actionUrl, action_label: notif.actionLabel },
    }).select().single();

    if (!error && data) {
      const newNotif: AppNotification = {
        ...notif,
        id: data.id,
        createdAt: data.created_at,
      };
      setNotifications(prev => [newNotif, ...prev]);
    }
  }, []);

  const dismiss = useCallback(async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    isOpen,
    setIsOpen,
    markRead,
    markAllRead,
    addNotification,
    dismiss,
    refresh: fetchNotifications,
  };
}
