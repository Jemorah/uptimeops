// ═══════════════════════════════════════════════════════════════
// ENGINEER COMPONENT TYPES
// Shared types for AiLogViewer, AuditPanel, CredentialsPanel
// ═══════════════════════════════════════════════════════════════

// ── AI Log Entry (from scan_results) ──
export interface AILogEntry {
  id: string;
  timestamp: string;
  category: string;
  agent: string;
  message: string;
  details: string;
  severity: 'info' | 'warning' | 'error';
}

// ── Audit Entry (from audit_reports + audit_hash_chain) ──
export interface AuditEntry {
  id: string;
  timestamp: string;
  type: 'system' | 'deployment' | 'credential' | 'chat';
  actor: string;
  action: string;
  details: string;
  severity: 'info' | 'warning' | 'error';
}

// ── Stored Credential (from vault_secrets) ──
export interface StoredCredential {
  id: string;
  type: string;
  name: string;
  value: string;
  description: string;
  addedAt: string;
  expiresAt: string | null;
  lastUsed: string | null;
}
