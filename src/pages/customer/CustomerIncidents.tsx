// ═══════════════════════════════════════════════════════════════
// CUSTOMER INCIDENTS v2.5 — Kanban + Detail Pane
// 6-agent gated tracker, 42-scanner grid, CodeGraph canvas,
// customer approval/rejection module
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Shield,
  Zap,
  Server,
  Eye,
  Fingerprint,
  Clock,
  MessageSquare,
  Send,
  ThumbsUp,
  ThumbsDown,
  CircleDot,
  Activity,
  FileText,
  HardHat,
  CheckSquare,
  X,
  Bot,
  BrainCircuit
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

// ── Types ──
interface Incident {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: string;
  stage: number;
  confidence: number;
  retryCount: number;
  escalated: boolean;
  created_at: string;
  description: string;
  website: string;
}

interface ChatMessage {
  id: string;
  sender: 'customer' | 'coordinator' | 'system';
  text: string;
  timestamp: string;
}

// ── Mock Data ──
const MOCK_INCIDENTS: Incident[] = [
  { id: 'INC-2024-001847', title: 'SSL Certificate Expiry on API Gateway', severity: 'critical', status: 'deployed', stage: 4, confidence: 96, retryCount: 0, escalated: false, created_at: new Date(Date.now() - 86400000).toISOString(), description: 'TLS certificate for api.uptimeops.io expires in 18 hours. Auto-detected by Certificate Expiry scanner.', website: 'api.uptimeops.io' },
  { id: 'INC-2024-001846', title: 'Database Connection Pool Exhaustion', severity: 'high', status: 'repaired', stage: 2, confidence: 88, retryCount: 1, escalated: false, created_at: new Date(Date.now() - 172800000).toISOString(), description: 'Connection pool maxed out at 500 concurrent connections. Query performance degraded.', website: 'db-primary.uptimeops.io' },
  { id: 'INC-2024-001845', title: 'Edge Function Cold Start Degradation', severity: 'medium', status: 'triaged', stage: 0, confidence: 0, retryCount: 0, escalated: false, created_at: new Date(Date.now() - 259200000).toISOString(), description: 'Edge function cold start averaging 890ms across us-east and eu-west regions.', website: 'edge.uptimeops.io' },
  { id: 'INC-2024-001844', title: 'DNS Propagation Delay on Secondary NS', severity: 'high', status: 'validated', stage: 3, confidence: 97, retryCount: 0, escalated: false, created_at: new Date(Date.now() - 345600000).toISOString(), description: 'DNS changes not propagating to secondary nameserver ns2.uptimeops.io within SLA.', website: 'uptimeops.io' },
  { id: 'INC-2024-001843', title: 'Storage Bucket Permission Misconfiguration', severity: 'low', status: 'resolved', stage: 5, confidence: 99, retryCount: 0, escalated: false, created_at: new Date(Date.now() - 432000000).toISOString(), description: 'S3 bucket had overly permissive ACL allowing public read access.', website: 'assets.uptimeops.io' },
  { id: 'INC-2024-001842', title: 'OAuth Token Rotation Failure', severity: 'critical', status: 'isolated', stage: 1, confidence: 72, retryCount: 2, escalated: true, created_at: new Date(Date.now() - 500000000).toISOString(), description: 'OAuth refresh tokens failing rotation after keypair update. 3 retry attempts exhausted. Escalated to on-call engineer.', website: 'auth.uptimeops.io' },
];

const MOCK_CHAT: ChatMessage[] = [
  { id: '1', sender: 'system', text: 'Incident INC-2024-001847 has been submitted to the autonomous pipeline.', timestamp: new Date(Date.now() - 3600000).toISOString() },
  { id: '2', sender: 'coordinator', text: 'We have triaged this as P1 Critical — SSL expiry within 18 hours. The repair agent is generating a new certificate now.', timestamp: new Date(Date.now() - 3000000).toISOString() },
  { id: '3', sender: 'system', text: 'Patch generated with 96% confidence. Auto-approved for deployment (threshold: >95%).', timestamp: new Date(Date.now() - 2400000).toISOString() },
  { id: '4', sender: 'coordinator', text: 'Deployment successful. Please review the fix and approve or reject below.', timestamp: new Date(Date.now() - 1800000).toISOString() },
];

// ── 42 Scanner Matrix Data ──
const SCANNER_CATEGORIES = [
  { name: 'Infrastructure', color: '#a3e635', scanners: ['VM Health', 'Load Balancer', 'CDN Edge', 'Storage Bucket', 'Backup Integrity', 'Uptime Sentinel'] },
  { name: 'SSL/TLS', color: '#22d3ee', scanners: ['Certificate Expiry', 'Cipher Suite', 'TLS Version', 'OCSP Responder', 'Chain Validation', 'HSTS Inspector'] },
  { name: 'DNS', color: '#e879f9', scanners: ['DNSSEC Validator', 'Propagation', 'MX Record', 'TXT/SPF', 'Nameserver Sync', 'CNAME Chain'] },
  { name: 'Auth', color: '#f43f5e', scanners: ['MFA Policy', 'Session Token', 'JWT Validator', 'OAuth Scope', 'Password Policy', 'Brute Force'] },
  { name: 'Database', color: '#fbbf24', scanners: ['Query Perf', 'Connection Pool', 'Replication Lag', 'Index Health', 'Deadlock', 'Backup Verify'] },
  { name: 'Edge', color: '#a78bfa', scanners: ['Cold Start', 'Memory Leak', 'Timeout', 'Dependency Audit', 'Error Rate', 'Invocation Limit'] },
  { name: 'Network', color: '#34d399', scanners: ['Latency Probe', 'Packet Loss', 'Firewall', 'Port Scan', 'DDoS Detect', 'Bandwidth'] },
  { name: 'Containers', color: '#fb923c', scanners: ['Image Vuln', 'Runtime Sec', 'Resource Limit', 'Pod Health', 'Registry Scan', 'Secret Leak'] },
];

const ALL_SCANNERS = SCANNER_CATEGORIES.flatMap(c => c.scanners.map((s) => ({
  name: s, category: c.name, color: c.color,
  status: Math.random() > 0.9 ? 'fail' as const : Math.random() > 0.8 ? 'eval' as const : 'pass' as const,
})));

const AGENT_STAGES = [
  { name: 'Triage', desc: 'Severity assessment & routing', icon: Eye, color: '#22d3ee' },
  { name: 'Isolate', desc: 'Sandbox provisioning', icon: Server, color: '#e879f9' },
  { name: 'Repair', desc: 'AI patch generation', icon: Bot, color: '#a3e635' },
  { name: 'Validate', desc: '42-scanner verification', icon: Shield, color: '#fbbf24' },
  { name: 'Deploy', desc: 'Zero-downtime rollout', icon: Zap, color: '#34d399' },
  { name: 'Audit', desc: 'Compliance trail generation', icon: FileText, color: '#a78bfa' },
];

// ── Severity Config ──
const SEV_CONFIG = {
  critical: { color: '#f43f5e', bg: 'bg-rose/10', border: 'border-rose/20', label: 'P1 CRITICAL' },
  high:     { color: '#fb923c', bg: 'bg-orange/10', border: 'border-orange/20', label: 'P2 HIGH' },
  medium:   { color: '#fbbf24', bg: 'bg-amber/10', border: 'border-amber/20', label: 'P3 MEDIUM' },
  low:      { color: '#a3e635', bg: 'bg-lime/10', border: 'border-lime/20', label: 'P4 LOW' },
};

const STATUS_COLUMNS = [
  { key: 'submitted', label: 'Submitted' },
  { key: 'triaged', label: 'Triaged' },
  { key: 'repaired', label: 'In Progress' },
  { key: 'deployed', label: 'Deployed' },
  { key: 'resolved', label: 'Resolved' },
];

export function CustomerIncidents() {
    const [incidents] = useState<Incident[]>(MOCK_INCIDENTS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(MOCK_CHAT);
  const [chatInput, setChatInput] = useState('');
  const [rejectNote, setRejectNote] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [hoveredScanner, setHoveredScanner] = useState<string | null>(null);

  const selected = incidents.find(i => i.id === selectedId);

  const handleApprove = () => {
    toast.success('Incident approved. Closing ticket and generating audit certificate.');
    setSelectedId(null);
  };

  const handleReject = () => {
    if (!rejectNote.trim()) { toast.error('Please provide rejection details'); return; }
    toast.success('Rejection submitted. Repair re-attempt request dispatched to HQ Admin.');
    setShowRejectForm(false);
    setRejectNote('');
    setSelectedId(null);
  };

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    setChatMessages(prev => [...prev, { id: String(Date.now()), sender: 'customer', text: chatInput, timestamp: new Date().toISOString() }]);
    setChatInput('');
    setTimeout(() => {
      setChatMessages(prev => [...prev, { id: String(Date.now() + 1), sender: 'coordinator', text: 'Thank you for your message. The HQ Coordinator will review and respond shortly.', timestamp: new Date().toISOString() }]);
    }, 1500);
  };

  const sevCfg = (s: string) => SEV_CONFIG[s as keyof typeof SEV_CONFIG] || SEV_CONFIG.medium;

  if (selected) {
    return (
      <div className="space-y-4">
        {/* Detail Header */}
        <div className="flex items-center justify-between">
          <button onClick={() => setSelectedId(null)} className="flex items-center gap-1 text-[11px] text-white/40 hover:text-white/60 transition-colors">
            <ChevronLeft className="w-3.5 h-3.5" /> Back to Incidents
          </button>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-white/30">{selected.id}</span>
            <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${sevCfg(selected.severity).bg} ${sevCfg(selected.severity).border} border`} style={{ color: sevCfg(selected.severity).color }}>
              {sevCfg(selected.severity).label}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Main Detail Column */}
          <div className="xl:col-span-2 space-y-4">
            {/* Title Card */}
            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
              <h2 className="text-lg font-black text-white mb-1">{selected.title}</h2>
              <p className="text-xs text-white/40">{selected.description}</p>
              <div className="flex items-center gap-4 mt-3 text-[10px] text-white/30">
                <span className="flex items-center gap-1"><Server className="w-3 h-3" /> {selected.website}</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(selected.created_at).toLocaleString()}</span>
                <span className="flex items-center gap-1"><Activity className="w-3 h-3" /> Status: <span className="text-cyan font-bold uppercase">{selected.status}</span></span>
              </div>
            </div>

            {/* 6-Agent Autonomous Tracker */}
            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
              <h3 className="text-[10px] font-black uppercase tracking-wider text-white/40 mb-4 flex items-center gap-2">
                <BrainCircuit className="w-3.5 h-3.5 text-magenta" style={{ color: '#e879f9' }} /> 6-Agent Autonomous Pipeline
              </h3>

              {/* Gating Logic Display */}
              {selected.confidence > 0 && (
                <div className={`mb-4 p-3 rounded-lg border ${selected.confidence > 95 ? 'border-lime/20 bg-lime/5' : 'border-amber/20 bg-amber/5'}`}>
                  <div className="flex items-center gap-2">
                    {selected.confidence > 95 ? <CheckCircle2 className="w-4 h-4 text-lime" /> : <HardHat className="w-4 h-4 text-amber" />}
                    <span className={`text-[11px] font-bold ${selected.confidence > 95 ? 'text-lime' : 'text-amber'}`}>
                      {selected.confidence > 95 ? 'AI AUTO-APPROVED (>95% confidence)' : 'ADMIN-GATED (≤95% confidence)'}
                    </span>
                  </div>
                  <div className="mt-2 h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${selected.confidence}%`, backgroundColor: selected.confidence > 95 ? '#a3e635' : '#fbbf24' }} />
                  </div>
                  <span className="text-[10px] text-white/30 mt-1 block">Confidence: {selected.confidence}%</span>
                  {selected.confidence <= 95 && selected.retryCount > 0 && (
                    <span className="text-[10px] text-amber mt-1 block">Retry Attempt: {selected.retryCount} of 3</span>
                  )}
                  {selected.escalated && (
                    <span className="text-[10px] text-rose mt-1 block flex items-center gap-1"><HardHat className="w-3 h-3" /> Escalated to On-Call Engineer by Admin</span>
                  )}
                </div>
              )}

              {/* Agent Timeline */}
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-px bg-white/5" />
                <div className="space-y-3">
                  {AGENT_STAGES.map((stage, i) => {
                    const isActive = i === selected.stage;
                    const isComplete = i < selected.stage;
                    return (
                      <div key={stage.name} className="relative flex items-start gap-3 pl-1">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10"
                          style={{
                            backgroundColor: isComplete ? `${stage.color}20` : isActive ? `${stage.color}30` : 'rgba(255,255,255,0.05)',
                            border: `1px solid ${isComplete || isActive ? stage.color : 'rgba(255,255,255,0.1)'}`,
                            boxShadow: isActive ? `0 0 10px ${stage.color}60` : 'none',
                          }}
                        >
                          {isComplete ? <CheckCircle2 className="w-3 h-3" style={{ color: stage.color }} /> :
                           isActive ? <CircleDot className="w-3 h-3 animate-pulse" style={{ color: stage.color }} /> :
                           <span className="text-[8px] text-white/20">{i + 1}</span>}
                        </div>
                        <div className="flex-1 pb-3">
                          <div className="flex items-center gap-2">
                            <span className={`text-[11px] font-bold ${isComplete || isActive ? 'text-white/80' : 'text-white/30'}`}>{stage.name}</span>
                            {isActive && <span className="text-[8px] text-white/30 animate-pulse">ACTIVE</span>}
                          </div>
                          <p className={`text-[10px] ${isComplete || isActive ? 'text-white/40' : 'text-white/20'}`}>{stage.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 42-Scanner Verification Grid */}
            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
              <h3 className="text-[10px] font-black uppercase tracking-wider text-white/40 mb-3 flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-lime" /> 42-Scanner Verification Matrix
              </h3>
              <div className="grid grid-cols-7 sm:grid-cols-14 gap-1">
                {ALL_SCANNERS.map((s, idx) => (
                  <div
                    key={idx}
                    onMouseEnter={() => setHoveredScanner(`${s.category}: ${s.name}`)}
                    onMouseLeave={() => setHoveredScanner(null)}
                    className="w-full aspect-square rounded-sm cursor-pointer transition-all hover:scale-125 relative"
                    style={{
                      backgroundColor: s.status === 'pass' ? `${s.color}30` : s.status === 'fail' ? 'rgba(244,63,94,0.4)' : `${s.color}50`,
                      boxShadow: s.status === 'eval' ? `0 0 4px ${s.color}60` : 'none',
                      animation: s.status === 'eval' ? 'pulse 2s infinite' : 'none',
                    }}
                  >
                    {s.status === 'fail' && <X className="w-2 h-2 text-rose absolute inset-0 m-auto" />}
                    {s.status === 'pass' && <CheckCircle2 className="w-2 h-2 absolute inset-0 m-auto" style={{ color: s.color }} />}
                  </div>
                ))}
              </div>
              {hoveredScanner && (
                <p className="text-[10px] text-white/50 mt-2 bg-white/5 px-2 py-1 rounded">{hoveredScanner}</p>
              )}
              <div className="flex items-center gap-4 mt-3 text-[9px] text-white/30">
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-lime/30" /> Pass</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-rose/40" /> Fail</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-cyan/50 animate-pulse" /> Eval</span>
              </div>
            </div>

            {/* CodeGraph Interactive Canvas */}
            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
              <h3 className="text-[10px] font-black uppercase tracking-wider text-white/40 mb-3 flex items-center gap-2">
                <Fingerprint className="w-3.5 h-3.5 text-cyan" /> CodeGraph Vulnerability Path
              </h3>
              <div className="relative h-48 bg-black/30 rounded-lg overflow-hidden border border-white/5">
                {/* SVG Network Graph */}
                <svg className="w-full h-full" viewBox="0 0 600 200">
                  {/* Entry point */}
                  <circle cx="50" cy="100" r="20" fill="#22d3ee" fillOpacity="0.2" stroke="#22d3ee" strokeWidth="1" />
                  <text x="50" y="104" textAnchor="middle" fill="#22d3ee" fontSize="8">Entry</text>
                  {/* Vuln nodes */}
                  <circle cx="180" cy="60" r="15" fill="#f43f5e" fillOpacity="0.3" stroke="#f43f5e" strokeWidth="1.5" />
                  <text x="180" y="63" textAnchor="middle" fill="#f43f5e" fontSize="7">SSL Expiry</text>
                  <circle cx="320" cy="100" r="15" fill="#f43f5e" fillOpacity="0.3" stroke="#f43f5e" strokeWidth="1.5" />
                  <text x="320" y="103" textAnchor="middle" fill="#f43f5e" fontSize="7">Chain Break</text>
                  <circle cx="460" cy="80" r="15" fill="#f43f5e" fillOpacity="0.2" stroke="#f43f5e" strokeWidth="1" strokeDasharray="3,2" />
                  <text x="460" y="83" textAnchor="middle" fill="#a3e635" fontSize="7">Fixed</text>
                  {/* Remedied nodes */}
                  <circle cx="460" cy="140" r="15" fill="#a3e635" fillOpacity="0.2" stroke="#a3e635" strokeWidth="1" />
                  <text x="460" y="143" textAnchor="middle" fill="#a3e635" fontSize="7">Renewed</text>
                  {/* Edges */}
                  <line x1="70" y1="90" x2="165" y2="65" stroke="#f43f5e" strokeWidth="1" strokeOpacity="0.5" />
                  <line x1="195" y1="65" x2="305" y2="95" stroke="#f43f5e" strokeWidth="1.5" strokeOpacity="0.6" />
                  <line x1="335" y1="95" x2="445" y2="85" stroke="#fbbf24" strokeWidth="1" strokeOpacity="0.4" strokeDasharray="4,2" />
                  <line x1="335" y1="105" x2="445" y2="135" stroke="#a3e635" strokeWidth="1.5" strokeOpacity="0.5" />
                  {/* AST call graph decorations */}
                  <text x="300" y="185" textAnchor="middle" fill="rgba(255,255,255,0.15)" fontSize="8" fontFamily="monospace">AST Call Graph • 14 nodes • 8 edges</text>
                </svg>
              </div>
            </div>

            {/* Customer Final Evaluation */}
            {selected.status === 'deployed' && (
              <div className="bg-white/[0.02] border border-lime/20 rounded-xl p-4">
                <h3 className="text-sm font-black text-lime mb-2 flex items-center gap-2">
                  <CheckSquare className="w-4 h-4" /> Final Evaluation Required
                </h3>
                <p className="text-xs text-white/40 mb-4">The fix has been deployed. Please review and approve or reject the resolution.</p>
                {!showRejectForm ? (
                  <div className="flex gap-3">
                    <button onClick={handleApprove} className="flex-1 flex items-center justify-center gap-2 py-3 bg-lime text-black rounded-lg text-sm font-black hover:bg-lime/90 transition-all">
                      <ThumbsUp className="w-4 h-4" /> Approve & Close
                    </button>
                    <button onClick={() => setShowRejectForm(true)} className="flex-1 flex items-center justify-center gap-2 py-3 bg-rose/10 text-rose border border-rose/20 rounded-lg text-sm font-black hover:bg-rose/20 transition-all">
                      <ThumbsDown className="w-4 h-4" /> Reject & Request Re-Repair
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <textarea
                      value={rejectNote}
                      onChange={e => setRejectNote(e.target.value)}
                      placeholder="Describe why the fix is insufficient..."
                      className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/20 focus:border-rose/30 outline-none resize-none h-20"
                    />
                    <div className="flex gap-2">
                      <button onClick={handleReject} className="flex-1 py-2 bg-rose text-white rounded-lg text-xs font-black hover:bg-rose/90 transition-all">
                        Submit Rejection
                      </button>
                      <button onClick={() => setShowRejectForm(false)} className="px-4 py-2 bg-white/5 text-white/40 rounded-lg text-xs font-bold hover:bg-white/10 transition-all">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Chat Panel */}
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 flex flex-col h-[calc(100vh-200px)]">
            <h3 className="text-[10px] font-black uppercase tracking-wider text-white/40 mb-3 flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5 text-cyan" /> HQ Coordinator
            </h3>
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 mb-3">
              {chatMessages.map(msg => (
                <div key={msg.id} className={`${msg.sender === 'customer' ? 'ml-4' : msg.sender === 'coordinator' ? 'mr-4' : ''}`}>
                  <div className={`p-2.5 rounded-lg text-[11px] leading-relaxed ${
                    msg.sender === 'customer' ? 'bg-lime/10 text-white/70 ml-auto' :
                    msg.sender === 'coordinator' ? 'bg-cyan/10 text-white/70' :
                    'bg-white/5 text-white/40 italic'
                  }`}>
                    {msg.text}
                  </div>
                  <span className="text-[8px] text-white/20 mt-0.5 block">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                placeholder="Message HQ Coordinator..."
                className="flex-1 bg-black/30 border-white/10 text-white text-xs placeholder:text-white/20"
              />
              <button onClick={handleSendChat} className="p-2 bg-cyan/10 text-cyan rounded-lg hover:bg-cyan/20 transition-all">
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[8px] text-white/15 mt-2 text-center">Direct engineer communication is not permitted per protocol.</p>
          </div>
        </div>
      </div>
    );
  }

  // Kanban View
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-rose" /> Incident Management
        </h1>
        <span className="text-[10px] text-white/30">{incidents.length} total incidents</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {STATUS_COLUMNS.map(col => {
          const colIncidents = incidents.filter(i => i.status === col.key || (col.key === 'repaired' && ['isolated', 'repaired', 'validated'].includes(i.status)));
          return (
            <div key={col.key} className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-white/40">{col.label}</span>
                <span className="text-[10px] font-mono text-white/30">{colIncidents.length}</span>
              </div>
              <div className="space-y-2">
                {colIncidents.map(inc => (
                  <div
                    key={inc.id}
                    onClick={() => setSelectedId(inc.id)}
                    className="bg-white/[0.03] border border-white/5 rounded-lg p-3 cursor-pointer hover:bg-white/[0.06] hover:border-white/10 transition-all group"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: sevCfg(inc.severity).color, boxShadow: `0 0 4px ${sevCfg(inc.severity).color}` }} />
                      <span className="text-[9px] font-mono text-white/30">{inc.id}</span>
                    </div>
                    <p className="text-[11px] font-bold text-white/70 mb-2 line-clamp-2">{inc.title}</p>
                    <div className="flex items-center justify-between">
                      <span className={`text-[8px] font-black uppercase px-1 py-0.5 rounded ${sevCfg(inc.severity).bg}`} style={{ color: sevCfg(inc.severity).color }}>
                        {inc.severity}
                      </span>
                      <ChevronRight className="w-3 h-3 text-white/15 group-hover:text-white/40 transition-all" />
                    </div>
                  </div>
                ))}
                {colIncidents.length === 0 && <p className="text-[10px] text-white/15 text-center py-4">No incidents</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
