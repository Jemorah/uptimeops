// ═══════════════════════════════════════════════════════════════
// DEPLOYMENT TRACKER — Stage 8: Live deploy with rollback
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import {
  Rocket, CheckCircle, XCircle, Clock, RotateCcw,
  Database, Server, Activity, Shield, Zap
} from 'lucide-react';
import type { DeploymentState } from './types';

interface DeploymentTrackerProps {
  deployment: DeploymentState | null;
  onDeploy: () => void;
  onRollback: () => void;
  onSmokeTestComplete: (passed: boolean) => void;
}

export function DeploymentTracker({ deployment, onDeploy, onSmokeTestComplete }: DeploymentTrackerProps) {
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployStep, setDeployStep] = useState(0);

  if (!deployment) {
    return (
      <div className="bg-surface border border-white/5 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Rocket className="w-4 h-4 text-orange-400" />
          <h3 className="text-sm font-bold uppercase tracking-wider">Deployment</h3>
        </div>
        <p className="text-xs text-white/40 mb-4">Ready to deploy fix to production environment</p>
        <button
          onClick={() => {
            setIsDeploying(true);
            onDeploy();
            // Simulate deployment steps
            [0, 1, 2, 3].forEach((step, i) => {
              setTimeout(() => setDeployStep(step), i * 800);
            });
            setTimeout(() => {
              setIsDeploying(false);
              onSmokeTestComplete(true);
            }, 4000);
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange/10 border border-orange/30 text-orange-400 text-sm font-bold hover:bg-orange/20 transition-colors"
        >
          <Rocket className="w-4 h-4" />
          START DEPLOYMENT
        </button>
      </div>
    );
  }


  const allPassed = deployment.smokeTestResults.length > 0 && deployment.smokeTestResults.every(r => r.status === 'pass');

  return (
    <div className="bg-surface border border-white/5">
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
            <Rocket className="w-4 h-4 text-orange-400" />
            Deployment Tracker
          </h3>
          <div className={`flex items-center gap-1.5 px-2 py-1 border text-xs font-bold ${
            deployment.status === 'deployed' ? 'bg-lime/10 text-lime border-lime/20' :
            deployment.status === 'rolled_back' ? 'bg-red/10 text-red-400 border-red/20' :
            'bg-orange/10 text-orange-400 border-orange/20'
          }`}>
            {deployment.status === 'deployed' ? <CheckCircle className="w-3 h-3" /> :
             deployment.status === 'rolled_back' ? <RotateCcw className="w-3 h-3" /> :
             <Zap className="w-3 h-3 animate-pulse" />}
            {deployment.status.toUpperCase()}
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          {[
            { icon: Database, label: 'Backup', done: ['deploying', 'smoke_testing', 'deployed'].includes(deployment.status) },
            { icon: Server, label: 'Deploy', done: ['smoke_testing', 'deployed'].includes(deployment.status) },
            { icon: Activity, label: 'Smoke Test', done: deployment.status === 'deployed' },
            { icon: Shield, label: 'Verify', done: allPassed },
          ].map((step, i) => (
            <div key={step.label} className="flex-1 flex items-center gap-2">
              <div className={`w-8 h-8 flex items-center justify-center border transition-colors ${
                step.done ? 'bg-lime/10 border-lime/30 text-lime' :
                isDeploying && deployStep === i ? 'bg-orange/10 border-orange/30 text-orange-400' :
                'bg-white/5 border-white/10 text-white/20'
              }`}>
                <step.icon className="w-4 h-4" />
              </div>
              <span className={`text-[10px] font-bold ${step.done ? 'text-lime' : 'text-white/20'}`}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Backup Info */}
      {deployment.backupSnapshotId && (
        <div className="p-4 border-b border-white/5 flex items-center gap-3">
          <Database className="w-4 h-4 text-cyan" />
          <div className="flex-1">
            <div className="text-xs text-white/60">Rollback Snapshot</div>
            <div className="text-[10px] text-white/30 font-mono">{deployment.backupSnapshotId}</div>
          </div>
          {deployment.status === 'deployed' && (
            <span className="text-[10px] text-lime flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              SAFE
            </span>
          )}
        </div>
      )}

      {/* Smoke Test Results */}
      {deployment.smokeTestResults.length > 0 && (
        <div className="p-4 border-b border-white/5">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-lime" />
            <span className="text-xs font-bold uppercase tracking-wider">Smoke Tests</span>
            <span className="text-[10px] text-white/30">
              {deployment.smokeTestResults.filter(r => r.status === 'pass').length}/{deployment.smokeTestResults.length} passed
            </span>
          </div>
          <div className="space-y-1.5">
            {deployment.smokeTestResults.map((test) => (
              <div key={test.id} className="flex items-center gap-3 p-2 bg-black/20">
                {test.status === 'pass' ? (
                  <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                )}
                <span className="text-xs text-white/60 flex-1">{test.name}</span>
                <span className="text-[10px] text-white/30 font-mono">{test.detail}</span>
                <span className="text-[10px] text-white/20 font-mono">{test.duration}ms</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Duration */}
      {deployment.deployDurationSeconds && (
        <div className="p-4 flex items-center gap-2 text-xs text-white/30">
          <Clock className="w-3 h-3" />
          <span>Deploy duration: {deployment.deployDurationSeconds}s</span>
          {deployment.deployedAt && (
            <span className="font-mono ml-2">{new Date(deployment.deployedAt).toLocaleTimeString()}</span>
          )}
        </div>
      )}

      {/* Rollback Warning */}
      {deployment.status === 'rolled_back' && (
        <div className="p-4 bg-red-500/5 border-t border-red-500/10">
          <div className="flex items-start gap-2">
            <RotateCcw className="w-4 h-4 text-red-400 flex-shrink-0" />
            <div>
              <p className="text-xs font-bold text-red-400">Automatic Rollback Executed</p>
              <p className="text-xs text-white/40 mt-1">{deployment.rollbackReason}</p>
              <p className="text-xs text-white/30 mt-1">
                Original backup restored. No changes remain in production.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
