import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useRequireAuth, getRoleRedirectPath } from '@/hooks/useAuth';
import type { UserRole } from '@/lib/supabase/client';
import { Loader2, Zap } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  fallback?: React.ReactNode;
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, role } = useAuth();
  const { authorized, checking } = useRequireAuth(allowedRoles);

  useEffect(() => {
    if (isLoading || checking) return;

    if (!isAuthenticated) {
      // Not logged in → redirect to login with return URL
      const returnPath = window.location.pathname;
      navigate(`/login?redirect=${encodeURIComponent(returnPath)}`, { replace: true });
      return;
    }

    if (!authorized && allowedRoles) {
      // Logged in but wrong role → redirect to appropriate portal
      const redirectPath = getRoleRedirectPath(role);
      navigate(redirectPath, { replace: true });
    }
  }, [isLoading, checking, isAuthenticated, authorized, allowedRoles, navigate, role]);

  if (isLoading || checking) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="flex items-center gap-2 justify-center">
            <Zap className="w-5 h-5 text-lime animate-pulse" />
            <span className="text-sm font-black tracking-tight text-white/60">UPTIME<span className="text-lime">OPS</span></span>
          </div>
          <Loader2 className="w-6 h-6 text-lime animate-spin mx-auto" />
          <p className="text-xs text-white/40 font-mono uppercase tracking-wider">Verifying Access...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || (allowedRoles && !authorized)) {
    return null;
  }

  return <>{children}</>;
}
