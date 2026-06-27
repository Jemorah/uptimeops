// @ts-nocheck
import { useState, useEffect } from 'react';
import {
  Lock, Shield, Fingerprint, Clock, AlertTriangle,
  XCircle, Loader2, Timer, KeyRound, EyeOff
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import type { CredentialsVault } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface VaultEntry extends CredentialsVault {
  incident_title?: string;
  website_url?: string;
}

export function CredentialVault() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<VaultEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  // Tick the clock every second for expiry display
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  // Fetch credentials
  useEffect(() => {
    if (!user?.id) return;

    const fetchCredentials = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('credentials_vault')
        .select(`
          *,
          incidents:incident_id ( title, website_url )
        `)
        .eq('customer_id', user.id)
        .is('revoked_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        // RLS may block — that's fine, just show empty
        setEntries([]);
      } else if (data) {
        const formatted = data.map((item: any) => ({
          ...item,
          incident_title: item.incidents?.title,
          website_url: item.incidents?.website_url,
        })) as VaultEntry[];
        setEntries(formatted);
      }
      setIsLoading(false);
    };

    fetchCredentials();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('credentials-vault')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'credentials_vault', filter: `customer_id=eq.${user.id}` },
        () => fetchCredentials()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const handleRevoke = async (id: string) => {
    if (!confirmRevoke) {
      setConfirmRevoke(id);
      return;
    }

    setRevokingId(id);
    setConfirmRevoke(null);

    const { error } = await supabase
      .from('credentials_vault')
      .update({
        revoked_at: new Date().toISOString(),
        revoked_by: user?.id,
      })
      .eq('id', id);

    setRevokingId(null);

    if (error) {
      toast.error('Failed to revoke: ' + error.message);
    } else {
      toast.success('Credentials revoked. All active sessions terminated.');
      setEntries((prev) => prev.filter((e) => e.id !== id));
    }
  };

  const formatTimeLeft = (expiresAt: string): string => {
    const diff = new Date(expiresAt).getTime() - now;
    if (diff <= 0) return 'Expired';
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return `${h}h ${m}m ${s}s`;
  };

  const getExpiryColor = (expiresAt: string): string => {
    const diff = new Date(expiresAt).getTime() - now;
    if (diff <= 0) return 'text-white/60';
    if (diff < 3600000) return 'text-lime'; // < 1 hour
    if (diff < 86400000) return 'text-white/50'; // < 24 hours
    return 'text-white/40';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 text-lime animate-spin" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-12 bg-surface border border-white/5">
        <Lock className="w-8 h-8 text-white/20 mx-auto mb-3" />
        <p className="text-sm text-white/40">No active credentials in vault</p>
        <p className="text-xs text-white/30 mt-1">
          Submitted credentials appear here with expiry countdown and revoke controls
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
          <Shield className="w-4 h-4 text-lime" />
          Active Credentials ({entries.length})
        </h3>
      </div>

      {entries.map((entry) => (
        <div
          key={entry.id}
          className="bg-surface border border-white/5 p-4 space-y-3"
        >
          {/* Header row */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-lime/10 rounded-full flex items-center justify-center">
                <KeyRound className="w-4 h-4 text-lime" />
              </div>
              <div>
                <div className="text-sm font-medium">
                  {entry.incident_title || 'One-Time Fix'}
                </div>
                <div className="text-xs text-white/40 font-mono">
                  {entry.website_url || 'Credential Vault Entry'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-1 text-xs font-mono ${getExpiryColor(entry.expires_at)}`}>
                <Timer className="w-3 h-3" />
                {formatTimeLeft(entry.expires_at)}
              </div>
            </div>
          </div>

          {/* Fingerprint */}
          <div className="flex items-center gap-2 bg-void/50 rounded p-2">
            <Fingerprint className="w-3 h-3 text-lime" />
            <code className="text-xs font-mono text-lime break-all">
              {entry.public_key_fingerprint.substring(0, 16)}...
            </code>
            <span className="text-xs text-white/30 ml-auto">SHA-256</span>
          </div>

          {/* Security info */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-white/40">
            <div className="flex items-center gap-1">
              <EyeOff className="w-3 h-3" />
              <span>Zero-Knowledge</span>
            </div>
            <div className="flex items-center gap-1">
              <Lock className="w-3 h-3" />
              <span>AES-256-GCM</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>Created: {new Date(entry.created_at).toLocaleString()}</span>
            </div>
          </div>

          {/* Revoke */}
          <div className="pt-2 border-t border-white/5">
            {confirmRevoke === entry.id ? (
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-red-500/5 border border-red-500/20 p-3">
                  <div className="flex items-center gap-2 text-red-400 text-sm font-medium mb-1">
                    <AlertTriangle className="w-4 h-4" />
                    Confirm Revocation
                  </div>
                  <p className="text-xs text-white/60">
                    This will immediately terminate all engineer sessions using these credentials.
                    The encrypted payload will be marked as revoked.
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleRevoke(entry.id)}
                    disabled={revokingId === entry.id}
                    className="px-4 py-2 bg-red-500 text-white text-xs font-bold uppercase tracking-wider hover:bg-red-600 transition-colors flex items-center gap-1"
                  >
                    {revokingId === entry.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <XCircle className="w-3 h-3" />
                    )}
                    Revoke
                  </button>
                  <button
                    onClick={() => setConfirmRevoke(null)}
                    className="px-4 py-2 border border-white/10 text-xs text-white/40 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => handleRevoke(entry.id)}
                className="flex items-center gap-2 text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                <XCircle className="w-3.5 h-3.5" />
                Revoke Access
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
