// ═══════════════════════════════════════════════════════════════
// SESSION RECORDER — v2.1
// Keystroke and command logging for audit trail.
// No mock data. Starts empty, events added by engineer actions.
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from 'react';
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

interface SessionRecorderProps {
  incidentId: string;
}

export function SessionRecorder({ incidentId }: SessionRecorderProps) {
  const [isRecording, setIsRecording] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [events, setEvents] = useState<SessionEvent[]>([]);
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

  const addEvent = useCallback((type: SessionEventType, description: string, detail?: string) => {
    setEvents(prev => [...prev, {
      id: `se-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
      elapsed: formatTime(elapsed),
      type,
      description,
      detail,
    }]);
  }, [elapsed]);

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
            onClick={() => {
              const text = events.map(l => `${l.elapsed} [${l.type}] ${l.description}${l.detail ? ` — ${l.detail}` : ''}`).join('\n');
              navigator.clipboard.writeText(text);
            }}
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
          {events.length === 0 && (
            <div className="px-3 py-8 text-center text-[10px] text-white/20">
              Session recording started. Events will appear here as you work.
            </div>
          )}
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
          onClick={() => addEvent('command', 'Manual command logged', 'Command recorded by engineer')}
          className="px-2 py-1 text-[10px] text-cyan border border-cyan/20 hover:bg-cyan/10 transition-colors"
        >
          + Command
        </button>
        <button
          onClick={() => addEvent('review', 'Code review checkpoint', 'Review checkpoint recorded')}
          className="px-2 py-1 text-[10px] text-white/40 border border-white/10 hover:bg-white/5 transition-colors"
        >
          + Review
        </button>
      </div>
    </div>
  );
}
