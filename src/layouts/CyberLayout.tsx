// ═══════════════════════════════════════════════════════════════
// CYBER LAYOUT — Unified Dashboard Shell (v2.2)
// Persistent collapsible left sidebar + top utility header
// Used by: HQ Control Center, Engineer Dashboard, Customer Dashboard
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/authStore';
import {
  LayoutDashboard, AlertTriangle, CreditCard, Shield,
  MessageSquare, Settings, LogOut, Zap, Terminal,
  Users, CheckSquare, ClipboardList,
  Radio, ChevronLeft, ChevronRight, ScanLine,
  ShieldCheck, Wifi, WifiOff, ChevronDown,
  User, Bell, ShieldAlert, HardHat, Building2, Crown
} from 'lucide-react';

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
}

// ── Navigation Config Per Role ──
const NAV_CONFIG: Record<string, NavItem[]> = {
  customer: [
    { label: 'Dashboard', path: '/customer', icon: LayoutDashboard },
    { label: 'Incidents', path: '/customer/incidents', icon: AlertTriangle },
    { label: 'Security', path: '/customer/security', icon: ShieldCheck },
    { label: 'Vault', path: '/customer/vault', icon: Shield },
    { label: 'Billing', path: '/customer/billing', icon: CreditCard },
    { label: 'Messages', path: '/customer/comms', icon: MessageSquare },
    { label: 'Settings', path: '/customer/settings', icon: Settings },
  ],
  engineer: [
    { label: 'Dashboard', path: '/engineer', icon: LayoutDashboard },
    { label: 'Incident Queue', path: '/engineer/sessions', icon: AlertTriangle },
    { label: 'Terminal', path: '/engineer/workspace', icon: Terminal },
    { label: 'On-Call', path: '/engineer/oncall', icon: Radio },
    { label: 'Audit', path: '/engineer/audit', icon: ClipboardList },
    { label: 'Security', path: '/engineer/security', icon: ScanLine },
    { label: 'Settings', path: '/engineer/settings', icon: Settings },
  ],
  coordinator: [
    { label: 'Control Center', path: '/hq', icon: LayoutDashboard },
    { label: 'Incidents', path: '/hq/incidents', icon: AlertTriangle },
    { label: 'Engineers', path: '/hq/engineers', icon: Users },
    { label: 'Approvals', path: '/hq/approvals', icon: CheckSquare },
    { label: 'Audit Trail', path: '/hq/audit', icon: ClipboardList },
    { label: 'Scanners', path: '/hq/scanners', icon: ScanLine },
    { label: 'Gap Seal', path: '/hq/gap-seal', icon: Shield },
    { label: 'Settings', path: '/hq/settings', icon: Settings },
  ],
  admin: [
    { label: 'Control Center', path: '/hq', icon: LayoutDashboard },
    { label: 'Incidents', path: '/hq/incidents', icon: AlertTriangle },
    { label: 'Engineers', path: '/hq/engineers', icon: Users },
    { label: 'Approvals', path: '/hq/approvals', icon: CheckSquare },
    { label: 'Audit Trail', path: '/hq/audit', icon: ClipboardList },
    { label: 'Scanners', path: '/hq/scanners', icon: ScanLine },
    { label: 'Gap Seal', path: '/hq/gap-seal', icon: Shield },
    { label: 'Settings', path: '/hq/settings', icon: Settings },
  ],
};

const ROLE_BADGE: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  admin:       { label: 'ADMIN',       color: 'text-rose border-rose/30 bg-rose-dim',       icon: Crown },
  coordinator: { label: 'COORDINATOR', color: 'text-lime border-lime/30 bg-lime-dim',       icon: ShieldAlert },
  engineer:    { label: 'ENGINEER',    color: 'text-cyan border-cyan/30 bg-cyan-dim',       icon: HardHat },
  customer:    { label: 'CUSTOMER',    color: 'text-magenta border-magenta/30 bg-magenta-dim', icon: Building2 },
};

interface Props {
  portalType: 'customer' | 'engineer' | 'coordinator' | 'admin';
}

export default function CyberLayout({ portalType }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const { user, role } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const [rtConnected, setRtConnected] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);

  // ── Realtime connection tracking ──
  useEffect(() => {
    const interval = setInterval(() => {
      setRtConnected(navigator.onLine);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const navItems = NAV_CONFIG[portalType] || NAV_CONFIG.customer;
  const badge = ROLE_BADGE[role] || ROLE_BADGE.customer;
  const isActive = (path: string) => location.pathname === path || (path !== '/' && location.pathname.startsWith(path));

  // ── Breadcrumb generation ──
  const crumbs = location.pathname.split('/').filter(Boolean);

  return (
    <div className="min-h-screen bg-void flex">
      {/* ════════════════ SIDEBAR ════════════════ */}
      <aside
        className={`fixed left-0 top-0 bottom-0 z-40 flex flex-col transition-all duration-300 ease-in-out border-r border-surface-border bg-void-deep ${
          collapsed ? 'w-16' : 'w-56'
        }`}
      >
        {/* Logo */}
        <div className="h-14 flex items-center px-4 border-b border-surface-border">
          <Zap className="w-5 h-5 text-lime shrink-0" />
          {!collapsed && (
            <span className="ml-2 text-sm font-black tracking-tight text-text-primary">
              UPTIME<span className="text-lime">OPS</span>
            </span>
          )}
        </div>

        {/* Role Badge */}
        <div className={`px-3 pt-3 ${collapsed ? 'flex justify-center' : ''}`}>
          <div className={`flex items-center gap-2 px-2 py-1.5 rounded border ${badge.color} ${collapsed ? 'w-8 h-8 justify-center px-0' : ''}`}>
            <badge.icon className={`w-3.5 h-3.5 shrink-0 ${collapsed ? '' : ''}`} />
            {!collapsed && <span className="text-[10px] font-black tracking-widest">{badge.label}</span>}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {navItems.map(item => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-semibold transition-all duration-150 ${
                isActive(item.path)
                  ? 'bg-lime-dim text-lime border border-lime/20'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-hover/50 border border-transparent'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-2 border-t border-surface-border space-y-1">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center px-3 py-2 rounded-md text-text-disabled hover:text-text-primary hover:bg-surface-hover/30 transition-all"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
          <button
            onClick={async () => { await signOut(); navigate('/'); }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs text-rose/60 hover:text-rose hover:bg-rose-dim transition-all"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* ════════════════ MAIN AREA ════════════════ */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out ${collapsed ? 'ml-16' : 'ml-56'}`}>
        {/* ── Top Utility Header ── */}
        <header className="h-14 bg-void-deep border-b border-surface-border flex items-center justify-between px-6 shrink-0">
          {/* Left: Breadcrumbs */}
          <nav className="flex items-center gap-2 text-xs text-text-muted">
            <button onClick={() => navigate(getHomePath(role))} className="hover:text-lime transition-colors">
              <Zap className="w-3.5 h-3.5" />
            </button>
            {crumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-2">
                <span className="text-surface-border">/</span>
                <span className={i === crumbs.length - 1 ? 'text-text-primary font-semibold capitalize' : 'capitalize'}>
                  {crumb}
                </span>
              </span>
            ))}
          </nav>

          {/* Right: Connection State + Profile */}
          <div className="flex items-center gap-4">
            {/* Connection Status */}
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${
              rtConnected
                ? 'text-lime border-lime/30 bg-lime-dim'
                : 'text-rose border-rose/30 bg-rose-dim'
            }`}>
              {rtConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              <span>{rtConnected ? 'LIVE' : 'OFFLINE'}</span>
            </div>

            {/* Notification Bell */}
            <button className="relative text-text-muted hover:text-text-primary transition-colors">
              <Bell className="w-4 h-4" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-rose rounded-full" />
            </button>

            {/* User Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 hover:bg-surface-hover/30 rounded-md px-2 py-1.5 transition-all"
              >
                <div className="w-7 h-7 rounded-full bg-lime-dim border border-lime/30 flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-lime" />
                </div>
                <div className={`text-left ${collapsed ? 'hidden md:block' : ''}`}>
                  <div className="text-[11px] font-semibold text-text-primary leading-tight">{user?.email?.split('@')[0] || 'User'}</div>
                  <div className="text-[10px] text-text-muted capitalize">{role}</div>
                </div>
                <ChevronDown className="w-3 h-3 text-text-muted" />
              </button>

              {profileOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-56 bg-surface-solid border border-surface-border rounded-md shadow-xl z-50 py-2">
                    <div className="px-3 py-2 border-b border-surface-border">
                      <div className="text-xs font-semibold text-text-primary truncate">{user?.email}</div>
                      <div className="text-[10px] text-text-muted mt-0.5 flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${rtConnected ? 'bg-lime' : 'bg-rose'}`} />
                        {rtConnected ? 'Realtime Connected' : 'Disconnected'}
                      </div>
                    </div>
                    <div className="py-1">
                      <button onClick={() => { setProfileOpen(false); navigate('/' + role + '/settings'); }} className="w-full text-left px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-hover/30 transition-colors">
                        Settings
                      </button>
                      <button onClick={async () => { setProfileOpen(false); await signOut(); navigate('/'); }} className="w-full text-left px-3 py-1.5 text-xs text-rose hover:text-rose hover:bg-rose-dim transition-colors">
                        Sign Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* ── Page Content ── */}
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function getHomePath(role: string): string {
  switch (role) {
    case 'customer': return '/customer';
    case 'engineer': return '/engineer';
    case 'coordinator':
    case 'admin': return '/hq';
    default: return '/';
  }
}
