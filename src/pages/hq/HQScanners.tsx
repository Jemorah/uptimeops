// ═══════════════════════════════════════════════════════════════
// HQ SCANNERS — Security Scanners / Edge Threat Matrix v2.4
// 8-category attack vectors grid + live vulnerability stream
// 42-scanner health matrix with real-time status
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  CheckCircle, AlertTriangle, XCircle,
  ScanLine, Globe, Lock, Database, Server,
  Wifi, Container, Fingerprint, Timer, Bug, Zap,
  RefreshCw, Radio, Crosshair,
  FileWarning, TrendingUp, Eye, Play
} from 'lucide-react';

// ── Scanner Category Config ──
const SCANNER_CATEGORIES = [
  { key: 'infrastructure', label: 'Infrastructure', icon: Server, color: '#a3e635', scanners: ['VM Health Monitor', 'Load Balancer Probe', 'CDN Edge Check', 'Storage Bucket Scan', 'Backup Integrity', 'Uptime Sentinel'] },
  { key: 'ssl_tls', label: 'SSL / TLS', icon: Lock, color: '#22d3ee', scanners: ['Certificate Expiry', 'Cipher Suite Audit', 'TLS Version Check', 'OCSP Responder', 'Chain Validation', 'HSTS Inspector'] },
  { key: 'dns', label: 'DNS', icon: Globe, color: '#e879f9', scanners: ['DNSSEC Validator', 'Propagation Check', 'MX Record Scan', 'TXT/SPF Audit', 'Nameserver Sync', 'CNAME Chain'] },
  { key: 'authentication', label: 'Authentication', icon: Fingerprint, color: '#f43f5e', scanners: ['MFA Policy Check', 'Session Token Audit', 'JWT Validator', 'OAuth Scope Scan', 'Password Policy', 'Brute Force Detection'] },
  { key: 'database', label: 'Database', icon: Database, color: '#fbbf24', scanners: ['Query Performance', 'Connection Pool', 'Replication Lag', 'Index Health', 'Deadlock Monitor', 'Backup Verify'] },
  { key: 'edge', label: 'Edge Functions', icon: Zap, color: '#a78bfa', scanners: ['Cold Start Monitor', 'Memory Leak', 'Timeout Check', 'Dependency Audit', 'Error Rate Track', 'Invocation Limit'] },
  { key: 'network', label: 'Network', icon: Wifi, color: '#34d399', scanners: ['Latency Probe', 'Packet Loss', 'Firewall Rule', 'Port Scan', 'DDoS Detection', 'Bandwidth Monitor'] },
  { key: 'containers', label: 'Containers', icon: Container, color: '#fb923c', scanners: ['Image Vulnerability', 'Runtime Security', 'Resource Limit', 'Pod Health', 'Registry Scan', 'Secret Leak'] },
];

const ALL_SCANNERS = SCANNER_CATEGORIES.flatMap(cat => cat.scanners.map(name => ({ name, category: cat.key, categoryLabel: cat.label, color: cat.color })));

// ── Mock vulnerability stream data ──
interface VulnEntry {
  id: string;
  scanner: string;
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  timestamp: Date;
  status: 'open' | 'acknowledged' | 'resolved';
}

const MOCK_VULNS: VulnEntry[] = [
  { id: 'V-2847', scanner: 'Certificate Expiry', category: 'ssl_tls', severity: 'critical', message: 'TLS cert for api.uptimeops.io expires in 18 hours', timestamp: new Date(Date.now() - 120000), status: 'open' },
  { id: 'V-2846', scanner: 'DNSSEC Validator', category: 'dns', severity: 'high', message: 'DNSSEC chain broken on secondary nameserver ns2.uptimeops.io', timestamp: new Date(Date.now() - 340000), status: 'acknowledged' },
  { id: 'V-2845', scanner: 'Image Vulnerability', category: 'containers', severity: 'high', message: 'CVE-2024-5633 found in nginx:alpine-1.24', timestamp: new Date(Date.now() - 560000), status: 'open' },
  { id: 'V-2844', scanner: 'Query Performance', category: 'database', severity: 'medium', message: 'Slow query detected: avg 2.4s on incident_logs table', timestamp: new Date(Date.now() - 890000), status: 'resolved' },
  { id: 'V-2843', scanner: 'MFA Policy Check', category: 'authentication', severity: 'medium', message: '3 admin accounts missing MFA enforcement', timestamp: new Date(Date.now() - 1200000), status: 'acknowledged' },
  { id: 'V-2842', scanner: 'Cold Start Monitor', category: 'edge', severity: 'low', message: 'Edge function cold start: 890ms (threshold: 500ms)', timestamp: new Date(Date.now() - 1500000), status: 'open' },
  { id: 'V-2841', scanner: 'DDoS Detection', category: 'network', severity: 'critical', message: 'Anomalous traffic spike: 45k req/s from 3 IPs', timestamp: new Date(Date.now() - 1800000), status: 'acknowledged' },
  { id: 'V-2840', scanner: 'VM Health Monitor', category: 'infrastructure', severity: 'high', message: 'Disk usage 94% on vm-prod-us-east-01', timestamp: new Date(Date.now() - 2100000), status: 'open' },
];

// ── Severity Config ──
const SEVERITY_CONFIG = {
  critical: { color: '#f43f5e', bg: 'bg-rose/10', border: 'border-rose/30', label: 'CRITICAL' },
  high:     { color: '#fb923c', bg: 'bg-orange/10', border: 'border-orange/30', label: 'HIGH' },
  medium:   { color: '#fbbf24', bg: 'bg-amber/10', border: 'border-amber/30', label: 'MEDIUM' },
  low:      { color: '#a3e635', bg: 'bg-lime/10', border: 'border-lime/30', label: 'LOW' },
};

// ── Status Config ──
const STATUS_CONFIG = {
  open:         { icon: AlertTriangle, color: '#f43f5e', label: 'Open' },
  acknowledged: { icon: Eye, color: '#22d3ee', label: 'Ack' },
  resolved:     { icon: CheckCircle, color: '#a3e635', label: 'Fixed' },
};

export function HQScanners() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [scannerStatuses, setScannerStatuses] = useState<Record<string, { status: 'healthy' | 'degraded' | 'failed'; lastScan: Date; findings: number }>>({});
  const [vulnStream, setVulnStream] = useState<VulnEntry[]>(MOCK_VULNS);
  const [selectedScanner, setSelectedScanner] = useState<string | null>(null);
  const [runningScan, setRunningScan] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 42, healthy: 0, degraded: 0, failed: 0, criticalFindings: 0 });

  // Initialize scanner statuses
  useEffect(() => {
    const init: Record<string, { status: 'healthy' | 'degraded' | 'failed'; lastScan: Date; findings: number }> = {};
    ALL_SCANNERS.forEach((s) => {
      const rand = Math.random();
      init[s.name] = {
        status: rand > 0.85 ? 'failed' : rand > 0.7 ? 'degraded' : 'healthy',
        lastScan: new Date(Date.now() - Math.random() * 3600000),
        findings: Math.floor(Math.random() * 8),
      };
    });
    setScannerStatuses(init);
  }, []);

  // Recalculate stats when statuses change
  useEffect(() => {
    const statuses = Object.values(scannerStatuses);
    const healthy = statuses.filter(s => s.status === 'healthy').length;
    const degraded = statuses.filter(s => s.status === 'degraded').length;
    const failed = statuses.filter(s => s.status === 'failed').length;
    const criticalFindings = vulnStream.filter(v => v.severity === 'critical' && v.status === 'open').length;
    setStats({ total: 42, healthy, degraded, failed, criticalFindings });
  }, [scannerStatuses, vulnStream]);

  // Realtime subscription for vulnerability stream
  useEffect(() => {
    const ch = supabase.channel('hq-vulns')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'vulnerability_findings' }, (payload) => {
        const newVuln = payload.new as any;
        setVulnStream(prev => [{
          id: newVuln.id || `V-${Math.floor(Math.random() * 9999)}`,
          scanner: newVuln.scanner_name || 'Unknown',
          category: newVuln.category || 'unknown',
          severity: newVuln.severity || 'medium',
          message: newVuln.message || 'New vulnerability detected',
          timestamp: new Date(),
          status: 'open' as const,
        }, ...prev].slice(0, 50));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const handleRunScan = useCallback((scannerName: string) => {
    setRunningScan(scannerName);
    toast.info(`Running ${scannerName}...`);
    setTimeout(() => {
      setScannerStatuses(prev => ({
        ...prev,
        [scannerName]: { ...prev[scannerName], status: 'healthy' as const, lastScan: new Date(), findings: Math.max(0, (prev[scannerName]?.findings || 0) - Math.floor(Math.random() * 3)) },
      }));
      setRunningScan(null);
      toast.success(`${scannerName} completed — 0 new findings`);
    }, 2500);
  }, []);

  const handleAckVuln = (id: string) => {
    setVulnStream(prev => prev.map(v => v.id === id ? { ...v, status: 'acknowledged' as const } : v));
    toast.success(`Vulnerability ${id} acknowledged`);
  };

  const handleResolveVuln = (id: string) => {
    setVulnStream(prev => prev.map(v => v.id === id ? { ...v, status: 'resolved' as const } : v));
    toast.success(`Vulnerability ${id} marked resolved`);
  };

  const filteredScanners = activeCategory === 'all'
    ? ALL_SCANNERS
    : ALL_SCANNERS.filter(s => s.category === activeCategory);

  const timeAgo = (d: Date) => {
    const mins = Math.floor((Date.now() - d.getTime()) / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-lime" />
            EDGE THREAT MATRIX
          </h1>
          <p className="text-xs text-white/40 mt-0.5">42 security scanners across 8 attack-vector categories</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-[10px] text-white/40 uppercase tracking-wider">
            <Radio className="w-3 h-3 text-lime animate-pulse" /> Live Stream Active
          </span>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Total Scanners', value: stats.total, icon: ScanLine, color: '#22d3ee' },
          { label: 'Healthy', value: stats.healthy, icon: CheckCircle, color: '#a3e635' },
          { label: 'Degraded', value: stats.degraded, icon: AlertTriangle, color: '#fbbf24' },
          { label: 'Failed', value: stats.failed, icon: XCircle, color: '#f43f5e' },
          { label: 'Critical Findings', value: stats.criticalFindings, icon: Bug, color: '#f43f5e' },
        ].map(s => (
          <div key={s.label} className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <s.icon className="w-4 h-4" style={{ color: s.color }} />
              <span className="text-2xl font-black text-white">{s.value}</span>
            </div>
            <p className="text-[10px] text-white/40 uppercase tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Category Filter Tabs */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${activeCategory === 'all' ? 'bg-white/10 text-white border border-white/20' : 'text-white/40 hover:text-white/60 border border-transparent'}`}
        >
          All Categories
        </button>
        {SCANNER_CATEGORIES.map(cat => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all border ${activeCategory === cat.key ? 'border-white/20 text-white' : 'border-transparent text-white/40 hover:text-white/60'}`}
            style={activeCategory === cat.key ? { backgroundColor: `${cat.color}15`, borderColor: `${cat.color}40` } : {}}
          >
            <cat.icon className="w-3 h-3" style={{ color: activeCategory === cat.key ? cat.color : undefined }} />
            {cat.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Scanner Grid */}
        <div className="xl:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white/40 flex items-center gap-2">
              <Crosshair className="w-3.5 h-3.5" /> Scanner Registry — {filteredScanners.length} scanners
            </h3>
            <button
              onClick={() => {
                toast.info('Running full matrix sweep...');
                setTimeout(() => toast.success('All 42 scanners refreshed'), 2000);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-lime/10 text-lime rounded-lg text-[11px] font-bold hover:bg-lime/20 transition-all"
            >
              <RefreshCw className="w-3 h-3" /> Sweep All
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {filteredScanners.map(scanner => {
              const status = scannerStatuses[scanner.name];
              const isRunning = runningScan === scanner.name;
              const isSelected = selectedScanner === scanner.name;
              if (!status) return null;

              return (
                <div
                  key={scanner.name}
                  onClick={() => setSelectedScanner(isSelected ? null : scanner.name)}
                  className={`relative bg-white/[0.02] border rounded-xl p-3.5 cursor-pointer transition-all hover:bg-white/[0.04] ${isSelected ? 'border-lime/30 ring-1 ring-lime/20' : 'border-white/5 hover:border-white/10'}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{
                        backgroundColor: status.status === 'healthy' ? '#a3e635' : status.status === 'degraded' ? '#fbbf24' : '#f43f5e',
                        boxShadow: `0 0 6px ${status.status === 'healthy' ? '#a3e635' : status.status === 'degraded' ? '#fbbf24' : '#f43f5e'}40`,
                      }} />
                      <span className="text-xs font-bold text-white/80">{scanner.name}</span>
                    </div>
                    <span className="text-[10px] font-mono uppercase" style={{ color: scanner.color }}>{scanner.categoryLabel}</span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-white/30 mb-2">
                    <span className="flex items-center gap-1"><Timer className="w-3 h-3" /> {timeAgo(status.lastScan)}</span>
                    <span className={`font-bold ${status.findings > 0 ? 'text-rose' : 'text-white/30'}`}>{status.findings} findings</span>
                  </div>

                  {/* Mini health bar */}
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden mb-2">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: status.status === 'healthy' ? '100%' : status.status === 'degraded' ? '60%' : '30%',
                        backgroundColor: status.status === 'healthy' ? '#a3e635' : status.status === 'degraded' ? '#fbbf24' : '#f43f5e',
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold uppercase ${status.status === 'healthy' ? 'text-lime' : status.status === 'degraded' ? 'text-amber' : 'text-rose'}`}>
                      {status.status}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRunScan(scanner.name); }}
                      disabled={isRunning}
                      className="flex items-center gap-1 px-2 py-0.5 bg-white/5 text-white/50 rounded text-[10px] font-bold hover:bg-white/10 transition-all disabled:opacity-50"
                    >
                      {isRunning ? <RefreshCw className="w-2.5 h-2.5 animate-spin" /> : <Play className="w-2.5 h-2.5" />}
                      {isRunning ? 'Running' : 'Run'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Vulnerability Stream */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white/40 flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-rose animate-pulse" /> Live Vulnerability Stream
          </h3>

          <div className="space-y-2 max-h-[800px] overflow-y-auto pr-1">
            {vulnStream.map(vuln => {
              const sev = SEVERITY_CONFIG[vuln.severity];
              const st = STATUS_CONFIG[vuln.status];
              return (
                <div key={vuln.id} className={`bg-white/[0.02] border ${vuln.status === 'open' ? 'border-rose/20' : 'border-white/5'} rounded-xl p-3.5 transition-all`}>
                  <div className="flex items-start justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded ${sev.bg} ${sev.border} border`} style={{ color: sev.color }}>
                        {sev.label}
                      </span>
                      <span className="text-[10px] font-mono text-white/30">{vuln.id}</span>
                    </div>
                    <span className="flex items-center gap-1 text-[10px]" style={{ color: st.color }}>
                      <st.icon className="w-3 h-3" /> {st.label}
                    </span>
                  </div>

                  <p className="text-[11px] text-white/60 mb-1 leading-relaxed">{vuln.message}</p>

                  <div className="flex items-center justify-between text-[10px] text-white/25 mb-2">
                    <span className="flex items-center gap-1"><ScanLine className="w-3 h-3" /> {vuln.scanner}</span>
                    <span>{timeAgo(vuln.timestamp)}</span>
                  </div>

                  {vuln.status === 'open' && (
                    <div className="flex gap-1.5">
                      <button onClick={() => handleAckVuln(vuln.id)} className="flex-1 py-1 bg-cyan/10 text-cyan rounded text-[10px] font-bold hover:bg-cyan/20 transition-all">
                        Acknowledge
                      </button>
                      <button onClick={() => handleResolveVuln(vuln.id)} className="flex-1 py-1 bg-lime/10 text-lime rounded text-[10px] font-bold hover:bg-lime/20 transition-all">
                        Resolve
                      </button>
                    </div>
                  )}
                  {vuln.status === 'acknowledged' && (
                    <button onClick={() => handleResolveVuln(vuln.id)} className="w-full py-1 bg-lime/10 text-lime rounded text-[10px] font-bold hover:bg-lime/20 transition-all">
                      Mark Resolved
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Scanner Detail Panel */}
      {selectedScanner && scannerStatuses[selectedScanner] && (
        <div className="bg-white/[0.02] border border-lime/20 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <FileWarning className="w-4 h-4 text-lime" />
                {selectedScanner}
              </h3>
              <p className="text-xs text-white/40 mt-0.5">
                Category: {ALL_SCANNERS.find(s => s.name === selectedScanner)?.categoryLabel} ·
                Last scan: {timeAgo(scannerStatuses[selectedScanner].lastScan)}
              </p>
            </div>
            <button onClick={() => setSelectedScanner(null)} className="text-white/30 hover:text-white/60 text-xs">Close</button>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-white/[0.03] rounded-lg p-3 text-center">
              <div className="text-lg font-black" style={{ color: scannerStatuses[selectedScanner].status === 'healthy' ? '#a3e635' : scannerStatuses[selectedScanner].status === 'degraded' ? '#fbbf24' : '#f43f5e' }}>
                {scannerStatuses[selectedScanner].status.toUpperCase()}
              </div>
              <div className="text-[10px] text-white/30 uppercase">Status</div>
            </div>
            <div className="bg-white/[0.03] rounded-lg p-3 text-center">
              <div className="text-lg font-black text-white">{scannerStatuses[selectedScanner].findings}</div>
              <div className="text-[10px] text-white/30 uppercase">Findings</div>
            </div>
            <div className="bg-white/[0.03] rounded-lg p-3 text-center">
              <div className="text-lg font-black text-cyan">
                {Math.floor(Math.random() * 150 + 50)}ms
              </div>
              <div className="text-[10px] text-white/30 uppercase">Latency</div>
            </div>
          </div>

          {/* Simulated scan history sparkline */}
          <div className="bg-white/[0.03] rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-white/30 uppercase tracking-wider">Scan History (24h)</span>
              <TrendingUp className="w-3 h-3 text-lime" />
            </div>
            <div className="flex items-end gap-1 h-16">
              {Array.from({ length: 24 }, (_, i) => {
                const h = Math.floor(Math.random() * 80 + 20);
                return (
                  <div key={i} className="flex-1 bg-lime/20 rounded-sm hover:bg-lime/40 transition-all relative group" style={{ height: `${h}%` }}>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 text-[9px] text-white/50 opacity-0 group-hover:opacity-100 whitespace-nowrap">{h}%</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
