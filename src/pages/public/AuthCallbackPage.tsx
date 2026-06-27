// ═══════════════════════════════════════════════════════════════
// AUTH CALLBACK — Handles OAuth redirect from GitHub/Google
// ═══════════════════════════════════════════════════════════════

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, getRoleRedirectPath } from '@/hooks/useAuth';
import { Loader2, Zap } from 'lucide-react';

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, role } = useAuth();

  useEffect(() => {
    // After onAuthStateChange fires, the auth context will have
    // isAuthenticated=true and the correct role. We just wait for it.
    if (isLoading) return;

    if (isAuthenticated) {
      // Auth state is ready — redirect based on role
      navigate(getRoleRedirectPath(role), { replace: true });
    } else {
      // Auth failed
      console.error('[Auth Callback] Not authenticated after callback');
      navigate('/login?error=auth_failed', { replace: true });
    }
  }, [isLoading, isAuthenticated, role, navigate]);

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
        <p className="text-xs text-white/40 font-mono uppercase tracking-wider">Completing sign-in...</p>
      </div>
    </div>
  );
}
