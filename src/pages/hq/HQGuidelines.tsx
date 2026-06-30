// ═══════════════════════════════════════════════════════════════
// HQ GUIDELINES MANAGER — AI Tuning & Compliance Rule Engine
// Interactive rule builder: scope selector, code editor, agent assignment
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import {
  BookOpen, Plus, CheckCircle2, X, Zap, Code2, Save,
  Trash2, Shield, Bot, Eye, FileCode2, ChevronDown,
  Lock, Server
} from 'lucide-react';

interface GuidelineRule {
  id: string;
  name: string;
  scope: string;
  code: string;
  targetAgents: string[];
  severity: 'enforce' | 'warn' | 'info';
  active: boolean;
  createdAt: string;
}

const SCOPE_OPTIONS = [
  'React 19', 'Node.js Security', 'Database Migrations', 'API Design', 'Infrastructure', 'Authentication', 'CSS/Styling', 'Testing',
];

const AGENT_STAGES = [
  { id: 'triage', label: 'TRIAGE', icon: Eye, desc: 'Detection & classification' },
  { id: 'isolate', label: 'ISOLATE', icon: Server, desc: 'Sandbox provisioning' },
  { id: 'repair', label: 'REPAIR', icon: Bot, desc: 'Patch generation' },
  { id: 'validate', label: 'VALIDATE', icon: Shield, desc: 'Security review' },
  { id: 'deploy', label: 'DEPLOY', icon: Zap, desc: 'Zero-downtime rollout' },
  { id: 'audit', label: 'AUDIT', icon: Lock, desc: 'Compliance trail' },
];

const INITIAL_RULES: GuidelineRule[] = [
  {
    id: 'rule-1', name: 'No eval() or Function() constructor', scope: 'Node.js Security',
    code: "// ENFORCE: Never use eval() or new Function()\n// RATIONALE: Remote code execution risk\n// SEVERITY: CRITICAL \u2014 Block deployment\n\nconst forbidden = ['eval', 'Function', 'setTimeout(code)', 'setInterval(code)'];\n\nfunction validate(code: string) {\n  for (const f of forbidden) {\n    if (code.includes(f)) throw new SecurityError(f + ' is forbidden');\n  }\n}",
    targetAgents: ['repair', 'validate'], severity: 'enforce', active: true, createdAt: '2026-06-01',
  },
  {
    id: 'rule-2', name: 'SQL parameterized queries only', scope: 'Database Migrations',
    code: "// ENFORCE: All DB queries must use parameterized statements\n// RATIONALE: SQL injection prevention\n// AUTO-FIX: Wrap raw queries in preparedStatement()\n\n// BAD: db.query(SELECT * FROM users WHERE id = USER_ID)\n// GOOD: db.query('SELECT * FROM users WHERE id = ?', [userId])\n",
    targetAgents: ['repair', 'validate'], severity: 'enforce', active: true, createdAt: '2026-06-03',
  },
  {
    id: 'rule-3', name: 'React hooks dependency audit', scope: 'React 19',
    code: '// WARN: useEffect / useCallback must declare all dependencies\\n// RATIONALE: Stale closure bugs, infinite loops\\n// CHECK: eslint-plugin-react-hooks exhaustive-deps',
    targetAgents: ['validate'], severity: 'warn', active: true, createdAt: '2026-06-05',
  },
];

export function HQGuidelines() {
  const [rules, setRules] = useState<GuidelineRule[]>(INITIAL_RULES);
  const [showAdd, setShowAdd] = useState(false);
  const [editingRule, setEditingRule] = useState<string | null>(null);

  // New rule form state
  const [newName, setNewName] = useState('');
  const [newScope, setNewScope] = useState(SCOPE_OPTIONS[0]);
  const [newCode, setNewCode] = useState('');
  const [newAgents, setNewAgents] = useState<string[]>(['repair', 'validate']);
  const [newSeverity, setNewSeverity] = useState<'enforce' | 'warn' | 'info'>('warn');

  const toggleAgent = (agentId: string) => {
    setNewAgents(prev => prev.includes(agentId) ? prev.filter(a => a !== agentId) : [...prev, agentId]);
  };

  const handleSave = () => {
    if (!newName || !newCode) return;
    const rule: GuidelineRule = {
      id: `rule-${Date.now()}`, name: newName, scope: newScope,
      code: newCode, targetAgents: newAgents, severity: newSeverity,
      active: true, createdAt: new Date().toISOString(),
    };
    setRules(prev => [rule, ...prev]);
    resetForm();
  };

  const resetForm = () => {
    setNewName(''); setNewScope(SCOPE_OPTIONS[0]); setNewCode('');
    setNewAgents(['repair', 'validate']); setNewSeverity('warn'); setShowAdd(false);
  };

  const deleteRule = (id: string) => setRules(prev => prev.filter(r => r.id !== id));
  const toggleActive = (id: string) => setRules(prev => prev.map(r => r.id === id ? { ...r, active: !r.active } : r));

  const severityBadge = (s: string) => s === 'enforce' ? 'badge-rose' : s === 'warn' ? 'badge-magenta' : 'badge-cyan';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-text-primary flex items-center gap-2"><BookOpen className="w-6 h-6 text-cyan" /> GUIDELINES MANAGER</h1>
          <p className="text-xs text-text-muted mt-1 font-mono">AI Tuning &amp; Compliance Rule Engine — {rules.length} active rules</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-2 px-4 py-2 bg-lime text-void-dark text-xs font-black uppercase tracking-wider rounded-lg hover:bg-lime-light transition-colors">
          <Plus className="w-3.5 h-3.5" /> {showAdd ? 'Cancel' : 'New Rule'}
        </button>
      </div>

      {/* New Rule Builder */}
      {showAdd && (
        <div className="glass-surface rounded-xl p-6 border border-cyan/20 animate-slide-down">
          <h3 className="text-sm font-black text-text-primary uppercase tracking-wider mb-4 flex items-center gap-2">
            <Code2 className="w-4 h-4 text-cyan" /> Create New Guideline
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Config */}
            <div className="space-y-4">
              {/* Rule Name */}
              <div>
                <label className="text-[10px] text-text-muted uppercase tracking-wider font-bold mb-1.5 block">Rule Name</label>
                <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g., No hardcoded secrets" className="w-full bg-void-light border border-surface-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-disabled focus:border-cyan focus:outline-none" />
              </div>

              {/* Scope Selector */}
              <div>
                <label className="text-[10px] text-text-muted uppercase tracking-wider font-bold mb-1.5 block">Rule Scope</label>
                <div className="relative">
                  <select value={newScope} onChange={e => setNewScope(e.target.value)} className="w-full bg-void-light border border-surface-border rounded-lg px-3 py-2 text-sm text-text-primary appearance-none focus:border-cyan focus:outline-none">
                    {SCOPE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <ChevronDown className="w-4 h-4 text-text-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Severity */}
              <div>
                <label className="text-[10px] text-text-muted uppercase tracking-wider font-bold mb-1.5 block">Enforcement Level</label>
                <div className="flex gap-2">
                  {(['enforce', 'warn', 'info'] as const).map(s => (
                    <button key={s} onClick={() => setNewSeverity(s)} className={`flex-1 py-2 rounded text-[10px] font-black uppercase border transition-all ${newSeverity === s ? s === 'enforce' ? 'bg-rose-dim text-rose border-rose/30' : s === 'warn' ? 'bg-magenta-dim text-magenta border-magenta/30' : 'bg-cyan-dim text-cyan border-cyan/30' : 'bg-void-light text-text-muted border-surface-border'}`}>
                    {s}
                  </button>
                  ))}
                </div>
              </div>

              {/* Target Agent Assignment Tree */}
              <div>
                <label className="text-[10px] text-text-muted uppercase tracking-wider font-bold mb-2 block">Target Agent Stages</label>
                <div className="grid grid-cols-3 gap-2">
                  {AGENT_STAGES.map(stage => {
                    const isSelected = newAgents.includes(stage.id);
                    return (
                      <button key={stage.id} onClick={() => toggleAgent(stage.id)} className={`p-2.5 rounded border text-left transition-all ${isSelected ? 'bg-lime-dim border-lime/30' : 'bg-void-light border-surface-border hover:border-cyan/20'}`}>
                        <div className="flex items-center gap-1.5">
                          {isSelected ? <CheckCircle2 className="w-3 h-3 text-lime" /> : <stage.icon className="w-3 h-3 text-text-muted" />}
                          <span className={`text-[10px] font-bold uppercase ${isSelected ? 'text-lime' : 'text-text-muted'}`}>{stage.label}</span>
                        </div>
                        <div className="text-[8px] text-text-muted mt-0.5">{stage.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right: Code Editor */}
            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-text-muted uppercase tracking-wider font-bold mb-1.5 block">Guideline Code / Regex</label>
                <div className="relative">
                  <textarea
                    value={newCode}
                    onChange={e => setNewCode(e.target.value)}
                    placeholder={`// Write your compliance rule here\n// Example: Enforce parameterized queries\n\nfunction validate(code) {\n  if (code.match(/\\$\\{.*\\}.*\\b(SELECT|INSERT|UPDATE)\\b/i)) {\n    throw new Error('SQL injection risk: use parameterized queries');\n  }\n}`}
                    rows={14}
                    className="w-full bg-void-deep border border-surface-border rounded-lg p-4 text-xs font-mono text-text-primary placeholder:text-text-disabled focus:border-cyan focus:outline-none resize-none leading-relaxed"
                  />
                  <div className="absolute top-2 right-2 flex items-center gap-1">
                    <span className="text-[8px] text-text-muted font-mono bg-void-light px-1.5 py-0.5 rounded">JS / REGEX</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button onClick={resetForm} className="px-4 py-2 text-xs font-bold text-text-secondary border border-surface-border rounded-lg hover:bg-surface-hover/30 transition-colors">Cancel</button>
                <button onClick={handleSave} disabled={!newName || !newCode} className="flex-1 px-4 py-2 bg-lime text-void-dark text-xs font-black uppercase tracking-wider rounded-lg hover:bg-lime-light transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  <Save className="w-3.5 h-3.5" /> Save Rule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rules List */}
      <div className="space-y-3">
        {rules.map(rule => (
          <div key={rule.id} className={`glass-surface rounded-xl p-5 border transition-all ${rule.active ? 'border-surface-border' : 'border-surface-border/30 opacity-60'}`}>
            {/* Rule Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <button onClick={() => toggleActive(rule.id)} className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all ${rule.active ? 'bg-lime-dim border-lime/30' : 'bg-surface-hover border-surface-border'}`}>
                  {rule.active ? <CheckCircle2 className="w-4 h-4 text-lime" /> : <X className="w-4 h-4 text-text-muted" />}
                </button>
                <div>
                  <div className="text-sm font-bold text-text-primary">{rule.name}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-mono text-cyan bg-cyan-dim border border-cyan/20 px-1.5 py-0.5 rounded">{rule.scope}</span>
                    <span className={severityBadge(rule.severity)}>{rule.severity}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => { setEditingRule(editingRule === rule.id ? null : rule.id); }} className="p-1.5 text-text-muted hover:text-cyan transition-colors">
                  <FileCode2 className="w-4 h-4" />
                </button>
                <button onClick={() => deleteRule(rule.id)} className="p-1.5 text-text-muted hover:text-rose transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Agent Badges */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {rule.targetAgents.map(agentId => {
                const stage = AGENT_STAGES.find(s => s.id === agentId);
                return stage ? (
                  <span key={agentId} className="flex items-center gap-1 px-2 py-0.5 bg-void-light border border-surface-border rounded text-[9px] font-bold text-text-muted">
                    <stage.icon className="w-2.5 h-2.5" /> {stage.label}
                  </span>
                ) : null;
              })}
            </div>

            {/* Code Preview (expandable) */}
            {editingRule === rule.id && (
              <div className="bg-void-deep border border-surface-border rounded-lg p-4 font-mono text-[11px] text-text-secondary whitespace-pre-wrap leading-relaxed animate-fade-in">
                {rule.code}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
