// ═══════════════════════════════════════════════════════════════
// UptimeOps v2.1 — Multi-Subdomain App Router
// ONE build, ONE deployment. Runtime hostname detection.
// Admin (cumouat@gmail.com) can access all subdomains.
// ═══════════════════════════════════════════════════════════════

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { getCurrentPortal } from '@/lib/supabase/client';
import { MarketingRouter } from '@/routers/MarketingRouter';
import { CustomerRouter } from '@/routers/CustomerRouter';
import { HQRouter } from '@/routers/HQRouter';
import { EngineerRouter } from '@/routers/EngineerRouter';
import { Loader2, Zap } from 'lucide-react';

function PortalGate({ portal, children }: { portal: string; children: React.ReactNode }) {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, role } = useAuth();

  useEffect(() => {
    if (portal === 'www') return;
    if (isLoading) return;
    // Admin can access all portals — no redirect needed
    if (role === 'admin') return;
    if (!isAuthenticated) {
      console.log('[PortalGate] Not authenticated on portal:', portal, '→ redirecting to /login');
      const currentPath = window.location.hash.replace(/^#/, '');
      navigate('/login?redirect_to=' + encodeURIComponent(currentPath), { replace: true });
    }
  }, [portal, isAuthenticated, isLoading, role, navigate]);

  if (portal !== 'www' && isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="flex items-center gap-2 justify-center">
            <Zap className="w-5 h-5 text-[#a3e635] animate-pulse" />
            <span className="text-sm font-black tracking-tight text-white/60">UPTIME<span className="text-[#a3e635]">OPS</span></span>
          </div>
          <Loader2 className="w-6 h-6 text-[#a3e635] animate-spin mx-auto" />
          <p className="text-xs text-white/40 font-mono uppercase tracking-wider">Verifying session...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function AppInner() {
  const portal = getCurrentPortal();
  console.log('[App] Current portal:', portal, 'hash:', window.location.hash);
  return (
    <PortalGate portal={portal}>
      {portal === 'app' && <CustomerRouter />}
      {portal === 'dashboard' && <HQRouter />}
      {portal === 'engineers' && <EngineerRouter />}
      {portal === 'www' && <MarketingRouter />}
    </PortalGate>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
