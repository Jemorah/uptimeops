// ═══════════════════════════════════════════════════════════════
// COORDINATOR CHAT
// Real-time Slack-like chat between engineer and coordinator
// ═══════════════════════════════════════════════════════════════

import { useState, useRef, useEffect } from 'react';
import {
  MessageSquare, Send, User, Bot, Shield,
  Paperclip, Smile
} from 'lucide-react';
import type { ChatMessage } from '@/components/escalation/types';

// Chat starts empty — messages are added by the engineer in real time.
// Future: Load historical messages from Supabase realtime.

interface CoordinatorChatProps {
  incidentId: string;
}

export function CoordinatorChat({ incidentId }: CoordinatorChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim()) return;

    const newMessage: ChatMessage = {
      id: `cm-${Date.now()}`,
      sender: 'Engineer',
      senderRole: 'engineer',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, newMessage]);
    setInput('');

    // Note: Real coordinator replies would come via Supabase realtime
    // This is a placeholder until websocket chat is implemented
    setTimeout(() => {
      const reply: ChatMessage = {
        id: `cm-${Date.now() + 1}`,
        sender: 'Coordinator',
        senderRole: 'coordinator',
        content: 'Message received. Will review and respond shortly.',
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, reply]);
    }, 2000);
  };

  const formatTime = (ts: string) => {
    return new Date(ts).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const roleIcons = {
    engineer: <User className="w-3 h-3" />,
    coordinator: <Shield className="w-3 h-3" />,
    system: <Bot className="w-3 h-3" />,
  };

  const roleColors = {
    engineer: 'bg-cyan/10 text-cyan border-cyan/20',
    coordinator: 'bg-purple/10 text-purple-400 border-purple/20',
    system: 'bg-white/5 text-white/30 border-white/10',
  };

  return (
    <div className="bg-surface border border-white/10 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-lime" />
          <span className="text-xs font-bold">Coordinator Chat</span>
          <span className="text-[10px] text-white/30 font-mono">{incidentId}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-green-400" />
          <span className="text-[10px] text-white/40">Sarah online</span>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[200px] max-h-[400px]">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2 ${msg.senderRole === 'engineer' ? 'flex-row-reverse' : ''}`}
          >
            {/* Avatar */}
            <div className={`flex-shrink-0 w-6 h-6 flex items-center justify-center border ${roleColors[msg.senderRole]}`}>
              {roleIcons[msg.senderRole]}
            </div>

            {/* Bubble */}
            <div className={`max-w-[80%] ${msg.senderRole === 'engineer' ? 'items-end' : 'items-start'}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] font-bold ${
                  msg.senderRole === 'coordinator' ? 'text-purple-400' :
                  msg.senderRole === 'engineer' ? 'text-cyan' : 'text-white/30'
                }`}>
                  {msg.sender}
                </span>
                <span className="text-[10px] text-white/20">{formatTime(msg.timestamp)}</span>
              </div>
              <div className={`px-3 py-2 text-xs leading-relaxed ${
                msg.senderRole === 'engineer'
                  ? 'bg-cyan/5 border border-cyan/10 text-white/70'
                  : msg.senderRole === 'coordinator'
                  ? 'bg-purple/5 border border-purple/10 text-white/70'
                  : 'bg-white/[0.02] border border-white/5 text-white/40 italic'
              }`}>
                {msg.content}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="border-t border-white/5 p-2">
        <div className="flex items-center gap-2 mb-2">
          <button className="p-1 text-white/20 hover:text-white/40 transition-colors">
            <Paperclip className="w-3 h-3" />
          </button>
          <button className="p-1 text-white/20 hover:text-white/40 transition-colors">
            <Smile className="w-3 h-3" />
          </button>
          <span className="text-[10px] text-white/20">All messages logged for audit</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Message coordinator..."
            className="flex-1 bg-black/30 border border-white/10 text-xs text-white/70 px-3 py-2 outline-none placeholder:text-white/20 focus:border-lime/30 transition-colors"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim()}
            className="p-2 bg-lime/10 border border-lime/30 text-lime hover:bg-lime/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Send className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
