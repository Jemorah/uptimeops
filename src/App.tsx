// ═══════════════════════════════════════════════════════════════
// UptimeOps v2.1 — Multi-Subdomain App Router
// ONE build, ONE deployment. Detects hostname at runtime and renders
// only the portal that belongs to that domain.
//
// Vercel Configuration:
//   Add all 4 domains to the same Vercel project:
//     - www.uptimeops.org
//     - app.uptimeops.org
//     - dashboard.uptimeops.org
//     - engineers.uptimeops.org
//   DNS: All 4 CNAME → cname.vercel-dns.com
//   No rewrites needed — HashRouter handles client-side routing.
//
// Supabase Auth Configuration:
//   Site URL: https://www.uptimeops.org
//   Redirect URLs:
//     - https://www.uptimeops.org/#/auth/callback
//     - https://app.uptimeops.org/#/auth/callback
//     - https://dashboard.uptimeops.org/#/auth/callback
//     - https://engineers.uptimeops.org/#/auth/callback
// ═══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { AuthProvider, useAuth, getLoginUrl } from '@/hooks/useAuth';
import { getCurrentPortal } from '@/lib/supabase/client';
import { MarketingRouter } from '@/routers/MarketingRouter';
import { CustomerRouter } from '@/routers/CustomerRouter';
import { HQRouter } from '@/routers/HQRouter';
import { EngineerRouter } from '@/routers/EngineerRouter';
import { Loader2, Zap } from 'lucide-react';

// ── Portal subdomain detection ──
function detectPortal(): 'www' | 'app' | 'dashboard' | 'engineers' {
  return getCurrentPortal();
}

// ── Subdomain portal gate ──
// If a non-www portal loads with no auth session, redirect to www login.
function PortalGate({ portal, children }: { portal: string; children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    // www always renders — login page lives there
    if (portal === 'www') return;

    // If auth is still loading, wait
    if (isLoading) return;

    // If no session on a portal subdomain, redirect to www login
    if (!isAuthenticated) {
      setRedirecting(true);
      const currentUrl = window.location.href;
      window.location.href = getLoginUrl(currentUrl);
    }
  }, [portal, isAuthenticated, isLoading]);

  // While checking auth on non-www portal, show loading
  if (portal !== 'www' && (isLoading || redirecting)) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="flex items-center gap-2 justify-center">
            <Zap className="w-5 h-5 text-[#a3e635] animate-pulse" />
            <span className="text-sm font-black tracking-tight text-white/60">
              UPTIME<span className="text-[#a3e635]">OPS</span>
            </span>
          </div>
          <Loader2 className="w-6 h-6 text-[#a3e635] animate-spin mx-auto" />
          <p className="text-xs text-white/40 font-mono uppercase tracking-wider">Verifying session...</p>
          <p className="text-[10px] text-white/20">Redirecting to login if needed</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// ── Main App ──
function AppInner() {
  const portal = detectPortal();

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
