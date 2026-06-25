// ═══════════════════════════════════════════════════════════════
// APP ROUTER — UptimeOps Final Integration
// Lazy-loaded routes + Error Boundaries + Suspense + RBAC
// ═══════════════════════════════════════════════════════════════

import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { LoadingScreen } from '@/components/LoadingScreen';
import { PublicLayout } from '@/layouts/PublicLayout';
import { PortalLayout } from '@/layouts/PortalLayout';

// ── Eager-loaded: Public pages (above the fold) ──
import { LandingPage } from '@/pages/public/LandingPage';
import { EmergencyPage } from '@/pages/public/EmergencyPage';

// ── Lazy-loaded: All other pages ──
const PricingPage = lazy(() => import('@/pages/public/PricingPage').then(m => ({ default: m.PricingPage })));
const StatusPage = lazy(() => import('@/pages/public/StatusPage').then(m => ({ default: m.StatusPage })));
const LoginPage = lazy(() => import('@/pages/public/LoginPage').then(m => ({ default: m.LoginPage })));
const SignupPage = lazy(() => import('@/pages/public/SignupPage').then(m => ({ default: m.SignupPage })));
const ForgotPasswordPage = lazy(() => import('@/pages/public/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('@/pages/public/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })));
const AuthCallbackPage = lazy(() => import('@/pages/public/AuthCallbackPage').then(m => ({ default: m.AuthCallbackPage })));

// Customer portal
const CustomerDashboard = lazy(() => import('@/pages/customer/CustomerDashboard').then(m => ({ default: m.CustomerDashboard })));
const CustomerIncidents = lazy(() => import('@/pages/customer/CustomerIncidents').then(m => ({ default: m.CustomerIncidents })));
const CustomerBilling = lazy(() => import('@/pages/customer/CustomerBilling').then(m => ({ default: m.CustomerBilling })));
const CustomerSettings = lazy(() => import('@/pages/customer/CustomerSettings').then(m => ({ default: m.CustomerSettings })));
const CustomerVault = lazy(() => import('@/pages/customer/CustomerVault').then(m => ({ default: m.CustomerVault })));
const CustomerComms = lazy(() => import('@/pages/customer/CustomerComms').then(m => ({ default: m.CustomerComms })));

// Temporary fix portal
const FixDashboard = lazy(() => import('@/pages/temporary/FixDashboard').then(m => ({ default: m.FixDashboard })));
const FixLog = lazy(() => import('@/pages/temporary/FixLog').then(m => ({ default: m.FixLog })));
const FixAIProgress = lazy(() => import('@/pages/temporary/FixAIProgress').then(m => ({ default: m.FixAIProgress })));

// Engineer portal
const EngineerDashboard = lazy(() => import('@/pages/engineer/EngineerDashboard').then(m => ({ default: m.EngineerDashboard })));
const EngineerWorkspace = lazy(() => import('@/pages/engineer/EngineerWorkspace').then(m => ({ default: m.EngineerWorkspace })));
const IncidentWorkspace = lazy(() => import('@/pages/engineer/IncidentWorkspace').then(m => ({ default: m.IncidentWorkspace })));
const EngineerSessions = lazy(() => import('@/pages/engineer/EngineerSessions').then(m => ({ default: m.EngineerSessions })));
const EngineerOnCall = lazy(() => import('@/pages/engineer/EngineerOnCall').then(m => ({ default: m.EngineerOnCall })));
const EngineerAudit = lazy(() => import('@/pages/engineer/EngineerAudit').then(m => ({ default: m.EngineerAudit })));
const EngineerSettings = lazy(() => import('@/pages/engineer/EngineerSettings').then(m => ({ default: m.EngineerSettings })));

// HQ Control Center
const HQDashboard = lazy(() => import('@/pages/hq/HQDashboard').then(m => ({ default: m.HQDashboard })));
const HQIncidents = lazy(() => import('@/pages/hq/HQIncidents').then(m => ({ default: m.HQIncidents })));
const HQEngineers = lazy(() => import('@/pages/hq/HQEngineers').then(m => ({ default: m.HQEngineers })));
const HQAudit = lazy(() => import('@/pages/hq/HQAudit').then(m => ({ default: m.HQAudit })));
const HQSettings = lazy(() => import('@/pages/hq/HQSettings').then(m => ({ default: m.HQSettings })));
const HQApprovals = lazy(() => import('@/pages/hq/HQApprovals').then(m => ({ default: m.HQApprovals })));
const HQCommunications = lazy(() => import('@/pages/hq/HQCommunications').then(m => ({ default: m.HQCommunications })));
const GapSealAudit = lazy(() => import('@/pages/hq/GapSealAudit').then(m => ({ default: m.GapSealAudit })));

// System pages
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })));
const FinalGapSeal = lazy(() => import('@/pages/FinalGapSeal').then(m => ({ default: m.FinalGapSeal })));
const LifecycleDemo = lazy(() => import('@/pages/LifecycleDemo').then(m => ({ default: m.LifecycleDemo })));

// ── Role definitions ──
const CUSTOMER_ROLES = ['customer', 'coordinator', 'admin'] as const;
const ENGINEER_ROLES = ['engineer', 'coordinator', 'admin'] as const;
const HQ_ROLES = ['coordinator', 'admin'] as const;

// ── Route wrappers ──

function PublicWrapper({ children }: { children: React.ReactNode }) {
  return <PublicLayout>{children}</PublicLayout>;
}

function CustomerRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={[...CUSTOMER_ROLES]}>
      <PortalLayout allowedRoles={[...CUSTOMER_ROLES]}>
        <Suspense fallback={<LoadingScreen message="Loading dashboard" variant="inline" />}>
          {children}
        </Suspense>
      </PortalLayout>
    </ProtectedRoute>
  );
}

function EngineerRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={[...ENGINEER_ROLES]}>
      <PortalLayout allowedRoles={[...ENGINEER_ROLES]}>
        <Suspense fallback={<LoadingScreen message="Loading engineer portal" variant="inline" />}>
          {children}
        </Suspense>
      </PortalLayout>
    </ProtectedRoute>
  );
}

function HQRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={[...HQ_ROLES]}>
      <PortalLayout allowedRoles={[...HQ_ROLES]}>
        <Suspense fallback={<LoadingScreen message="Loading HQ Center" variant="inline" />}>
          {children}
        </Suspense>
      </PortalLayout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Routes>
          {/* ═══════════════════════════════════════════
              PUBLIC ROUTES — No auth required
          ═══════════════════════════════════════════ */}
          <Route path="/" element={<PublicWrapper><LandingPage /></PublicWrapper>} />
          <Route path="/pricing" element={
            <PublicWrapper>
              <Suspense fallback={<LoadingScreen message="Loading pricing" variant="inline" />}>
                <PricingPage />
              </Suspense>
            </PublicWrapper>
          } />
          <Route path="/emergency" element={<PublicWrapper><EmergencyPage /></PublicWrapper>} />
          <Route path="/status" element={
            <PublicWrapper>
              <Suspense fallback={<LoadingScreen message="Loading status" variant="inline" />}>
                <StatusPage />
              </Suspense>
            </PublicWrapper>
          } />

          {/* ═══════════════════════════════════════════
              AUTH ROUTES — No layout wrapper
          ═══════════════════════════════════════════ */}
          <Route path="/login" element={
            <Suspense fallback={<LoadingScreen message="Loading" variant="inline" />}>
              <LoginPage />
            </Suspense>
          } />
          <Route path="/signup" element={
            <Suspense fallback={<LoadingScreen message="Loading" variant="inline" />}>
              <SignupPage />
            </Suspense>
          } />
          <Route path="/forgot-password" element={
            <Suspense fallback={<LoadingScreen message="Loading" variant="inline" />}>
              <ForgotPasswordPage />
            </Suspense>
          } />
          <Route path="/reset-password" element={
            <Suspense fallback={<LoadingScreen message="Loading" variant="inline" />}>
              <ResetPasswordPage />
            </Suspense>
          } />
          <Route path="/auth/callback" element={
            <Suspense fallback={<LoadingScreen message="Authenticating" variant="inline" />}>
              <AuthCallbackPage />
            </Suspense>
          } />

          {/* ═══════════════════════════════════════════
              CUSTOMER PORTAL — customer/coordinator/admin
          ═══════════════════════════════════════════ */}
          <Route path="/customer" element={<CustomerRoute><CustomerDashboard /></CustomerRoute>} />
          <Route path="/customer/incidents" element={<CustomerRoute><CustomerIncidents /></CustomerRoute>} />
          <Route path="/customer/billing" element={<CustomerRoute><CustomerBilling /></CustomerRoute>} />
          <Route path="/customer/vault" element={<CustomerRoute><CustomerVault /></CustomerRoute>} />
          <Route path="/customer/settings" element={<CustomerRoute><CustomerSettings /></CustomerRoute>} />
          <Route path="/customer/comms" element={<CustomerRoute><CustomerComms /></CustomerRoute>} />

          {/* ═══════════════════════════════════════════
              TEMPORARY FIX PORTAL — Public, token-based
          ═══════════════════════════════════════════ */}
          <Route path="/fix/:ticketId" element={
            <Suspense fallback={<LoadingScreen message="Loading fix portal" />}>
              <FixDashboard />
            </Suspense>
          } />
          <Route path="/fix/:ticketId/log" element={
            <Suspense fallback={<LoadingScreen message="Loading logs" />}>
              <FixLog />
            </Suspense>
          } />
          <Route path="/fix/:ticketId/ai" element={
            <Suspense fallback={<LoadingScreen message="Loading AI progress" />}>
              <FixAIProgress />
            </Suspense>
          } />

          {/* ═══════════════════════════════════════════
              ENGINEER PORTAL — engineer/coordinator/admin
          ═══════════════════════════════════════════ */}
          <Route path="/engineer" element={<EngineerRoute><EngineerDashboard /></EngineerRoute>} />
          <Route path="/engineer/sessions" element={<EngineerRoute><EngineerSessions /></EngineerRoute>} />
          <Route path="/engineer/oncall" element={<EngineerRoute><EngineerOnCall /></EngineerRoute>} />
          <Route path="/engineer/audit" element={<EngineerRoute><EngineerAudit /></EngineerRoute>} />
          <Route path="/engineer/settings" element={<EngineerRoute><EngineerSettings /></EngineerRoute>} />
          <Route path="/engineer/workspace/:incidentId" element={<EngineerRoute><EngineerWorkspace /></EngineerRoute>} />
          <Route path="/engineer/incident/:incidentId" element={<EngineerRoute><IncidentWorkspace /></EngineerRoute>} />

          {/* ═══════════════════════════════════════════
              HQ CONTROL CENTER — coordinator/admin only
          ═══════════════════════════════════════════ */}
          <Route path="/hq" element={<HQRoute><HQDashboard /></HQRoute>} />
          <Route path="/hq/incidents" element={<HQRoute><HQIncidents /></HQRoute>} />
          <Route path="/hq/engineers" element={<HQRoute><HQEngineers /></HQRoute>} />
          <Route path="/hq/audit" element={<HQRoute><HQAudit /></HQRoute>} />
          <Route path="/hq/settings" element={<HQRoute><HQSettings /></HQRoute>} />
          <Route path="/hq/approvals" element={<HQRoute><HQApprovals /></HQRoute>} />
          <Route path="/hq/communications" element={<HQRoute><HQCommunications /></HQRoute>} />
          <Route path="/hq/gap-seal" element={<HQRoute><GapSealAudit /></HQRoute>} />

          {/* ═══════════════════════════════════════════
              SYSTEM PAGES
          ═══════════════════════════════════════════ */}
          <Route path="/lifecycle" element={
            <Suspense fallback={<LoadingScreen message="Loading lifecycle demo" />}>
              <LifecycleDemo />
            </Suspense>
          } />
          <Route path="/final-gap-seal" element={
            <Suspense fallback={<LoadingScreen message="Loading verification" />}>
              <FinalGapSeal />
            </Suspense>
          } />

          {/* 404 — Catch-all */}
          <Route path="*" element={
            <Suspense fallback={<LoadingScreen message="Loading" />}>
              <NotFoundPage />
            </Suspense>
          } />
        </Routes>
      </AuthProvider>
    </ErrorBoundary>
  );
}
