import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Activity, AlertTriangle, CheckCircle, Clock,
  Terminal, Zap, Timer
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface FixStep {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  detail: string;
  time: string;
}

export function FixDashboard() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const [timeLeft, setTimeLeft] = useState(72 * 60 * 60); // 72 hours in seconds
  const [currentStep] = useState(2);
  const [confidence, setConfidence] = useState(87);

  const steps: FixStep[] = [
    { name: 'TRIAGE', status: 'completed', detail: 'Classified as CSS/asset issue', time: '0.3s' },
    { name: 'ISOLATE', status: 'completed', detail: 'VM spawned, site cloned', time: '4.2s' },
    { name: 'REPAIR', status: 'running', detail: 'Applying fix to broken asset reference', time: '12s' },
    { name: 'VALIDATE', status: 'pending', detail: 'Waiting for repair to complete', time: '-' },
    { name: 'DEPLOY', status: 'pending', detail: 'Awaiting validation', time: '-' },
    { name: 'AUDIT', status: 'pending', detail: 'Logging actions', time: '-' },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setConfidence((prev) => Math.min(99, prev + Math.random() * 3));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-void p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-lime" />
              <span className="text-lime text-xs font-mono uppercase tracking-widest">One-Time Fix</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">FIX DASHBOARD</h1>
            <p className="text-sm text-white/40 font-mono mt-1">TICKET: {ticketId || 'UPX-UNKNOWN'}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-surface border border-white/5 px-4 py-2 text-center">
              <div className="text-xs text-white/40 uppercase tracking-wider mb-1">Expires In</div>
              <div className="text-lg font-black font-mono text-magenta flex items-center gap-2">
                <Timer className="w-4 h-4" />
                {formatTime(timeLeft)}
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-surface border border-white/5 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-white/40 uppercase tracking-wider">AI Pipeline Progress</span>
            <span className="text-xs font-mono text-lime">{Math.round((currentStep / steps.length) * 100)}%</span>
          </div>
          <Progress value={(currentStep / steps.length) * 100} className="h-2" />
          <div className="flex justify-between mt-2">
            {steps.map((step, i) => (
              <div key={step.name} className="flex flex-col items-center">
                <div className={`w-2 h-2 rounded-full mb-1 ${
                  i < currentStep ? 'bg-lime' : i === currentStep ? 'bg-cyan animate-pulse' : 'bg-white/20'
                }`} />
                <span className={`text-xs ${i <= currentStep ? 'text-white/60' : 'text-white/20'}`}>{step.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Steps */}
          <div className="lg:col-span-2 bg-surface border border-white/5">
            <div className="p-4 border-b border-white/5">
              <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-lime" />
                AI Agent Pipeline
              </h3>
            </div>
            <div className="divide-y divide-white/5">
              {steps.map((step, i) => (
                <div key={step.name} className={`p-4 flex items-center gap-4 ${i === currentStep ? 'bg-cyan/5' : ''}`}>
                  <div className="w-8 h-8 flex items-center justify-center">
                    {step.status === 'completed' && <CheckCircle className="w-5 h-5 text-green-500" />}
                    {step.status === 'running' && <Activity className="w-5 h-5 text-cyan animate-pulse" />}
                    {step.status === 'pending' && <Clock className="w-5 h-5 text-white/20" />}
                    {step.status === 'failed' && <AlertTriangle className="w-5 h-5 text-red-500" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${i === currentStep ? 'text-cyan' : step.status === 'completed' ? 'text-green-500' : 'text-white/40'}`}>
                        {step.name}
                      </span>
                      <span className="text-xs font-mono text-white/30">{step.time}</span>
                    </div>
                    <p className="text-xs text-white/50 mt-0.5">{step.detail}</p>
                  </div>
                  {i === currentStep && (
                    <span className="text-xs font-bold text-cyan uppercase animate-pulse">Running</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Confidence */}
            <div className="bg-surface border border-white/5 p-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-4">AI Confidence</h4>
              <div className="text-center">
                <div className={`text-4xl font-black font-mono ${confidence >= 90 ? 'text-green-500' : confidence >= 70 ? 'text-yellow-500' : 'text-red-500'}`}>
                  {Math.round(confidence)}%
                </div>
                <p className="text-xs text-white/40 mt-2">
                  {confidence >= 90
                    ? 'Auto-deployment approved'
                    : confidence >= 70
                    ? 'Under review'
                    : 'Engineer escalation likely'}
                </p>
              </div>
            </div>

            {/* Ticket Info */}
            <div className="bg-surface border border-white/5 p-6 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-2">Ticket Info</h4>
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Site</span>
                <span className="font-mono">shop.acme-corp.com</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Issue</span>
                <span>CSS 404 Error</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Severity</span>
                <span className="text-yellow-500 font-bold uppercase text-xs">Medium</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Submitted</span>
                <span className="font-mono text-xs">2 min ago</span>
              </div>
            </div>

            {/* Live Log Preview */}
            <div className="bg-void border border-white/5 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Terminal className="w-4 h-4 text-lime" />
                <span className="text-xs font-bold uppercase tracking-wider text-white/40">Live Log</span>
              </div>
              <div className="space-y-1 font-mono text-xs">
                <div className="text-green-500">[14:32:01] TRIAGE: CSS asset 404 detected</div>
                <div className="text-cyan">[14:32:04] ISOLATE: VM-4821 spawned</div>
                <div className="text-cyan">[14:32:08] ISOLATE: Site cloned successfully</div>
                <div className="text-white/60">[14:32:12] REPAIR: Analyzing asset references...</div>
                <div className="text-white/60 animate-pulse">[14:32:15] REPAIR: Applying fix...</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
