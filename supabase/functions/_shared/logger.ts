// ═══════════════════════════════════════════════════════════════
// LOGGER — Structured logging for Edge Functions
// Writes JSON to stdout for ingestion by monitoring
// ═══════════════════════════════════════════════════════════════

type LogLevel = 'info' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  function: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export function logInfo(fn: string, message: string, meta?: Record<string, unknown>) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: 'info',
    function: fn,
    message,
    metadata: meta,
  };
  console.log(JSON.stringify(entry));
}

export function logError(fn: string, message: string, err?: unknown, meta?: Record<string, unknown>) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: 'error',
    function: fn,
    message,
    metadata: {
      ...meta,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    },
  };
  console.error(JSON.stringify(entry));
}
