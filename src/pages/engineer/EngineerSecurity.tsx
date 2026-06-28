// UptimeOps v2.1 — Engineer Security Page
// Full-screen CodeGraph, scanner overrides, guidelines viewer, repair diff

import { useState } from 'react';
import { useCodeGraph } from '@/hooks/useCodeGraph';
import { useScanResults } from '@/hooks/useScanResults';
import { CodeGraphVisualizer } from '@/components/security/CodeGraphVisualizer';
import { ScannerRegistry } from '@/components/security/ScannerRegistry';
import { CustomGuidelineEditor } from '@/components/security/CustomGuidelineEditor';
import { SarifViewer } from '@/components/security/SarifViewer';
import { ScanLine, FileCode2, GitCompare, Play, Settings } from 'lucide-react';

const TABS = [
  { id: 'codegraph', label: 'CodeGraph', icon: FileCode2 },
  { id: 'scanners', label: 'Scanners', icon: ScanLine },
  { id: 'guidelines', label: 'Guidelines', icon: Settings },
  { id: 'diff', label: 'Repair Diff', icon: GitCompare },
] as const;

export function EngineerSecurity() {
  const [activeTab, setActiveTab] = useState<string>('codegraph');
  const [incidentId, setIncidentId] = useState<string>('');
  const { graph } = useCodeGraph(incidentId || null);
  const { scans } = useScanResults(incidentId || null);

  // Flatten SARIF-like results from scans
  const sarifResults = scans.flatMap(s =>
    (s.findings || []).map((f: any, i: number) => ({
      ruleId: f.rule || `${s.scanner_name}-${i}`,
      message: { text: f.message || 'No message' },
      level: f.severity === 'critical' ? 'error' : f.severity === 'high' ? 'error' : 'warning',
      locations: f.file ? [{ physicalLocation: { artifactLocation: { uri: f.file }, region: { startLine: f.line } } }] : undefined,
    }))
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-white tracking-tight">Security Tools</h1>
        <input
          type="text"
          value={incidentId}
          onChange={e => setIncidentId(e.target.value)}
          placeholder="Incident ID"
          className="w-48 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#a3e635]/50"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-white/5 rounded-lg w-fit">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              activeTab === tab.id ? 'bg-[#a3e635]/10 text-[#a3e635]' : 'text-white/40 hover:text-white'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'codegraph' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-[#22d3ee]/10 text-[#22d3ee] rounded-lg text-xs font-bold hover:bg-[#22d3ee]/20">
              <Play className="w-3 h-3" /> Generate Graph
            </button>
          </div>
          <CodeGraphVisualizer graph={graph} height={500} />
        </div>
      )}

      {activeTab === 'scanners' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-[#a3e635]/10 text-[#a3e635] rounded-lg text-xs font-bold hover:bg-[#a3e635]/20">
              <Play className="w-3 h-3" /> Run Manual Scan
            </button>
          </div>
          <ScannerRegistry />
          {sarifResults.length > 0 && (
            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
              <h3 className="text-xs font-bold text-white/60 mb-3">Raw SARIF Output</h3>
              <SarifViewer results={sarifResults.slice(0, 50)} />
            </div>
          )}
        </div>
      )}

      {activeTab === 'guidelines' && (
        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
          <h3 className="text-xs font-bold text-white/60 mb-3">Active Guidelines</h3>
          <CustomGuidelineEditor readOnly />
        </div>
      )}

      {activeTab === 'diff' && (
        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-3">
          <h3 className="text-xs font-bold text-white/60">Repair Diff Viewer</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] text-white/40 mb-1">Original</p>
              <div className="bg-white/5 border border-red-500/20 rounded-lg p-3 font-mono text-[11px] text-white/60 whitespace-pre-wrap">
{`// Before repair
function authenticate(token) {
  if (token) return true;  // Weak check
  return false;
}`}
              </div>
            </div>
            <div>
              <p className="text-[10px] text-white/40 mb-1">After Repair</p>
              <div className="bg-white/5 border border-green-500/20 rounded-lg p-3 font-mono text-[11px] text-white/60 whitespace-pre-wrap">
{`// After repair
function authenticate(token) {
  if (!token || token.length < 32) {
    throw new Error('Invalid token');
  }
  return verifyJWT(token);
}`}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 text-[10px]">
            <span className="flex items-center gap-1"><div className="w-2 h-2 bg-red-400 rounded-sm" /> Semgrep finding</span>
            <span className="flex items-center gap-1"><div className="w-2 h-2 bg-amber-400 rounded-sm" /> SonarQube warning</span>
            <span className="flex items-center gap-1"><div className="w-2 h-2 bg-green-400 rounded-sm" /> Auto-fix applied</span>
          </div>
        </div>
      )}
    </div>
  );
}
