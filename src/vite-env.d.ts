/// <reference types="vite/client" />

// Global constants injected by Vite define
declare const __APP_VERSION__: string;
declare const __BUILD_TIME__: string;

// Environment variables (VITE_ prefix)
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_APP_URL: string;
  readonly VITE_API_URL: string;
  readonly VITE_STRIPE_PUBLISHABLE_KEY: string;
  readonly VITE_SENTRY_DSN: string;
  readonly VITE_SENTRY_ORG: string;
  readonly VITE_SENTRY_PROJECT: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
