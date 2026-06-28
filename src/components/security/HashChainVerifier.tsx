// UptimeOps v2.1 — Hash Chain Verifier
// Input incident ID, verify audit_hash_chain integrity

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { ShieldCheck, ShieldAlert, Search } from 'lucide-react';

export function HashChainVerifier() {
  const [incidentId, setIncidentId] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<{
    valid: boolean;
    blocks: number;
    rootHash: string;
    brokenAt?: number;
  } | null>(null);

  async function verify() {
    if (!incidentId.trim()) return;
    setVerifying(true);

    const { data: blocks } = await supabase
      .from('audit_hash_chain')
      .select('*')
      .eq('incident_id', incidentId.trim())
      .order('block_index', { ascending: true });

    if (!blocks || blocks.length === 0) {
      setResult({ valid: false, blocks: 0, rootHash: '' });
      setVerifying(false);
      return;
    }

    // Verify chain integrity
    let valid = true;
    let brokenAt: number | undefined;
    const expectedPrev = '0'.repeat(64);

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const expectedPrevHash = i === 0 ? expectedPrev : blocks[i - 1].combined_hash;

      if (block.previous_hash !== expectedPrevHash) {
        valid = false;
        brokenAt = i;
        break;
      }
    }

    setResult({
      valid,
      blocks: blocks.length,
      rootHash: blocks[blocks.length - 1].combined_hash,
      brokenAt,
    });
    setVerifying(false);
  }

  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5 space-y-4">
      <h3 className="text-sm font-bold text-white/80 flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-[#a3e635]" />
        Hash Chain Verifier
      </h3>

      <div className="flex gap-2">
        <input
          type="text"
          value={incidentId}
          onChange={e => setIncidentId(e.target.value)}
          placeholder="Enter Incident ID"
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#a3e635]/50"
        />
        <button
          onClick={verify}
          disabled={verifying || !incidentId.trim()}
          className="px-4 py-2 bg-[#a3e635]/10 text-[#a3e635] rounded-lg text-xs font-bold hover:bg-[#a3e635]/20 disabled:opacity-30 transition-all flex items-center gap-1.5"
        >
          <Search className="w-3.5 h-3.5" />
          Verify
        </button>
      </div>

      {result && (
        <div className={`p-3 rounded-lg border ${result.valid ? 'bg-[#a3e635]/5 border-[#a3e635]/20' : 'bg-red-500/5 border-red-500/20'}`}>
          <div className="flex items-center gap-2 mb-2">
            {result.valid ? (
              <ShieldCheck className="w-4 h-4 text-[#a3e635]" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-red-400" />
            )}
            <span className={`text-xs font-bold ${result.valid ? 'text-[#a3e635]' : 'text-red-400'}`}>
              {result.valid ? 'CHAIN VERIFIED — IMMUTABLE' : 'CHAIN INTEGRITY COMPROMISED'}
            </span>
          </div>
          {result.blocks > 0 ? (
            <div className="space-y-1 text-[11px] text-white/50">
              <p>Blocks: <span className="text-white/80">{result.blocks}</span></p>
              <p className="font-mono break-all">Root: {result.rootHash}</p>
              {result.brokenAt != null && (
                <p className="text-red-400">Broken at block {result.brokenAt}</p>
              )}
            </div>
          ) : (
            <p className="text-[11px] text-white/40">No hash chain found for this incident.</p>
          )}
        </div>
      )}
    </div>
  );
}
