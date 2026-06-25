// ═══════════════════════════════════════════════════════════════
// SENTRY — Error Tracking & Performance Monitoring
// Frontend + Edge Functions error capture
// ═══════════════════════════════════════════════════════════════

import * as Sentry from '@sentry/react';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

export function initSentry() {
  if (!SENTRY_DSN) {
    console.warn('[Sentry] DSN not configured — skipping initialization');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE, // 'development' | 'production'
    release: __APP_VERSION__,

    // Performance monitoring
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,

    // Session replay (error context)
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: import.meta.env.PROD ? 0.1 : 1.0,

    // Integrations
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        maskAllInputs: true,
        blockAllMedia: true,
      }),
    ],

    // Before send — filter sensitive data
    beforeSend(event) {
      // Scrub PII from requests
      if (event.request) {
        delete event.request.cookies;
        delete event.request.headers;
      }
      // Scrub user email if present
      if (event.user?.email) {
        event.user.email = '[REDACTED]';
      }
      return event;
    },

    // Ignore common non-actionable errors
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'Network Error',
      'Failed to fetch',
      'AbortError',
      'ChunkLoadError',
    ],
  });
}

export function captureException(error: Error, context?: Record<string, unknown>) {
  if (!SENTRY_DSN) {
    console.error('[Sentry] Not initialized — logging to console:', error, context);
    return;
  }
  Sentry.captureException(error, { extra: context });
}

export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
  if (!SENTRY_DSN) {
    console.log(`[Sentry] ${message}`);
    return;
  }
  Sentry.captureMessage(message, level);
}

export function setUserContext(userId: string, role: string) {
  if (!SENTRY_DSN) return;
  Sentry.setUser({ id: userId, role });
}

export function clearUserContext() {
  if (!SENTRY_DSN) return;
  Sentry.setUser(null);
}
