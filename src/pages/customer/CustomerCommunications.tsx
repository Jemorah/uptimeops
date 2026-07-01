// ═══════════════════════════════════════════════════════════════════════════════
// CUSTOMER COMMUNICATIONS v2.5 — Secure Inbox
// Realtime threads per incident. HQ Coordinator mediated. No direct engineer contact.
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import {
  MessageSquare,
  Send,
  Search,
  Shield,
  Paperclip
} from 'lucide-react';
import { Input } from '@/components/ui/input';

interface Thread {
  id: string;
  incident_id: string;
  incident_title: string;
  severity: string;
  unread: number;
  last_message: string;
  last_at: string;
  status: string;
}

interface Message {
  id: string;
  thread_id: string;
  sender: 'customer' | 'coordinator' | 'system' | 'engineer';
  sender_name: string;
  content: string;
  created_at: string;
  attachments?: string[];
}

const MOCK_THREADS: Thread[] = [
  { id: 'th1', incident_id: 'INC-2024-001847', incident_title: 'SSL Certificate Expiry on API Gateway', severity: 'critical', unread: 2, last_message: 'Deployment successful. Please review and approve.', last_at: new Date(Date.now() - 1800000).toISOString(), status: 'deployed' },
  { id: 'th2', incident_id: 'INC-2024-001846', incident_title: 'Database Connection Pool Exhaustion', severity: 'high', unread: 0, last_message: 'Repair agent is generating the patch now.', last_at: new Date(Date.now() - 7200000).toISOString(), status: 'repaired' },
  { id: 'th3', incident_id: 'INC-2024-001845', incident_title: 'Edge Function Cold Start Degradation', severity: 'medium', unread: 1, last_message: 'Incident triaged as P3 Medium. Triage agent active.', last_at: new Date(Date.now() - 10800000).toISOString(), status: 'triaged' },
];

const MOCK_MESSAGES: Record<string, Message[]> = {
  th1: [
    { id: 'm1', thread_id: 'th1', sender: 'system', sender_name: 'System', content: 'Incident INC-2024-001847 has been submitted to the autonomous pipeline.', created_at: new Date(Date.now() - 3600000).toISOString() },
    { id: 'm2', thread_id: 'th1', sender: 'coordinator', sender_name: 'Sarah (HQ Coordinator)', content: 'We have triaged this as P1 Critical — SSL expiry within 18 hours. The repair agent is generating a new certificate now.', created_at: new Date(Date.now() - 3000000).toISOString() },
    { id: 'm3', thread_id: 'th1', sender: 'system', sender_name: 'System', content: 'Patch generated with 96% confidence. Auto-approved for deployment (>95% threshold).', created_at: new Date(Date.now() - 2400000).toISOString() },
    { id: 'm4', thread_id: 'th1', sender: 'coordinator', sender_name: 'Sarah (HQ Coordinator)', content: 'Deployment successful. Please review the fix and approve or reject below.', created_at: new Date(Date.now() - 1800000).toISOString() },
  ],
  th2: [
    { id: 'm5', thread_id: 'th2', sender: 'system', sender_name: 'System', content: 'Incident INC-2024-001846 submitted.', created_at: new Date(Date.now() - 10000000).toISOString() },
    { id: 'm6', thread_id: 'th2', sender: 'coordinator', sender_name: 'Marcus (HQ Coordinator)', content: 'P2 High — connection pool exhaustion. Isolate agent provisioning sandbox.', created_at: new Date(Date.now() - 8400000).toISOString() },
  ],
};

const SENDER_COLORS: Record<string, string> = { customer: '#a3e635', coordinator: '#22d3ee', system: '#94a3b8', engineer: '#e879f9' };
const SENDER_BG: Record<string, string> = { customer: 'rgba(163,230,53,0.08)', coordinator: 'rgba(34,211,238,0.08)', system: 'rgba(148,163,184,0.05)', engineer: 'rgba(232,121,249,0.08)' };

export function CustomerCommunications() {
  const [threads] = useState<Thread[]>(MOCK_THREADS);
  const [activeThread, setActiveThread] = useState<string>('th1');
  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES['th1'] || []);
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const active = threads.find(t => t.id === activeThread);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // Realtime subscription
  useEffect(() => {
    const ch = supabase.channel('communications').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'communications' }, (payload) => {
      const m = payload.new as Message;
      if (m.thread_id === activeThread) setMessages(p => [...p, m]);
    }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [activeThread]);

  const handleSend = () => {
    if (!input.trim()) return;
    const newMsg: Message = { id: `m${Date.now()}`, thread_id: activeThread, sender: 'customer', sender_name: 'You', content: input, created_at: new Date().toISOString() };
    setMessages(p => [...p, newMsg]);
    setInput('');
    setTimeout(() => {
      const reply: Message = { id: `m${Date.now() + 1}`, thread_id: activeThread, sender: 'coordinator', sender_name: 'Sarah (HQ Coordinator)', content: 'Thank you for your message. The HQ Coordinator will review and respond shortly.', created_at: new Date().toISOString() };
      setMessages(p => [...p, reply]);
    }, 2000);
  };

  const handleSwitchThread = (id: string) => {
    setActiveThread(id);
    setMessages(MOCK_MESSAGES[id] || []);
  };

  const filteredThreads = threads.filter(t => t.incident_title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="h-[calc(100vh-140px)] flex gap-0 bg-elevated/40 border border-white/5 rounded-xl overflow-hidden">
      {/* Thread Sidebar */}
      <div className="w-72 shrink-0 border-r border-white/5 flex flex-col">
        <div className="p-3 border-b border-white/5">
          <h2 className="text-xs font-black uppercase tracking-wider text-white/40 flex items-center gap-2 mb-2">
            <MessageSquare className="w-3.5 h-3.5" /> Conversations
          </h2>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/20" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="pl-7 bg-black/20 border-white/5 text-white text-[10px] h-7" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredThreads.map(t => {
            const sevColor = t.severity === 'critical' ? '#f43f5e' : t.severity === 'high' ? '#fb923c' : '#fbbf24';
            return (
              <button
                key={t.id}
                onClick={() => handleSwitchThread(t.id)}
                className={`w-full text-left p-3 border-b border-white/5 transition-all ${activeThread === t.id ? 'bg-white/[0.04] border-l-2 border-l-cyan' : 'hover:bg-white/[0.02]'}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[9px] font-mono text-white/25">{t.incident_id}</span>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sevColor }} />
                  {t.unread > 0 && <span className="ml-auto text-[8px] font-black text-white bg-magenta rounded-full w-4 h-4 flex items-center justify-center">{t.unread}</span>}
                </div>
                <p className="text-[10px] font-bold text-white/60 truncate">{t.incident_title}</p>
                <p className="text-[9px] text-white/25 truncate mt-0.5">{t.last_message}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Message Panel */}
      <div className="flex-1 flex flex-col">
        {active && (
          <>
            {/* Header */}
            <div className="p-3 border-b border-white/5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-cyan/10 flex items-center justify-center">
                <Shield className="w-4 h-4 text-cyan" />
              </div>
              <div>
                <p className="text-xs font-bold text-white/70">{active.incident_title}</p>
                <p className="text-[9px] text-white/30">{active.incident_id} · Mediated by HQ Coordinator</p>
              </div>
              <span className={`ml-auto text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${active.status === 'deployed' ? 'bg-lime/10 text-lime' : active.status === 'resolved' ? 'bg-cyan/10 text-cyan' : 'bg-amber/10 text-amber'}`}>
                {active.status}
              </span>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map(msg => {
                const isMe = msg.sender === 'customer';
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-xl px-3 py-2 ${isMe ? 'rounded-tr-sm' : 'rounded-tl-sm'}`} style={{ backgroundColor: SENDER_BG[msg.sender] }}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[9px] font-bold" style={{ color: SENDER_COLORS[msg.sender] }}>{msg.sender_name}</span>
                        <span className="text-[8px] text-white/20">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-[11px] text-white/70 leading-relaxed">{msg.content}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Composer */}
            <div className="p-3 border-t border-white/5">
              <div className="flex items-center gap-2">
                <button className="p-1.5 text-white/20 hover:text-white/40 transition-all" title="Attach file">
                  <Paperclip className="w-3.5 h-3.5" />
                </button>
                <Input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  placeholder="Message HQ Coordinator..."
                  className="flex-1 bg-black/20 border-white/5 text-white text-xs placeholder:text-white/15"
                />
                <button onClick={handleSend} className="p-2 bg-lime/10 text-lime rounded-lg hover:bg-lime/20 transition-all">
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[7px] text-white/10 mt-1 text-center">Direct engineer communication is not permitted. All messages routed through HQ Coordinator.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
