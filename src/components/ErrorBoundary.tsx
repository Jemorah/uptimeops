// ═══════════════════════════════════════════════════════════════
// ERROR BOUNDARY — Production-Ready Error Recovery
// Catches React errors, logs to Sentry, shows recovery UI
// ═══════════════════════════════════════════════════════════════

import { Component, type ErrorInfo, type ReactNode } from 'react';
import {
  AlertTriangle, RefreshCw, Home, Bug, Radio,
  Shield
} from 'lucide-react';
import { captureException } from '@/lib/sentry';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, errorId: '' };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error, errorId: `err-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    captureException(error, {
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, errorId: '' });
    this.props.onReset?.();
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <ErrorFallback
        error={this.state.error}
        errorId={this.state.errorId}
        onReset={this.handleReset}
        onReload={this.handleReload}
        onGoHome={this.handleGoHome}
      />;
    }

    return this.props.children;
  }
}

// ── Error Fallback UI ──

interface ErrorFallbackProps {
  error: Error | null;
  errorId: string;
  onReset: () => void;
  onReload: () => void;
  onGoHome: () => void;
}

function ErrorFallback({ error, errorId, onReset, onReload, onGoHome }: ErrorFallbackProps) {
  const isDev = import.meta.env.DEV;

  return (
    <div className="fixed inset-0 z-50 bg-void flex items-center justify-center p-4">
      {/* Grid background */}
      <div className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `linear-gradient(rgba(255,0,85,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,0,85,0.15) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative max-w-lg w-full">
        {/* Header */}
        <div className="bg-surface border border-magenta/20 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-magenta/10 border border-magenta/30 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-magenta" />
            </div>
            <div>
              <h1 className="text-sm font-black uppercase tracking-wider text-white">
                System Error
              </h1>
              <p className="text-[10px] text-white/30 font-mono">ID: {errorId}</p>
            </div>
          </div>

          <p className="text-xs text-white/50 leading-relaxed mb-4">
            Something went wrong. Our team has been notified automatically.
            You can try recovering or return to the home page.
          </p>

          {/* Error details (dev only) */}
          {isDev && error && (
            <div className="mb-4 p-3 bg-black border border-white/5 font-mono text-[10px] text-red-400 max-h-32 overflow-auto">
              <p className="text-white/40 mb-1">{error.name}: {error.message}</p>
              <p className="text-white/20">{error.stack}</p>
            </div>
          )}

          {/* Recovery actions */}
          <div className="space-y-2">
            <button
              onClick={onReset}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-lime/10 border border-lime/30 text-lime text-xs font-bold hover:bg-lime/20 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              TRY AGAIN
            </button>

            <button
              onClick={onReload}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white/5 border border-white/10 text-white/60 text-xs font-bold hover:bg-white/10 hover:border-white/20 transition-colors"
            >
              <Radio className="w-3.5 h-3.5" />
              RELOAD PAGE
            </button>

            <button
              onClick={onGoHome}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white/5 border border-white/10 text-white/40 text-xs hover:bg-white/5 hover:text-white/60 transition-colors"
            >
              <Home className="w-3.5 h-3.5" />
              GO TO HOME
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border border-white/5 border-t-0">
          <div className="flex items-center gap-2 text-[10px] text-white/20">
            <Shield className="w-3 h-3" />
            <span>Error logged securely</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-white/20">
            <Bug className="w-3 h-3" />
            <span>Sentry tracking active</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Async Error Wrapper ──

interface AsyncBoundaryProps {
  children: ReactNode;
  loading?: ReactNode;
}

/**
 * Wraps async operations with error catching
 * Usage: <AsyncBoundary><Suspense><MyComponent /></Suspense></AsyncBoundary>
 */
export function AsyncBoundary({ children, loading }: AsyncBoundaryProps) {
  return (
    <ErrorBoundary fallback={loading}>
      {children}
    </ErrorBoundary>
  );
}
