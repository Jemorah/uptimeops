import { useParams } from 'react-router-dom';
import { ArrowLeft, Brain, Activity, CheckCircle, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';

const agents = [
  {
    name: 'TRIAGE',
    status: 'completed',
    confidence: 99,
    started: '14:32:01',
    completed: '14:32:02',
    actions: ['Analyzed HTTP response', 'Classified failure mode', 'Assigned severity: medium', 'Routed to ISOLATE'],
  },
  {
    name: 'ISOLATE',
    status: 'completed',
    confidence: 100,
    started: '14:32:02',
    completed: '14:32:08',
    actions: ['Allocated VM-4821', 'Cloned repository', 'Installed dependencies', 'Started dev server'],
  },
  {
    name: 'REPAIR',
    status: 'completed',
    confidence: 94,
    started: '14:32:08',
    completed: '14:32:15',
    actions: ['Scanned build output', 'Found missing CSS import', 'Generated patch', 'Applied fix', 'Verified build'],
  },
  {
    name: 'VALIDATE',
    status: 'running',
    confidence: 0,
    started: '14:32:15',
    completed: null,
    actions: ['Running visual regression', 'Checking mobile viewport', 'Testing checkout flow'],
  },
  {
    name: 'DEPLOY',
    status: 'pending',
    confidence: 0,
    started: null,
    completed: null,
    actions: ['Waiting for validation'],
  },
  {
    name: 'AUDIT',
    status: 'pending',
    confidence: 0,
    started: null,
    completed: null,
    actions: ['Waiting for deployment'],
  },
];

export function FixAIProgress() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const completedAgents = agents.filter(a => a.status === 'completed').length;

  return (
    <div className="min-h-screen bg-void p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link to={`/fix/${ticketId}`} className="text-white/40 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-black tracking-tight">AI PROGRESS</h1>
            <p className="text-sm text-white/40 font-mono">{ticketId}</p>
          </div>
        </div>

        {/* Overall Progress */}
        <div className="bg-surface border border-white/5 p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold uppercase tracking-wider text-white/40">Overall Progress</span>
            <span className="text-sm font-mono text-lime">{completedAgents}/{agents.length} Agents</span>
          </div>
          <Progress value={(completedAgents / agents.length) * 100} className="h-3" />
        </div>

        {/* Agent Cards */}
        <div className="space-y-4">
          {agents.map((agent) => (
            <div
              key={agent.name}
              className={`bg-surface border p-6 transition-all ${
                agent.status === 'running' ? 'border-cyan/30 bg-cyan/5' :
                agent.status === 'completed' ? 'border-green-500/20' :
                'border-white/5'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {agent.status === 'completed' && <CheckCircle className="w-5 h-5 text-green-500" />}
                  {agent.status === 'running' && <Activity className="w-5 h-5 text-cyan animate-pulse" />}
                  {agent.status === 'pending' && <Clock className="w-5 h-5 text-white/20" />}
                  <h3 className={`text-lg font-bold ${
                    agent.status === 'running' ? 'text-cyan' :
                    agent.status === 'completed' ? 'text-white' :
                    'text-white/30'
                  }`}>
                    {agent.name}
                  </h3>
                </div>
                <div className="flex items-center gap-4">
                  {agent.confidence > 0 && (
                    <div className="text-right">
                      <div className="text-xs text-white/40">Confidence</div>
                      <div className={`text-sm font-mono font-bold ${
                        agent.confidence >= 90 ? 'text-green-500' : 'text-yellow-500'
                      }`}>
                        {agent.confidence}%
                      </div>
                    </div>
                  )}
                  <span className={`text-xs font-bold uppercase ${
                    agent.status === 'completed' ? 'text-green-500' :
                    agent.status === 'running' ? 'text-cyan' :
                    'text-white/20'
                  }`}>
                    {agent.status}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono text-white/40 mb-3">
                {agent.started && <span>Started: {agent.started}</span>}
                {agent.completed && <span>Completed: {agent.completed}</span>}
              </div>

              <div className="space-y-1">
                {agent.actions.map((action, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-white/60">
                    <Brain className="w-3 h-3 text-white/20" />
                    {action}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
