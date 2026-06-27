/// <reference types="vite/client" />

// Global constants injected by Vite define
declare const __APP_VERSION__: string;
declare const __BUILD_TIME__: string;

// Environment variables (VITE_ prefix for frontend exposure)
interface ImportMetaEnv {
  // Supabase
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  // Stripe
  readonly VITE_STRIPE_PUBLISHABLE_KEY: string;
  // App
  readonly VITE_APP_URL: string;
  // Sentry (optional)
  readonly VITE_SENTRY_DSN: string;
  readonly VITE_SENTRY_ORG: string;
  readonly VITE_SENTRY_PROJECT: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
