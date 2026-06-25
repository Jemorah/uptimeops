import { useState } from 'react';
import {
  AlertTriangle, PauseCircle, PlayCircle, RotateCcw,
  UserX, Shield
} from 'lucide-react';
import type { AgentName, PipelineIncident } from './types';

interface ManualControlsProps {
  incident: PipelineIncident;
  onEscalate: (agent: AgentName, engineer: string) => void;
  onPause: (agent: AgentName) => void;
  onResume: (agent: AgentName) => void;
  onRollback: () => void;
}

const ENGINEERS = ['Alex Chen', 'Jordan Smith', 'Morgan Lee', 'Sam Rivera'];

export function ManualControls({
  incident,
  onEscalate,
  onPause,
  onResume,
  onRollback,
}: ManualControlsProps) {
  const [showEscalate, setShowEscalate] = useState(false);
  const [selectedEngineer, setSelectedEngineer] = useState(ENGINEERS[0]);
  const [confirmRollback, setConfirmRollback] = useState(false);

  const runningAgents = Object.values(incident.agents).filter(a => a.status === 'running');
  const pausedAgents = Object.values(incident.agents).filter(a => a.status === 'paused');
  const canRollback = incident.agents.DEPLOY.status === 'completed' || incident.agents.DEPLOY.status === 'running';

  return (
    <div className="bg-surface border border-white/5 p-6 space-y-4">
      <h3 className="text-xs font-bold uppercase tracking-wider text-white/40 flex items-center gap-2">
        <Shield className="w-4 h-4 text-lime" />
        Manual Controls
      </h3>

      {/* Escalate */}
      <div>
        {!showEscalate ? (
          <button
            onClick={() => setShowEscalate(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-magenta/30 text-magenta text-xs font-bold uppercase tracking-wider hover:bg-magenta/10 transition-colors"
          >
            <UserX className="w-4 h-4" />
            Escalate to Engineer
          </button>
        ) : (
          <div className="space-y-3 border border-magenta/20 p-4 bg-magenta/5">
            <div className="flex items-center gap-2 text-magenta text-sm font-bold">
              <AlertTriangle className="w-4 h-4" />
              Escalate Current Agent
            </div>
            <select
              value={selectedEngineer}
              onChange={(e) => setSelectedEngineer(e.target.value)}
              className="w-full bg-void border border-white/10 text-white text-xs px-3 py-2 focus:border-magenta outline-none"
            >
              {ENGINEERS.map(eng => (
                <option key={eng} value={eng}>{eng}</option>
              ))}
            </select>
            <div className="flex gap-2">
              {runningAgents.map(agent => (
                <button
                  key={agent.name}
                  onClick={() => { onEscalate(agent.name, selectedEngineer); setShowEscalate(false); }}
                  className="flex-1 px-3 py-2 bg-magenta text-void text-xs font-bold uppercase hover:bg-magenta/80 transition-colors"
                >
                  {agent.name}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowEscalate(false)}
              className="w-full text-xs text-white/40 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Pause / Resume */}
      {runningAgents.length > 0 && (
        <div className="flex gap-2">
          {runningAgents.map(agent => (
            <button
              key={agent.name}
              onClick={() => onPause(agent.name)}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-yellow-500/30 text-yellow-500 text-xs font-bold uppercase hover:bg-yellow-500/10 transition-colors"
            >
              <PauseCircle className="w-3.5 h-3.5" />
              Pause {agent.name}
            </button>
          ))}
        </div>
      )}

      {pausedAgents.length > 0 && (
        <div className="flex gap-2">
          {pausedAgents.map(agent => (
            <button
              key={agent.name}
              onClick={() => onResume(agent.name)}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-green-500/30 text-green-500 text-xs font-bold uppercase hover:bg-green-500/10 transition-colors"
            >
              <PlayCircle className="w-3.5 h-3.5" />
              Resume {agent.name}
            </button>
          ))}
        </div>
      )}

      {/* Rollback */}
      <div>
        {!confirmRollback ? (
          <button
            onClick={() => setConfirmRollback(true)}
            disabled={!canRollback}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-orange-500/30 text-orange-500 text-xs font-bold uppercase tracking-wider hover:bg-orange-500/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <RotateCcw className="w-4 h-4" />
            Rollback Deployment
          </button>
        ) : (
          <div className="space-y-3 border border-orange-500/20 p-4 bg-orange-500/5">
            <p className="text-xs text-orange-400">
              This will restore the pre-fix backup snapshot. All changes will be reverted.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => { onRollback(); setConfirmRollback(false); }}
                className="flex-1 px-3 py-2 bg-orange-500 text-void text-xs font-bold uppercase hover:bg-orange-500/80 transition-colors"
              >
                Confirm Rollback
              </button>
              <button
                onClick={() => setConfirmRollback(false)}
                className="flex-1 px-3 py-2 border border-white/10 text-xs text-white/40 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
