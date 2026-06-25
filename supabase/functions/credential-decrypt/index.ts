// ═══════════════════════════════════════════════════════════════
// FUNCTION 4: credential-decrypt
// Validate session → request customer approval → relay ephemeral key
// Security: Never touches plaintext, only relays encrypted WebSocket
// Audit: Log every request, approval, denial, timeout
// ═══════════════════════════════════════════════════════════════

import { createClient } from 'npm:@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// In-memory approval requests (volatile, per-process)
const pendingApprovals = new Map<string, {
  requestId: string;
  engineerId: string;
  vmSessionId: string;
  credentialFingerprint: string;
  requestedAt: number;
  expiresAt: number;
  status: 'pending' | 'approved' | 'denied' | 'timeout';
}>();

const APPROVAL_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes for customer to respond

// Cleanup expired approvals
setInterval(() => {
  const now = Date.now();
  for (const [id, req] of pendingApprovals.entries()) {
    if (req.expiresAt < now && req.status === 'pending') {
      req.status = 'timeout';
      // Log timeout
      supabase.from('audit_logs').insert({
        entity_type: 'credential_access',
        entity_id: req.vmSessionId,
        action: 'approval_timeout',
        performed_by_type: 'system',
        metadata: { request_id: id, credential_fingerprint_prefix: req.credentialFingerprint.substring(0, 8) },
      }).then(() => {});
    }
  }
}, 30000);

interface ApprovalRequest {
  action: 'request_access' | 'approve_access' | 'deny_access' | 'check_status';
  vm_session_id?: string;
  credential_fingerprint?: string;
  request_id?: string;
  engineer_id?: string;
  customer_id?: string;
}

async function requestAccess(payload: ApprovalRequest) {
  if (!payload.vm_session_id || !payload.credential_fingerprint || !payload.engineer_id) {
    return { success: false, error: 'Missing vm_session_id, credential_fingerprint, or engineer_id' };
  }

  // Validate VM session
  const { data: vmSession } = await supabase
    .from('vm_sessions')
    .select('id, status, incident_id')
    .eq('id', payload.vm_session_id)
    .single();

  if (!vmSession) return { success: false, error: 'VM session not found' };
  if (vmSession.status === 'destroyed') return { success: false, error: 'VM session has been destroyed' };

  // Validate credential exists and is not revoked
  const { data: cred } = await supabase
    .from('credentials_vault')
    .select('id, customer_id, revoked_at, expires_at, public_key_fingerprint')
    .eq('public_key_fingerprint', payload.credential_fingerprint)
    .single();

  if (!cred) return { success: false, error: 'Credential not found' };
  if (cred.revoked_at) return { success: false, error: 'Credential has been revoked' };
  if (new Date(cred.expires_at) < new Date()) return { success: false, error: 'Credential has expired' };

  // Create approval request
  const requestId = `cred-req-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  pendingApprovals.set(requestId, {
    requestId,
    engineerId: payload.engineer_id,
    vmSessionId: payload.vm_session_id,
    credentialFingerprint: payload.credential_fingerprint,
    requestedAt: Date.now(),
    expiresAt: Date.now() + APPROVAL_TIMEOUT_MS,
    status: 'pending',
  });

  // Send push notification to customer
  await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/communication-sender`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'credential_approval_request',
      entity_type: 'credential',
      entity_id: cred.id,
      channel: 'push',
      metadata: {
        request_id: requestId,
        engineer_id: payload.engineer_id,
        vm_session_id: payload.vm_session_id,
        expires_in_seconds: APPROVAL_TIMEOUT_MS / 1000,
      },
    }),
  });

  // Audit log
  await supabase.from('audit_logs').insert({
    entity_type: 'credential_access',
    entity_id: payload.vm_session_id,
    action: 'approval_requested',
    performed_by_type: 'engineer',
    performed_by_id: payload.engineer_id,
    metadata: {
      request_id: requestId,
      credential_fingerprint_prefix: payload.credential_fingerprint.substring(0, 8),
      customer_id: cred.customer_id,
    },
  });

  return {
    success: true,
    request_id: requestId,
    status: 'pending',
    message: 'Approval request sent to customer',
    expires_at: new Date(Date.now() + APPROVAL_TIMEOUT_MS).toISOString(),
  };
}

async function approveAccess(payload: ApprovalRequest) {
  if (!payload.request_id || !payload.customer_id) {
    return { success: false, error: 'Missing request_id or customer_id' };
  }

  const approval = pendingApprovals.get(payload.request_id);
  if (!approval) return { success: false, error: 'Approval request not found or expired' };
  if (approval.status !== 'pending') return { success: false, error: `Request already ${approval.status}` };

  // Verify the approver owns the credential
  const { data: cred } = await supabase
    .from('credentials_vault')
    .select('customer_id')
    .eq('public_key_fingerprint', approval.credentialFingerprint)
    .single();

  if (!cred || cred.customer_id !== payload.customer_id) {
    return { success: false, error: 'Unauthorized: You do not own this credential' };
  }

  approval.status = 'approved';

  // Log approval
  await supabase.from('audit_logs').insert({
    entity_type: 'credential_access',
    entity_id: approval.vmSessionId,
    action: 'approval_granted',
    performed_by_type: 'customer',
    performed_by_id: payload.customer_id,
    metadata: {
      request_id: payload.request_id,
      engineer_id: approval.engineerId,
      credential_fingerprint_prefix: approval.credentialFingerprint.substring(0, 8),
    },
  });

  // Notify engineer that approval was granted
  await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/communication-sender`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'credential_approved',
      entity_type: 'credential',
      channel: 'dashboard',
      metadata: {
        request_id: payload.request_id,
        engineer_id: approval.engineerId,
        vm_session_id: approval.vmSessionId,
      },
    }),
  });

  return {
    success: true,
    request_id: payload.request_id,
    status: 'approved',
    message: 'Access approved. Ephemeral key can now be relayed.',
  };
}

async function denyAccess(payload: ApprovalRequest) {
  if (!payload.request_id || !payload.customer_id) {
    return { success: false, error: 'Missing request_id or customer_id' };
  }

  const approval = pendingApprovals.get(payload.request_id);
  if (!approval) return { success: false, error: 'Approval request not found' };

  approval.status = 'denied';

  // Log denial
  await supabase.from('audit_logs').insert({
    entity_type: 'credential_access',
    entity_id: approval.vmSessionId,
    action: 'approval_denied',
    performed_by_type: 'customer',
    performed_by_id: payload.customer_id,
    metadata: {
      request_id: payload.request_id,
      engineer_id: approval.engineerId,
    },
  });

  // Notify engineer
  await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/communication-sender`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'credential_denied',
      entity_type: 'credential',
      channel: 'dashboard',
      metadata: {
        request_id: payload.request_id,
        engineer_id: approval.engineerId,
      },
    }),
  });

  return { success: true, status: 'denied', message: 'Access denied by customer' };
}

async function checkStatus(payload: ApprovalRequest) {
  if (!payload.request_id) return { success: false, error: 'Missing request_id' };

  const approval = pendingApprovals.get(payload.request_id);
  if (!approval) return { success: false, error: 'Request not found' };

  return {
    success: true,
    request_id: payload.request_id,
    status: approval.status,
    requested_at: new Date(approval.requestedAt).toISOString(),
    expires_at: new Date(approval.expiresAt).toISOString(),
  };
}

export default async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS' } });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }

  const payload: ApprovalRequest = await req.json();

  try {
    let result: Record<string, unknown>;

    switch (payload.action) {
      case 'request_access':
        result = await requestAccess(payload);
        break;
      case 'approve_access':
        result = await approveAccess(payload);
        break;
      case 'deny_access':
        result = await denyAccess(payload);
        break;
      case 'check_status':
        result = await checkStatus(payload);
        break;
      default:
        return new Response(JSON.stringify({ error: 'Unknown action. Use: request_access, approve_access, deny_access, check_status' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
