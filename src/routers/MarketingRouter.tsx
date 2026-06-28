// ═══════════════════════════════════════════════════════════════
// MARKETING ROUTER — www.uptimeops.org
// Public pages + centralized login/signup/auth. No portal routes.
// ═══════════════════════════════════════════════════════════════

import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { LoadingScreen } from '@/components/LoadingScreen';

// ── Public pages ──
const LandingPage    = lazy(() => import('@/pages/public/LandingPage').then(m => ({ default: m.LandingPage })));
const PricingPage    = lazy(() => import('@/pages/public/PricingPage').then(m => ({ default: m.PricingPage })));
const EmergencyPage  = lazy(() => import('@/pages/public/EmergencyPage').then(m => ({ default: m.EmergencyPage })));
const StatusPage     = lazy(() => import('@/pages/public/StatusPage').then(m => ({ default: m.StatusPage })));
const LoginPage      = lazy(() => import('@/pages/public/LoginPage').then(m => ({ default: m.LoginPage })));
const SignupPage     = lazy(() => import('@/pages/public/SignupPage').then(m => ({ default: m.SignupPage })));
const ForgotPassword = lazy(() => import('@/pages/public/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })));
const ResetPassword  = lazy(() => import('@/pages/public/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })));
const AuthCallback   = lazy(() => import('@/pages/public/AuthCallbackPage').then(m => ({ default: m.AuthCallbackPage })));
const EngineerOnboard = lazy(() => import('@/pages/engineer/EngineerOnboarding').then(m => ({ default: m.EngineerOnboarding })));

// Temporary fix portal (public, token-based)
const FixDashboard  = lazy(() => import('@/pages/temporary/FixDashboard').then(m => ({ default: m.FixDashboard })));
const FixLog        = lazy(() => import('@/pages/temporary/FixLog').then(m => ({ default: m.FixLog })));
const FixAIProgress = lazy(() => import('@/pages/temporary/FixAIProgress').then(m => ({ default: m.FixAIProgress })));

// System pages (lazy-loaded)
const LifecycleDemo  = lazy(() => import('@/pages/temporary/FixDashboard').then(m => ({ default: m.FixDashboard })));
const FinalGapSeal   = lazy(() => import('@/pages/temporary/FixLog').then(m => ({ default: m.FixLog })));
const CoordinatorGate = lazy(() => import('@/pages/temporary/FixAIProgress').then(m => ({ default: m.FixAIProgress })));

export function MarketingRouter() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        {/* Public marketing */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/emergency" element={<EmergencyPage />} />
        <Route path="/status" element={<StatusPage />} />

        {/* Auth (centralized on www) */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* Engineer onboarding (public, token-based) */}
        <Route path="/engineer/onboard" element={<EngineerOnboard />} />

        {/* Temporary fix portal */}
        <Route path="/fix/:ticketId" element={<FixDashboard />} />
        <Route path="/fix-log" element={<FixLog />} />
        <Route path="/fix-ai-progress" element={<FixAIProgress />} />

        {/* Public demos */}
        <Route path="/lifecycle" element={<LifecycleDemo />} />
        <Route path="/final-gap-seal" element={<FinalGapSeal />} />
        <Route path="/coordinator-gate" element={<CoordinatorGate />} />
      </Routes>
    </Suspense>
  );
}
