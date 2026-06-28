// ═══════════════════════════════════════════════════════════════
// HANDOFF NOTES
// For shift changes and L2→L3 escalation handoff
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import {
  ClipboardList, Plus, User, Bot, Shield,
  Clock, ChevronDown, ChevronUp, Send
} from 'lucide-react';
import { useEscalations } from '@/hooks/useEscalations';

interface HandoffNotesProps {
  incidentId: string;
}

export function HandoffNotes({ incidentId }: HandoffNotesProps) {
  const { getHandoffNotes, addHandoffNote } = useEscalations();
  const notes = getHandoffNotes(incidentId);
  const [newNote, setNewNote] = useState('');
  const [noteType, setNoteType] = useState<'engineer' | 'coordinator'>('engineer');
  const [expandedNotes, setExpandedNotes] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  const handleSubmit = () => {
    if (!newNote.trim()) return;
    const author = noteType === 'engineer' ? 'Alex Chen' : 'Coordinator Sarah';
    addHandoffNote(incidentId, newNote.trim(), author, noteType);
    setNewNote('');
    setShowAddForm(false);
  };

  const authorIcons = {
    engineer: <User className="w-3 h-3" />,
    coordinator: <Shield className="w-3 h-3" />,
    ai: <Bot className="w-3 h-3" />,
  };

  const authorColors = {
    engineer: 'bg-cyan/10 text-cyan border-cyan/20',
    coordinator: 'bg-purple/10 text-purple-400 border-purple/20',
    ai: 'bg-white/5 text-white/30 border-white/10',
  };

  const formatTime = (ts: string) => {
    return new Date(ts).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  return (
    <div className="bg-surface border border-white/10 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-lime" />
          <span className="text-xs font-bold">Handoff Notes</span>
          <span className="text-[10px] text-white/30 font-mono">{notes.length} notes</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1 px-2 py-1 bg-lime/10 border border-lime/30 text-lime text-[10px] font-bold hover:bg-lime/20 transition-colors"
          >
            <Plus className="w-3 h-3" />
            ADD
          </button>
          <button
            onClick={() => setExpandedNotes(!expandedNotes)}
            className="p-1 text-white/30 hover:text-white/60 transition-colors"
          >
            {expandedNotes ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Add Note Form */}
      {showAddForm && (
        <div className="p-3 border-b border-white/5 bg-lime/[0.02]">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] text-white/30">Author:</span>
            <button
              onClick={() => setNoteType('engineer')}
              className={`text-[10px] px-2 py-1 border transition-colors ${
                noteType === 'engineer'
                  ? 'bg-cyan/10 text-cyan border-cyan/30'
                  : 'bg-white/5 text-white/30 border-white/10'
              }`}
            >
              Engineer
            </button>
            <button
              onClick={() => setNoteType('coordinator')}
              className={`text-[10px] px-2 py-1 border transition-colors ${
                noteType === 'coordinator'
                  ? 'bg-purple/10 text-purple-400 border-purple/30'
                  : 'bg-white/5 text-white/30 border-white/10'
              }`}
            >
              Coordinator
            </button>
          </div>
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add handoff note..."
            className="w-full bg-black/30 border border-white/10 text-xs text-white/70 px-2 py-1.5 outline-none focus:border-lime/30 min-h-[60px] resize-none mb-2"
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-white/20">Visible to all team members</span>
            <button
              onClick={handleSubmit}
              disabled={!newNote.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-lime/10 border border-lime/30 text-lime text-xs font-bold hover:bg-lime/20 transition-colors disabled:opacity-30"
            >
              <Send className="w-3 h-3" />
              POST
            </button>
          </div>
        </div>
      )}

      {/* Notes List */}
      {expandedNotes && (
        <div className="flex-1 overflow-y-auto min-h-[150px] max-h-[300px]">
          {notes.length === 0 ? (
            <div className="p-6 text-center">
              <ClipboardList className="w-6 h-6 text-white/10 mx-auto mb-2" />
              <p className="text-xs text-white/20">No handoff notes yet</p>
              <p className="text-[10px] text-white/15 mt-1">Add notes for shift changes or escalation</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {notes.map((note, index) => (
                <div
                  key={note.id}
                  className={`p-3 ${index === notes.length - 1 ? 'bg-lime/[0.01]' : ''}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-5 h-5 flex items-center justify-center border ${authorColors[note.authorRole]}`}>
                      {authorIcons[note.authorRole]}
                    </div>
                    <span className={`text-[10px] font-bold ${
                      note.authorRole === 'engineer' ? 'text-cyan' :
                      note.authorRole === 'coordinator' ? 'text-purple-400' :
                      'text-white/30'
                    }`}>
                      {note.author}
                    </span>
                    <span className="text-[10px] text-white/15 font-mono flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {formatTime(note.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-white/60 leading-relaxed pl-7">{note.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Escalation Handoff */}
      {notes.length > 0 && (
        <div className="px-3 py-2 border-t border-white/5 bg-black/10">
          <button className="flex items-center gap-2 text-[10px] text-white/30 hover:text-white/50 transition-colors w-full">
            <Shield className="w-3 h-3" />
            <span>Generate escalation handoff report</span>
          </button>
        </div>
      )}
    </div>
  );
}
