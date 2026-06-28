// ═══════════════════════════════════════════════════════════════
// PROTECTED ROUTE — Multi-Subdomain
// Guards by auth + role. Unauthenticated users redirected to www login.
// Wrong-role users redirected to their correct subdomain.
// ═══════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react';
import { useAuth, getLoginUrl, redirectToRoleSubdomain } from '@/hooks/useAuth';
import type { UserRole } from '@/lib/supabase/client';
import { getSubdomainForRole, getCurrentPortal } from '@/lib/supabase/client';
import { Loader2, Zap, ShieldAlert } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

const AUTH_SETTLE_MS = 100;

export function ProtectedRoute({ children, allowedRoles }: Props) {
  const { isAuthenticated, isLoading, user, role } = useAuth();
  const [settling, setSettling] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isLoading) { setSettling(true); return; }
    timerRef.current = setTimeout(() => { setSettling(false); }, AUTH_SETTLE_MS);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [isLoading]);

  // After settling, handle redirects
  useEffect(() => {
    if (settling) return;

    if (!isAuthenticated) {
      // Redirect to www login with current URL as redirect_to
      const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
      window.location.href = getLoginUrl(currentUrl);
      return;
    }

    if (allowedRoles && role && !allowedRoles.includes(role)) {
      // Wrong role — redirect to their correct subdomain
      const currentPortal = getCurrentPortal();
      const correctDomain = getSubdomainForRole(role);
      const portalDomain = Object.entries({
        app: 'app.uptimeops.org',
        dashboard: 'dashboard.uptimeops.org',
        engineers: 'engineers.uptimeops.org',
      }).find(([, d]) => d === correctDomain)?.[0];

      if (portalDomain && currentPortal !== portalDomain && currentPortal !== 'www') {
        redirectToRoleSubdomain(role, null);
      }
    }
  }, [settling, isAuthenticated, allowedRoles, role]);

  // Loading state
  if (isLoading || settling) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="flex items-center gap-2 justify-center">
            <Zap className="w-5 h-5 text-[#a3e635] animate-pulse" />
            <span className="text-sm font-black tracking-tight text-white/60">UPTIME<span className="text-[#a3e635]">OPS</span></span>
          </div>
          <Loader2 className="w-6 h-6 text-[#a3e635] animate-spin mx-auto" />
          <p className="text-xs text-white/40 font-mono uppercase tracking-wider">Authenticating...</p>
        </div>
      </div>
    );
  }

  // Not authenticated — will redirect via useEffect above
  if (!isAuthenticated) return null;

  // Wrong role
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center space-y-4 max-w-sm mx-auto px-4">
          <ShieldAlert className="w-10 h-10 text-red-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">Access Denied</h2>
          <p className="text-sm text-white/50">
            Your account ({user?.email}) does not have permission for this portal.
          </p>
          <p className="text-xs text-white/30">Role: {role}</p>
          <button
            onClick={() => {
              if (role && role !== 'public') redirectToRoleSubdomain(role, null);
            }}
            className="text-xs text-[#a3e635] hover:underline"
          >
            Go to my portal
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
