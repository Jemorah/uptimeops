// ═══════════════════════════════════════════════════════════════
// PROTECTED ROUTE — Guards access by authentication + role
// ═══════════════════════════════════════════════════════════════

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useRequireAuth } from '@/hooks/useAuth';
import type { UserRole } from '@/lib/supabase/client';
import { Loader2, Zap } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: Props) {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();
  const { authorized, checking } = useRequireAuth(allowedRoles);

  useEffect(() => {
    if (isLoading || checking) return;

    if (!isAuthenticated) {
      navigate('/login', { replace: true });
      return;
    }

    if (!authorized) {
      navigate('/', { replace: true });
    }
  }, [isLoading, checking, isAuthenticated, authorized, navigate]);

  if (isLoading || checking) {
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

  if (!isAuthenticated || !authorized) return null;

  return <>{children}</>;
}
