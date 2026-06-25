// ═══════════════════════════════════════════════════════════════
// HQ COMMUNICATIONS PAGE
// Template management, comm log oversight, delivery monitoring
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import { Mail, FileText, BarChart3, Zap } from 'lucide-react';
import { useCommunicationSystem } from '@/hooks/useCommunicationSystem';
import { CommunicationMatrix } from '@/components/communication/CommunicationMatrix';
import { CommLogViewer } from '@/components/communication/CommLogViewer';
import { TemplateManager } from '@/components/communication/TemplateManager';
import { AutomationTriggers } from '@/components/lifecycle/AutomationTriggers';

type HQTab = 'templates' | 'log' | 'matrix' | 'automation';

const TABS: { key: HQTab; label: string; icon: React.ElementType }[] = [
  { key: 'templates', label: 'Templates', icon: FileText },
  { key: 'log', label: 'Comm Log', icon: Mail },
  { key: 'matrix', label: 'Matrix', icon: BarChart3 },
  { key: 'automation', label: 'Automation', icon: Zap },
];

export function HQCommunications() {
  const [activeTab, setActiveTab] = useState<HQTab>('templates');
  const comms = useCommunicationSystem();

  const stats = [
    { label: 'Templates', value: comms.templates.length, active: comms.templates.filter(t => t.enabled).length },
    { label: 'Messages Today', value: comms.stats.totalSent, color: 'text-cyan' },
    { label: 'Delivery Rate', value: `${comms.stats.totalSent > 0 ? Math.round((comms.stats.delivered / comms.stats.totalSent) * 100) : 0}%`, color: 'text-lime' },
    { label: 'Pending Retry', value: comms.stats.pendingRetry, color: 'text-yellow-400' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black tracking-tight">COMMUNICATIONS HQ</h2>
        <p className="text-sm text-white/40 mt-1">Template management, delivery monitoring, automation rules</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.label} className="bg-surface border border-white/5 p-3 text-center">
            <div className={`text-xl font-black font-mono ${'color' in s ? s.color : 'text-white'}`}>{s.value}</div>
            {'active' in s && <div className="text-[10px] text-lime">{s.active} active</div>}
            <div className="text-[10px] text-white/30 uppercase tracking-wider">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold uppercase border-b-2 transition-colors ${
              activeTab === tab.key ? 'border-lime text-lime' : 'border-transparent text-white/30 hover:text-white/50'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'templates' && (
        <TemplateManager
          templates={comms.templates}
          selected={comms.selectedTemplate}
          onSelect={comms.setSelectedTemplate}
          onUpdate={comms.updateTemplate}
          onToggle={comms.toggleTemplate}
        />
      )}

      {activeTab === 'log' && (
        <CommLogViewer logs={comms.logs} onRetry={comms.retryDelivery} />
      )}

      {activeTab === 'matrix' && (
        <CommunicationMatrix />
      )}

      {activeTab === 'automation' && (
        <AutomationTriggers />
      )}
    </div>
  );
}
