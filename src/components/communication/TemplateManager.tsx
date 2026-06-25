// ═══════════════════════════════════════════════════════════════
// TEMPLATE MANAGER + EDITOR
// CRUD for message templates with variable substitution
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import { FileText, Edit2, Eye, Save, X, ToggleLeft, ToggleRight, Mail, Smartphone, LayoutDashboard } from 'lucide-react';
import type { MessageTemplate, TemplateCategory } from './types';
import { CHANNEL_COLORS } from './types';

interface TemplateManagerProps {
  templates: MessageTemplate[];
  selected: MessageTemplate | null;
  onSelect: (t: MessageTemplate | null) => void;
  onUpdate: (id: string, updates: Partial<MessageTemplate>) => void;
  onToggle: (id: string) => void;
}

const categoryColors: Record<TemplateCategory, string> = {
  transactional: 'text-cyan bg-cyan/10 border-cyan/20',
  marketing: 'text-purple-400 bg-purple/10 border-purple/20',
  alert: 'text-red-400 bg-red/10 border-red/20',
  internal: 'text-white/40 bg-white/5 border-white/10',
  follow_up: 'text-yellow-400 bg-yellow/10 border-yellow/20',
  security: 'text-orange-400 bg-orange/10 border-orange/20',
};

export function TemplateManager({ templates, selected, onSelect, onUpdate, onToggle }: TemplateManagerProps) {
  const [filterCategory, setFilterCategory] = useState<TemplateCategory | 'all'>('all');

  const filtered = filterCategory === 'all' ? templates : templates.filter(t => t.category === filterCategory);

  return (
    <div className="bg-surface border border-white/5">
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-purple-400" />
            Templates ({templates.length})
          </h3>
          <div className="flex gap-1">
            {(['all', 'transactional', 'alert', 'follow_up', 'security', 'marketing'] as const).map(c => (
              <button key={c} onClick={() => setFilterCategory(c)} className={`px-2 py-1 text-[10px] font-bold uppercase border transition-colors ${filterCategory === c ? 'bg-lime/10 text-lime border-lime/30' : 'bg-white/5 text-white/30 border-white/10'}`}>
                {c === 'all' ? 'ALL' : c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {selected ? (
        <TemplateEditor template={selected} onSave={onUpdate} onClose={() => onSelect(null)} />
      ) : (
        <div className="divide-y divide-white/5">
          {filtered.map(t => (
            <button key={t.id} className="w-full flex items-center gap-3 p-3 text-left hover:bg-white/[0.01] transition-colors" onClick={() => onSelect(t)}>
              <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center border" style={{ borderColor: `${CHANNEL_COLORS[t.channels[0]]}30`, backgroundColor: `${CHANNEL_COLORS[t.channels[0]]}10` }}>
                {t.channels.includes('email') ? <Mail className="w-4 h-4" style={{ color: CHANNEL_COLORS.email }} /> :
                 t.channels.includes('sms') ? <Smartphone className="w-4 h-4" style={{ color: CHANNEL_COLORS.sms }} /> :
                 <LayoutDashboard className="w-4 h-4" style={{ color: CHANNEL_COLORS.dashboard }} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white/70">{t.name}</span>
                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 border ${categoryColors[t.category]}`}>{t.category}</span>
                </div>
                <div className="text-[10px] text-white/30 truncate mt-0.5">{t.subject}</div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[10px] text-white/20 font-mono">{t.useCount} uses</span>
                <button onClick={e => { e.stopPropagation(); onToggle(t.id); }} className="text-white/20 hover:text-white/40 transition-colors">
                  {t.enabled ? <ToggleRight className="w-5 h-5 text-lime" /> : <ToggleLeft className="w-5 h-5 text-white/20" />}
                </button>
                <Edit2 className="w-3 h-3 text-white/20" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TemplateEditor({ template, onSave, onClose }: { template: MessageTemplate; onSave: (id: string, u: Partial<MessageTemplate>) => void; onClose: () => void }) {
  const [subject, setSubject] = useState(template.subject);
  const [body, setBody] = useState(template.body);
  const [preview, setPreview] = useState(false);

  const previewBody = body
    .replace(/{{TICKET_ID}}/g, 'ESC-2049')
    .replace(/{{WEBSITE}}/g, 'acme-corp.com')
    .replace(/{{AMOUNT}}/g, '299')
    .replace(/{{VERIFY_URL}}/g, 'https://uptimeops.app/fix/abc123')
    .replace(/{{EXTRA_TIME}}/g, '30 min')
    .replace(/{{MONTH}}/g, 'June 2024')
    .replace(/{{SCORE}}/g, '87')
    .replace(/{{PLAN}}/g, 'Sentinel')
    .replace(/{{SEVERITY}}/g, 'MEDIUM')
    .replace(/{{ACTION}}/g, 'Auto-patched');

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Edit2 className="w-4 h-4 text-cyan" />
          <span className="text-xs font-bold uppercase">Edit Template</span>
          <span className="text-[10px] text-white/30 font-mono">{template.id}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setPreview(!preview)} className={`flex items-center gap-1 px-2 py-1 text-[10px] font-bold border transition-colors ${preview ? 'bg-lime/10 text-lime border-lime/30' : 'bg-white/5 text-white/40 border-white/10'}`}>
            <Eye className="w-3 h-3" />
            {preview ? 'EDIT' : 'PREVIEW'}
          </button>
          <button onClick={() => { onSave(template.id, { subject, body }); onClose(); }} className="flex items-center gap-1 px-3 py-1.5 bg-lime/10 border border-lime/30 text-lime text-xs font-bold hover:bg-lime/20 transition-colors">
            <Save className="w-3 h-3" />
            SAVE
          </button>
          <button onClick={onClose} className="p-1 text-white/30 hover:text-white/60 transition-colors"><X className="w-4 h-4" /></button>
        </div>
      </div>

      <div>
        <label className="text-[10px] text-white/30 uppercase tracking-wider mb-1 block">Subject</label>
        <input value={subject} onChange={e => setSubject(e.target.value)} className="w-full bg-black/30 border border-white/10 text-xs text-white/70 px-3 py-2 outline-none focus:border-lime/30" />
      </div>

      <div>
        <label className="text-[10px] text-white/30 uppercase tracking-wider mb-1 block">{preview ? 'Preview' : 'Body'}</label>
        {preview ? (
          <div className="bg-black/20 border border-white/5 p-3 text-xs text-white/60 leading-relaxed whitespace-pre-wrap">{previewBody}</div>
        ) : (
          <textarea value={body} onChange={e => setBody(e.target.value)} className="w-full bg-black/30 border border-white/10 text-xs text-white/70 px-3 py-2 outline-none focus:border-lime/30 min-h-[120px] resize-none" />
        )}
      </div>

      {!preview && (
        <div>
          <label className="text-[10px] text-white/30 uppercase tracking-wider mb-2 block">Variables — click to insert</label>
          <div className="flex flex-wrap gap-1">
            {template.variables.map(v => (
              <button key={v} onClick={() => setBody(prev => prev + `{{${v.toUpperCase()}}}`)} className="text-[10px] font-mono px-2 py-1 bg-cyan/5 border border-cyan/20 text-cyan/60 hover:border-cyan/40 transition-colors">
                {'{{'}{v.toUpperCase()}{'}}'}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
