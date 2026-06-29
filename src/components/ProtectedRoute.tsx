// ═══════════════════════════════════════════════════════════════
// PROTECTED ROUTE — Simple, direct auth check.
// No settling delays, no complex state. Just: authenticated? render. Not? redirect.
// Admin (cumouat@gmail.com) passes all role checks automatically.
// ═══════════════════════════════════════════════════════════════

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import type { UserRole } from '@/lib/supabase/client';
import { Zap, Loader2, ShieldAlert } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: Props) {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, user, role } = useAuth();

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (isLoading) return; // Still checking — wait
    if (!isAuthenticated) {
      const currentPath = window.location.hash.replace(/^#/, '') || '/';
      console.log('[ProtectedRoute] Not authenticated, redirecting to /login?redirect_to=' + currentPath);
      navigate('/login?redirect_to=' + encodeURIComponent(currentPath), { replace: true });
    }
  }, [isLoading, isAuthenticated, navigate]);

  // Loading state — auth check in progress
  if (isLoading) {
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

  // Not authenticated — redirecting (effect above handles it)
  if (!isAuthenticated) {
    return null;
  }

  // Check role permissions (admin bypasses all)
  if (allowedRoles && role !== 'admin' && !allowedRoles.includes(role)) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center space-y-4 max-w-sm mx-auto px-4">
          <ShieldAlert className="w-10 h-10 text-red-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">Access Denied</h2>
          <p className="text-sm text-white/50">
            Your account ({user?.email}) has role <strong>{role}</strong> but this page requires: {allowedRoles.join(', ')}
          </p>
          <button onClick={() => navigate('/')} className="text-xs text-[#a3e635] hover:underline">
            Go to home
          </button>
        </div>
      </div>
    );
  }

  // All checks passed — render the protected content
  return <>{children}</>;
}
