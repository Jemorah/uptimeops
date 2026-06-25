// ═══════════════════════════════════════════════════════════════
// FUNCTION 6: audit-logger
// Capture old/new values, performer, timestamp, IP, user agent
// Append-only to audit_logs table
// Export: PDF/CSV generation on request
// ═══════════════════════════════════════════════════════════════

import { createClient } from 'npm:@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

interface AuditPayload {
  action: 'log_change' | 'export_csv' | 'export_json';
  table_name?: string;
  record_id?: string;
  operation?: 'INSERT' | 'UPDATE' | 'DELETE';
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  performed_by_type?: 'system' | 'customer' | 'engineer' | 'coordinator' | 'ai_agent';
  performed_by_id?: string;
  metadata?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  filters?: { entity_type?: string; start_date?: string; end_date?: string; performed_by_id?: string };
}

async function logChange(payload: AuditPayload, req: Request) {
  const ipAddress = payload.ip_address || req.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = payload.user_agent || req.headers.get('user-agent') || 'unknown';

  const { data, error } = await supabase.from('audit_logs').insert({
    table_name: payload.table_name,
    record_id: payload.record_id,
    operation: payload.operation,
    old_values: payload.old_values || null,
    new_values: payload.new_values || null,
    performed_by_type: payload.performed_by_type || 'system',
    performed_by_id: payload.performed_by_id || null,
    metadata: {
      ...payload.metadata,
      ip_address: ipAddress,
      user_agent: userAgent,
      timestamp: new Date().toISOString(),
    },
    created_at: new Date().toISOString(),
  }).select().single();

  if (error) throw error;
  return { success: true, log_id: data.id };
}

async function exportCSV(payload: AuditPayload) {
  let query = supabase.from('audit_logs').select('*').order('created_at', { ascending: false });

  if (payload.filters?.entity_type) {
    query = query.eq('entity_type', payload.filters.entity_type);
  }
  if (payload.filters?.start_date) {
    query = query.gte('created_at', payload.filters.start_date);
  }
  if (payload.filters?.end_date) {
    query = query.lte('created_at', payload.filters.end_date);
  }
  if (payload.filters?.performed_by_id) {
    query = query.eq('performed_by_id', payload.filters.performed_by_id);
  }

  const { data, error } = await query.limit(10000);
  if (error) throw error;
  if (!data || data.length === 0) return { success: true, csv: '', count: 0 };

  // CSV header
  const headers = ['id', 'created_at', 'table_name', 'record_id', 'operation', 'performed_by_type', 'performed_by_id', 'old_values', 'new_values', 'metadata'];
  const rows = data.map((row: Record<string, unknown>) =>
    headers.map(h => {
      const val = row[h];
      if (val === null) return '';
      if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(',')
  );

  const csv = [headers.join(','), ...rows].join('\n');
  return { success: true, csv, count: data.length };
}

async function exportJSON(payload: AuditPayload) {
  let query = supabase.from('audit_logs').select('*').order('created_at', { ascending: false });

  if (payload.filters?.entity_type) {
    query = query.eq('entity_type', payload.filters.entity_type);
  }
  if (payload.filters?.start_date) {
    query = query.gte('created_at', payload.filters.start_date);
  }
  if (payload.filters?.end_date) {
    query = query.lte('created_at', payload.filters.end_date);
  }
  if (payload.filters?.performed_by_id) {
    query = query.eq('performed_by_id', payload.filters.performed_by_id);
  }

  const { data, error } = await query.limit(10000);
  if (error) throw error;

  return { success: true, data, count: data?.length || 0 };
}

export default async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS' } });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }

  const payload: AuditPayload = await req.json();

  try {
    let result: Record<string, unknown>;

    switch (payload.action) {
      case 'log_change':
        result = await logChange(payload, req);
        break;
      case 'export_csv':
        result = await exportCSV(payload);
        break;
      case 'export_json':
        result = await exportJSON(payload);
        break;
      default:
        return new Response(JSON.stringify({ error: 'Unknown action. Use: log_change, export_csv, export_json' }), {
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
