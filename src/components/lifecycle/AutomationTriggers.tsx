// ═══════════════════════════════════════════════════════════════
// AUTOMATION TRIGGERS ENGINE
// Rules-based automation with trigger conditions and actions
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import {
  Zap, ToggleLeft, ToggleRight, AlertTriangle,
  Clock, Shield, Bot, ArrowRight
} from 'lucide-react';

interface AutomationRule {
  id: string;
  name: string;
  trigger: string;
  condition: string;
  action: string;
  enabled: boolean;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'escalation' | 'notification' | 'auto_fix' | 'approval' | 'cleanup';
  lastFired: string | null;
  fireCount: number;
}

const DEFAULT_RULES: AutomationRule[] = [
  {
    id: 'rule-1', name: 'P1 Auto-Escalate', trigger: 'confidence < 70%', condition: 'severity = P1_CRITICAL',
    action: 'Immediately escalate to L3 engineer + SMS coordinator', enabled: true, severity: 'critical', category: 'escalation',
    lastFired: '2024-06-25T14:32:00Z', fireCount: 12,
  },
  {
    id: 'rule-2', name: 'Smoke Test Rollback', trigger: 'deploy smoke test fails', condition: 'any test = fail',
    action: 'Automatic rollback to pre-deploy snapshot + notify engineer', enabled: true, severity: 'critical', category: 'auto_fix',
    lastFired: '2024-06-24T09:15:00Z', fireCount: 3,
  },
  {
    id: 'rule-3', name: 'Customer No-Response Auto-Close', trigger: '24h after verification request', condition: 'no customer response',
    action: 'Auto-close incident + send follow-up email', enabled: true, severity: 'medium', category: 'cleanup',
    lastFired: '2024-06-23T16:00:00Z', fireCount: 28,
  },
  {
    id: 'rule-4', name: 'Double Failure Escalation', trigger: 'same issue type within 7 days', condition: 'previous incident same category',
    action: 'Escalate to L2+ engineer + flag for deep analysis', enabled: true, severity: 'high', category: 'escalation',
    lastFired: '2024-06-22T11:30:00Z', fireCount: 5,
  },
  {
    id: 'rule-5', name: 'Urgent Keyword Lead Alert', trigger: 'lead submission', condition: 'pain point contains "critical" OR "emergency" OR "down"',
    action: 'Auto-prompt emergency page + notify sales team', enabled: true, severity: 'high', category: 'notification',
    lastFired: '2024-06-25T14:28:00Z', fireCount: 47,
  },
  {
    id: 'rule-6', name: 'VM Session Timeout', trigger: 'VM idle for 30 min', condition: 'no engineer activity',
    action: 'Auto-save session state + notify engineer + 10-min warning', enabled: true, severity: 'medium', category: 'cleanup',
    lastFired: '2024-06-24T18:45:00Z', fireCount: 8,
  },
  {
    id: 'rule-7', name: 'SSL Expiry Warning', trigger: 'SSL expires in < 30 days', condition: 'subscription active',
    action: 'Create preventive incident + auto-renewal attempt', enabled: true, severity: 'high', category: 'auto_fix',
    lastFired: '2024-06-20T02:00:00Z', fireCount: 15,
  },
  {
    id: 'rule-8', name: 'Credential Auto-Expiry', trigger: 'credentials age > 48h', condition: 'incident closed',
    action: 'Auto-revoke credentials + purge from session storage', enabled: true, severity: 'medium', category: 'cleanup',
    lastFired: '2024-06-25T12:00:00Z', fireCount: 142,
  },
  {
    id: 'rule-9', name: 'Coordinator Approval Bypass', trigger: 'confidence >= 95%', condition: 'all tests pass + no security findings',
    action: 'Fast-track approval: single coordinator click required', enabled: false, severity: 'low', category: 'approval',
    lastFired: null, fireCount: 0,
  },
  {
    id: 'rule-10', name: 'Recurring Issue Auto-Subscription', trigger: '3+ one-time fixes for same site', condition: 'within 90 days',
    action: 'Recommend subscription upgrade to customer', enabled: true, severity: 'low', category: 'notification',
    lastFired: '2024-06-18T09:00:00Z', fireCount: 4,
  },
];

const categoryIcons = {
  escalation: AlertTriangle,
  notification: Zap,
  auto_fix: Bot,
  approval: Shield,
  cleanup: Clock,
};

const severityColors = {
  critical: 'text-red-400',
  high: 'text-orange-400',
  medium: 'text-yellow-400',
  low: 'text-white/40',
};

const severityBorders = {
  critical: 'border-red/20 bg-red/5',
  high: 'border-orange/20 bg-orange/5',
  medium: 'border-yellow/20 bg-yellow/5',
  low: 'border-white/10 bg-white/[0.02]',
};

export function AutomationTriggers() {
  const [rules, setRules] = useState<AutomationRule[]>(DEFAULT_RULES);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [expandedRule, setExpandedRule] = useState<string | null>(null);

  const toggleRule = (id: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const filtered = filterCategory === 'all' ? rules : rules.filter(r => r.category === filterCategory);
  const enabledCount = rules.filter(r => r.enabled).length;

  return (
    <div className="bg-surface border border-white/5">
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-4 h-4 text-lime" />
              Automation Triggers
            </h3>
            <p className="text-xs text-white/30 mt-1">{enabledCount}/{rules.length} rules active</p>
          </div>
          <div className="flex items-center gap-1">
            {(['all', 'escalation', 'notification', 'auto_fix', 'approval', 'cleanup'] as const).map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-2 py-1 text-[10px] font-bold uppercase border transition-colors ${
                  filterCategory === cat
                    ? 'bg-lime/10 text-lime border-lime/30'
                    : 'bg-white/5 text-white/30 border-white/10 hover:border-white/20'
                }`}
              >
                {cat === 'all' ? 'ALL' : cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto">
        {filtered.map((rule) => {
          const Icon = categoryIcons[rule.category];
          const isExpanded = expandedRule === rule.id;

          return (
            <div key={rule.id} className={`${severityBorders[rule.severity]}`}>
              <div
                className="flex items-center gap-3 p-3 cursor-pointer hover:bg-white/[0.01] transition-colors"
                onClick={() => setExpandedRule(isExpanded ? null : rule.id)}
              >
                <Icon className={`w-4 h-4 ${severityColors[rule.severity]} flex-shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white/70">{rule.name}</span>
                    <span className={`text-[9px] font-bold uppercase ${severityColors[rule.severity]}`}>
                      {rule.severity}
                    </span>
                  </div>
                  <div className="text-[10px] text-white/30 mt-0.5 truncate">{rule.trigger}</div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); toggleRule(rule.id); }}
                  className="flex-shrink-0"
                >
                  {rule.enabled ? (
                    <ToggleRight className="w-5 h-5 text-lime" />
                  ) : (
                    <ToggleLeft className="w-5 h-5 text-white/20" />
                  )}
                </button>
              </div>

              {isExpanded && (
                <div className="px-3 pb-3 pl-12 space-y-2">
                  <div className="flex items-center gap-2 text-xs">
                    <ArrowRight className="w-3 h-3 text-white/20" />
                    <span className="text-white/30">When:</span>
                    <span className="text-white/50">{rule.trigger}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <ArrowRight className="w-3 h-3 text-white/20" />
                    <span className="text-white/30">If:</span>
                    <span className="text-white/50">{rule.condition}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <ArrowRight className="w-3 h-3 text-white/20" />
                    <span className="text-white/30">Then:</span>
                    <span className="text-cyan">{rule.action}</span>
                  </div>
                  {rule.lastFired && (
                    <div className="text-[10px] text-white/20 mt-1">
                      Last fired: {new Date(rule.lastFired).toLocaleString()} — {rule.fireCount} times total
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
