// ═══════════════════════════════════════════════════════════════
// HQ COMMS CENTER — Operational Command Desk
// Dual-pane: priority-sorted conversation list + markdown chat canvas
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react';
import {
  MessageSquare, Send, Paperclip, Clock, AlertTriangle,
  CheckCircle2, BarChart3, Bold, Italic, Code
} from 'lucide-react';

interface Conversation {
  id: string;
  title: string;
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  customer: string;
  tier: string;
  unread: number;
  lastMessage: string;
  updatedAt: string;
  status: 'open' | 'resolved' | 'escalated';
}

interface ChatMessage {
  id: string;
  sender: 'agent' | 'customer' | 'system';
  content: string;
  timestamp: string;
  attachments?: string[];
}

const PRIORITY_CONFIG = {
  P1: { color: 'text-rose bg-rose-dim border-rose/30', label: 'CRITICAL' },
  P2: { color: 'text-magenta bg-magenta-dim border-magenta/30', label: 'HIGH' },
  P3: { color: 'text-cyan bg-cyan-dim border-cyan/30', label: 'MEDIUM' },
  P4: { color: 'text-lime bg-lime-dim border-lime/30', label: 'LOW' },
};

const MOCK_CONVERSATIONS: Conversation[] = [
  { id: 'conv-1', title: 'Site down — 502 errors', priority: 'P1', customer: 'TechFlow Inc', tier: 'Fortress', unread: 3, lastMessage: 'Engineer Alex is on it. ETA 5 min.', updatedAt: new Date(Date.now() - 120000).toISOString(), status: 'escalated' },
  { id: 'conv-2', title: 'SSL certificate renewal', priority: 'P2', customer: 'DataVault Corp', tier: 'Sentinel', unread: 1, lastMessage: 'Cert deployed successfully.', updatedAt: new Date(Date.now() - 900000).toISOString(), status: 'open' },
  { id: 'conv-3', title: 'Database connection pool', priority: 'P2', customer: 'CloudMesh', tier: 'Fortress', unread: 0, lastMessage: 'Pool size increased to 50.', updatedAt: new Date(Date.now() - 1800000).toISOString(), status: 'resolved' },
  { id: 'conv-4', title: 'CDN cache invalidation', priority: 'P3', customer: 'PixelForge', tier: 'Guardian', unread: 2, lastMessage: 'Purge request submitted.', updatedAt: new Date(Date.now() - 3600000).toISOString(), status: 'open' },
  { id: 'conv-5', title: 'Monitoring alert config', priority: 'P4', customer: 'StartUpXYZ', tier: 'Guardian', unread: 0, lastMessage: 'Thresholds updated.', updatedAt: new Date(Date.now() - 7200000).toISOString(), status: 'resolved' },
  { id: 'conv-6', title: 'API rate limiting issue', priority: 'P1', customer: 'ScaleFast', tier: 'Sentinel', unread: 5, lastMessage: 'DDoS mitigation activated.', updatedAt: new Date(Date.now() - 60000).toISOString(), status: 'escalated' },
];

const MOCK_MESSAGES: Record<string, ChatMessage[]> = {
  'conv-1': [
    { id: 'm1', sender: 'customer', content: 'Our main site is returning 502 Bad Gateway. This is critical.', timestamp: new Date(Date.now() - 600000).toISOString() },
    { id: 'm2', sender: 'system', content: '\\`\\`\\`\\nALERT: P1 Incident triggered\\nURL: https://techflow.io\\nError: 502 Bad Gateway\\nScanners: 2/42 flagged\\n\\`\\`\\`', timestamp: new Date(Date.now() - 580000).toISOString() },
    { id: 'm3', sender: 'agent', content: 'Acknowledged. Triaging now. Initial scan shows upstream timeout from the API gateway.', timestamp: new Date(Date.now() - 550000).toISOString() },
    { id: 'm4', sender: 'agent', content: '**Update**: Issue isolated to the load balancer health check failure. Rotating to backup nodes.', timestamp: new Date(Date.now() - 300000).toISOString() },
    { id: 'm5', sender: 'agent', content: '/escalate Engineer Alex — on-call primary', timestamp: new Date(Date.now() - 180000).toISOString() },
    { id: 'm6', sender: 'system', content: 'Escalation sent to Alex Chen (on-call primary) via OpsGenie.', timestamp: new Date(Date.now() - 175000).toISOString() },
    { id: 'm7', sender: 'agent', content: 'Engineer Alex is on it. ETA 5 min.', timestamp: new Date(Date.now() - 120000).toISOString() },
  ],
  'conv-2': [
    { id: 'm1', sender: 'customer', content: 'SSL cert expires tomorrow. Need renewal.', timestamp: new Date(Date.now() - 1000000).toISOString() },
    { id: 'm2', sender: 'agent', content: 'Processing auto-renewal via Let\'s Encrypt. Stand by.', timestamp: new Date(Date.now() - 950000).toISOString() },
    { id: 'm3', sender: 'agent', content: 'Cert deployed successfully.', timestamp: new Date(Date.now() - 900000).toISOString() },
  ],
};

export function HQCommunications() {
  const [conversations] = useState<Conversation[]>(MOCK_CONVERSATIONS);
  const [activeConv, setActiveConv] = useState<string>('conv-1');
  const [messages, setMessages] = useState<ChatMessage[]>(MOCK_MESSAGES['conv-1'] || []);
  const [input, setInput] = useState('');
  const [showMarkdownHelp, setShowMarkdownHelp] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const active = conversations.find(c => c.id === activeConv);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    const newMsg: ChatMessage = { id: `m-${Date.now()}`, sender: 'agent', content: input, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, newMsg]);
    setInput('');

    // Handle slash commands
    if (input.startsWith('/escalate')) {
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: `sys-${Date.now()}`, sender: 'system',
          content: `Escalation triggered: ${input.slice(10) || 'On-call engineer'} has been paged via OpsGenie.`,
          timestamp: new Date().toISOString(),
        }]);
      }, 500);
    }
    if (input.startsWith('/resolve')) {
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: `sys-${Date.now()}`, sender: 'system',
          content: 'Incident marked as resolved. Audit trail updated with SHA-256 hash.',
          timestamp: new Date().toISOString(),
        }]);
      }, 500);
    }
  };

  const switchConversation = (id: string) => {
    setActiveConv(id);
    setMessages(MOCK_MESSAGES[id] || [
      { id: 'm1', sender: 'system', content: 'Conversation history loaded.', timestamp: new Date().toISOString() },
    ]);
  };

  const insertMarkdown = (syntax: string) => {
    setInput(prev => prev + syntax);
  };

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-text-primary flex items-center gap-2"><MessageSquare className="w-6 h-6 text-magenta" /> COMMS CENTER</h1>
          <p className="text-xs text-text-muted mt-1 font-mono">Operational command desk — {conversations.filter(c => c.unread > 0).length} unread</p>
        </div>
      </div>

      {/* Dual-Pane Layout */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Left: Conversation List */}
        <div className="w-72 shrink-0 glass-surface rounded-xl flex flex-col overflow-hidden">
          <div className="p-3 border-b border-surface-border">
            <div className="flex items-center gap-2 text-[10px] text-text-muted uppercase font-bold tracking-wider">
              <BarChart3 className="w-3 h-3" /> Conversations
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {conversations.sort((a, b) => {
              const prioOrder = { P1: 0, P2: 1, P3: 2, P4: 3 };
              return prioOrder[a.priority] - prioOrder[b.priority];
            }).map(conv => (
              <button
                key={conv.id}
                onClick={() => switchConversation(conv.id)}
                className={`w-full text-left p-3 rounded-lg transition-all ${activeConv === conv.id ? 'bg-cyan-dim border border-cyan/30' : 'hover:bg-void-light/50 border border-transparent'}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${PRIORITY_CONFIG[conv.priority].color}`}>
                    {conv.priority}
                  </span>
                  {conv.unread > 0 && <span className="w-5 h-5 rounded-full bg-rose text-white text-[9px] font-black flex items-center justify-center">{conv.unread}</span>}
                </div>
                <div className="text-xs font-semibold text-text-primary truncate">{conv.title}</div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[9px] text-text-muted">{conv.customer}</span>
                  <span className="text-[9px] text-text-muted font-mono">{timeAgo(conv.updatedAt)}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Chat Canvas */}
        <div className="flex-1 glass-surface rounded-xl flex flex-col overflow-hidden">
          {active ? (
            <>
              {/* Chat Header */}
              <div className="px-4 py-3 border-b border-surface-border flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${PRIORITY_CONFIG[active.priority].color}`}>{active.priority}</span>
                  <div>
                    <div className="text-sm font-bold text-text-primary">{active.title}</div>
                    <div className="text-[10px] text-text-muted">{active.customer} — {active.tier}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`flex items-center gap-1 text-[10px] font-bold uppercase ${active.status === 'resolved' ? 'text-lime' : active.status === 'escalated' ? 'text-rose' : 'text-cyan'}`}>
                    {active.status === 'resolved' ? <CheckCircle2 className="w-3 h-3" /> : active.status === 'escalated' ? <AlertTriangle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                    {active.status}
                  </span>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.sender === 'agent' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] ${msg.sender === 'system' ? 'w-full' : ''}`}>
                      {msg.sender === 'system' ? (
                        <div className="text-center py-1">
                          <span className="inline-block px-3 py-1 bg-void-light border border-surface-border rounded-full text-[10px] text-text-muted font-mono">
                            {msg.content}
                          </span>
                        </div>
                      ) : (
                        <div className={`p-3 rounded-xl ${msg.sender === 'agent' ? 'bg-cyan-dim border border-cyan/20 text-text-primary' : 'bg-void-light border border-surface-border/50 text-text-secondary'}`}>
                          <div className="text-xs whitespace-pre-wrap leading-relaxed">{formatMessage(msg.content)}</div>
                          <div className="text-[9px] text-text-muted mt-1.5 text-right font-mono">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-3 border-t border-surface-border shrink-0">
                {/* Markdown Toolbar */}
                <div className="flex items-center gap-1 mb-2 px-1">
                  <button onClick={() => insertMarkdown('**bold**')} className="p-1 text-text-muted hover:text-cyan transition-colors" title="Bold"><Bold className="w-3 h-3" /></button>
                  <button onClick={() => insertMarkdown('*italic*')} className="p-1 text-text-muted hover:text-cyan transition-colors" title="Italic"><Italic className="w-3 h-3" /></button>
                  <button onClick={() => insertMarkdown('`code`')} className="p-1 text-text-muted hover:text-cyan transition-colors" title="Code"><Code className="w-3 h-3" /></button>
                  <div className="flex-1" />
                  <button onClick={() => setShowMarkdownHelp(!showMarkdownHelp)} className="text-[9px] text-text-muted hover:text-text-primary font-bold">/commands</button>
                </div>

                {/* Slash commands help */}
                {showMarkdownHelp && (
                  <div className="mb-2 p-2 bg-void-light border border-surface-border rounded text-[10px] space-y-1">
                    <div className="text-text-muted"><span className="text-cyan font-bold">/escalate</span> [engineer] — Page via OpsGenie</div>
                    <div className="text-text-muted"><span className="text-cyan font-bold">/resolve</span> — Mark incident resolved</div>
                    <div className="text-text-muted"><span className="text-cyan font-bold">/status</span> — Update incident status</div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <label className="p-2 text-text-muted hover:text-cyan cursor-pointer transition-colors">
                    <Paperclip className="w-4 h-4" />
                    <input type="file" className="hidden" />
                  </label>
                  <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                    placeholder="Type a message... Use /escalate or /resolve"
                    className="flex-1 bg-void-light border border-surface-border rounded-lg px-3 py-2 text-xs text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-cyan"
                  />
                  <button onClick={handleSend} disabled={!input.trim()} className="p-2 bg-lime text-void-dark rounded-lg hover:bg-lime-light transition-colors disabled:opacity-30">
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-text-muted text-sm">Select a conversation</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Helpers ──
function formatMessage(content: string): React.ReactNode {
  // Simple markdown-like formatting
  const parts = content.split(/(\*\*.*?\*\*|\\`.*?\\`|\/\w+(?:\s.*)?)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} className="text-text-primary">{part.slice(2, -2)}</strong>;
    if (part.startsWith('`') && part.endsWith('`')) return <code key={i} className="px-1 py-0.5 bg-void-deep rounded text-[10px] font-mono text-cyan">{part.slice(1, -1)}</code>;
    if (part.startsWith('/')) return <span key={i} className="text-cyan font-bold">{part}</span>;
    return part;
  });
}

function timeAgo(date: string) { const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000); if (s < 60) return `${s}s`; if (s < 3600) return `${Math.floor(s / 60)}m`; return `${Math.floor(s / 3600)}h`; }
