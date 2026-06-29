// ═══════════════════════════════════════════════════════════════
// CUSTOMER COMMUNICATION TEMPLATES
// Pre-approved status update templates for engineers
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import { Copy, Check, Send, Mail, Clock, AlertTriangle, CheckCircle, Wrench } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

interface Template {
  id: string;
  label: string;
  icon: React.ElementType;
  iconColor: string;
  subject: string;
  body: string;
}

const TEMPLATES: Template[] = [
  {
    id: 'investigating',
    label: 'Investigating',
    icon: Clock,
    iconColor: 'text-yellow-400',
    subject: '[UptimeOps] Issue Under Investigation — {{WEBSITE}}',
    body: `Hello {{CUSTOMER_NAME}},

Our monitoring systems detected an issue with {{WEBSITE}} at approximately {{TIME}} UTC. A senior engineer is now actively investigating the root cause.

What we know so far:
• Issue category: {{ISSUE_TYPE}}
• Severity: {{SEVERITY}}
• Status: Under investigation
• Engineer assigned: {{ENGINEER_NAME}}

We will update you within 15 minutes with our findings.

Incident ID: {{INCIDENT_ID}}

—
UptimeOps Engineering Team`,
  },
  {
    id: 'identified',
    label: 'Root Cause Identified',
    icon: AlertTriangle,
    iconColor: 'text-orange-400',
    subject: '[UptimeOps] Root Cause Identified — {{WEBSITE}}',
    body: `Hello {{CUSTOMER_NAME}},

We have identified the root cause of the issue affecting {{WEBSITE}}.

Root cause: {{ROOT_CAUSE}}
Impact: {{IMPACT_DESCRIPTION}}

Our engineer {{ENGINEER_NAME}} is now implementing a fix. We expect resolution within {{ETA}}.

We will notify you once the fix has been deployed and verified.

Incident ID: {{INCIDENT_ID}}

—
UptimeOps Engineering Team`,
  },
  {
    id: 'fix-deployed',
    label: 'Fix Deployed',
    icon: Wrench,
    iconColor: 'text-cyan',
    subject: '[UptimeOps] Fix Deployed — {{WEBSITE}}',
    body: `Hello {{CUSTOMER_NAME}},

We have deployed a fix for the issue affecting {{WEBSITE}}.

Fix applied: {{FIX_DESCRIPTION}}
Deployment time: {{TIME}} UTC
Verification: All health checks passing

Our team will continue monitoring for the next 30 minutes to ensure stability.

Please reply if you notice any remaining issues.

Incident ID: {{INCIDENT_ID}}

—
UptimeOps Engineering Team`,
  },
  {
    id: 'resolved',
    label: 'Resolved',
    icon: CheckCircle,
    iconColor: 'text-green-400',
    subject: '[UptimeOps] Issue Resolved — {{WEBSITE}}',
    body: `Hello {{CUSTOMER_NAME}},

The issue affecting {{WEBSITE}} has been fully resolved.

Resolution summary:
• Root cause: {{ROOT_CAUSE}}
• Fix applied: {{FIX_DESCRIPTION}}
• Downtime: {{DOWNTIME}}
• Resolved at: {{TIME}} UTC

All systems are operating normally. Our team will continue monitoring.

A full incident report will be available in your dashboard within 1 hour.

Incident ID: {{INCIDENT_ID}}

—
UptimeOps Engineering Team`,
  },
  {
    id: 'escalated',
    label: 'Escalated to Human',
    icon: AlertTriangle,
    iconColor: 'text-magenta',
    subject: '[UptimeOps] Escalated to Senior Engineer — {{WEBSITE}}',
    body: `Hello {{CUSTOMER_NAME}},

Our AI automation system attempted initial remediation for the issue on {{WEBSITE}}. Due to the complexity of this issue, it has been escalated to one of our senior engineers.

Escalation reason: {{ESCALATION_REASON}}
Assigned engineer: {{ENGINEER_NAME}}
Specialty: {{ENGINEER_SPECIALTY}}

You can expect:
• Initial assessment: Within 10 minutes
• Regular updates: Every 15 minutes
• Resolution target: Per your SLA ({{SLA}})

We appreciate your patience.

Incident ID: {{INCIDENT_ID}}

—
UptimeOps Engineering Team`,
  },
];

const VARIABLES = [
  { key: '{{WEBSITE}}', example: 'acme-corp.com' },
  { key: '{{CUSTOMER_NAME}}', example: 'Acme Corp Team' },
  { key: '{{TIME}}', example: '14:45 UTC' },
  { key: '{{ISSUE_TYPE}}', example: 'Database connection pool exhaustion' },
  { key: '{{SEVERITY}}', example: 'P1 - Critical' },
  { key: '{{ENGINEER_NAME}}', example: 'Alex Chen' },
  { key: '{{INCIDENT_ID}}', example: 'ESC-2049' },
  { key: '{{ROOT_CAUSE}}', example: 'Connection leak in error handling path' },
  { key: '{{IMPACT_DESCRIPTION}}', example: 'API responses timing out, checkout affected' },
  { key: '{{ETA}}', example: '30 minutes' },
  { key: '{{FIX_DESCRIPTION}}', example: 'Added pool.release() in catch block' },
  { key: '{{DOWNTIME}}', example: '12 minutes' },
  { key: '{{ESCALATION_REASON}}', example: 'AI confidence below threshold, requires code review' },
  { key: '{{ENGINEER_SPECIALTY}}', example: 'Database Systems' },
  { key: '{{SLA}}', example: '15 min response, 1 hr resolution' },
];

interface CommTemplatesProps {
  incidentId: string;
  websiteUrl?: string;
}

export function CommTemplates({ incidentId }: CommTemplatesProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<Template>(TEMPLATES[0]);
  const [customizedBody, setCustomizedBody] = useState(TEMPLATES[0].body);
  const [customizedSubject, setCustomizedSubject] = useState(TEMPLATES[0].subject);
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplate(template);
    setCustomizedBody(template.body);
    setCustomizedSubject(template.subject);
    setShowPreview(false);
  };

  const renderPreview = (text: string) => {
    return text.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const variable = VARIABLES.find(v => v.key === `{{${key}}}`);
      return `<span class="text-cyan font-bold">${variable ? variable.example : match}</span>`;
    }).replace(/\n/g, '<br/>');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(`Subject: ${customizedSubject}\n\n${customizedBody}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-surface border border-white/10 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-lime" />
          <span className="text-xs font-bold">Comm Templates</span>
          <span className="text-[10px] text-white/30 font-mono">{incidentId}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={`text-[10px] px-2 py-1 border transition-colors ${
              showPreview ? 'bg-lime/10 text-lime border-lime/30' : 'bg-white/5 text-white/40 border-white/10'
            }`}
          >
            {showPreview ? 'EDIT' : 'PREVIEW'}
          </button>
        </div>
      </div>

      {/* Template Selector */}
      <div className="flex border-b border-white/5 overflow-x-auto">
        {TEMPLATES.map((template) => (
          <button
            key={template.id}
            onClick={() => handleTemplateSelect(template)}
            className={`flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold whitespace-nowrap border-r border-white/5 transition-colors ${
              selectedTemplate.id === template.id
                ? 'bg-lime/5 text-lime border-b-2 border-b-lime'
                : 'text-white/30 hover:text-white/60'
            }`}
          >
            <template.icon className={`w-3 h-3 ${template.iconColor}`} />
            {template.label.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-[250px]">
        {/* Subject */}
        <div className="p-3 border-b border-white/5">
          <label className="text-[10px] text-white/30 uppercase tracking-wider mb-1 block">Subject</label>
          {showPreview ? (
            <div
              className="text-xs text-white/70 font-mono"
              dangerouslySetInnerHTML={{ __html: renderPreview(customizedSubject) }}
            />
          ) : (
            <input
              value={customizedSubject}
              onChange={(e) => setCustomizedSubject(e.target.value)}
              className="w-full bg-black/30 border border-white/10 text-xs text-white/70 px-2 py-1.5 outline-none focus:border-lime/30 font-mono"
            />
          )}
        </div>

        {/* Body */}
        <div className="p-3">
          <label className="text-[10px] text-white/30 uppercase tracking-wider mb-1 block">Body</label>
          {showPreview ? (
            <div
              className="text-xs text-white/70 leading-relaxed whitespace-pre-wrap font-mono"
              dangerouslySetInnerHTML={{ __html: renderPreview(customizedBody) }}
            />
          ) : (
            <textarea
              value={customizedBody}
              onChange={(e) => setCustomizedBody(e.target.value)}
              className="w-full bg-black/30 border border-white/10 text-xs text-white/70 px-2 py-1.5 outline-none focus:border-lime/30 font-mono min-h-[200px] resize-none"
            />
          )}
        </div>

        {/* Variables Reference */}
        <div className="px-3 pb-3">
          <label className="text-[10px] text-white/30 uppercase tracking-wider mb-2 block">Available Variables</label>
          <div className="flex flex-wrap gap-1">
            {VARIABLES.map(v => (
              <button
                key={v.key}
                onClick={() => setCustomizedBody(prev => prev + v.key)}
                className="text-[10px] font-mono px-1.5 py-0.5 bg-cyan/5 border border-cyan/20 text-cyan/60 hover:border-cyan/40 transition-colors"
                title={`Example: ${v.example}`}
              >
                {v.key}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="px-3 py-2 border-t border-white/5 bg-black/10 flex items-center gap-2">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 text-white/60 text-xs hover:border-white/20 transition-colors"
        >
          {copied ? <Check className="w-3 h-3 text-lime" /> : <Copy className="w-3 h-3" />}
          {copied ? 'COPIED' : 'COPY'}
        </button>
        <button
          onClick={() => {
            // Insert communication log entry
            supabase.from('communications_log').insert({
              incident_id: incidentId,
              channel: 'email',
              direction: 'outbound',
              subject: customizedSubject,
              content: customizedBody,
              status: 'sent',
            });
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-lime/10 border border-lime/30 text-lime text-xs hover:bg-lime/20 transition-colors"
        >
          <Send className="w-3 h-3" />
          SEND TO CUSTOMER
        </button>
        <span className="text-[10px] text-white/20 ml-auto">Pre-approved template</span>
      </div>
    </div>
  );
}
