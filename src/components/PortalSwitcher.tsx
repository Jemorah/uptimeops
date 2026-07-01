// ═══════════════════════════════════════════════════════════════
// PORTAL SWITCHER — Dev/testing tool for preview deployments
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { LayoutDashboard, Shield, HardHat, X, Globe } from 'lucide-react';
import { getCurrentPortal } from '@/hooks/useSubdomain';

const PORTALS = [
  { id: 'landing', label: 'Landing', icon: Globe, color: '#94a3b8' },
  { id: 'customer', label: 'Customer', icon: LayoutDashboard, color: '#a3e635' },
  { id: 'hq', label: 'HQ Control', icon: Shield, color: '#22d3ee' },
  { id: 'engineer', label: 'Engineer', icon: HardHat, color: '#e879f9' },
];

export function PortalSwitcher() {
  const [visible, setVisible] = useState(false);
  const currentPortal = getCurrentPortal().portal;

  useEffect(() => {
    const host = window.location.hostname;
    const isPreview = host.includes('vercel.app') || host === 'localhost' || host === '127.0.0.1';
    if (!isPreview) return;
    setVisible(true);
  }, []);

  if (!visible) return null;

  const handleSwitch = (portalId: string) => {
    if (portalId === 'landing') {
      localStorage.removeItem('portal_override');
    } else {
      localStorage.setItem('portal_override', portalId);
    }
    // Force full page reload — critical for HashRouter + portal change
    window.location.reload();
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-elevated/90 backdrop-blur-xl border border-white/10 rounded-xl px-4 py-2.5 flex items-center gap-2 shadow-2xl">
        <span className="text-[9px] font-bold uppercase tracking-wider text-white/30 mr-1">Portal:</span>
        {PORTALS.map(p => {
          const Icon = p.icon;
          const isActive = currentPortal === p.id;
          return (
            <button
              key={p.id}
              onClick={() => handleSwitch(p.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                isActive
                  ? 'text-white border'
                  : 'text-white/30 hover:text-white/60 hover:bg-white/5'
              }`}
              style={isActive ? { backgroundColor: `${p.color}15`, borderColor: `${p.color}30`, color: p.color } : {}}
            >
              <Icon className="w-3 h-3" />
              {p.label}
            </button>
          );
        })}
        <button onClick={() => setVisible(false)} className="ml-1 p-1 text-white/20 hover:text-white/40 transition-all">
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
