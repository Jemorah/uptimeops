// ═══════════════════════════════════════════════════════════════
// UptimeOps v2.1 — Multi-Subdomain App Router (ADMIN BYPASS)
// ONE build, ONE deployment. All portals accessible without auth.
// Admin role on all subdomains. No login required.
// ═══════════════════════════════════════════════════════════════

import { AuthProvider } from '@/hooks/useAuth';
import { getCurrentPortal } from '@/lib/supabase/client';
import { MarketingRouter } from '@/routers/MarketingRouter';
import { CustomerRouter } from '@/routers/CustomerRouter';
import { HQRouter } from '@/routers/HQRouter';
import { EngineerRouter } from '@/routers/EngineerRouter';

function AppInner() {
  const portal = getCurrentPortal();

  return (
    <>
      {portal === 'app' && <CustomerRouter />}
      {portal === 'dashboard' && <HQRouter />}
      {portal === 'engineers' && <EngineerRouter />}
      {portal === 'www' && <MarketingRouter />}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
