// ═══════════════════════════════════════════════════════════════
// AUTH CALLBACK — Handles OAuth redirect from GitHub/Google
// ═══════════════════════════════════════════════════════════════

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, getUserRole } from '@/lib/supabase/client';
import { Loader2, Zap } from 'lucide-react';

export function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    async function handleCallback() {
      // Supabase PKCE flow: exchange code for session
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session?.user) {
        console.error('[Auth Callback] Error:', error?.message || 'No session');
        navigate('/login?error=auth_failed', { replace: true });
        return;
      }

      // Get role and redirect
      const role = await getUserRole(session.user.id);

      switch (role) {
        case 'coordinator':
        case 'admin':
          navigate('/hq', { replace: true });
          break;
        case 'engineer':
          navigate('/engineer', { replace: true });
          break;
        default:
          navigate('/customer', { replace: true });
      }
    }

    handleCallback();
  }, [navigate]);

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
