// ═══════════════════════════════════════════════════════════════
// NOTIFICATION CENTER — Monochrome + lime only
// ═══════════════════════════════════════════════════════════════

import { Bell, CheckCircle, XCircle, AlertTriangle, Info, X, CheckCheck, Clock } from 'lucide-react';
import type { AppNotification } from './types';

interface NotificationCenterProps {
  notifications: AppNotification[];
  unreadCount: number;
  isOpen: boolean;
  onToggle: () => void;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onDismiss: (id: string) => void;
}

const typeIcons: Record<AppNotification['type'], typeof Info> = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
  alert: AlertTriangle,
};

// Monochrome type colors — only lime for success, white/gray for everything else
const typeColors: Record<AppNotification['type'], string> = {
  info: 'text-white/40',
  success: 'text-lime',
  warning: 'text-white/40',
  error: 'text-white/40',
  alert: 'text-white/40',
};

export function NotificationCenter({ notifications, unreadCount, isOpen, onToggle, onMarkRead, onMarkAllRead, onDismiss }: NotificationCenterProps) {
  return (
    <div className="relative">
      {/* Bell Button */}
      <button onClick={onToggle} className="relative p-2 text-white/40 hover:text-white transition-colors">
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-lime text-black text-[9px] font-bold flex items-center justify-center border border-void animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={onToggle} />
          <div className="absolute right-0 top-12 w-96 bg-surface border border-white/10 shadow-2xl z-50">
            <div className="p-3 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-lime" />
                <span className="text-xs font-bold uppercase tracking-wider">Notifications</span>
                {unreadCount > 0 && (
                  <span className="text-[10px] text-lime font-bold">{unreadCount} new</span>
                )}
              </div>
              {unreadCount > 0 && (
                <button onClick={onMarkAllRead} className="flex items-center gap-1 text-[10px] text-white/30 hover:text-white/60 transition-colors">
                  <CheckCheck className="w-3 h-3" />
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-6 text-center">
                  <Bell className="w-6 h-6 text-white/10 mx-auto mb-2" />
                  <p className="text-xs text-white/30">No notifications</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {notifications.map(notif => {
                    const Icon = typeIcons[notif.type];
                    return (
                      <div
                        key={notif.id}
                        className={`p-3 transition-colors ${!notif.read ? 'bg-lime/[0.02]' : ''} hover:bg-white/[0.01]`}
                        onClick={() => onMarkRead(notif.id)}
                      >
                        <div className="flex items-start gap-3">
                          <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${typeColors[notif.type]}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold ${!notif.read ? 'text-white' : 'text-white/50'}`}>{notif.title}</span>
                              {!notif.read && <div className="w-1.5 h-1.5 rounded-full bg-lime flex-shrink-0" />}
                            </div>
                            <p className="text-[10px] text-white/40 mt-0.5 leading-relaxed">{notif.message}</p>
                            <div className="flex items-center justify-between mt-1.5">
                              <span className="text-[9px] text-white/15 font-mono flex items-center gap-1">
                                <Clock className="w-2 h-2" />
                                {new Date(notif.createdAt).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <div className="flex items-center gap-2">
                                {notif.actionLabel && (
                                  <button className="text-[9px] text-white/40 hover:text-white/60 transition-colors font-bold uppercase">
                                    {notif.actionLabel}
                                  </button>
                                )}
                                <button onClick={e => { e.stopPropagation(); onDismiss(notif.id); }} className="text-white/15 hover:text-white/30 transition-colors">
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
