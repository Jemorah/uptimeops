// ═══════════════════════════════════════════════════════════════
// COMMUNICATION SYSTEM HOOK
// Manages comm logs, templates, delivery tracking, preferences
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback } from 'react';
import type {
  CommLogEntry, MessageTemplate, CommPreferences, CommStatus
} from '@/components/communication/types';

const DEFAULT_TEMPLATES: MessageTemplate[] = [
  { id: 'tpl-1', name: 'Payment Confirmed',     category: 'transactional', subject: 'Payment Received — UptimeOps',              body: 'Thank you! We\'ve received your payment. Ticket {{TICKET_ID}} has been created.', channels: ['email', 'sms'], variables: ['TICKET_ID', 'AMOUNT'], enabled: true, createdBy: 'System', createdAt: '2024-01-01', updatedAt: '2024-06-01', useCount: 1423 },
  { id: 'tpl-2', name: 'Ticket Received',       category: 'transactional', subject: 'Ticket Received — {{TICKET_ID}}',           body: 'We got your request for {{WEBSITE}}. An engineer will start work shortly.', channels: ['email'], variables: ['TICKET_ID', 'WEBSITE'], enabled: true, createdBy: 'System', createdAt: '2024-01-01', updatedAt: '2024-06-01', useCount: 2891 },
  { id: 'tpl-3', name: 'Fix In Progress',       category: 'transactional', subject: 'Repair Started — {{TICKET_ID}}',            body: 'Work has begun on your site. AI agents TRIAGE and ISOLATE are now active.', channels: ['sms', 'dashboard'], variables: ['TICKET_ID'], enabled: true, createdBy: 'System', createdAt: '2024-01-01', updatedAt: '2024-06-01', useCount: 2456 },
  { id: 'tpl-4', name: 'Critical Blocker',      category: 'alert',         subject: '⚠️ Delayed — {{TICKET_ID}}',                body: 'We hit a roadblock. A senior engineer has been assigned. ETA extended by {{EXTRA_TIME}}.', channels: ['sms', 'email'], variables: ['TICKET_ID', 'EXTRA_TIME'], enabled: true, createdBy: 'System', createdAt: '2024-01-01', updatedAt: '2024-06-01', useCount: 312 },
  { id: 'tpl-5', name: 'Fix Completed',         category: 'transactional', subject: '✅ Fix Ready — {{TICKET_ID}}',              body: 'Your fix has been deployed. Please verify: {{VERIFY_URL}}', channels: ['sms', 'email', 'dashboard'], variables: ['TICKET_ID', 'VERIFY_URL'], enabled: true, createdBy: 'System', createdAt: '2024-01-01', updatedAt: '2024-06-01', useCount: 2456 },
  { id: 'tpl-6', name: 'Verification Request',  category: 'follow_up',     subject: 'Is everything working? — {{TICKET_ID}}',   body: 'It\'s been 5 minutes since your fix. Please confirm your site is working correctly.', channels: ['email'], variables: ['TICKET_ID'], enabled: true, createdBy: 'System', createdAt: '2024-01-01', updatedAt: '2024-06-01', useCount: 2341 },
  { id: 'tpl-7', name: 'Link Expiry Warning',   category: 'follow_up',     subject: 'Your link expires in 24h — {{TICKET_ID}}', body: 'Your temporary dashboard access expires in 24 hours. Download your audit report now.', channels: ['email'], variables: ['TICKET_ID'], enabled: true, createdBy: 'System', createdAt: '2024-01-01', updatedAt: '2024-06-01', useCount: 1892 },
  { id: 'tpl-8', name: 'Link Expired',          category: 'follow_up',     subject: 'Link Expired — {{TICKET_ID}}',             body: 'Your temporary dashboard access has expired. Contact support for a reactivation.', channels: ['email'], variables: ['TICKET_ID'], enabled: true, createdBy: 'System', createdAt: '2024-01-01', updatedAt: '2024-06-01', useCount: 1567 },
  { id: 'tpl-9', name: 'Monthly Report',        category: 'marketing',     subject: 'Monthly Health Report — {{MONTH}}',        body: 'Your site health report for {{MONTH}} is ready. Security score: {{SCORE}}/100.', channels: ['email', 'dashboard'], variables: ['MONTH', 'SCORE'], enabled: true, createdBy: 'System', createdAt: '2024-01-01', updatedAt: '2024-06-01', useCount: 892 },
  { id: 'tpl-10', name: 'Security Alert',       category: 'security',      subject: '🔒 Security Alert — {{WEBSITE}}',          body: 'A security issue was detected on {{WEBSITE}}. Severity: {{SEVERITY}}. Action: {{ACTION}}.', channels: ['sms', 'email', 'dashboard'], variables: ['WEBSITE', 'SEVERITY', 'ACTION'], enabled: true, createdBy: 'System', createdAt: '2024-01-01', updatedAt: '2024-06-01', useCount: 234 },
  { id: 'tpl-11', name: 'Subscription Renewal', category: 'marketing',     subject: 'Renewal Reminder — {{PLAN}}',              body: 'Your {{PLAN}} subscription renews in 7 days. Amount: ${{AMOUNT}}.', channels: ['email'], variables: ['PLAN', 'AMOUNT'], enabled: true, createdBy: 'System', createdAt: '2024-01-01', updatedAt: '2024-06-01', useCount: 634 },
  { id: 'tpl-12', name: 'Credential Revoked',   category: 'security',      subject: 'Credentials Revoked — {{WEBSITE}}',        body: 'Your access credentials for {{WEBSITE}} have been revoked. Zero residual access remains.', channels: ['email', 'sms'], variables: ['WEBSITE'], enabled: true, createdBy: 'System', createdAt: '2024-01-01', updatedAt: '2024-06-01', useCount: 1423 },
];

const MOCK_LOGS: CommLogEntry[] = [
  { id: 'clog-1',  incidentId: 'ESC-2049', stage: 'Payment Confirmed',       channel: 'email',     status: 'delivered', recipient: 'admin@acme-corp.com',      subject: 'Payment Received',              body: 'Thank you! Payment of $299 received.',       templateId: 'tpl-1',  sentAt: '2024-06-25T14:30:05Z', deliveredAt: '2024-06-25T14:30:08Z', openedAt: '2024-06-25T14:32:00Z', failedAt: null, failReason: null, retryCount: 0, maxRetries: 3 },
  { id: 'clog-2',  incidentId: 'ESC-2049', stage: 'Payment Confirmed',       channel: 'sms',       status: 'delivered', recipient: '+1-555-0199',             subject: 'UptimeOps',                     body: 'Payment confirmed. Ticket ESC-2049 created.', templateId: 'tpl-1',  sentAt: '2024-06-25T14:30:06Z', deliveredAt: '2024-06-25T14:30:10Z', openedAt: null,                     failedAt: null, failReason: null, retryCount: 0, maxRetries: 3 },
  { id: 'clog-3',  incidentId: 'ESC-2049', stage: 'Ticket Received',         channel: 'email',     status: 'delivered', recipient: 'admin@acme-corp.com',      subject: 'Ticket Received — ESC-2049',    body: 'We got your request for acme-corp.com.',      templateId: 'tpl-2',  sentAt: '2024-06-25T14:30:45Z', deliveredAt: '2024-06-25T14:30:48Z', openedAt: '2024-06-25T14:31:00Z', failedAt: null, failReason: null, retryCount: 0, maxRetries: 3 },
  { id: 'clog-4',  incidentId: 'ESC-2049', stage: 'Fix In Progress',         channel: 'sms',       status: 'delivered', recipient: '+1-555-0199',             subject: 'UptimeOps',                     body: 'Repair started on acme-corp.com.',            templateId: 'tpl-3',  sentAt: '2024-06-25T14:35:00Z', deliveredAt: '2024-06-25T14:35:03Z', openedAt: null,                     failedAt: null, failReason: null, retryCount: 0, maxRetries: 3 },
  { id: 'clog-5',  incidentId: 'ESC-2049', stage: 'Fix In Progress',         channel: 'dashboard', status: 'delivered', recipient: 'dashboard',                subject: 'Repair Active',                 body: 'AI agents TRIAGE + ISOLATE running.',         templateId: 'tpl-3',  sentAt: '2024-06-25T14:35:00Z', deliveredAt: '2024-06-25T14:35:00Z', openedAt: '2024-06-25T14:35:00Z', failedAt: null, failReason: null, retryCount: 0, maxRetries: 3 },
  { id: 'clog-6',  incidentId: 'ESC-2049', stage: 'Fix Completed',           channel: 'sms',       status: 'delivered', recipient: '+1-555-0199',             subject: 'UptimeOps',                     body: 'Fix deployed! Please verify your site.',      templateId: 'tpl-5',  sentAt: '2024-06-25T14:48:00Z', deliveredAt: '2024-06-25T14:48:03Z', openedAt: null,                     failedAt: null, failReason: null, retryCount: 0, maxRetries: 3 },
  { id: 'clog-7',  incidentId: 'ESC-2049', stage: 'Fix Completed',           channel: 'email',     status: 'opened',    recipient: 'admin@acme-corp.com',      subject: 'Fix Ready — ESC-2049',          body: 'Your fix has been deployed successfully.',    templateId: 'tpl-5',  sentAt: '2024-06-25T14:48:01Z', deliveredAt: '2024-06-25T14:48:04Z', openedAt: '2024-06-25T14:49:00Z', failedAt: null, failReason: null, retryCount: 0, maxRetries: 3 },
  { id: 'clog-8',  incidentId: 'ESC-2049', stage: 'Fix Completed',           channel: 'dashboard', status: 'delivered', recipient: 'dashboard',                subject: 'Fix Deployed',                  body: 'Please confirm your site is working.',        templateId: 'tpl-5',  sentAt: '2024-06-25T14:48:02Z', deliveredAt: '2024-06-25T14:48:02Z', openedAt: '2024-06-25T14:48:05Z', failedAt: null, failReason: null, retryCount: 0, maxRetries: 3 },
  { id: 'clog-9',  incidentId: 'ESC-2049', stage: 'Verification Request',    channel: 'email',     status: 'sent',      recipient: 'admin@acme-corp.com',      subject: 'Is everything working?',        body: 'Please confirm your site is working.',        templateId: 'tpl-6',  sentAt: '2024-06-25T14:53:00Z', deliveredAt: null,                     openedAt: null,                     failedAt: null, failReason: null, retryCount: 0, maxRetries: 3 },
  { id: 'clog-10', incidentId: 'ESC-2048', stage: 'Critical Blocker',        channel: 'email',     status: 'failed',    recipient: 'ops@beta.co',              subject: '⚠️ Delayed — ESC-2048',       body: 'We hit a roadblock. Senior engineer assigned.', templateId: 'tpl-4', sentAt: null,                     deliveredAt: null,                     openedAt: null,                     failedAt: '2024-06-25T13:50:00Z', failReason: 'Recipient inbox full', retryCount: 2, maxRetries: 3 },
  { id: 'clog-11', incidentId: 'ESC-2048', stage: 'Critical Blocker',        channel: 'sms',       status: 'delivered', recipient: '+1-555-0188',             subject: 'UptimeOps',                     body: 'Issue delayed. Senior engineer on it.',       templateId: 'tpl-4',  sentAt: '2024-06-25T13:50:05Z', deliveredAt: '2024-06-25T13:50:08Z', openedAt: null,                     failedAt: null, failReason: null, retryCount: 0, maxRetries: 3 },
  { id: 'clog-12', incidentId: null,       stage: 'Monthly Report',          channel: 'email',     status: 'opened',    recipient: 'admin@acme-corp.com',      subject: 'Monthly Health Report — June',  body: 'Your site health report for June.',           templateId: 'tpl-9',  sentAt: '2024-06-01T09:00:00Z', deliveredAt: '2024-06-01T09:00:03Z', openedAt: '2024-06-01T10:15:00Z', failedAt: null, failReason: null, retryCount: 0, maxRetries: 3 },
];

const DEFAULT_PREFS: CommPreferences = {
  emailEnabled: true,
  smsEnabled: true,
  pushEnabled: false,
  dashboardEnabled: true,
  emailAddress: 'admin@acme-corp.com',
  phoneNumber: '+1-555-0199',
  quietHoursStart: 22,
  quietHoursEnd: 8,
  alertCategories: {
    incident_updates: true,
    security_alerts: true,
    billing: true,
    maintenance: true,
    marketing: false,
  },
};

export function useCommunicationSystem() {
  const [logs, setLogs] = useState<CommLogEntry[]>(MOCK_LOGS);
  const [templates, setTemplates] = useState<MessageTemplate[]>(DEFAULT_TEMPLATES);
  const [preferences, setPreferences] = useState<CommPreferences>(DEFAULT_PREFS);
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);

  const addLog = useCallback((entry: Omit<CommLogEntry, 'id' | 'sentAt' | 'retryCount'>) => {
    const newLog: CommLogEntry = {
      ...entry,
      id: `clog-${Date.now()}`,
      sentAt: new Date().toISOString(),
      retryCount: 0,
    };
    setLogs(prev => [newLog, ...prev]);
  }, []);

  const retryDelivery = useCallback((logId: string) => {
    setLogs(prev => prev.map(l => {
      if (l.id === logId) {
        return {
          ...l,
          status: 'queued' as CommStatus,
          retryCount: l.retryCount + 1,
          failedAt: null,
          failReason: null,
        };
      }
      return l;
    }));
  }, []);

  const updateTemplate = useCallback((id: string, updates: Partial<MessageTemplate>) => {
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t));
  }, []);

  const toggleTemplate = useCallback((id: string) => {
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, enabled: !t.enabled } : t));
  }, []);

  const updatePreferences = useCallback((updates: Partial<CommPreferences>) => {
    setPreferences(prev => ({ ...prev, ...updates }));
  }, []);

  const stats = {
    totalSent: logs.filter(l => l.status !== 'pending').length,
    delivered: logs.filter(l => l.status === 'delivered').length,
    failed: logs.filter(l => l.status === 'failed').length,
    opened: logs.filter(l => l.status === 'opened').length,
    pendingRetry: logs.filter(l => l.status === 'failed' && l.retryCount < l.maxRetries).length,
  };

  return {
    logs,
    templates,
    preferences,
    selectedTemplate,
    setSelectedTemplate,
    addLog,
    retryDelivery,
    updateTemplate,
    toggleTemplate,
    updatePreferences,
    stats,
  };
}
