// ═══════════════════════════════════════════════════════════════
// AUTH CALLBACK — Handles OAuth redirect from GitHub/Google
// Works in both single-domain and subdomain modes.
// ═══════════════════════════════════════════════════════════════

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, getPostLoginDestination } from '@/hooks/useAuth';
import { isSubdomainMode } from '@/lib/supabase/client';
import { Loader2, Zap } from 'lucide-react';

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, role } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (isAuthenticated && role && role !== 'public') {
      if (!isSubdomainMode()) {
        // Single-domain: client-side navigation
        const dest = getPostLoginDestination(role, null);
        navigate(dest, { replace: true });
      } else {
        // Subdomain mode: full page redirect
        window.location.href = getPostLoginDestination(role, null);
      }
    } else {
      // Auth failed or still loading
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
