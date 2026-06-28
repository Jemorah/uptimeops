// ═══════════════════════════════════════════════════════════════
// UPTIMEOPS ENTRY POINT — Multi-Subdomain
// No router wrapper here — each portal router provides its own Routes.
// ═══════════════════════════════════════════════════════════════

import { createRoot } from 'react-dom/client';
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
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster />
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
