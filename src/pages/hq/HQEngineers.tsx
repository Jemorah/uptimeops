import { useState } from 'react';
import { Terminal } from 'lucide-react';

interface Engineer {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'available' | 'offline' | 'on_break';
  currentSession: string | null;
  resolvedToday: number;
  totalResolved: number;
  avgHandleTime: string;
  lastActive: string;
  certifications: string[];
}

const engineers: Engineer[] = [
  { id: 'ENG-001', name: 'Alex Chen', email: 'alex@uptimeops.io', status: 'active', currentSession: 'SES-4821', resolvedToday: 5, totalResolved: 342, avgHandleTime: '4.2m', lastActive: 'now', certifications: ['Senior', 'Database', 'Security'] },
  { id: 'ENG-002', name: 'Jordan Smith', email: 'jordan@uptimeops.io', status: 'active', currentSession: 'SES-4820', resolvedToday: 3, totalResolved: 289, avgHandleTime: '5.1m', lastActive: 'now', certifications: ['Senior', 'Frontend', 'DevOps'] },
  { id: 'ENG-003', name: 'Morgan Lee', email: 'morgan@uptimeops.io', status: 'active', currentSession: 'SES-4819', resolvedToday: 4, totalResolved: 198, avgHandleTime: '3.8m', lastActive: 'now', certifications: ['Mid', 'API', 'Performance'] },
  { id: 'ENG-004', name: 'Sam Rivera', email: 'sam@uptimeops.io', status: 'available', currentSession: null, resolvedToday: 0, totalResolved: 156, avgHandleTime: '6.2m', lastActive: '15m ago', certifications: ['Junior', 'Frontend'] },
  { id: 'ENG-005', name: 'Taylor Park', email: 'taylor@uptimeops.io', status: 'offline', currentSession: null, resolvedToday: 0, totalResolved: 410, avgHandleTime: '3.5m', lastActive: '2h ago', certifications: ['Senior', 'Security', 'Infrastructure'] },
  { id: 'ENG-006', name: 'Riley Kim', email: 'riley@uptimeops.io', status: 'on_break', currentSession: null, resolvedToday: 2, totalResolved: 267, avgHandleTime: '4.8m', lastActive: '20m ago', certifications: ['Mid', 'Database', 'DevOps'] },
];

export function HQEngineers() {
  const [filter, setFilter] = useState('all');

  const filtered = engineers.filter((eng) => filter === 'all' || eng.status === filter);

  const statusConfig = {
    active: { color: 'text-cyan', bg: 'bg-cyan/10', label: 'Active' },
    available: { color: 'text-green-500', bg: 'bg-green-500/10', label: 'Available' },
    offline: { color: 'text-white/30', bg: 'bg-white/5', label: 'Offline' },
    on_break: { color: 'text-yellow-500', bg: 'bg-yellow-500/10', label: 'On Break' },
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black tracking-tight">ENGINEERS</h2>
        <p className="text-sm text-white/40 mt-1">Manage on-call engineers and view performance</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {['all', 'active', 'available', 'on_break', 'offline'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider border transition-colors ${
              filter === status
                ? 'border-lime text-lime bg-lime/10'
                : 'border-white/10 text-white/40 hover:border-white/20'
            }`}
          >
            {status.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((eng) => {
          const config = statusConfig[eng.status];
          return (
            <div key={eng.id} className="bg-surface border border-white/5 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-2 h-2 rounded-full ${config.color.replace('text-', 'bg-')}`} />
                    <span className={`text-xs font-bold uppercase ${config.color}`}>{config.label}</span>
                  </div>
                  <h3 className="text-lg font-bold">{eng.name}</h3>
                  <p className="text-xs text-white/40 font-mono">{eng.email}</p>
                </div>
                <span className="text-xs font-mono text-white/30">{eng.id}</span>
              </div>

              {eng.currentSession && (
                <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-cyan/5 border border-cyan/20">
                  <Terminal className="w-3 h-3 text-cyan" />
                  <span className="text-xs font-mono text-cyan">{eng.currentSession}</span>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-lg font-black font-mono">{eng.resolvedToday}</div>
                  <div className="text-xs text-white/40">Today</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-black font-mono">{eng.totalResolved}</div>
                  <div className="text-xs text-white/40">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-black font-mono">{eng.avgHandleTime}</div>
                  <div className="text-xs text-white/40">Avg</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-1">
                {eng.certifications.map((cert) => (
                  <span key={cert} className="text-xs px-2 py-0.5 bg-white/5 text-white/40">
                    {cert}
                  </span>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                <span className="text-xs text-white/30">Last active: {eng.lastActive}</span>
                <button className="text-xs text-lime hover:underline">View Details</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
