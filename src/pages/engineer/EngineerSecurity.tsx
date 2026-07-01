// ═══════════════════════════════════════════════════════════════════════════════
// ENGINEER SECURITY v2.5 — Security Workspace
// CodeGraph visualizer, scanner override panel, repair diff viewer,
// custom guidelines, manual scan trigger
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  FileCode2, ScanLine, Settings, GitCompare, Play,
  Shield, AlertTriangle, CheckCircle2,
  Clock, Zap, Eye, Radio
} from 'lucide-react';
import { Input } from '@/components/ui/input';

// Mock scanner data for 42-scanner grid
const SCANNER_CATEGORIES = [
  { name: 'Infrastructure', color: '#a3e635', scanners: ['VM Health', 'Load Balancer', 'CDN Edge', 'Storage Bucket', 'Backup Integrity', 'Uptime'] },
  { name: 'SSL/TLS', color: '#22d3ee', scanners: ['Cert Expiry', 'Cipher Suite', 'TLS Version', 'OCSP', 'Chain Valid', 'HSTS'] },
  { name: 'DNS', color: '#e879f9', scanners: ['DNSSEC', 'Propagation', 'MX Record', 'TXT/SPF', 'NS Sync', 'CNAME'] },
  { name: 'Auth', color: '#f43f5e', scanners: ['MFA Policy', 'Session', 'JWT', 'OAuth', 'Password', 'Brute Force'] },
  { name: 'Database', color: '#fbbf24', scanners: ['Query Perf', 'Conn Pool', 'Replica Lag', 'Index', 'Deadlock', 'Backup'] },
  { name: 'Edge', color: '#a78bfa', scanners: ['Cold Start', 'Memory', 'Timeout', 'Deps', 'Error Rate', 'Invoke'] },
  { name: 'Network', color: '#34d399', scanners: ['Latency', 'Packet Loss', 'Firewall', 'Port Scan', 'DDoS', 'Bandwidth'] },
];

// Mock CodeGraph data
const MOCK_CODEGRAPH = {
  nodes: [
    { id: 'entry', label: 'app.ts', type: 'entry', x: 100, y: 200 },
    { id: 'auth', label: 'auth/login.ts', type: 'function', x: 250, y: 150 },
    { id: 'db', label: 'db/pool.ts', type: 'db_query', x: 400, y: 100 },
    { id: 'vuln1', label: 'config.dev.ts', type: 'vulnerability', x: 300, y: 300 },
    { id: 'api', label: 'api/routes.ts', type: 'function', x: 450, y: 250 },
    { id: 'ssl', label: 'ssl/cert.ts', type: 'function', x: 200, y: 350 },
    { id: 'cache', label: 'cache/redis.ts', type: 'function', x: 500, y: 180 },
    { id: 'util', label: 'utils/crypto.ts', type: 'auth_flow', x: 350, y: 400 },
  ],
  edges: [
    { source: 'entry', target: 'auth' },
    { source: 'auth', target: 'db' },
    { source: 'auth', target: 'vuln1' },
    { source: 'entry', target: 'api' },
    { source: 'api', target: 'ssl' },
    { source: 'api', target: 'cache' },
    { source: 'ssl', target: 'util' },
    { source: 'db', target: 'cache' },
  ],
};

// Mock diff data
const ORIGINAL_CODE = `import { config } from './config';

// WARNING: Hardcoded secret - DO NOT USE IN PRODUCTION
const API_KEY = 'sk_live_51234567890abcdef';

export async function authenticate(req) {
  const token = req.headers.authorization;
  if (!token) return { error: 'No token' };
  
  // No rate limiting - vulnerable to brute force
  const result = await db.query('SELECT * FROM users WHERE token = $1', [token]);
  
  return result.rows[0];
}`;

const PATCHED_CODE = `import { config } from './config';

// FIXED: Use environment variable for secret
const API_KEY = process.env.STRIPE_SECRET_KEY;

export async function authenticate(req) {
  const token = req.headers.authorization;
  if (!token) return { error: 'No token' };
  
  // FIXED: Added rate limiting (5 attempts per minute)
  await rateLimiter.check(req.ip, 5, '1m');
  
  // FIXED: Use parameterized query with validation
  const result = await db.query(
    'SELECT id, email, role FROM users WHERE token = $1 AND expires_at > NOW()',
    [token]
  );
  
  return result.rows[0] || null;
}`;

const NODE_COLORS: Record<string, string> = {
  entry: '#a3e635', function: '#22d3ee', class: '#3b82f6',
  vulnerability: '#f43f5e', db_query: '#fbbf24', auth_flow: '#10b981',
};

const TABS = [
  { id: 'codegraph', label: 'CodeGraph', icon: FileCode2 },
  { id: 'scanners', label: '42 Scanners', icon: ScanLine },
  { id: 'guidelines', label: 'Guidelines', icon: Settings },
  { id: 'diff', label: 'Repair Diff', icon: GitCompare },
] as const;

export function EngineerSecurity() {
  const [activeTab, setActiveTab] = useState<string>('codegraph');
  const [incidentId, setIncidentId] = useState('');
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [, setRunningScanner] = useState<string | null>(null);
  const [scanResults, setScanResults] = useState<Record<string, 'pass' | 'fail' | 'running'>>({});

  // Initialize scan results
  useEffect(() => {
    const init: Record<string, 'pass' | 'fail' | 'running'> = {};
    SCANNER_CATEGORIES.forEach(cat => {
      cat.scanners.forEach(s => {
        const rand = Math.random();
        init[s] = rand > 0.9 ? 'fail' : rand > 0.8 ? 'running' : 'pass';
      });
    });
    setScanResults(init);
  }, []);

  const handleRunScanner = (name: string) => {
    setRunningScanner(name);
    setScanResults(p => ({ ...p, [name]: 'running' }));
    setTimeout(() => {
      setScanResults(p => ({ ...p, [name]: Math.random() > 0.1 ? 'pass' : 'fail' }));
      setRunningScanner(null);
    }, 2000);
  };

  const handleRunAll = () => {
    toast.info('Running full scanner suite...');
    SCANNER_CATEGORIES.forEach(cat => {
      cat.scanners.forEach(s => setScanResults(p => ({ ...p, [s]: 'running' })));
    });
    setTimeout(() => {
      const final: Record<string, 'pass' | 'fail'> = {};
      SCANNER_CATEGORIES.forEach(cat => {
        cat.scanners.forEach(s => { final[s] = Math.random() > 0.05 ? 'pass' : 'fail'; });
      });
      setScanResults(final);
      toast.success('42/42 scanners completed');
    }, 3000);
  };

  const selectedNodeData = selectedNode ? MOCK_CODEGRAPH.nodes.find(n => n.id === selectedNode) : null;
  const connectedEdges = selectedNode ? MOCK_CODEGRAPH.edges.filter(e => e.source === selectedNode || e.target === selectedNode) : [];

  return (
    <div className="space-y-4 h-[calc(100vh-120px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
          <Shield className="w-5 h-5 text-cyan" /> Security Workspace
        </h1>
        <div className="flex items-center gap-2">
          <Input value={incidentId} onChange={e => setIncidentId(e.target.value)} placeholder="Incident ID..." className="w-40 bg-black/30 border-white/10 text-white text-xs h-8" />
          <button onClick={() => toast.info(`Loading CodeGraph for ${incidentId || 'demo'}...`)} className="px-3 py-1.5 bg-cyan/10 text-cyan rounded-lg text-xs font-bold hover:bg-cyan/20 transition-all">
            Load
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/[0.02] rounded-lg p-1 shrink-0">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-2 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all ${activeTab === tab.id ? 'bg-cyan/10 text-cyan border border-cyan/20' : 'text-white/30 hover:text-white/50'}`}>
              <Icon className="w-3.5 h-3.5" /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0 overflow-auto">

        {/* ── CodeGraph Tab ── */}
        {activeTab === 'codegraph' && (
          <div className="flex gap-4 h-full">
            {/* Graph Canvas */}
            <div className="flex-1 bg-elevated/60 border border-white/5 rounded-xl overflow-hidden relative">
              <div className="absolute top-3 left-3 z-10 flex gap-1">
                <button onClick={() => setZoom(z => Math.min(z + 0.2, 3))} className="p-1.5 bg-black/50 text-white/50 rounded hover:text-white transition-all"><Zap className="w-3 h-3" /></button>
                <button onClick={() => setZoom(z => Math.max(z - 0.2, 0.3))} className="p-1.5 bg-black/50 text-white/50 rounded hover:text-white transition-all"><Eye className="w-3 h-3" /></button>
                <button onClick={() => { setZoom(1); setSelectedNode(null); }} className="p-1.5 bg-black/50 text-white/50 rounded hover:text-white transition-all"><Radio className="w-3 h-3" /></button>
              </div>
              <svg viewBox="0 0 600 450" className="w-full h-full" style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}>
                {/* Edges */}
                {MOCK_CODEGRAPH.edges.map((e, i) => {
                  const src = MOCK_CODEGRAPH.nodes.find(n => n.id === e.source);
                  const tgt = MOCK_CODEGRAPH.nodes.find(n => n.id === e.target);
                  if (!src || !tgt) return null;
                  const isVuln = src.type === 'vulnerability' || tgt.type === 'vulnerability';
                  return (
                    <line key={i} x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y}
                      stroke={isVuln ? '#f43f5e' : 'rgba(255,255,255,0.1)'} strokeWidth={isVuln ? 2 : 1}
                      strokeDasharray={isVuln ? 'none' : '4,4'} opacity={isVuln ? 0.8 : 0.3} />
                  );
                })}
                {/* Nodes */}
                {MOCK_CODEGRAPH.nodes.map(n => {
                  const color = NODE_COLORS[n.type] || '#94a3b8';
                  const isSelected = selectedNode === n.id;
                  const isVuln = n.type === 'vulnerability';
                  return (
                    <g key={n.id} onClick={() => setSelectedNode(isSelected ? null : n.id)} className="cursor-pointer">
                      <circle cx={n.x} cy={n.y} r={isSelected ? 28 : 22}
                        fill={`${color}15`} stroke={color} strokeWidth={isSelected ? 2.5 : 1.5}
                        style={{ filter: isVuln ? 'drop-shadow(0 0 8px #f43f5e60)' : isSelected ? `drop-shadow(0 0 6px ${color}60)` : 'none' }} />
                      <text x={n.x} y={n.y + 4} textAnchor="middle" fill={color} fontSize="8" fontWeight="bold" fontFamily="monospace">{n.label.length > 10 ? n.label.slice(0, 8) + '..' : n.label}</text>
                      {isVuln && <circle cx={n.x + 16} cy={n.y - 16} r="6" fill="#f43f5e" opacity="0.8"><animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite" /></circle>}
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Node Detail Sidebar */}
            <div className="w-64 shrink-0 bg-elevated/60 border border-white/5 rounded-xl p-4 space-y-3">
              {selectedNodeData ? (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: NODE_COLORS[selectedNodeData.type] }} />
                    <h3 className="text-sm font-bold text-white/80">{selectedNodeData.label}</h3>
                  </div>
                  <p className="text-[10px] text-white/30 uppercase">{selectedNodeData.type}</p>
                  <div className="space-y-1 pt-2 border-t border-white/5">
                    <p className="text-[10px] text-white/40 font-bold">Connections:</p>
                    {connectedEdges.map((e, i) => {
                      const other = e.source === selectedNode ? e.target : e.source;
                      const otherNode = MOCK_CODEGRAPH.nodes.find(n => n.id === other);
                      return <p key={i} className="text-[10px] text-white/30">→ {otherNode?.label || other}</p>;
                    })}
                  </div>
                  {selectedNodeData.type === 'vulnerability' && (
                    <div className="p-2 bg-magenta/5 border border-magenta/20 rounded mt-2">
                      <p className="text-[10px] text-magenta font-bold flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Vulnerable Path</p>
                      <p className="text-[9px] text-white/30 mt-1">Entry → {selectedNodeData.label} → DB Query</p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-xs text-white/30 text-center py-8">Click a node to inspect</p>
              )}
            </div>
          </div>
        )}

        {/* ── 42 Scanners Tab ── */}
        {activeTab === 'scanners' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-[10px] text-lime"><CheckCircle2 className="w-3 h-3" /> {Object.values(scanResults).filter(r => r === 'pass').length} passed</span>
                <span className="flex items-center gap-1 text-[10px] text-magenta"><AlertTriangle className="w-3 h-3" /> {Object.values(scanResults).filter(r => r === 'fail').length} failed</span>
                <span className="flex items-center gap-1 text-[10px] text-amber"><Clock className="w-3 h-3" /> {Object.values(scanResults).filter(r => r === 'running').length} running</span>
              </div>
              <button onClick={handleRunAll} className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan/10 text-cyan rounded-lg text-xs font-bold hover:bg-cyan/20 transition-all">
                <Play className="w-3 h-3" /> Run All
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {SCANNER_CATEGORIES.flatMap(cat => cat.scanners.map(s => ({ name: s, cat: cat.name, color: cat.color }))).map(s => {
                const status = scanResults[s.name] || 'pass';
                const isRunning = status === 'running';
                return (
                  <button key={s.name} onClick={() => handleRunScanner(s.name)} disabled={isRunning}
                    className={`p-2.5 rounded-lg border text-left transition-all hover:scale-105 disabled:opacity-50 ${status === 'fail' ? 'border-magenta/30 bg-magenta/5' : status === 'running' ? 'border-amber/30 bg-amber/5' : 'border-white/5 bg-white/[0.02]'}`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-1.5 h-1.5 rounded-full" style={{
                        backgroundColor: status === 'pass' ? '#a3e635' : status === 'fail' ? '#f43f5e' : '#fbbf24',
                        boxShadow: `0 0 4px ${status === 'pass' ? '#a3e635' : status === 'fail' ? '#f43f5e' : '#fbbf24'}`,
                      }} />
                      <span className="text-[8px] font-bold" style={{ color: s.color }}>{s.cat.slice(0, 3)}</span>
                    </div>
                    <p className="text-[9px] text-white/60 font-medium">{s.name}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Guidelines Tab ── */}
        {activeTab === 'guidelines' && (
          <div className="space-y-3">
            {[
              { id: 'G-001', name: 'No Hardcoded Secrets', lang: 'All', pattern: '/(password|secret|key)\s*=\s*[\'"][^\'"]+/', severity: 'blocker', autoFix: false, compliance: ['SOC2', 'ISO27001', 'PCI'] },
              { id: 'G-002', name: 'SQL Parameterized Queries', lang: 'SQL/TS', pattern: '/query\([^,]+,\s*\$/', severity: 'critical', autoFix: true, compliance: ['SOC2', 'HIPAA'] },
              { id: 'G-003', name: 'Rate Limiting on Auth', lang: 'TS/JS', pattern: '/rateLimiter\.(check|limit)/', severity: 'critical', autoFix: false, compliance: ['PCI', 'SOC2'] },
              { id: 'G-004', name: 'CSP Headers Required', lang: 'All', pattern: '/Content-Security-Policy/', severity: 'warning', autoFix: false, compliance: ['ISO27001'] },
              { id: 'G-005', name: 'No console.log in Prod', lang: 'JS/TS', pattern: '/console\.(log|warn|error)/', severity: 'info', autoFix: true, compliance: [] },
            ].map(rule => (
              <div key={rule.id} className="bg-elevated/60 border border-white/5 rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[9px] font-mono text-white/25">{rule.id}</span>
                      <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${rule.severity === 'blocker' ? 'bg-magenta/10 text-magenta' : rule.severity === 'critical' ? 'bg-rose/10 text-rose' : rule.severity === 'warning' ? 'bg-amber/10 text-amber' : 'bg-white/5 text-white/30'}`}>{rule.severity}</span>
                      {rule.autoFix && <span className="text-[8px] font-bold text-lime bg-lime/10 px-1.5 py-0.5 rounded">Auto-fix</span>}
                    </div>
                    <p className="text-sm font-bold text-white/70">{rule.name}</p>
                    <p className="text-[10px] text-white/30 font-mono mt-0.5">{rule.pattern}</p>
                  </div>
                  <div className="flex gap-1">
                    {rule.compliance.map(c => <span key={c} className="text-[7px] font-bold text-cyan bg-cyan/10 px-1 py-0.5 rounded">{c}</span>)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Repair Diff Tab ── */}
        {activeTab === 'diff' && (
          <div className="flex gap-4 h-full">
            {/* Original */}
            <div className="flex-1 bg-elevated/60 border border-rose/20 rounded-xl overflow-hidden flex flex-col">
              <div className="px-4 py-2 bg-rose/5 border-b border-rose/20 flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-rose" />
                <span className="text-[10px] font-bold text-rose uppercase">Original (Vulnerable)</span>
              </div>
              <pre className="flex-1 p-4 overflow-auto text-[11px] font-mono leading-relaxed">
                {ORIGINAL_CODE.split('\n').map((line, i) => (
                  <div key={i} className="flex">
                    <span className="w-6 text-right text-white/15 select-none mr-3 shrink-0">{i + 1}</span>
                    <span className={`${line.includes('WARNING') || line.includes('sk_live') || line.includes('No rate') ? 'text-rose bg-rose/5' : line.includes('//') ? 'text-white/20' : 'text-white/50'}`}>{line}</span>
                  </div>
                ))}
              </pre>
            </div>
            {/* Patched */}
            <div className="flex-1 bg-elevated/60 border border-lime/20 rounded-xl overflow-hidden flex flex-col">
              <div className="px-4 py-2 bg-lime/5 border-b border-lime/20 flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-lime" />
                <span className="text-[10px] font-bold text-lime uppercase">Patched (Remediated)</span>
              </div>
              <pre className="flex-1 p-4 overflow-auto text-[11px] font-mono leading-relaxed">
                {PATCHED_CODE.split('\n').map((line, i) => (
                  <div key={i} className="flex">
                    <span className="w-6 text-right text-white/15 select-none mr-3 shrink-0">{i + 1}</span>
                    <span className={`${line.includes('FIXED') ? 'text-lime bg-lime/5' : line.includes('//') ? 'text-white/20' : 'text-white/50'}`}>{line}</span>
                  </div>
                ))}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
