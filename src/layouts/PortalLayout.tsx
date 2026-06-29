// ═══════════════════════════════════════════════════════════════
// PORTAL LAYOUT — Sidebar navigation for all authenticated portals
// Adapts links based on user role (customer/engineer/coordinator)
// ═══════════════════════════════════════════════════════════════

import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

import {
  LayoutDashboard, AlertTriangle, CreditCard, Shield,
  MessageSquare, Settings, LogOut, Zap, Terminal,
  Users, BarChart3, CheckSquare, ClipboardList,
  Radio, ChevronLeft, ChevronRight, ScanLine,
  FileCode2, ShieldCheck
} from 'lucide-react';
import { useState } from 'react';

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
}

// All paths are absolute — matches the Routes in App.tsx
const NAV_CONFIG: Record<string, NavItem[]> = {
  customer: [
    { label: 'Dashboard', path: '/customer', icon: LayoutDashboard },
    { label: 'Incidents', path: '/customer/incidents', icon: AlertTriangle },
    { label: 'Billing', path: '/customer/billing', icon: CreditCard },
    { label: 'Vault', path: '/customer/vault', icon: Shield },
    { label: 'Messages', path: '/customer/comms', icon: MessageSquare },
    { label: 'Security', path: '/customer/security', icon: ShieldCheck },
    { label: 'Settings', path: '/customer/settings', icon: Settings },
  ],
  engineer: [
    { label: 'Workspace', path: '/engineer', icon: LayoutDashboard },
    { label: 'My Incidents', path: '/engineer/sessions', icon: AlertTriangle },
    { label: 'Terminal', path: '/engineer/workspace/default', icon: Terminal },
    { label: 'Credentials', path: '/engineer/audit', icon: Shield },
    { label: 'On-Call', path: '/engineer/oncall', icon: Radio },
    { label: 'Security', path: '/engineer/security', icon: ScanLine },
    { label: 'Settings', path: '/engineer/settings', icon: Settings },
  ],
  coordinator: [
    { label: 'Control Center', path: '/hq', icon: LayoutDashboard },
    { label: 'Incidents', path: '/hq/incidents', icon: AlertTriangle },
    { label: 'Analytics', path: '/hq/approvals', icon: BarChart3 },
    { label: 'Engineers', path: '/hq/engineers', icon: Users },
    { label: 'Approvals', path: '/hq/approvals', icon: CheckSquare },
    { label: 'Audit Trail', path: '/hq/audit', icon: ClipboardList },
    { label: 'Comms', path: '/hq/communications', icon: MessageSquare },
    { label: 'Gap Seal', path: '/hq/gap-seal', icon: Shield },
    { label: 'Scanners', path: '/hq/scanners', icon: ScanLine },
    { label: 'Guidelines', path: '/hq/guidelines', icon: FileCode2 },
    { label: 'Settings', path: '/hq/settings', icon: Settings },
  ],
  admin: [
    { label: 'Control Center', path: '/hq', icon: LayoutDashboard },
    { label: 'Incidents', path: '/hq/incidents', icon: AlertTriangle },
    { label: 'Analytics', path: '/hq/approvals', icon: BarChart3 },
    { label: 'Engineers', path: '/hq/engineers', icon: Users },
    { label: 'Approvals', path: '/hq/approvals', icon: CheckSquare },
    { label: 'Audit Trail', path: '/hq/audit', icon: ClipboardList },
    { label: 'Comms', path: '/hq/communications', icon: MessageSquare },
    { label: 'Gap Seal', path: '/hq/gap-seal', icon: Shield },
    { label: 'Scanners', path: '/hq/scanners', icon: ScanLine },
    { label: 'Guidelines', path: '/hq/guidelines', icon: FileCode2 },
    { label: 'Settings', path: '/hq/settings', icon: Settings },
  ],
};

interface PortalLayoutProps {
  portalType: 'customer' | 'engineer' | 'coordinator' | 'admin';
}

export function PortalLayout({ portalType }: PortalLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const navItems = NAV_CONFIG[portalType] || NAV_CONFIG.customer;

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    return location.pathname.startsWith(path) && path !== '/';
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex">
      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 bottom-0 z-40 bg-[#0e0e14] border-r border-white/5 flex flex-col transition-all duration-200 ${
          collapsed ? 'w-16' : 'w-56'
        }`}
      >
        {/* Logo */}
        <div className="h-14 flex items-center px-4 border-b border-white/5">
          <Zap className="w-5 h-5 text-[#a3e635] shrink-0" />
          {!collapsed && (
            <span className="ml-2 text-sm font-black tracking-tight">
              UPTIME<span className="text-[#a3e635]">OPS</span>
            </span>
          )}
        </div>

        {/* Nav Links */}
        <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
          {navItems.map(item => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                isActive(item.path)
                  ? 'bg-[#a3e635]/10 text-[#a3e635] border border-[#a3e635]/20'
                  : 'text-white/50 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-2 border-t border-white/5 space-y-1">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center px-3 py-2 rounded-lg text-white/30 hover:text-white hover:bg-white/5 transition-all"
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
          <button
            onClick={async () => { await signOut(); navigate('/'); }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 min-h-screen transition-all duration-200 ${collapsed ? 'ml-16' : 'ml-56'}`}>
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
