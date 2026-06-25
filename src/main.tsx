// ═══════════════════════════════════════════════════════════════
// UPTIMEOPS ENTRY POINT
// Providers: QueryClient, Sentry, Service Worker
// ═══════════════════════════════════════════════════════════════

import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from '@/components/ui/sonner';
import { queryClient } from '@/lib/query-client';
import { initSentry } from '@/lib/sentry';
import App from './App.tsx';
import './index.css';

// ── Initialize Sentry (production only) ──
initSentry();

// ── Register service worker (production only) ──
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        console.log('[SW] Registered:', registration.scope);
      })
      .catch((error) => {
        console.error('[SW] Registration failed:', error);
      });
  });
}

// ── Request push notification permission ──
if ('Notification' in window && import.meta.env.PROD) {
  Notification.requestPermission().then((permission) => {
    console.log('[Push] Notification permission:', permission);
  });
}

// ── Render ──
createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
    <Toaster />
    {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
  </QueryClientProvider>
);
