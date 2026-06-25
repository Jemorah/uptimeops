// ═══════════════════════════════════════════════════════════════
// SHARED: CORS + Response Helpers
// ═══════════════════════════════════════════════════════════════

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
  'Access-Control-Max-Age': '86400',
};

export function jsonResponse(body: object, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

export function errorResponse(message: string, status = 500, code?: string): Response {
  return jsonResponse({ success: false, error: message, code: code || 'INTERNAL_ERROR' }, status);
}

export function corsPreflight(): Response {
  return new Response('ok', { headers: CORS_HEADERS, status: 200 });
}
