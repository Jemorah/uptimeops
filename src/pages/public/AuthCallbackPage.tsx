// ═══════════════════════════════════════════════════════════════
// AUTH CALLBACK — Handles OAuth redirect (Google/GitHub)
// Extracts PKCE code from URL, exchanges for session, redirects by role.
// ═══════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, isAdminEmail } from '@/lib/supabase/client';
import { Loader2, Zap } from 'lucide-react';

const POLL_MS = 400;
const TIMEOUT_MS = 8000;

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<'processing' | 'found' | 'timeout'>('processing');
  const [attempts, setAttempts] = useState(0);
  const doneRef = useRef(false);

  useEffect(() => {
    console.log('[AuthCallback] Mounted');
    console.log('[AuthCallback] Full URL:', window.location.href);
    console.log('[AuthCallback] Search:', window.location.search);
    console.log('[AuthCallback] Hash:', window.location.hash);

    // Extract PKCE code from URL (could be in search OR hash)
    const params = new URLSearchParams(window.location.search);
    let code = params.get('code');

    // If not in search, check hash (HashRouter puts params after #)
    if (!code && window.location.hash.includes('?')) {
      const hashSearch = window.location.hash.split('?')[1];
      if (hashSearch) {
        const hashParams = new URLSearchParams(hashSearch);
        code = hashParams.get('code');
      }
    }

    console.log('[AuthCallback] PKCE code found:', !!code);

    async function run() {
      // Step 1: If we have a code, exchange it for a session
      if (code) {
        console.log('[AuthCallback] Exchanging code for session...');
        try {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error('[AuthCallback] exchangeCodeForSession error:', error.message);
          } else if (data.session) {
            console.log('[AuthCallback] Session created via code exchange');
          }
        } catch (err: any) {
          console.error('[AuthCallback] exchangeCodeForSession exception:', err?.message);
        }
      }

      // Step 2: Poll for session (Supabase may also auto-detect via detectSessionInUrl)
      const start = Date.now();

      const check = async (): Promise<boolean> => {
        const { data } = await supabase.auth.getSession();
        return !!data.session?.user;
      };

      // Immediate check
      if (await check()) {
        handleSessionFound();
        return;
      }

      // Poll
      const interval = setInterval(async () => {
        const elapsed = Date.now() - start;
        setAttempts(Math.floor(elapsed / POLL_MS));

        if (await check()) {
          clearInterval(interval);
          handleSessionFound();
          return;
        }

        if (elapsed >= TIMEOUT_MS) {
          clearInterval(interval);
          console.error('[AuthCallback] Timeout waiting for session');
          setPhase('timeout');
          setTimeout(() => navigate('/login?error=auth_timeout', { replace: true }), 500);
        }
      }, POLL_MS);

      return () => clearInterval(interval);
    }

    function handleSessionFound() {
      if (doneRef.current) return;
      doneRef.current = true;
      setPhase('found');

      // Get user and determine role
      supabase.auth.getSession().then(({ data }) => {
        const user = data.session?.user;
        if (!user) {
          navigate('/login?error=no_user', { replace: true });
          return;
        }

        const role: string = isAdminEmail(user.email) ? 'admin' : 'customer';
        console.log('[AuthCallback] User:', user.email, 'Role:', role);

        const dest = role === 'admin' || role === 'coordinator' ? '/hq'
          : role === 'engineer' ? '/engineer'
          : '/customer';

        console.log('[AuthCallback] Navigating to:', dest);
        navigate(dest, { replace: true });
      });
    }

    run();
  }, [navigate]);

  const msg = phase === 'found' ? 'Redirecting...'
    : phase === 'timeout' ? 'Session timeout — redirecting to login...'
    : `Processing authentication... (${attempts})`;

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
        <p className="text-xs text-white/40 font-mono uppercase tracking-wider">{msg}</p>
        <p className="text-[10px] text-white/20 font-mono">Open F12 console for debug logs</p>
      </div>
    </div>
  );
}
