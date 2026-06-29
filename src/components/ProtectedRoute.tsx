// ═══════════════════════════════════════════════════════════════
// PROTECTED ROUTE — Direct auth check. No delays. No subdomain redirects.
// Admin passes all checks. Unauthenticated → redirect to /login.
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
  const { isAuthenticated, isLoading, role } = useAuth();

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      console.log('[ProtectedRoute] Not authenticated → redirect to /login');
      navigate('/login', { replace: true });
    }
  }, [isLoading, isAuthenticated, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="flex items-center gap-2 justify-center">
            <Zap className="w-5 h-5 text-[#a3e635] animate-pulse" />
            <span className="text-sm font-black tracking-tight text-white/60">UPTIME<span className="text-[#a3e635]">OPS</span></span>
          </div>
          <Loader2 className="w-6 h-6 text-[#a3e635] animate-spin mx-auto" />
          <p className="text-xs text-white/40 font-mono">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  // Role check (admin bypasses all)
  if (allowedRoles && role !== 'admin' && !allowedRoles.includes(role)) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center space-y-4 max-w-sm mx-auto px-4">
          <ShieldAlert className="w-10 h-10 text-red-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">Access Denied</h2>
          <p className="text-sm text-white/50">Role: {role} — Required: {allowedRoles.join(', ')}</p>
          <button onClick={() => navigate('/')} className="text-xs text-[#a3e635] hover:underline">Go home</button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
