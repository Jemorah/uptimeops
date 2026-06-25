// ═══════════════════════════════════════════════════════════════
// SHARED: Structured Logging
// ═══════════════════════════════════════════════════════════════

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  function: string;
  message: string;
  data?: Record<string, unknown>;
  error?: string;
}

const LOG_LEVELS: Record<string, number> = { debug: 0, info: 1, warn: 2, error: 3 };
const CURRENT_LEVEL = LOG_LEVELS[Deno.env.get('LOG_LEVEL') || 'info'];

export function logInfo(fn: string, message: string, data?: Record<string, unknown>) {
  if (CURRENT_LEVEL > LOG_LEVELS.info) return;
  const entry: LogEntry = { timestamp: new Date().toISOString(), level: 'info', function: fn, message, data };
  console.log(JSON.stringify(entry));
}

export function logWarn(fn: string, message: string, data?: Record<string, unknown>) {
  if (CURRENT_LEVEL > LOG_LEVELS.warn) return;
  const entry: LogEntry = { timestamp: new Date().toISOString(), level: 'warn', function: fn, message, data };
  console.warn(JSON.stringify(entry));
}

export function logError(fn: string, message: string, error?: Error, data?: Record<string, unknown>) {
  if (CURRENT_LEVEL > LOG_LEVELS.error) return;
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: 'error',
    function: fn,
    message,
    data,
    error: error?.message || error?.toString(),
  };
  console.error(JSON.stringify(entry));
}
