// ═══════════════════════════════════════════════════════════════
// CUSTOMER COMMUNICATIONS PAGE
// Preferences, notification history, one-time dashboard, subscription
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import { Mail, Bell, LayoutDashboard, FileText, TrendingUp } from 'lucide-react';
import { useCommunicationSystem } from '@/hooks/useCommunicationSystem';
import { useNotifications } from '@/hooks/useNotifications';
import { CommunicationMatrix } from '@/components/communication/CommunicationMatrix';
import { CommLogViewer } from '@/components/communication/CommLogViewer';
import { PreferenceSettings } from '@/components/communication/PreferenceSettings';
import { NotificationCenter } from '@/components/communication/NotificationCenter';
import { OneTimeDashboard } from '@/components/communication/OneTimeDashboard';
import { SubscriptionDashboard } from '@/components/communication/SubscriptionDashboard';

type CommTab = 'overview' | 'notifications' | 'preferences' | 'history' | 'matrix' | 'onetime' | 'subscription';

const TABS: { key: CommTab; label: string; icon: React.ElementType }[] = [
  { key: 'overview',     label: 'Overview',      icon: LayoutDashboard },
  { key: 'notifications',label: 'Notifications', icon: Bell },
  { key: 'preferences',  label: 'Preferences',   icon: Mail },
  { key: 'history',      label: 'History',       icon: FileText },
  { key: 'matrix',       label: 'Matrix',        icon: Mail },
  { key: 'onetime',      label: 'Fix Dashboard', icon: FileText },
  { key: 'subscription', label: 'Subscription',  icon: TrendingUp },
];

export function CustomerComms() {
  const [activeTab, setActiveTab] = useState<CommTab>('overview');
  const comms = useCommunicationSystem();
  const notifs = useNotifications();

  const stats = [
    { label: 'Total Sent', value: comms.stats.totalSent },
    { label: 'Delivered', value: comms.stats.delivered },
    { label: 'Failed', value: comms.stats.failed },
    { label: 'Opened', value: comms.stats.opened },
    { label: 'Pending Retry', value: comms.stats.pendingRetry },
    { label: 'Unread', value: notifs.unreadCount },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">COMMUNICATIONS</h2>
          <p className="text-sm text-white/40 mt-1">Manage your notifications, preferences, and message history</p>
        </div>
        <NotificationCenter
          notifications={notifs.notifications}
          unreadCount={notifs.unreadCount}
          isOpen={notifs.isOpen}
          onToggle={() => notifs.setIsOpen(!notifs.isOpen)}
          onMarkRead={notifs.markRead}
          onMarkAllRead={notifs.markAllRead}
          onDismiss={notifs.dismiss}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map(s => (
          <div key={s.label} className="bg-surface border border-white/5 p-3 text-center">
            <div className="text-lg font-black font-mono text-white/70">{s.value}</div>
            <div className="text-[10px] text-white/30 uppercase tracking-wider">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold uppercase whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.key ? 'border-lime text-lime' : 'border-transparent text-white/30 hover:text-white/50'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div>
        {activeTab === 'overview' && (
          <div className="grid lg:grid-cols-2 gap-6">
            {comms.preferences ? (
              <PreferenceSettings preferences={comms.preferences} onUpdate={comms.updatePreferences} />
            ) : (
              <div className="bg-surface border border-white/5 p-6 text-center">
                <p className="text-xs text-white/30">Loading preferences...</p>
              </div>
            )}
            <div className="space-y-6">
              <div className="bg-surface border border-white/5 p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-white/50 mb-3">Recent Notifications</h4>
                <div className="space-y-2">
                  {notifs.notifications.slice(0, 4).map(n => (
                    <div key={n.id} className={`flex items-start gap-2 p-2 ${!n.read ? 'bg-lime/[0.02]' : ''}`}>
                      <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${!n.read ? 'bg-lime' : 'bg-white/10'}`} />
                      <div>
                        <div className={`text-xs ${!n.read ? 'font-bold text-white/70' : 'text-white/40'}`}>{n.title}</div>
                        <div className="text-[10px] text-white/20">{n.message}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <OneTimeDashboard />
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-3">
            {notifs.notifications.map(n => (
              <div key={n.id} className={`flex items-start gap-3 p-3 bg-surface border border-white/5 ${!n.read ? 'border-lime/10' : ''}`}>
                <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${!n.read ? 'bg-lime' : 'bg-white/10'}`} />
                <div className="flex-1">
                  <div className={`text-xs ${!n.read ? 'font-bold text-white' : 'text-white/50'}`}>{n.title}</div>
                  <p className="text-xs text-white/30 mt-1">{n.message}</p>
                  <div className="flex items-center gap-3 mt-2">
                    {!n.read && <button onClick={() => notifs.markRead(n.id)} className="text-[10px] text-white/40 hover:text-white/60">Mark read</button>}
                    {n.actionLabel && <button className="text-[10px] text-lime hover:text-lime/70">{n.actionLabel}</button>}
                    <button onClick={() => notifs.dismiss(n.id)} className="text-[10px] text-white/20 hover:text-white/40">Dismiss</button>
                  </div>
                </div>
                <span className="text-[10px] text-white/15 font-mono">{new Date(n.createdAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'preferences' && (
          comms.preferences ? (
            <PreferenceSettings preferences={comms.preferences} onUpdate={comms.updatePreferences} />
          ) : (
            <div className="bg-surface border border-white/5 p-6 text-center">
              <p className="text-xs text-white/30">Loading preferences...</p>
            </div>
          )
        )}

        {activeTab === 'history' && (
          <CommLogViewer logs={comms.logs} onRetry={comms.retryDelivery} />
        )}

        {activeTab === 'matrix' && (
          <CommunicationMatrix />
        )}

        {activeTab === 'onetime' && (
          <OneTimeDashboard />
        )}

        {activeTab === 'subscription' && (
          <SubscriptionDashboard />
        )}
      </div>
    </div>
  );
}
