// UptimeOps v2.1 — Custom Guideline Editor
// Rule builder with pattern input, severity, auto-fix template

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Plus, Trash2, Play, Save } from 'lucide-react';

interface Guideline {
  id?: string;
  rule_name: string;
  rule_pattern: string;
  language: string;
  severity: 'blocker' | 'critical' | 'warning' | 'info';
  auto_fix_template: string;
  description: string;
}

const SEVERITY_COLORS = {
  blocker: '#ef4444', critical: '#f97316', warning: '#eab308', info: '#22c55e',
};

export function CustomGuidelineEditor({ projectId, readOnly = false }: { projectId?: string; readOnly?: boolean }) {
  const [guidelines, setGuidelines] = useState<Guideline[]>([]);
  const [editing, setEditing] = useState<Guideline | null>(null);
  const [testCode, setTestCode] = useState('');
  const [testResult, setTestResult] = useState<string | null>(null);

  const addNew = () => {
    setEditing({ rule_name: '', rule_pattern: '', language: 'typescript', severity: 'warning', auto_fix_template: '', description: '' });
  };

  const save = async () => {
    if (!editing || !projectId) return;
    const { data } = await supabase.from('custom_guidelines').insert({
      project_id: projectId,
      ...editing,
    }).select().single();
    if (data) {
      setGuidelines([...guidelines, data]);
      setEditing(null);
    }
  };

  const runTest = () => {
    if (!editing?.rule_pattern || !testCode) return;
    try {
      const regex = new RegExp(editing.rule_pattern, 'gm');
      const matches = testCode.match(regex);
      setTestResult(matches ? `Found ${matches.length} match(es): ${matches.slice(0, 3).join(', ')}${matches.length > 3 ? '...' : ''}` : 'No matches found');
    } catch {
      setTestResult('Invalid regex pattern');
    }
  };

  return (
    <div className="space-y-4">
      {!readOnly && (
        <div className="flex items-center justify-between">
          <button onClick={addNew} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#a3e635]/10 text-[#a3e635] rounded-lg text-xs font-bold hover:bg-[#a3e635]/20 transition-all">
            <Plus className="w-3.5 h-3.5" /> New Rule
          </button>
        </div>
      )}

      {editing && (
        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input value={editing.rule_name} onChange={e => setEditing({ ...editing, rule_name: e.target.value })} placeholder="Rule name" className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#a3e635]/50" />
            <select value={editing.severity} onChange={e => setEditing({ ...editing, severity: e.target.value as any })} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none">
              {Object.keys(SEVERITY_COLORS).map(s => <option key={s} value={s} className="bg-[#0a0a0f]">{s}</option>)}
            </select>
          </div>
          <input value={editing.rule_pattern} onChange={e => setEditing({ ...editing, rule_pattern: e.target.value })} placeholder="Regex pattern" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-white/30 font-mono focus:outline-none focus:border-[#a3e635]/50" />
          <textarea value={editing.description} onChange={e => setEditing({ ...editing, description: e.target.value })} placeholder="Description" rows={2} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#a3e635]/50" />
          <textarea value={editing.auto_fix_template} onChange={e => setEditing({ ...editing, auto_fix_template: e.target.value })} placeholder="Auto-fix template (optional)" rows={2} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-white/30 font-mono focus:outline-none focus:border-[#a3e635]/50" />

          {/* Live test */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <textarea value={testCode} onChange={e => setTestCode(e.target.value)} placeholder="Test code snippet..." rows={3} className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-white/30 font-mono focus:outline-none" />
              <button onClick={runTest} className="px-3 py-2 bg-[#22d3ee]/10 text-[#22d3ee] rounded-lg text-xs font-bold hover:bg-[#22d3ee]/20 flex items-center gap-1"><Play className="w-3 h-3" /> Test</button>
            </div>
            {testResult && <p className="text-[11px] text-white/60">{testResult}</p>}
          </div>

          <div className="flex gap-2">
            <button onClick={save} className="flex items-center gap-1.5 px-4 py-2 bg-[#a3e635] text-black rounded-lg text-xs font-bold hover:bg-[#a3e635]/90"><Save className="w-3.5 h-3.5" /> Save</button>
            <button onClick={() => setEditing(null)} className="px-4 py-2 text-white/40 hover:text-white text-xs">Cancel</button>
          </div>
        </div>
      )}

      {/* List */}
      {guidelines.length === 0 && !editing ? (
        <p className="text-xs text-white/30">No custom guidelines yet.</p>
      ) : (
        <div className="space-y-1.5">
          {guidelines.map(g => (
            <div key={g.id} className="flex items-center gap-3 p-2.5 bg-white/[0.02] border border-white/5 rounded-lg">
              <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ backgroundColor: `${SEVERITY_COLORS[g.severity]}20`, color: SEVERITY_COLORS[g.severity] }}>{g.severity}</span>
              <span className="text-xs text-white/80 flex-1">{g.rule_name}</span>
              <span className="text-[10px] text-white/30 font-mono">{g.language}</span>
              {!readOnly && <button onClick={() => setGuidelines(guidelines.filter(x => x.id !== g.id))} className="text-white/20 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
