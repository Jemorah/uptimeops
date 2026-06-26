// Structured logging for Edge Functions

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  function: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export function logInfo(fn: string, message: string, meta?: Record<string, unknown>) {
  const entry: LogEntry = { timestamp: new Date().toISOString(), level: 'info', function: fn, message, metadata: meta };
  console.log(JSON.stringify(entry));
}

export function logWarn(fn: string, message: string, meta?: Record<string, unknown>) {
  const entry: LogEntry = { timestamp: new Date().toISOString(), level: 'warn', function: fn, message, metadata: meta };
  console.warn(JSON.stringify(entry));
}

export function logError(fn: string, message: string, error: unknown, meta?: Record<string, unknown>) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: 'error',
    function: fn,
    message,
    metadata: { error: error instanceof Error ? error.message : String(error), ...meta },
  };
  console.error(JSON.stringify(entry));
}
