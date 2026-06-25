// ═══════════════════════════════════════════════════════════════
// SESSION RECORDER
// Keystroke and command logging for audit trail
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react';
import {
  Play, Square, Download, Clock,
  Keyboard, MousePointer, Terminal, Eye, Video
} from 'lucide-react';

type SessionEventType = 'command' | 'keystroke' | 'file_edit' | 'file_save' | 'review' | 'system' | 'mouse';

interface SessionEvent {
  id: string;
  timestamp: string;
  elapsed: string;
  type: SessionEventType;
  description: string;
  detail?: string;
}

const INITIAL_EVENTS: SessionEvent[] = [
  { id: 'se-1', timestamp: '14:45:00', elapsed: '00:00', type: 'system', description: 'Session started', detail: 'Engineer Alex Chen joined workspace ESC-2049' },
  { id: 'se-2', timestamp: '14:45:05', elapsed: '00:05', type: 'command', description: 'ls -la /var/log/', detail: 'Listed log directory contents' },
  { id: 'se-3', timestamp: '14:45:12', elapsed: '00:12', type: 'command', description: 'cat /var/log/postgresql/error.log | tail -50', detail: 'Viewed last 50 PostgreSQL errors' },
  { id: 'se-4', timestamp: '14:46:30', elapsed: '01:30', type: 'keystroke', description: 'Analyzed pg_stat_activity', detail: 'SELECT pid, state, query_start, query FROM pg_stat_activity WHERE state = \'active\';' },
  { id: 'se-5', timestamp: '14:48:00', elapsed: '03:00', type: 'file_edit', description: 'Opened db/pool.js', detail: 'Reviewed connection pool configuration' },
  { id: 'se-6', timestamp: '14:49:15', elapsed: '04:15', type: 'review', description: 'Reviewed AI attempt logs', detail: 'AI tried max: 200 and idleTimeoutMillis: 30000, both partial fixes' },
  { id: 'se-7', timestamp: '14:50:00', elapsed: '05:00', type: 'command', description: 'pgbadger /var/log/postgresql/*.log', detail: 'Generated PostgreSQL slow query report' },
  { id: 'se-8', timestamp: '14:52:30', elapsed: '07:30', type: 'keystroke', description: 'Identified root cause', detail: 'Connection leak in /api/v2/products — no pool.release() in error path' },
];

interface SessionRecorderProps {
  incidentId: string;
}

export function SessionRecorder({ incidentId }: SessionRecorderProps) {
  const [isRecording, setIsRecording] = useState(true);
  const [elapsed, setElapsed] = useState(450); // 7m 30s
  const [events, setEvents] = useState<SessionEvent[]>(INITIAL_EVENTS);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isRecording) {
      intervalRef.current = setInterval(() => {
        setElapsed(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRecording]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
  };

  const addEvent = (type: SessionEventType, description: string, detail?: string) => {
    const newEvent: SessionEvent = {
      id: `se-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
      elapsed: formatTime(elapsed),
      type,
      description,
      detail,
    };
    setEvents(prev => [...prev, newEvent]);
  };

  const typeIcons: Record<SessionEventType, React.ReactNode> = {
    command: <Terminal className="w-3 h-3" />,
    keystroke: <Keyboard className="w-3 h-3" />,
    file_edit: <Eye className="w-3 h-3" />,
    file_save: <Download className="w-3 h-3" />,
    review: <Eye className="w-3 h-3" />,
    system: <Terminal className="w-3 h-3" />,
    mouse: <MousePointer className="w-3 h-3" />,
  };

  const typeColors: Record<SessionEventType, string> = {
    command: 'text-cyan',
    keystroke: 'text-yellow-400',
    file_edit: 'text-magenta',
    file_save: 'text-lime',
    review: 'text-white/40',
    system: 'text-white/60',
    mouse: 'text-white/20',
  };

  return (
    <div className="bg-surface border border-white/10 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          {isRecording ? (
            <Video className="w-4 h-4 text-red-400 animate-pulse" />
          ) : (
            <Square className="w-4 h-4 text-white/30" />
          )}
          <span className="text-xs font-bold">Session Recorder</span>
          <span className="text-[10px] text-white/30 font-mono">{incidentId}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-mono text-white/40">
            <Clock className="w-3 h-3" />
            {formatTime(elapsed)}
          </div>
          <button
            onClick={toggleRecording}
            className={`p-1.5 transition-colors ${
              isRecording ? 'text-red-400 hover:text-red-300' : 'text-white/30 hover:text-white/60'
            }`}
            title={isRecording ? 'Stop recording' : 'Resume recording'}
          >
            {isRecording ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          </button>
          <button
            className="p-1.5 text-white/30 hover:text-white/60 transition-colors"
            title="Export session log"
          >
            <Download className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Recording indicator */}
      {isRecording && (
        <div className="px-3 py-1 bg-red-500/5 border-b border-red-500/10 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
          <span className="text-[10px] text-red-400 font-mono">RECORDING — All actions logged for audit</span>
        </div>
      )}

      {/* Events */}
      <div className="flex-1 overflow-y-auto min-h-[200px] max-h-[400px]">
        <div className="divide-y divide-white/5">
          {events.map((event) => (
            <div
              key={event.id}
              className="flex items-start gap-2 px-3 py-2 hover:bg-white/[0.02] transition-colors"
            >
              <div className={`flex-shrink-0 mt-0.5 ${typeColors[event.type]}`}>
                {typeIcons[event.type]}
              </div>
              <div className="flex-shrink-0 text-white/15 font-mono text-[10px] pt-0.5 w-10">
                {event.elapsed}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-white/60">{event.description}</div>
                {event.detail && (
                  <div className="text-[10px] text-white/30 font-mono mt-0.5 truncate">{event.detail}</div>
                )}
              </div>
              <div className="flex-shrink-0 text-white/15 font-mono text-[10px]">
                {event.timestamp}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div className="px-3 py-2 border-t border-white/5 bg-black/10 flex items-center gap-2">
        <span className="text-[10px] text-white/30">Log:</span>
        <button
          onClick={() => addEvent('command', 'Manual command executed', 'ps aux | grep postgres')}
          className="px-2 py-1 text-[10px] text-cyan border border-cyan/20 hover:bg-cyan/10 transition-colors"
        >
          + Command
        </button>
        <button
          onClick={() => addEvent('review', 'Code review checkpoint', 'Reviewed fix for connection pool leak')}
          className="px-2 py-1 text-[10px] text-white/40 border border-white/10 hover:bg-white/5 transition-colors"
        >
          + Review
        </button>
      </div>
    </div>
  );
}
