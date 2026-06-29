// ═══════════════════════════════════════════════════════════════
// AUTH CALLBACK — Handles OAuth redirect (Google/GitHub)
// Exchanges PKCE code for session. Watches isAuthenticated to navigate.
// ═══════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';
import { Loader2, Zap } from 'lucide-react';

const POLL_MS = 400;
const TIMEOUT_MS = 8000;

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const { isAuthenticated, role } = useAuth();
  const [phase, setPhase] = useState<'processing' | 'timeout'>('processing');
  const [attempts, setAttempts] = useState(0);
  const doneRef = useRef(false);

  // ── Step 1: Exchange PKCE code for session ──
  useEffect(() => {
    // Auth callback mounted — processing OAuth redirect

    // Extract code from URL
    const params = new URLSearchParams(window.location.search);
    let code = params.get('code');
    if (!code && window.location.hash.includes('?')) {
      const qs = window.location.hash.split('?')[1];
      if (qs) code = new URLSearchParams(qs).get('code');
    }

    if (!code) {
      // No code in URL — not an OAuth callback
      return;
    }

    async function exchange() {
      // Exchanging PKCE code for session
      try {
        const { error } = await supabase.auth.exchangeCodeForSession(code!);
        if (error) {/* exchange failed — will retry via polling */}
      } catch (err: any) {
        {/* exchange exception — will retry via polling */}
      }
    }

    exchange();
  }, []);

  // ── Step 2: Poll until session appears (onAuthStateChange fires) ──
  useEffect(() => {
    if (doneRef.current) return;

    const start = Date.now();
    const interval = setInterval(async () => {
      if (doneRef.current) { clearInterval(interval); return; }

      const elapsed = Date.now() - start;
      setAttempts(Math.floor(elapsed / POLL_MS));

      // Check if we have a session
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        // Session found via poll
        doneRef.current = true;
        clearInterval(interval);
        // onAuthStateChange will update isAuthenticated
        // Second useEffect below will navigate
        return;
      }

      if (elapsed >= TIMEOUT_MS) {
        doneRef.current = true;
        clearInterval(interval);
        // Auth callback timeout
        setPhase('timeout');
        setTimeout(() => navigate('/login?error=timeout', { replace: true }), 1000);
      }
    }, POLL_MS);

    return () => clearInterval(interval);
  }, [navigate]);

  // ── Step 3: When isAuthenticated becomes true, navigate ──
  useEffect(() => {
    if (isAuthenticated && role && role !== 'public') {
      // Authenticated — navigating to portal
      const dest = role === 'admin' || role === 'coordinator' ? '/hq'
        : role === 'engineer' ? '/engineer'
        : '/customer';
      navigate(dest, { replace: true });
    }
  }, [isAuthenticated, role, navigate]);

  const msg = phase === 'timeout' ? 'Session timeout — redirecting...'
    : `Completing sign-in... (${attempts})`;

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="flex items-center gap-2 justify-center">
          <Zap className="w-5 h-5 text-[#a3e635] animate-pulse" />
          <span className="text-sm font-black tracking-tight text-white/60">UPTIME<span className="text-[#a3e635]">OPS</span></span>
        </div>
        <Loader2 className="w-6 h-6 text-[#a3e635] animate-spin mx-auto" />
        <p className="text-xs text-white/40 font-mono uppercase">{msg}</p>
      </div>
    </div>
  );
}
