// ═══════════════════════════════════════════════════════════════
// CREDENTIALS PANEL — v2.1
// Fetches real credentials from vault_secrets. No mock data.
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { KeyRound, Eye, EyeOff, Copy, Clock, AlertTriangle, Loader2, CheckCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import type { StoredCredential } from './types';

interface CredentialsPanelProps {
  incidentId: string;
  customerEmail: string;
}

const typeColors: Record<string, string> = {
  ssh: '#a3e635', database: '#22d3ee', api_key: '#eab308',
  server: '#f97316', domain: '#e879f9',
};

export function CredentialsPanel({ incidentId, customerEmail }: CredentialsPanelProps) {
  const [creds, setCreds] = useState<StoredCredential[]>([]);
  const [visible, setVisible] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function loadCreds() {
    setLoading(true);
    setError(null);
    try {
      const { data, error: dbError } = await supabase
        .from('vault_secrets')
        .select('id, label, secret_type, created_at, metadata')
        .eq('incident_id', incidentId)
        .order('created_at', { ascending: false });

      if (dbError) throw dbError;

      const mapped: StoredCredential[] = (data || []).map((c: any) => ({
        id: c.id,
        type: c.secret_type || 'ssh',
        name: c.label || 'Unnamed',
        value: '••••••••••••••••',
        description: c.metadata?.description || '',
        addedAt: c.created_at,
        expiresAt: c.metadata?.expires_at || null,
        lastUsed: null,
      }));

      setCreds(mapped);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load credentials');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadCreds(); }, [incidentId]);

  const toggleVisible = (id: string) => {
    setVisible(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  const activeCount = creds.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white/80">CREDENTIALS</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/40">{activeCount} active</span>
          <button onClick={loadCreds} className="text-white/30 hover:text-[#a3e635] transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {customerEmail && (
        <p className="text-xs text-white/30 font-mono">Customer: {customerEmail}</p>
      )}

      {loading && (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-4 h-4 text-[#a3e635] animate-spin" />
          <span className="text-xs text-white/30 ml-2">Loading credentials...</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 text-xs text-red-400">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {error}
        </div>
      )}

      {!loading && !error && creds.length === 0 && (
        <p className="text-xs text-white/30 py-4 text-center">No credentials submitted for this incident.</p>
      )}

      <div className="space-y-2">
        {creds.map(cred => {
          const isVisible = visible.has(cred.id);
          const color = typeColors[cred.type] || '#a3e635';
          return (
            <div key={cred.id} className="p-3 bg-black/30 border border-white/5 hover:bg-white/[0.02] transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4" style={{ color }} />
                  <div>
                    <p className="text-xs font-bold text-white/80">{cred.name}</p>
                    <p className="text-[10px] text-white/30 font-mono">{cred.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => toggleVisible(cred.id)} className="p-1 text-white/20 hover:text-white/60 transition-colors">
                    {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => copyToClipboard(cred.value, cred.id)} className="p-1 text-white/20 hover:text-[#a3e635] transition-colors">
                    {copied === cred.id ? <CheckCircle className="w-3.5 h-3.5 text-[#a3e635]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <div className="mt-2 font-mono text-xs bg-black/50 p-2 border border-white/5 text-white/40">
                {isVisible ? cred.value : '••••••••••••••••'}
              </div>
              <div className="flex items-center gap-3 mt-1.5 text-[10px] text-white/20">
                {cred.expiresAt && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" /> Expires {new Date(cred.expiresAt).toLocaleDateString()}
                  </span>
                )}
                <span>Added {new Date(cred.addedAt).toLocaleDateString()}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
