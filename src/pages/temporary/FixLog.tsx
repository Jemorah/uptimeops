import { useParams } from 'react-router-dom';
import { Terminal, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const logEntries = [
  { time: '14:32:01.245', level: 'info', agent: 'TRIAGE', message: 'Emergency ticket received: CSS asset 404 on checkout page' },
  { time: '14:32:01.412', level: 'info', agent: 'TRIAGE', message: 'Site URL: https://shop.acme-corp.com/checkout' },
  { time: '14:32:01.589', level: 'info', agent: 'TRIAGE', message: 'Classification: Frontend asset failure (medium severity)' },
  { time: '14:32:01.723', level: 'success', agent: 'TRIAGE', message: 'Triage complete. Routing to ISOLATE agent.' },
  { time: '14:32:02.104', level: 'info', agent: 'ISOLATE', message: 'Spawning isolated VM: vm-4821-fix-session' },
  { time: '14:32:03.876', level: 'info', agent: 'ISOLATE', message: 'VM allocated: 2 vCPU, 4GB RAM, 20GB SSD' },
  { time: '14:32:04.231', level: 'info', agent: 'ISOLATE', message: 'Cloning production environment...' },
  { time: '14:32:06.445', level: 'info', agent: 'ISOLATE', message: 'Git clone complete: shop.acme-corp.com@v2.4.1' },
  { time: '14:32:07.112', level: 'info', agent: 'ISOLATE', message: 'Dependency installation: npm ci (1423 packages)' },
  { time: '14:32:08.334', level: 'success', agent: 'ISOLATE', message: 'Environment isolated and ready for repair' },
  { time: '14:32:08.501', level: 'info', agent: 'REPAIR', message: 'Analyzing build output for broken asset references' },
  { time: '14:32:09.887', level: 'warn', agent: 'REPAIR', message: 'Found: styles.checkout.css referenced but not in build output' },
  { time: '14:32:10.223', level: 'info', agent: 'REPAIR', message: 'Root cause: Missing import in checkout.tsx (line 142)' },
  { time: '14:32:11.445', level: 'info', agent: 'REPAIR', message: 'Generating fix: Add missing stylesheet import' },
  { time: '14:32:12.001', level: 'info', agent: 'REPAIR', message: 'Applying patch to checkout.tsx...' },
  { time: '14:32:13.556', level: 'info', agent: 'REPAIR', message: 'Rebuild triggered: npm run build' },
  { time: '14:32:15.009', level: 'success', agent: 'REPAIR', message: 'Build successful. Asset reference resolved.' },
];

export function FixLog() {
  const { ticketId } = useParams<{ ticketId: string }>();

  return (
    <div className="min-h-screen bg-void p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link to={`/fix/${ticketId}`} className="text-white/40 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-black tracking-tight">LIVE LOG</h1>
            <p className="text-sm text-white/40 font-mono">{ticketId}</p>
          </div>
        </div>

        <div className="bg-void border border-white/5 p-4 font-mono text-xs leading-relaxed overflow-x-auto">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-white/5">
            <Terminal className="w-4 h-4 text-lime" />
            <span className="text-white/40">Session Log Stream</span>
          </div>
          <div className="space-y-1">
            {logEntries.map((entry, i) => (
              <div key={i} className="flex gap-3 hover:bg-white/[0.02] px-2 py-0.5 -mx-2">
                <span className="text-white/30 flex-shrink-0 w-24">{entry.time}</span>
                <span className={`flex-shrink-0 w-16 font-bold ${
                  entry.level === 'success' ? 'text-green-500' :
                  entry.level === 'warn' ? 'text-yellow-500' :
                  entry.level === 'error' ? 'text-red-500' :
                  'text-cyan'
                }`}>
                  {entry.agent}
                </span>
                <span className={`${
                  entry.level === 'success' ? 'text-green-400' :
                  entry.level === 'warn' ? 'text-yellow-400' :
                  entry.level === 'error' ? 'text-red-400' :
                  'text-white/70'
                }`}>
                  {entry.message}
                </span>
              </div>
            ))}
            <div className="flex gap-3 px-2 py-0.5 -mx-2 animate-pulse">
              <span className="text-white/30 flex-shrink-0 w-24">14:32:15.234</span>
              <span className="flex-shrink-0 w-16 font-bold text-cyan">VALIDATE</span>
              <span className="text-white/50">Running validation tests...</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
