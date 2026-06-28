// ═══════════════════════════════════════════════════════════════
// UPTIMEOPS ENTRY POINT — Multi-Subdomain
// HashRouter wraps entire app — each portal router uses Routes inside it.
// ═══════════════════════════════════════════════════════════════

import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from '@/components/ui/sonner';
import { queryClient } from '@/lib/query-client';
import { initSentry } from '@/lib/sentry';
import App from './App.tsx';
import './index.css';

// Initialize Sentry (production only)
try { initSentry(); } catch (e) { /* sentry optional */ }

const rootEl = document.getElementById('root');
if (!rootEl) {
  document.body.innerHTML = '<div style="color:#d1ff00;font-family:monospace;padding:20px;">UptimeOps: Root element not found</div>';
} else {
  createRoot(rootEl).render(
    <HashRouter>
      <QueryClientProvider client={queryClient}>
        <App />
        <Toaster />
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </HashRouter>
  );
}
