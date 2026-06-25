import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Loader2, AlertTriangle, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuth, getRoleRedirectPath } from '@/hooks/useAuth';

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const { role, profile } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    // Supabase automatically handles the OAuth callback hash in the URL
    // We just need to wait for the session to be established
    const handleCallback = async () => {
      try {
        // Check if there's an error in the URL (from OAuth provider)
        const hash = window.location.hash;
        if (hash.includes('error=')) {
          const params = new URLSearchParams(hash.substring(1));
          setError(params.get('error_description') || 'Authentication failed');
          setProcessing(false);
          return;
        }

        // Wait for session to be established
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          setError(sessionError.message);
          setProcessing(false);
          return;
        }

        if (session?.user) {
          // Session is good — the auth hook will pick up role/profile
          // Give it a moment to populate
          setTimeout(() => setProcessing(false), 500);
        } else {
          // No session — might need to exchange the code
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(
            new URLSearchParams(window.location.search).get('code') || ''
          );

          if (exchangeError) {
            setError(exchangeError.message);
            setProcessing(false);
          } else {
            setTimeout(() => setProcessing(false), 500);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Authentication failed');
        setProcessing(false);
      }
    };

    handleCallback();
  }, []);

  // Once we have role and profile, redirect
  useEffect(() => {
    if (!processing && role !== 'public' && profile) {
      const path = getRoleRedirectPath(role, profile.subscription_status);
      navigate(path, { replace: true });
    }
  }, [processing, role, profile, navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="w-16 h-16 bg-magenta/10 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8 text-magenta" />
          </div>
          <h2 className="text-2xl font-black">AUTHENTICATION FAILED</h2>
          <p className="text-white/60">{error}</p>
          <button
            onClick={() => navigate('/login')}
            className="btn-lime text-sm inline-flex items-center gap-2"
          >
            Try Again <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-void flex flex-col items-center justify-center p-4">
      <div className="text-center space-y-6">
        <div className="flex items-center gap-2 justify-center mb-4">
          <Zap className="w-6 h-6 text-lime animate-pulse" />
          <span className="text-lg font-black tracking-tight">
            UPTIME<span className="text-lime">OPS</span>
          </span>
        </div>
        <Loader2 className="w-8 h-8 text-lime animate-spin mx-auto" />
        <p className="text-sm text-white/60 font-mono uppercase tracking-wider">Authenticating...</p>
        <p className="text-xs text-white/40">Verifying credentials and setting up your session</p>
      </div>
    </div>
  );
}
