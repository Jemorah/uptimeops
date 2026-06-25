// ═══════════════════════════════════════════════════════════════
// NOTIFICATIONS HOOK
// In-app notification center with real-time badges
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback } from 'react';
import type { AppNotification } from '@/components/communication/types';

const INITIAL_NOTIFICATIONS: AppNotification[] = [
  { id: 'notif-1', title: 'Fix Deployed',          message: 'ESC-2049 fix has been deployed to acme-corp.com',                         type: 'success',   read: false, incidentId: 'ESC-2049', createdAt: '2024-06-25T14:48:00Z', actionUrl: '/fix/ESC-2049', actionLabel: 'Verify' },
  { id: 'notif-2', title: 'Verification Requested', message: 'Please confirm your site is working (5 min after fix)',                    type: 'info',      read: false, incidentId: 'ESC-2049', createdAt: '2024-06-25T14:53:00Z', actionUrl: null, actionLabel: null },
  { id: 'notif-3', title: 'Payment Confirmed',      message: '$299 received for Critical Fix — Ticket ESC-2049 created',                type: 'success',   read: true,  incidentId: 'ESC-2049', createdAt: '2024-06-25T14:30:00Z', actionUrl: '/customer/incidents', actionLabel: 'View' },
  { id: 'notif-4', title: 'Security Alert',         message: 'SSL certificate expires in 42 days — secure.finance.co',                    type: 'warning',   read: false, incidentId: 'ESC-2046', createdAt: '2024-06-25T12:00:00Z', actionUrl: '/customer/incidents', actionLabel: 'Review' },
  { id: 'notif-5', title: 'Monthly Report Ready',   message: 'Your June health report is available — Security score: 87/100',              type: 'info',      read: true,  incidentId: null,       createdAt: '2024-06-01T09:00:00Z', actionUrl: '/customer/billing', actionLabel: 'Download' },
  { id: 'notif-6', title: 'Link Expiry Warning',    message: 'Your temporary dashboard access expires in 24h — Download audit report now',  type: 'warning',   read: false, incidentId: 'ESC-2031', createdAt: '2024-06-24T10:00:00Z', actionUrl: '/fix/ESC-2031', actionLabel: 'Download' },
  { id: 'notif-7', title: 'Critical Blocker',       message: 'ESC-2048: Smoke test failure — fix delayed, senior engineer assigned',       type: 'error',     read: false, incidentId: 'ESC-2048', createdAt: '2024-06-25T13:50:00Z', actionUrl: '/engineer', actionLabel: 'Details' },
  { id: 'notif-8', title: 'Credential Revoked',     message: 'SFTP credentials for startup.io have been purged — Zero residual access',    type: 'success',   read: true,  incidentId: null,       createdAt: '2024-06-24T18:00:00Z', actionUrl: null, actionLabel: null },
];

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS);
  const [isOpen, setIsOpen] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const addNotification = useCallback((notif: Omit<AppNotification, 'id' | 'createdAt'>) => {
    const newNotif: AppNotification = {
      ...notif,
      id: `notif-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setNotifications(prev => [newNotif, ...prev]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return {
    notifications,
    unreadCount,
    isOpen,
    setIsOpen,
    markRead,
    markAllRead,
    addNotification,
    dismiss,
  };
}
