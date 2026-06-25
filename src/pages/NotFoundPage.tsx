// ═══════════════════════════════════════════════════════════════
// 404 NOT FOUND — UptimeOps
// Branded error page with portal navigation
// ═══════════════════════════════════════════════════════════════

import { Link, useLocation } from 'react-router-dom';
import {
  AlertTriangle, Home, ArrowRight, Zap, Globe,
  LayoutDashboard, Terminal, Shield, Radio
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export function NotFoundPage() {
  const location = useLocation();
  const { isAuthenticated, role } = useAuth();

  const suggestedLinks = [
    { label: 'Home', path: '/', icon: Home, desc: 'Landing page' },
    { label: 'Pricing', path: '/pricing', icon: Zap, desc: 'View plans' },
    { label: 'Emergency', path: '/emergency', icon: AlertTriangle, desc: 'Get help now' },
    ...(isAuthenticated && (role === 'customer' || role === 'coordinator' || role === 'admin')
      ? [{ label: 'Dashboard', path: '/customer', icon: LayoutDashboard, desc: 'Your dashboard' }]
      : []),
    ...(isAuthenticated && (role === 'engineer' || role === 'coordinator' || role === 'admin')
      ? [{ label: 'Engineer Portal', path: '/engineer', icon: Terminal, desc: 'Incident queue' }]
      : []),
    ...(isAuthenticated && (role === 'coordinator' || role === 'admin')
      ? [{ label: 'HQ Center', path: '/hq', icon: Shield, desc: 'Control center' }]
      : []),
  ];

  return (
    <div className="min-h-screen bg-void flex flex-col items-center justify-center p-4">
      {/* Background grid */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(0,240,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0,240,255,0.3) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative max-w-xl w-full">
        {/* Error code */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 border border-cyan/20 bg-cyan/5 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-cyan" />
            </div>
            <Radio className="w-4 h-4 text-white/10 animate-pulse" />
            <div className="w-12 h-12 border border-magenta/20 bg-magenta/5 flex items-center justify-center">
              <Globe className="w-6 h-6 text-magenta" />
            </div>
          </div>

          <h1 className="text-7xl font-black font-mono tracking-tight mb-2">
            <span className="text-cyan">4</span>
            <span className="text-white/20">0</span>
            <span className="text-magenta">4</span>
          </h1>

          <p className="text-xs font-bold uppercase tracking-[0.3em] text-white/30 mb-1">
            Page Not Found
          </p>
          <p className="text-[10px] text-white/20 font-mono">
            {location.pathname}
          </p>
        </div>

        {/* Message */}
        <div className="bg-surface border border-white/5 p-5 mb-6">
          <p className="text-sm text-white/60 text-center">
            The page you requested does not exist or you may not have access to it.
            Check the URL or navigate to one of the sections below.
          </p>
        </div>

        {/* Suggested links */}
        <div className="space-y-1.5 mb-8">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/20 px-1 mb-2">
            Navigation Options
          </p>
          {suggestedLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className="flex items-center gap-3 p-3 bg-white/[0.01] border border-white/5 hover:border-lime/20 hover:bg-lime/5 transition-all group"
            >
              <link.icon className="w-4 h-4 text-white/20 group-hover:text-lime transition-colors" />
              <div className="flex-1">
                <span className="text-xs font-bold text-white/60 group-hover:text-white transition-colors">
                  {link.label}
                </span>
                <span className="text-[10px] text-white/20 ml-2">{link.desc}</span>
              </div>
              <ArrowRight className="w-3 h-3 text-white/10 group-hover:text-lime group-hover:translate-x-1 transition-all" />
            </Link>
          ))}
        </div>

        {/* Marketing tag */}
        <div className="text-center border-t border-white/5 pt-6">
          <p className="text-[10px] text-white/20 uppercase tracking-[0.2em]">
            <Zap className="w-3 h-3 inline text-lime mr-1" />
            UptimeOps — Infrastructure Emergency Response
          </p>
        </div>
      </div>
    </div>
  );
}
