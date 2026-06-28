// UptimeOps v2.1 — HQ Custom Guidelines Management
// Rule builder with compliance mapping

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { CustomGuidelineEditor } from '@/components/security/CustomGuidelineEditor';
import { FileCode2, ShieldCheck, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';

const COMPLIANCE_FRAMEWORKS = ['SOC2', 'ISO27001', 'HIPAA', 'PCI-DSS'] as const;

interface Guideline {
  id: string;
  rule_name: string;
  rule_pattern: string;
  language: string;
  severity: string;
  auto_fix_template: string;
  is_active: boolean;
  description: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  blocker: '#ef4444', critical: '#f97316', warning: '#eab308', info: '#22c55e',
};

export function HQGuidelines() {
  const [guidelines, setGuidelines] = useState<Guideline[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [selectedFrameworks, setSelectedFrameworks] = useState<string[]>(['SOC2']);

  useEffect(() => {
    fetchGuidelines();
  }, []);

  async function fetchGuidelines() {
    const { data } = await supabase.from('custom_guidelines').select('*').order('created_at', { ascending: false });
    setGuidelines(data || []);
    setLoading(false);
  }

  async function toggleActive(id: string, current: boolean) {
    await supabase.from('custom_guidelines').update({ is_active: !current }).eq('id', id);
    fetchGuidelines();
  }

  async function deleteRule(id: string) {
    await supabase.from('custom_guidelines').delete().eq('id', id);
    fetchGuidelines();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight">Custom Guidelines</h1>
          <p className="text-xs text-white/40 mt-0.5">Project-specific security rules with compliance mapping</p>
        </div>
        <button onClick={() => setShowEditor(!showEditor)} className="flex items-center gap-1.5 px-3 py-2 bg-[#a3e635]/10 text-[#a3e635] rounded-lg text-xs font-bold hover:bg-[#a3e635]/20 transition-all">
          <FileCode2 className="w-3.5 h-3.5" /> {showEditor ? 'Close' : 'New Rule'}
        </button>
      </div>

      {/* Compliance filter */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-white/40">Compliance:</span>
        {COMPLIANCE_FRAMEWORKS.map(fw => (
          <button
            key={fw}
            onClick={() => setSelectedFrameworks(prev => prev.includes(fw) ? prev.filter(f => f !== fw) : [...prev, fw])}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold transition-all ${
              selectedFrameworks.includes(fw) ? 'bg-[#a3e635]/10 text-[#a3e635]' : 'bg-white/5 text-white/40'
            }`}
          >
            <ShieldCheck className="w-3 h-3" /> {fw}
          </button>
        ))}
      </div>

      {showEditor && (
        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
          <CustomGuidelineEditor />
        </div>
      )}

      {/* Rules table */}
      {loading ? (
        <p className="text-xs text-white/40">Loading...</p>
      ) : guidelines.length === 0 ? (
        <div className="text-center py-12">
          <FileCode2 className="w-8 h-8 text-white/10 mx-auto mb-2" />
          <p className="text-xs text-white/30">No custom guidelines yet</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {guidelines.map(g => (
            <div key={g.id} className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/5 rounded-lg hover:border-white/10 transition-all">
              <button onClick={() => toggleActive(g.id, g.is_active)} className="shrink-0">
                {g.is_active ? <ToggleRight className="w-5 h-5 text-[#a3e635]" /> : <ToggleLeft className="w-5 h-5 text-white/20" />}
              </button>
              <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0" style={{ backgroundColor: `${SEVERITY_COLORS[g.severity]}20`, color: SEVERITY_COLORS[g.severity] }}>
                {g.severity}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white/80 truncate">{g.rule_name}</p>
                <p className="text-[10px] text-white/30 font-mono truncate">{g.rule_pattern}</p>
              </div>
              <span className="text-[10px] text-white/30 shrink-0">{g.language}</span>
              <button onClick={() => deleteRule(g.id)} className="text-white/20 hover:text-red-400 shrink-0">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
