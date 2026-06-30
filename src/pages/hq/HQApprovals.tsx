// ═══════════════════════════════════════════════════════════════
// APPROVAL GATE — Human-in-the-Loop Pipeline
// Side-by-side Git diff, AI confidence, Approve/Reject actions
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import { CheckCircle2, XCircle, Shield, Bot, Code2, Loader2 } from 'lucide-react';

interface Approval {
  id: string;
  title: string;
  type: string;
  severity: string;
  requester: string;
  description: string;
  old_code: string;
  new_code: string;
  ai_confidence: number;
  token_cost: number;
  test_results: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  comments: string;
}

const INITIAL_APPROVALS: Approval[] = [
  {
    id: 'appr-1', title: 'Fix SQL injection in user auth', type: 'security_patch', severity: 'critical',
    requester: 'AI-Repair-Agent-3', description: 'Detected raw string interpolation in auth.ts line 42. Proposed parameterized query fix.',
    old_code: `const query = \`SELECT * FROM users WHERE email = '\${email}' AND pass = '\${password}'\`;\nreturn db.raw(query);`,
    new_code: `const query = 'SELECT * FROM users WHERE email = ? AND pass = ?';\nreturn db.query(query, [email, password]);`,
    ai_confidence: 98, token_cost: 1247, test_results: '12/12 passed, 0 regressions',
    status: 'pending', created_at: new Date(Date.now() - 180000).toISOString(), comments: '',
  },
  {
    id: 'appr-2', title: 'Add connection timeout retry logic', type: 'infra_patch', severity: 'high',
    requester: 'AI-Repair-Agent-1', description: 'Redis connection pool exhausting under load. Proposed exponential backoff with jitter.',
    old_code: `const client = redis.createClient({ host, port });\nawait client.connect();`,
    new_code: `const client = redis.createClient({\n  host, port,\n  retry_strategy: (o) => {\n    const d = Math.min(o * 50 + Math.random() * 50, 2000);\n    return d;\n  },\n  maxRetriesPerRequest: 5\n});\nawait client.connect();`,
    ai_confidence: 87, token_cost: 892, test_results: '8/8 passed, 1 minor lint warning',
    status: 'pending', created_at: new Date(Date.now() - 600000).toISOString(), comments: '',
  },
  {
    id: 'appr-3', title: 'Update SSL cipher suite for TLS 1.3', type: 'security_patch', severity: 'critical',
    requester: 'AI-Repair-Agent-2', description: 'Legacy TLS 1.0/1.1 still enabled. Force TLS 1.3 minimum with modern cipher whitelist.',
    old_code: `ssl_protocols TLSv1 TLSv1.1 TLSv1.2 TLSv1.3;\nssl_ciphers ALL:!!NULL;`,
    new_code: `ssl_protocols TLSv1.3;\nssl_ciphers TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256;\nssl_prefer_server_ciphers off;`,
    ai_confidence: 99, token_cost: 534, test_results: '6/6 passed, SSL Labs A+ rating',
    status: 'pending', created_at: new Date(Date.now() - 1200000).toISOString(), comments: '',
  },
];

export function HQApprovals() {
  const [approvals, setApprovals] = useState<Approval[]>(INITIAL_APPROVALS);
  const [selected, setSelected] = useState<string>('appr-1');
  const [rejectComment, setRejectComment] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);

  const active = approvals.find(a => a.id === selected);
  const pending = approvals.filter(a => a.status === 'pending');

  const handleAction = async (id: string, action: 'approved' | 'rejected') => {
    setProcessing(id);
    await new Promise(r => setTimeout(r, 800));
    if (action === 'rejected' && !rejectComment.trim()) {
      setProcessing(null); return;
    }
    setApprovals(prev => prev.map(a => a.id === id ? { ...a, status: action, comments: action === 'rejected' ? rejectComment : a.comments } : a));
    setRejectComment(''); setProcessing(null);
  };

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-text-primary flex items-center gap-2"><Shield className="w-6 h-6 text-lime" /> APPROVAL GATE</h1>
          <p className="text-xs text-text-muted mt-1 font-mono">Human-in-the-loop verification — {pending.length} pending</p>
        </div>
      </div>

      {active ? (
        <div className="flex-1 flex gap-4 min-h-0">
          {/* Left: Approval List */}
          <div className="w-64 shrink-0 glass-surface rounded-xl flex flex-col overflow-hidden">
            <div className="p-3 border-b border-surface-border"><span className="text-[10px] text-text-muted uppercase font-bold">Pending Approvals</span></div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {approvals.filter(a => a.status === 'pending').map(a => (
                <button key={a.id} onClick={() => setSelected(a.id)} className={`w-full text-left p-3 rounded-lg transition-all ${selected === a.id ? 'bg-lime-dim border border-lime/30' : 'hover:bg-void-light/50 border border-transparent'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[9px] font-black uppercase px-1.5 rounded ${a.severity === 'critical' ? 'bg-rose-dim text-rose' : a.severity === 'high' ? 'bg-magenta-dim text-magenta' : 'bg-cyan-dim text-cyan'}`}>{a.severity}</span>
                    <span className="text-[9px] text-text-muted">{a.type.replace('_', ' ')}</span>
                  </div>
                  <div className="text-xs font-semibold text-text-primary truncate">{a.title}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <Bot className="w-2.5 h-2.5 text-magenta" />
                    <span className="text-[9px] text-magenta">{a.ai_confidence}% confidence</span>
                  </div>
                </button>
              ))}
              {pending.length === 0 && <div className="text-center py-8 text-text-muted text-xs">All approvals processed</div>}
            </div>
          </div>

          {/* Main: Code Diff Canvas */}
          <div className="flex-1 glass-surface rounded-xl flex flex-col overflow-hidden">
            {/* Title bar */}
            <div className="px-4 py-3 border-b border-surface-border flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-sm font-bold text-text-primary">{active.title}</h3>
                <div className="flex items-center gap-3 mt-1">
                  <span className="flex items-center gap-1 text-[10px] text-magenta"><Bot className="w-3 h-3" /> {active.requester}</span>
                  <span className="text-[10px] text-text-muted">{active.description}</span>
                </div>
              </div>
              <div className="flex items-center gap-4 text-[10px] font-bold">
                <span className="flex items-center gap-1 text-cyan"><Code2 className="w-3 h-3" /> {active.token_cost.toLocaleString()} tokens</span>
                <span className="flex items-center gap-1 text-lime"><CheckCircle2 className="w-3 h-3" /> {active.test_results}</span>
              </div>
            </div>

            {/* AI Confidence Bar */}
            <div className="px-4 py-2 bg-void-light/30 border-b border-surface-border flex items-center gap-4 shrink-0">
              <span className="text-[10px] text-text-muted uppercase font-bold">AI Confidence</span>
              <div className="flex-1 h-2 bg-surface-border rounded-full overflow-hidden max-w-[200px]">
                <div className="h-full rounded-full transition-all" style={{ width: `${active.ai_confidence}%`, background: active.ai_confidence >= 95 ? '#a3e635' : active.ai_confidence >= 80 ? '#22d3ee' : '#f43f5e' }} />
              </div>
              <span className={`text-xs font-black ${active.ai_confidence >= 95 ? 'text-lime' : active.ai_confidence >= 80 ? 'text-cyan' : 'text-rose'}`}>{active.ai_confidence}%</span>
            </div>

            {/* Side-by-side Diff */}
            <div className="flex-1 flex overflow-hidden">
              {/* Old (Broken) */}
              <div className="flex-1 border-r border-surface-border overflow-auto">
                <div className="px-3 py-2 bg-rose-dim/30 border-b border-rose/20 flex items-center gap-2 shrink-0">
                  <XCircle className="w-3.5 h-3.5 text-rose" />
                  <span className="text-[10px] font-bold text-rose uppercase">Original (Broken)</span>
                </div>
                <pre className="p-4 font-mono text-[11px] text-rose/80 leading-relaxed whitespace-pre-wrap">{active.old_code}</pre>
              </div>
              {/* New (Fix) */}
              <div className="flex-1 overflow-auto">
                <div className="px-3 py-2 bg-lime-dim/30 border-b border-lime/20 flex items-center gap-2 shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5 text-lime" />
                  <span className="text-[10px] font-bold text-lime uppercase">AI Proposed Fix</span>
                </div>
                <pre className="p-4 font-mono text-[11px] text-lime/80 leading-relaxed whitespace-pre-wrap">{active.new_code}</pre>
              </div>
            </div>

            {/* Action Footer */}
            <div className="px-4 py-3 border-t border-surface-border shrink-0 space-y-3">
              {active.status === 'pending' && (
                <>
                  <div className="flex gap-3">
                    <button onClick={() => handleAction(active.id, 'approved')} disabled={!!processing} className="flex-1 py-3 bg-lime text-void-dark text-xs font-black uppercase tracking-wider rounded-lg hover:bg-lime-light transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                      {processing === active.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      Approve &amp; Deploy to Production
                    </button>
                    <button onClick={() => handleAction(active.id, 'rejected')} disabled={!!processing || !rejectComment.trim()} className="flex-1 py-3 bg-rose text-white text-xs font-black uppercase tracking-wider rounded-lg hover:bg-rose-light transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                      {processing === active.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                      Reject &amp; Reprompt Agent
                    </button>
                  </div>
                  <textarea
                    value={rejectComment}
                    onChange={e => setRejectComment(e.target.value)}
                    placeholder="Required: Provide context for rejection (why this patch should not be deployed)..."
                    rows={2}
                    className="w-full bg-void-light border border-surface-border rounded-lg px-3 py-2 text-xs text-text-primary placeholder:text-text-disabled focus:border-rose focus:outline-none resize-none"
                  />
                </>
              )}
              {active.status === 'approved' && (
                <div className="flex items-center gap-2 p-3 bg-lime-dim border border-lime/20 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-lime" />
                  <span className="text-sm font-bold text-lime">Approved — Deployed to production</span>
                </div>
              )}
              {active.status === 'rejected' && (
                <div className="flex items-center gap-2 p-3 bg-rose-dim border border-rose/20 rounded-lg">
                  <XCircle className="w-5 h-5 text-rose" />
                  <span className="text-sm font-bold text-rose">Rejected — Agent cycle reprompted</span>
                  {active.comments && <span className="text-xs text-text-muted ml-2">Reason: {active.comments}</span>}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-text-muted text-sm">No pending approvals</div>
      )}
    </div>
  );
}
