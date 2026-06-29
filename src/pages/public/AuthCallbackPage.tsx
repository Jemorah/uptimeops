// ═══════════════════════════════════════════════════════════════
// AUTH CALLBACK — OAuth redirect handler
// Processes session from URL, hydrates role, routes with intent
// ═══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { UserRole } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  Zap, AlertCircle, CheckCircle2
} from 'lucide-react';

// ── Intent routing (mirrors AuthConsole logic) ──
function getPostAuthDestination(
  role: UserRole,
  searchParams: URLSearchParams
): string {
  const intent = searchParams.get('intent');
  const plan = searchParams.get('plan');
  const billing = searchParams.get('billing');
  const tier = searchParams.get('tier');
  const track = searchParams.get('track');
  const leadId = searchParams.get('lead_id');

  if (intent === 'subscribe' && plan) {
    return `/customer/billing?plan=${plan}${billing ? `&billing=${billing}` : ''}`;
  }
  if (intent === 'emergency' && tier) {
    return `/emergency?tier=${tier}${track ? `&track=${track}` : ''}`;
  }
  if (leadId) return `/customer/incidents?lead=${leadId}`;

  switch (role) {
    case 'admin':
    case 'coordinator': return '/hq';
    case 'engineer': return '/engineer';
    case 'customer': return '/customer';
    default: return '/customer';
  }
}

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { role } = useAuth();

  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Completing authentication...');
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const handleCallback = async () => {
      // The OAuth flow with PKCE stores the session in the URL hash.
      // With detectSessionInUrl: false in our client config, we need
      // to manually extract and set the session from the URL.
      const hash = window.location.hash;
      const params = new URLSearchParams(hash.replace('#', '').replace(/^\//, ''));

      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const type = params.get('type');

      if (accessToken) {
        // Manually set the session from the URL tokens
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        });

        if (error) {
          if (cancelled) return;
          setStatus('error');
          setMessage(`Session error: ${error.message}`);
          toast.error(`Auth callback failed: ${error.message}`);
          // Retry after delay
          if (attempts < 3) {
            setTimeout(() => {
              setAttempts(a => a + 1);
              setStatus('processing');
              setMessage(`Retrying (${attempts + 1}/3)...`);
              handleCallback();
            }, 2000 * (attempts + 1));
          }
          return;
        }

        if (cancelled) return;
        setStatus('success');
        setMessage('Authentication successful!');
        toast.success('Signed in successfully');

        // Wait for auth context to hydrate role
        setTimeout(() => {
          if (cancelled) return;
          const dest = getPostAuthDestination(role || 'customer', searchParams);
          navigate(dest, { replace: true });
        }, 500);
        return;
      }

      // No tokens in URL — check if we already have a session
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        if (cancelled) return;
        setStatus('success');
        setMessage('Already authenticated');
        const dest = getPostAuthDestination(role || 'customer', searchParams);
        navigate(dest, { replace: true });
        return;
      }

      // Handle password recovery callback
      if (type === 'recovery') {
        if (cancelled) return;
        navigate('/reset-password', { replace: true });
        return;
      }

      if (cancelled) return;
      setStatus('error');
      setMessage('No authentication tokens found. Please try again.');
    };

    handleCallback();

    return () => { cancelled = true; };
  }, [navigate, role, searchParams, attempts]);

  return (
    <div className="min-h-screen bg-void flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center space-y-6">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2">
          <Zap className="w-6 h-6 text-lime" />
          <span className="text-lg font-black tracking-tight text-text-primary">
            UPTIME<span className="text-lime">OPS</span>
          </span>
        </div>

        {/* Status Card */}
        <div className="glass-surface rounded-xl p-8 space-y-4" style={{ borderColor: 'rgba(34,211,238,0.1)' }}>
          {status === 'processing' && (
            <div className="w-14 h-14 rounded-full border-4 border-cyan/20 border-t-cyan animate-spin mx-auto" />
          )}
          {status === 'success' && (
            <div className="w-14 h-14 rounded-full bg-lime-dim border border-lime/30 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7 text-lime" />
            </div>
          )}
          {status === 'error' && (
            <div className="w-14 h-14 rounded-full bg-rose-dim border border-rose/30 flex items-center justify-center mx-auto">
              <AlertCircle className="w-7 h-7 text-rose" />
            </div>
          )}

          <div>
            <h2 className="text-lg font-black text-text-primary">
              {status === 'processing' ? 'Authenticating...' : status === 'success' ? 'Success!' : 'Authentication Error'}
            </h2>
            <p className="text-sm text-text-secondary mt-1">{message}</p>
          </div>

          {status === 'processing' && (
            <p className="text-[10px] text-text-muted font-mono">
              {attempts > 0 ? `Retry attempt ${attempts}/3` : 'Processing OAuth tokens...'}
            </p>
          )}

          {status === 'error' && (
            <div className="space-y-2 pt-2">
              <button
                onClick={() => window.location.reload()}
                className="w-full py-2.5 bg-cyan text-void-dark text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-cyan-light transition-colors"
              >
                Retry
              </button>
              <button
                onClick={() => navigate('/login', { replace: true })}
                className="w-full py-2.5 bg-void-light border border-surface-border text-text-secondary text-xs font-bold uppercase tracking-wider rounded-lg hover:text-text-primary transition-colors"
              >
                Back to Sign In
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
