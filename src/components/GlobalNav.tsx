// ═══════════════════════════════════════════════════════════════
// GLOBAL NAVIGATION — Cross-Portal Navigation Bar
// Visible on all authenticated pages, adapts to user role
// ═══════════════════════════════════════════════════════════════

import { Link, useLocation } from 'react-router-dom';
import {
  Zap, Home, CreditCard, LayoutDashboard, Terminal,
  Shield, Bell, User, LogOut, Radio
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useStore } from '@/lib/store';

export function GlobalNav() {
  const location = useLocation();
  const { user, role, isAuthenticated, signOut } = useAuth();
  const { unreadCount } = useStore();

  if (!isAuthenticated) return null;

  const isActive = (path: string) => location.pathname.startsWith(path);

  const navItems: Array<{ label: string; path: string; icon: React.ElementType; roles: string[] }> = [
    { label: 'Home', path: '/', icon: Home, roles: ['public', 'customer', 'engineer', 'coordinator', 'admin'] },
    { label: 'Dashboard', path: '/customer', icon: LayoutDashboard, roles: ['customer', 'coordinator', 'admin'] },
    { label: 'Engineer', path: '/engineer', icon: Terminal, roles: ['engineer', 'coordinator', 'admin'] },
    { label: 'HQ Center', path: '/hq', icon: Shield, roles: ['coordinator', 'admin'] },
    { label: 'Gap Seal', path: '/hq/gap-seal', icon: Shield, roles: ['coordinator', 'admin'] },
    { label: 'Pricing', path: '/pricing', icon: CreditCard, roles: ['public', 'customer', 'engineer', 'coordinator', 'admin'] },
  ];

  const visibleItems = navItems.filter(item =>
    item.roles.includes(role || 'public')
  );

  return (
    <div className="fixed top-0 left-0 right-0 z-40 h-10 bg-void/90 backdrop-blur border-b border-white/5 flex items-center px-4 gap-1">
      {/* Brand */}
      <Link to="/" className="flex items-center gap-1.5 mr-4 shrink-0">
        <Zap className="w-3.5 h-3.5 text-lime" />
        <span className="text-[10px] font-black tracking-[0.2em] uppercase text-white/70 hidden sm:block">
          Uptime<span className="text-lime">Ops</span>
        </span>
      </Link>

      {/* Nav items */}
      <div className="flex items-center gap-0.5 flex-1 overflow-hidden">
        {visibleItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
              isActive(item.path)
                ? 'text-lime bg-lime/10 border border-lime/20'
                : 'text-white/30 hover:text-white/60 hover:bg-white/5 border border-transparent'
            }`}
          >
            <item.icon className="w-3 h-3" />
            <span className="hidden md:inline">{item.label}</span>
          </Link>
        ))}
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Role badge */}
        <span className="px-1.5 py-0.5 text-[8px] font-bold uppercase bg-white/5 text-white/30 border border-white/10 hidden sm:block">
          {role}
        </span>

        {/* Notifications */}
        <button className="relative p-1.5 hover:bg-white/5 transition-colors">
          <Bell className="w-3.5 h-3.5 text-white/30" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 flex items-center justify-center bg-magenta text-white text-[7px] font-bold rounded-full">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Online indicator */}
        <div className="flex items-center gap-1 px-1.5 py-0.5">
          <Radio className="w-2.5 h-2.5 text-green-400 animate-pulse" />
          <span className="text-[8px] text-white/20 uppercase hidden lg:block">Online</span>
        </div>

        {/* User */}
        <div className="flex items-center gap-1.5 pl-2 border-l border-white/5">
          <User className="w-3 h-3 text-white/20" />
          <span className="text-[9px] text-white/30 hidden sm:block max-w-[80px] truncate">
            {user?.email?.split('@')[0] || 'User'}
          </span>
        </div>

        {/* Logout */}
        <button
          onClick={() => signOut()}
          className="p-1.5 hover:bg-red-500/10 hover:text-red-400 transition-colors text-white/20"
          title="Sign out"
        >
          <LogOut className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
