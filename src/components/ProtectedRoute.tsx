// ═══════════════════════════════════════════════════════════════
// PROTECTED ROUTE — Guards by auth + role.
// Admin (cumouat@gmail.com) can access all portals.
// Unauthenticated → navigate to /login (NOT window.location.href reload).
// ═══════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import type { UserRole } from '@/lib/supabase/client';
import { Loader2, Zap, ShieldAlert } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

const AUTH_SETTLE_MS = 200;

export function ProtectedRoute({ children, allowedRoles }: Props) {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, user, role } = useAuth();
  const [settling, setSettling] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isLoading) { setSettling(true); return; }
    timerRef.current = setTimeout(() => setSettling(false), AUTH_SETTLE_MS);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [isLoading]);

  useEffect(() => {
    if (settling) return;
    if (!isAuthenticated) {
      console.log('[ProtectedRoute] Not authenticated, redirecting to /login');
      navigate('/login?redirect_to=' + encodeURIComponent(window.location.hash.replace(/^#/, '')), { replace: true });
    }
  }, [settling, isAuthenticated, navigate]);

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

  if (!isAuthenticated) return null;

  // Admin can access all portals
  if (allowedRoles && role && role !== 'admin' && !allowedRoles.includes(role)) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center space-y-4 max-w-sm mx-auto px-4">
          <ShieldAlert className="w-10 h-10 text-red-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">Access Denied</h2>
          <p className="text-sm text-white/50">Your account ({user?.email}) does not have permission for this portal.</p>
          <p className="text-xs text-white/30">Role: {role}</p>
          <button
            onClick={() => { navigate('/'); }}
            className="text-xs text-[#a3e635] hover:underline"
          >
            Go to home
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
