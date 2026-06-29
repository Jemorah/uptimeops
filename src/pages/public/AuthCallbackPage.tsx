// ═══════════════════════════════════════════════════════════════
// AUTH CALLBACK — Handles OAuth redirect from GitHub/Google
// CRITICAL: Polls for session instead of relying on detectSessionInUrl
// which doesn't work with HashRouter (OAuth params are in hash, not search).
// ═══════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase/client';
import { Loader2, Zap } from 'lucide-react';

const POLL_INTERVAL = 500;   // Check every 500ms
const MAX_WAIT_MS = 10000;   // Give up after 10 seconds

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'waiting' | 'found' | 'timeout'>('waiting');
  const [attempts, setAttempts] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);

  useEffect(() => {
    console.log('[AuthCallback] Mounted. URL:', window.location.href);
    console.log('[AuthCallback] Hash:', window.location.hash);
    console.log('[AuthCallback] Search:', window.location.search);

    // Check if there are OAuth params in the hash (HashRouter issue)
    const hash = window.location.hash;
    const hasOAuthParams = hash.includes('code=') || hash.includes('access_token=');
    console.log('[AuthCallback] Has OAuth params in hash:', hasOAuthParams);

    // Try to get session immediately
    async function tryGetSession() {
      const { data, error } = await supabase.auth.getSession();
      console.log('[AuthCallback] getSession result:', {
        hasSession: !!data.session,
        user: data.session?.user?.email || null,
        error: error?.message || null,
      });

      if (data.session?.user) {
        // Session found!
        console.log('[AuthCallback] Session found for:', data.session.user.email);
        const email = data.session.user.email;
        const isAdmin = email?.toLowerCase() === 'cumouat@gmail.com'.toLowerCase();
        const role = (isAdmin ? 'admin' : 'customer') as import('@/lib/supabase/client').UserRole;

        setStatus('found');

        // Small delay to let auth context pick up the state
        setTimeout(() => {
          if (!isSubdomainMode()) {
            const dest = getPathForRole(role);
            console.log('[AuthCallback] Navigating to:', dest);
            navigate(dest, { replace: true });
          } else {
            const domain = getDomainForRole(role);
            window.location.href = `https://${domain}/#/hq`;
          }
        }, 300);

        return true;
      }
      return false;
    }

    // Start polling
    async function startPolling() {
      const found = await tryGetSession();
      if (found) return;

      intervalRef.current = setInterval(async () => {
        elapsedRef.current += POLL_INTERVAL;
        setAttempts(prev => prev + 1);

        const found = await tryGetSession();
        if (found) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          if (timerRef.current) clearTimeout(timerRef.current);
          return;
        }

        if (elapsedRef.current >= MAX_WAIT_MS) {
          console.log('[AuthCallback] Timeout — no session found after', MAX_WAIT_MS, 'ms');
          setStatus('timeout');
          if (intervalRef.current) clearInterval(intervalRef.current);
          navigate('/login?error=auth_timeout', { replace: true });
        }
      }, POLL_INTERVAL);

      // Safety timeout
      timerRef.current = setTimeout(() => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      }, MAX_WAIT_MS + 1000);
    }

    startPolling();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [navigate]);

  const statusMessage = status === 'found'
    ? 'Session found — redirecting...'
    : status === 'timeout'
      ? 'Session timeout — redirecting to login...'
      : `Waiting for session... (${attempts})`;

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
        <p className="text-xs text-white/40 font-mono uppercase tracking-wider">{statusMessage}</p>
        <p className="text-[10px] text-white/20 font-mono">Open browser console (F12) for debug logs</p>
      </div>
    </div>
  );
}

function isSubdomainMode(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.hostname.endsWith('uptimeops.org') && !window.location.hostname.includes('vercel.app');
}

function getPathForRole(role: string): string {
  if (role === 'admin' || role === 'coordinator') return '/hq';
  if (role === 'engineer') return '/engineer';
  return '/customer';
}

function getDomainForRole(role: string): string {
  if (role === 'admin' || role === 'coordinator') return 'dashboard.uptimeops.org';
  if (role === 'engineer') return 'engineers.uptimeops.org';
  return 'app.uptimeops.org';
}
