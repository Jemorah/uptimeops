// ═══════════════════════════════════════════════════════════════
// SECTION 3: 42-SCANNER ZERO-TRUST & CODEGRAPH
// Split layout: animated network graph + 42-scanner security grid
// ═══════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react';
import { Shield, CheckCircle2, Lock, Eye, FileCode2 } from 'lucide-react';

const SCANNER_CATEGORIES = [
  { name: 'SAST', count: 6, scanners: ['Semgrep', 'SonarQube', 'CodeQL', 'Checkmarx', 'Bandit', 'ESLint'] },
  { name: 'DAST', count: 6, scanners: ['OWASP ZAP', 'Burp Suite', 'Nikto', 'Acunetix', 'Netsparker', 'Arachni'] },
  { name: 'SCA', count: 5, scanners: ['Snyk', 'Trivy', 'Grype', 'Clair', 'Anchore'] },
  { name: 'Secret Detection', count: 5, scanners: ['GitLeaks', 'TruffleHog', 'GitGuardian', 'Whispers', 'Repo-supervisor'] },
  { name: 'Container', count: 5, scanners: ['Sysdig', 'Falco', 'Aqua', 'Twistlock', 'Prisma'] },
  { name: 'Infrastructure', count: 5, scanners: ['Detectify', 'Intruder', 'Nmap', 'Masscan', 'Rapid7'] },
  { name: 'Compliance', count: 5, scanners: ['Qualys', 'Nessus', 'OpenVAS', 'SSLyze', 'TestSSL'] },
  { name: 'Network', count: 5, scanners: ['SQLMap', 'ZGrab', 'ZAP API', 'Arachni Net', 'Burp Pro'] },
];

// ── Animated CodeGraph (SVG) ──
function CodeGraphViz() {
  const [t, setT] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    let start: number | null = null;
    const animate = (ts: number) => {
      if (start === null) start = ts;
      setT((ts - start) / 4000); // 4-second cycle
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // Nodes positioned in a web-like pattern
  const nodes = [
    { id: 'app', label: 'App', x: 160, y: 30, r: 18 },
    { id: 'api', label: 'API', x: 80, y: 80, r: 14 },
    { id: 'auth', label: 'Auth', x: 240, y: 80, r: 14 },
    { id: 'db', label: 'DB', x: 50, y: 150, r: 16 },
    { id: 'cache', label: 'Cache', x: 160, y: 120, r: 12 },
    { id: 'queue', label: 'Queue', x: 270, y: 150, r: 12 },
    { id: 'worker', label: 'Worker', x: 160, y: 190, r: 14 },
    { id: 'external', label: '3rd Party', x: 300, y: 200, r: 11 },
  ];

  const edges = [
    { from: 'app', to: 'api' },
    { from: 'app', to: 'auth' },
    { from: 'api', to: 'db' },
    { from: 'api', to: 'cache' },
    { from: 'auth', to: 'db' },
    { from: 'auth', to: 'queue' },
    { from: 'queue', to: 'worker' },
    { from: 'worker', to: 'external' },
    { from: 'app', to: 'cache' },
    { from: 'db', to: 'worker' },
  ];

  // Cycle through showing a vulnerable path being fixed
  const cycle = t % 1;
  const vulnerableNode = Math.floor(cycle * nodes.length);
  const fixProgress = (cycle * nodes.length) % 1;

  return (
    <svg viewBox="0 0 340 230" className="w-full h-full max-h-[280px]">
      <defs>
        <filter id="glow-lime">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="glow-rose">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Edges */}
      {edges.map((e, i) => {
        const from = nodes.find(n => n.id === e.from)!;
        const to = nodes.find(n => n.id === e.to)!;
        const isVulnerable = (e.from === nodes[vulnerableNode]?.id || e.to === nodes[vulnerableNode]?.id) && fixProgress < 0.5;
        const isFixed = (e.from === nodes[vulnerableNode]?.id || e.to === nodes[vulnerableNode]?.id) && fixProgress >= 0.5;
        return (
          <line
            key={i}
            x1={from.x} y1={from.y + from.r * 0.5}
            x2={to.x} y2={to.y - to.r * 0.5}
            stroke={isVulnerable ? '#f43f5e' : isFixed ? '#a3e635' : '#1e293b'}
            strokeWidth={isVulnerable || isFixed ? 2 : 1}
            opacity={isVulnerable ? 0.8 : isFixed ? 0.9 : 0.4}
            strokeDasharray={isVulnerable ? '4,2' : undefined}
          >
            {isVulnerable && (
              <animate attributeName="stroke-dashoffset" from="0" to="-12" dur="0.5s" repeatCount="indefinite" />
            )}
          </line>
        );
      })}

      {/* Nodes */}
      {nodes.map((n, i) => {
        const isVulnerable = i === vulnerableNode && fixProgress < 0.5;
        const isFixed = i === vulnerableNode && fixProgress >= 0.5;
        const color = isVulnerable ? '#f43f5e' : isFixed ? '#a3e635' : '#22d3ee';
        const bgColor = isVulnerable ? 'rgba(244,63,94,0.2)' : isFixed ? 'rgba(163,230,53,0.2)' : 'rgba(34,211,238,0.1)';
        const glow = isVulnerable ? 'url(#glow-rose)' : isFixed ? 'url(#glow-lime)' : undefined;

        return (
          <g key={n.id} filter={glow}>
            <circle
              cx={n.x} cy={n.y} r={n.r}
              fill={bgColor}
              stroke={color}
              strokeWidth={isVulnerable ? 2.5 : isFixed ? 2.5 : 1.5}
              opacity={isVulnerable ? 1 : 0.85}
            />
            <text
              x={n.x} y={n.y + 1}
              textAnchor="middle"
              fill={color}
              fontSize="8"
              fontWeight="700"
              fontFamily="JetBrains Mono, monospace"
            >
              {n.label}
            </text>
            {/* Pulse ring for vulnerable/fixed node */}
            {(isVulnerable || isFixed) && (
              <circle
                cx={n.x} cy={n.y}
                r={n.r + 4 + Math.sin(t * 10) * 2}
                fill="none"
                stroke={color}
                strokeWidth="1"
                opacity={0.3 + Math.sin(t * 10) * 0.2}
              />
            )}
          </g>
        );
      })}

      {/* Legend */}
      <g transform="translate(10, 210)">
        <circle cx="6" cy="0" r="5" fill="rgba(244,63,94,0.2)" stroke="#f43f5e" strokeWidth="1" />
        <text x="16" y="3" fill="#f43f5e" fontSize="7" fontWeight="600" fontFamily="JetBrains Mono">Vulnerable</text>
        <circle cx="80" cy="0" r="5" fill="rgba(163,230,53,0.2)" stroke="#a3e635" strokeWidth="1" />
        <text x="90" y="3" fill="#a3e635" fontSize="7" fontWeight="600" fontFamily="JetBrains Mono">Fixed</text>
        <circle cx="140" cy="0" r="5" fill="rgba(34,211,238,0.1)" stroke="#22d3ee" strokeWidth="1" />
        <text x="150" y="3" fill="#22d3ee" fontSize="7" fontWeight="600" fontFamily="JetBrains Mono">Healthy</text>
      </g>
    </svg>
  );
}

// ── 42-Scanner Grid ──
function ScannerGrid() {
  const [flashIdx, setFlashIdx] = useState<number | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setFlashIdx(Math.floor(Math.random() * 42));
      setTimeout(() => setFlashIdx(null), 400);
    }, 200);
    return () => clearInterval(interval);
  }, []);

  let globalIdx = 0;

  return (
    <div className="space-y-4">
      {SCANNER_CATEGORIES.map((cat) => (
        <div key={cat.name}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">{cat.name}</span>
            <span className="text-[10px] font-bold text-lime">{cat.count}/{cat.count}</span>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {cat.scanners.map((name) => {
              const idx = globalIdx++;
              const isFlashing = flashIdx === idx;
              return (
                <div
                  key={name}
                  title={name}
                  className="h-7 rounded flex items-center justify-center transition-all duration-150"
                  style={{
                    background: isFlashing
                      ? 'rgba(163,230,53,0.5)'
                      : 'rgba(163,230,53,0.15)',
                    border: `1px solid ${isFlashing ? 'rgba(163,230,53,0.6)' : 'rgba(163,230,53,0.2)'}`,
                    boxShadow: isFlashing ? '0 0 8px rgba(163,230,53,0.4)' : 'none',
                  }}
                >
                  <CheckCircle2
                    className="w-3.5 h-3.5 transition-all duration-150"
                    style={{ color: isFlashing ? '#a3e635' : 'rgba(163,230,53,0.5)' }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Overall status */}
      <div className="flex items-center gap-2 pt-3 border-t border-surface-border">
        <Shield className="w-4 h-4 text-lime" />
        <span className="text-xs font-bold text-lime">42/42 OPERATIONAL</span>
        <span className="text-[10px] text-text-muted ml-2">All security checkpoints passing</span>
      </div>
    </div>
  );
}

export default function ScannerCodeGraph() {
  return (
    <section className="relative py-24 sm:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 600px 500px at 30% 50%, rgba(232,121,249,0.05), transparent 70%)',
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-magenta-dim border border-magenta/20 mb-4">
            <Lock className="w-3 h-3 text-magenta" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-magenta">Zero-Trust Security</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-text-primary mb-4">
            <span className="text-magenta">42-SCANNER</span> MATRIX
            <br />
            <span className="text-lime">&amp; CODEGRAPH</span> ENGINE
          </h2>
          <p className="text-text-secondary max-w-xl mx-auto">
            Every repair is mapped, traced, and validated across your entire application topology.
            Our CodeGraph engine visualizes data-flow paths while 42 independent security scanners verify every change.
          </p>
        </div>

        {/* Split layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: CodeGraph */}
          <div className="glass-surface rounded-xl p-6 lg:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-cyan-dim border border-cyan/30 flex items-center justify-center">
                <FileCode2 className="w-5 h-5 text-cyan" />
              </div>
              <div>
                <h3 className="text-sm font-black text-text-primary uppercase tracking-wider">CodeGraph Visualization</h3>
                <p className="text-[10px] text-text-muted">Live AST &amp; data-flow mapping</p>
              </div>
            </div>
            <CodeGraphViz />
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="text-center p-2 bg-void-light/50 rounded border border-surface-border/50">
                <div className="text-lg font-black text-cyan">8</div>
                <div className="text-[9px] text-text-muted uppercase">Entry Points</div>
              </div>
              <div className="text-center p-2 bg-void-light/50 rounded border border-surface-border/50">
                <div className="text-lg font-black text-magenta">10</div>
                <div className="text-[9px] text-text-muted uppercase">Data Flows</div>
              </div>
              <div className="text-center p-2 bg-void-light/50 rounded border border-surface-border/50">
                <div className="text-lg font-black text-lime">0</div>
                <div className="text-[9px] text-text-muted uppercase">Open Vulns</div>
              </div>
            </div>
          </div>

          {/* Right: 42-Scanner Grid */}
          <div className="glass-surface rounded-xl p-6 lg:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-lime-dim border border-lime/30 flex items-center justify-center">
                <Eye className="w-5 h-5 text-lime" />
              </div>
              <div>
                <h3 className="text-sm font-black text-text-primary uppercase tracking-wider">Security Scanner Cluster</h3>
                <p className="text-[10px] text-text-muted">42 automated checkpoints — all passing</p>
              </div>
            </div>
            <ScannerGrid />
          </div>
        </div>
      </div>
    </section>
  );
}
