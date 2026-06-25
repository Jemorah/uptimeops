import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  Zap, LayoutDashboard, AlertTriangle, Activity,
  Settings, LogOut, ChevronLeft, Shield, ShieldCheck, Users, BarChart3,
  Terminal, Clock, FileText, Bell, Lock, Code2, Mail, CreditCard
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import type { UserRole } from '@/lib/supabase/client';

interface PortalLayoutProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

const portalConfig: Record<string, { label: string; links: { label: string; path: string; icon: React.ElementType }[] }> = {
  customer: {
    label: 'Customer Portal',
    links: [
      { label: 'Dashboard', path: '/customer', icon: LayoutDashboard },
      { label: 'Incidents', path: '/customer/incidents', icon: AlertTriangle },
      { label: 'Credential Vault', path: '/customer/vault', icon: Lock },
      { label: 'Communications', path: '/customer/comms', icon: Mail },
      { label: 'Subscription', path: '/customer/billing', icon: FileText },
      { label: 'Settings', path: '/customer/settings', icon: Settings },
    ],
  },
  temporary: {
    label: 'Fix Dashboard',
    links: [
      { label: 'Overview', path: '/fix/:ticketId', icon: LayoutDashboard },
      { label: 'Live Log', path: '/fix/:ticketId/log', icon: Terminal },
      { label: 'AI Progress', path: '/fix/:ticketId/ai', icon: Activity },
    ],
  },
  engineer: {
    label: 'Engineer Portal',
    links: [
      { label: 'Dashboard', path: '/engineer', icon: LayoutDashboard },
      { label: 'Active Sessions', path: '/engineer/sessions', icon: Terminal },
      { label: 'On-Call', path: '/engineer/oncall', icon: Clock },
      { label: 'Audit Trail', path: '/engineer/audit', icon: FileText },
      { label: 'Settings', path: '/engineer/settings', icon: Settings },
    ],
  },
  workspace: {
    label: 'Workspace',
    links: [
      { label: 'Back to Dashboard', path: '/engineer', icon: LayoutDashboard },
      { label: 'VM Terminal', path: '/engineer/workspace/:incidentId', icon: Terminal },
      { label: 'Code Editor', path: '/engineer/workspace/:incidentId', icon: Code2 },
      { label: 'AI Logs', path: '/engineer/workspace/:incidentId', icon: Activity },
      { label: 'Chat', path: '/engineer/workspace/:incidentId', icon: FileText },
    ],
  },
  hq: {
    label: 'HQ Control Center',
    links: [
      { label: 'Dashboard', path: '/hq', icon: BarChart3 },
      { label: 'Incidents', path: '/hq/incidents', icon: AlertTriangle },
      { label: 'Approvals', path: '/hq/approvals', icon: ShieldCheck },
      { label: 'Customers', path: '/hq', icon: Users },
      { label: 'Engineers', path: '/hq/engineers', icon: Users },
      { label: 'Subscriptions', path: '/hq', icon: CreditCard },
      { label: 'Communications', path: '/hq/communications', icon: Mail },
      { label: 'Audit Log', path: '/hq/audit', icon: FileText },
      { label: 'AI Costs', path: '/hq', icon: Zap },
      { label: 'Settings', path: '/hq/settings', icon: Settings },
    ],
  },
};

export function PortalLayout({ children, allowedRoles }: PortalLayoutProps) {
  const { role, isLoading, isAuthenticated, signOut, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login', { replace: true });
    }
    if (!isLoading && isAuthenticated && !allowedRoles.includes(role)) {
      navigate('/', { replace: true });
    }
  }, [isLoading, isAuthenticated, role, allowedRoles, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Zap className="w-6 h-6 text-lime animate-pulse" />
          <span className="text-white/60 font-mono text-sm">INITIALIZING...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !allowedRoles.includes(role)) {
    return null;
  }

  const pathParts = location.pathname.split('/');
  const portalKey = pathParts[1] === 'engineer' && pathParts[2] === 'workspace'
    ? 'workspace'
    : pathParts[1];
  const config = portalConfig[portalKey] || portalConfig.customer;

  return (
    <div className="min-h-screen bg-void flex">
      <aside
        className={`fixed left-0 top-0 bottom-0 bg-surface border-r border-white/5 z-40 transition-all duration-300 ${
          sidebarCollapsed ? 'w-16' : 'w-64'
        } hidden lg:flex flex-col`}
      >
        <div className="h-16 flex items-center px-4 border-b border-white/5">
          <Link to="/" className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-lime flex-shrink-0" />
            {!sidebarCollapsed && (
              <span className="text-sm font-bold tracking-tight truncate">
                {config.label.toUpperCase()}
              </span>
            )}
          </Link>
        </div>

        <nav className="flex-1 py-4 space-y-1 px-2">
          {config.links.map((link) => {
            const isActive = location.pathname === link.path.replace(':ticketId', location.pathname.split('/')[2] || '');
            return (
              <Link
                key={link.label}
                to={link.path.replace(':ticketId', location.pathname.split('/')[2] || '')}
                className={`flex items-center gap-3 px-3 py-2 rounded-sm text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-lime/10 text-lime'
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
                title={sidebarCollapsed ? link.label : undefined}
              >
                <link.icon className="w-4 h-4 flex-shrink-0" />
                {!sidebarCollapsed && link.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-2 border-t border-white/5 space-y-1">
          {user?.email && !sidebarCollapsed && (
            <div className="px-3 py-2 text-xs text-white/40 truncate font-mono">
              {user.email}
            </div>
          )}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-3 px-3 py-2 rounded-sm text-sm text-white/40 hover:text-white hover:bg-white/5 transition-colors w-full"
          >
            <ChevronLeft className="w-4 h-4" />
            {!sidebarCollapsed && 'Back to Site'}
          </button>
          <button
            onClick={() => signOut()}
            className="flex items-center gap-3 px-3 py-2 rounded-sm text-sm text-white/40 hover:text-magenta hover:bg-white/5 transition-colors w-full"
          >
            <LogOut className="w-4 h-4" />
            {!sidebarCollapsed && 'Sign Out'}
          </button>
        </div>
      </aside>

      <div className={`flex-1 lg:ml-64 min-h-screen flex flex-col`}>
        <header className="h-16 bg-surface/50 border-b border-white/5 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden lg:block text-white/40 hover:text-white transition-colors"
            >
              <BarChart3 className="w-5 h-5" />
            </button>
            <h1 className="text-sm font-semibold text-white/80">
              {config.links.find(l => {
                const resolvedPath = l.path.replace(':ticketId', location.pathname.split('/')[2] || '');
                return location.pathname === resolvedPath;
              })?.label || 'Dashboard'}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-lime" />
              <span className="text-xs text-white/40 font-mono uppercase">{role}</span>
            </div>
            <Bell className="w-4 h-4 text-white/40 hover:text-white transition-colors cursor-pointer" />
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
