// ═══════════════════════════════════════════════════════════════
// PROTECTED ROUTE — Guards access by authentication + role
// Shows loading spinner while auth state settles, then redirects
// ═══════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth, useRequireAuth } from '@/hooks/useAuth';
import type { UserRole } from '@/lib/supabase/client';
import { Loader2, Zap, ShieldAlert } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

// Grace period: wait this many ms for auth state to settle before redirecting.
// This prevents race conditions where onAuthStateChange hasn't fired yet.
const AUTH_SETTLE_MS = 800;

export function ProtectedRoute({ children, allowedRoles }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading, user } = useAuth();
  const { authorized, checking } = useRequireAuth(allowedRoles);

  // Show a brief "settling" state even when isLoading is false,
  // to give onAuthStateChange time to update the auth context.
  const [settling, setSettling] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // If we're still loading auth, keep settling
    if (isLoading || checking) {
      setSettling(true);
      return;
    }

    // Auth has settled — start a short grace period
    timerRef.current = setTimeout(() => {
      setSettling(false);
    }, AUTH_SETTLE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isLoading, checking]);

  // After settling, redirect if not authenticated or not authorized
  useEffect(() => {
    if (settling) return;

    if (!isAuthenticated) {
      navigate('/login?redirect=' + encodeURIComponent(location.pathname), { replace: true });
      return;
    }

    if (!authorized) {
      navigate('/', { replace: true });
    }
  }, [settling, isAuthenticated, authorized, navigate, location.pathname]);

  // While settling or loading, show a loading screen
  if (isLoading || checking || settling) {
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
          <p className="text-xs text-white/40 font-mono uppercase tracking-wider">Authenticating...</p>
        </div>
      </div>
    );
  }

  // Not authenticated — will be redirected by useEffect above
  if (!isAuthenticated) return null;

  // Not authorized — will be redirected by useEffect above
  if (!authorized) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center space-y-4 max-w-sm mx-auto px-4">
          <ShieldAlert className="w-10 h-10 text-red-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">Access Denied</h2>
          <p className="text-sm text-white/50">
            Your account ({user?.email}) does not have permission to access this page.
          </p>
          <button
            onClick={() => navigate('/', { replace: true })}
            className="text-xs text-[#a3e635] hover:underline"
          >
            Go to home page
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
