// ═══════════════════════════════════════════════════════════════
// MARKETING ROUTER — www.uptimeops.org
// Public pages + centralized login/signup/auth callback.
// ═══════════════════════════════════════════════════════════════

import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { LoadingScreen } from '@/components/LoadingScreen';

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

const FixDashboard  = lazy(() => import('@/pages/temporary/FixDashboard').then(m => ({ default: m.FixDashboard })));
const FixLog        = lazy(() => import('@/pages/temporary/FixLog').then(m => ({ default: m.FixLog })));
const FixAIProgress = lazy(() => import('@/pages/temporary/FixAIProgress').then(m => ({ default: m.FixAIProgress })));

export function MarketingRouter() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/emergency" element={<EmergencyPage />} />
        <Route path="/status" element={<StatusPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/engineer/onboard" element={<EngineerOnboard />} />
        <Route path="/fix/:ticketId" element={<FixDashboard />} />
        <Route path="/fix-log" element={<FixLog />} />
        <Route path="/fix-ai-progress" element={<FixAIProgress />} />
      </Routes>
    </Suspense>
  );
}
