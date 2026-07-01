// ═══════════════════════════════════════════════════════════════
// APP v2.5 — Subdomain-Aware Unified Routing
// ═══════════════════════════════════════════════════════════════

import { lazy, useMemo } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import CyberLayout from '@/layouts/CyberLayout';
import AuthLayout from '@/layouts/AuthLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { getCurrentPortal } from '@/hooks/useSubdomain';
import { PortalSwitcher } from '@/components/PortalSwitcher';

// ── Public pages ──
const LandingPage      = lazy(() => import('@/pages/public/LandingPage').then(m => ({ default: m.LandingPage })));
const AuthConsole      = lazy(() => import('@/pages/public/AuthConsole').then(m => ({ default: m.AuthConsole })));
const ForgotPassword   = lazy(() => import('@/pages/public/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })));
const ResetPassword    = lazy(() => import('@/pages/public/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })));
const AuthCallback     = lazy(() => import('@/pages/public/AuthCallbackPage').then(m => ({ default: m.AuthCallbackPage })));
const PricingPage      = lazy(() => import('@/pages/public/PricingPage').then(m => ({ default: m.PricingPage })));
const EmergencyPage    = lazy(() => import('@/pages/public/EmergencyPage').then(m => ({ default: m.EmergencyPage })));
const StatusPage       = lazy(() => import('@/pages/public/StatusPage').then(m => ({ default: m.StatusPage })));
const EngineerOnboard  = lazy(() => import('@/pages/engineer/EngineerOnboarding').then(m => ({ default: m.EngineerOnboarding })));

// ── HQ pages ──
const HQDashboard      = lazy(() => import('@/pages/hq/HQDashboard').then(m => ({ default: m.HQDashboard })));
const HQIncidents      = lazy(() => import('@/pages/hq/HQIncidents').then(m => ({ default: m.HQIncidents })));
const HQApprovals      = lazy(() => import('@/pages/hq/HQApprovals').then(m => ({ default: m.HQApprovals })));
const HQEngineers      = lazy(() => import('@/pages/hq/HQEngineers').then(m => ({ default: m.HQEngineers })));
const HQAudit          = lazy(() => import('@/pages/hq/HQAudit').then(m => ({ default: m.HQAudit })));
const HQCommunications = lazy(() => import('@/pages/hq/HQCommunications').then(m => ({ default: m.HQCommunications })));
const GapSealAudit     = lazy(() => import('@/pages/hq/GapSealAudit').then(m => ({ default: m.GapSealAudit })));
const HQScanners       = lazy(() => import('@/pages/hq/HQScanners').then(m => ({ default: m.HQScanners })));
const HQGuidelines     = lazy(() => import('@/pages/hq/HQGuidelines').then(m => ({ default: m.HQGuidelines })));
const HQSettings       = lazy(() => import('@/pages/hq/HQSettings').then(m => ({ default: m.HQSettings })));

// ── Customer Portal ──
const CustomerOnboarding    = lazy(() => import('@/pages/customer/CustomerOnboarding').then(m => ({ default: m.CustomerOnboarding })));
const CustomerDashboard     = lazy(() => import('@/pages/customer/CustomerDashboard').then(m => ({ default: m.CustomerDashboard })));
const CustomerIncidents     = lazy(() => import('@/pages/customer/CustomerIncidents').then(m => ({ default: m.CustomerIncidents })));
const CustomerPayments      = lazy(() => import('@/pages/customer/CustomerPayments').then(m => ({ default: m.CustomerPayments })));
const CustomerCredentials   = lazy(() => import('@/pages/customer/CustomerCredentials').then(m => ({ default: m.CustomerCredentials })));
const CustomerCommunications = lazy(() => import('@/pages/customer/CustomerCommunications').then(m => ({ default: m.CustomerCommunications })));
const CustomerSecurity      = lazy(() => import('@/pages/customer/CustomerSecurity').then(m => ({ default: m.CustomerSecurity })));
const CustomerSettings      = lazy(() => import('@/pages/customer/CustomerSettings').then(m => ({ default: m.CustomerSettings })));

// ── Engineer pages ──
const EngineerDashboard = lazy(() => import('@/pages/engineer/EngineerDashboard').then(m => ({ default: m.EngineerDashboard })));
const EngineerSessions  = lazy(() => import('@/pages/engineer/EngineerSessions').then(m => ({ default: m.EngineerSessions })));
const EngineerWorkspace = lazy(() => import('@/pages/engineer/EngineerWorkspace').then(m => ({ default: m.EngineerWorkspace })));
const IncidentWorkspace = lazy(() => import('@/pages/engineer/IncidentWorkspace').then(m => ({ default: m.IncidentWorkspace })));
const EngineerAudit     = lazy(() => import('@/pages/engineer/EngineerAudit').then(m => ({ default: m.EngineerAudit })));
const EngineerOnCall    = lazy(() => import('@/pages/engineer/EngineerOnCall').then(m => ({ default: m.EngineerOnCall })));
const EngineerSecurity  = lazy(() => import('@/pages/engineer/EngineerSecurity').then(m => ({ default: m.EngineerSecurity })));
const EngineerSettings  = lazy(() => import('@/pages/engineer/EngineerSettings').then(m => ({ default: m.EngineerSettings })));

// ── Auth routes (used inline in each portal — must be literal <Route> children) ──
const AUTH_LOGIN        = <Route path="/login" element={<AuthLayout><AuthConsole /></AuthLayout>} />;
const AUTH_SIGNUP       = <Route path="/signup" element={<AuthLayout><AuthConsole /></AuthLayout>} />;
const AUTH_FORGOT       = <Route path="/forgot-password" element={<AuthLayout><ForgotPassword /></AuthLayout>} />;
const AUTH_RESET        = <Route path="/reset-password" element={<AuthLayout><ResetPassword /></AuthLayout>} />;
const AUTH_CALLBACK     = <Route path="/auth/callback" element={<AuthCallback />} />;

// ═══════════════════════════════════════════════════════════════
// CUSTOMER PORTAL — app.uptimeops.org
// ═══════════════════════════════════════════════════════════════
function CustomerRoutes() {
  return (
    <Routes>
      <Route element={<CyberLayout portalType="customer" />}>
        <Route path="/" element={<ProtectedRoute allowedRoles={['customer']}><CustomerDashboard /></ProtectedRoute>} />
        <Route path="/onboard" element={<ProtectedRoute allowedRoles={['customer']}><CustomerOnboarding /></ProtectedRoute>} />
        <Route path="/incidents" element={<ProtectedRoute allowedRoles={['customer']}><CustomerIncidents /></ProtectedRoute>} />
        <Route path="/incidents/:id" element={<ProtectedRoute allowedRoles={['customer']}><CustomerIncidents /></ProtectedRoute>} />
        <Route path="/payments" element={<ProtectedRoute allowedRoles={['customer']}><CustomerPayments /></ProtectedRoute>} />
        <Route path="/credentials" element={<ProtectedRoute allowedRoles={['customer']}><CustomerCredentials /></ProtectedRoute>} />
        <Route path="/communications" element={<ProtectedRoute allowedRoles={['customer']}><CustomerCommunications /></ProtectedRoute>} />
        <Route path="/security" element={<ProtectedRoute allowedRoles={['customer']}><CustomerSecurity /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute allowedRoles={['customer']}><CustomerSettings /></ProtectedRoute>} />
        <Route path="/billing" element={<Navigate to="/payments" replace />} />
        <Route path="/vault" element={<Navigate to="/credentials" replace />} />
      </Route>
      {AUTH_LOGIN}{AUTH_SIGNUP}{AUTH_FORGOT}{AUTH_RESET}{AUTH_CALLBACK}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// ═══════════════════════════════════════════════════════════════
// HQ PORTAL — dashboard.uptimeops.org
// ═══════════════════════════════════════════════════════════════
function HQRoutes() {
  return (
    <Routes>
      <Route element={<CyberLayout portalType="admin" />}>
        <Route path="/" element={<ProtectedRoute allowedRoles={['coordinator', 'admin']}><HQDashboard /></ProtectedRoute>} />
        <Route path="/incidents" element={<ProtectedRoute allowedRoles={['coordinator', 'admin']}><HQIncidents /></ProtectedRoute>} />
        <Route path="/approvals" element={<ProtectedRoute allowedRoles={['coordinator', 'admin']}><HQApprovals /></ProtectedRoute>} />
        <Route path="/engineers" element={<ProtectedRoute allowedRoles={['coordinator', 'admin']}><HQEngineers /></ProtectedRoute>} />
        <Route path="/audit" element={<ProtectedRoute allowedRoles={['coordinator', 'admin']}><HQAudit /></ProtectedRoute>} />
        <Route path="/communications" element={<ProtectedRoute allowedRoles={['coordinator', 'admin']}><HQCommunications /></ProtectedRoute>} />
        <Route path="/gap-seal" element={<ProtectedRoute allowedRoles={['coordinator', 'admin']}><GapSealAudit /></ProtectedRoute>} />
        <Route path="/scanners" element={<ProtectedRoute allowedRoles={['coordinator', 'admin']}><HQScanners /></ProtectedRoute>} />
        <Route path="/guidelines" element={<ProtectedRoute allowedRoles={['coordinator', 'admin']}><HQGuidelines /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute allowedRoles={['coordinator', 'admin']}><HQSettings /></ProtectedRoute>} />
      </Route>
      {AUTH_LOGIN}{AUTH_SIGNUP}{AUTH_FORGOT}{AUTH_RESET}{AUTH_CALLBACK}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// ═══════════════════════════════════════════════════════════════
// ENGINEER PORTAL — engineers.uptimeops.org
// ═══════════════════════════════════════════════════════════════
function EngineerRoutes() {
  return (
    <Routes>
      <Route element={<CyberLayout portalType="engineer" />}>
        <Route path="/" element={<ProtectedRoute allowedRoles={['engineer']}><EngineerDashboard /></ProtectedRoute>} />
        <Route path="/sessions" element={<ProtectedRoute allowedRoles={['engineer']}><EngineerSessions /></ProtectedRoute>} />
        <Route path="/workspace" element={<ProtectedRoute allowedRoles={['engineer']}><EngineerWorkspace /></ProtectedRoute>} />
        <Route path="/workspace/:incidentId" element={<ProtectedRoute allowedRoles={['engineer']}><IncidentWorkspace /></ProtectedRoute>} />
        <Route path="/audit" element={<ProtectedRoute allowedRoles={['engineer']}><EngineerAudit /></ProtectedRoute>} />
        <Route path="/oncall" element={<ProtectedRoute allowedRoles={['engineer']}><EngineerOnCall /></ProtectedRoute>} />
        <Route path="/security" element={<ProtectedRoute allowedRoles={['engineer']}><EngineerSecurity /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute allowedRoles={['engineer']}><EngineerSettings /></ProtectedRoute>} />
      </Route>
      {AUTH_LOGIN}{AUTH_SIGNUP}{AUTH_FORGOT}{AUTH_RESET}{AUTH_CALLBACK}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// ═══════════════════════════════════════════════════════════════
// LANDING — www.uptimeops.org (fallback)
// ═══════════════════════════════════════════════════════════════
function LandingRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/emergency" element={<EmergencyPage />} />
      <Route path="/status" element={<StatusPage />} />
      <Route path="/engineer/onboard" element={<EngineerOnboard />} />
      {AUTH_LOGIN}{AUTH_SIGNUP}{AUTH_FORGOT}{AUTH_RESET}{AUTH_CALLBACK}
      {/* Deep-links with full prefix on landing domain */}
      <Route element={<CyberLayout portalType="admin" />}>
        <Route path="/hq" element={<ProtectedRoute allowedRoles={['coordinator', 'admin']}><HQDashboard /></ProtectedRoute>} />
        <Route path="/hq/incidents" element={<ProtectedRoute allowedRoles={['coordinator', 'admin']}><HQIncidents /></ProtectedRoute>} />
        <Route path="/hq/approvals" element={<ProtectedRoute allowedRoles={['coordinator', 'admin']}><HQApprovals /></ProtectedRoute>} />
        <Route path="/hq/engineers" element={<ProtectedRoute allowedRoles={['coordinator', 'admin']}><HQEngineers /></ProtectedRoute>} />
        <Route path="/hq/audit" element={<ProtectedRoute allowedRoles={['coordinator', 'admin']}><HQAudit /></ProtectedRoute>} />
        <Route path="/hq/communications" element={<ProtectedRoute allowedRoles={['coordinator', 'admin']}><HQCommunications /></ProtectedRoute>} />
        <Route path="/hq/gap-seal" element={<ProtectedRoute allowedRoles={['coordinator', 'admin']}><GapSealAudit /></ProtectedRoute>} />
        <Route path="/hq/scanners" element={<ProtectedRoute allowedRoles={['coordinator', 'admin']}><HQScanners /></ProtectedRoute>} />
        <Route path="/hq/guidelines" element={<ProtectedRoute allowedRoles={['coordinator', 'admin']}><HQGuidelines /></ProtectedRoute>} />
        <Route path="/hq/settings" element={<ProtectedRoute allowedRoles={['coordinator', 'admin']}><HQSettings /></ProtectedRoute>} />
      </Route>
      <Route element={<CyberLayout portalType="customer" />}>
        <Route path="/customer/onboard" element={<ProtectedRoute allowedRoles={['customer']}><CustomerOnboarding /></ProtectedRoute>} />
        <Route path="/customer" element={<ProtectedRoute allowedRoles={['customer']}><CustomerDashboard /></ProtectedRoute>} />
        <Route path="/customer/incidents" element={<ProtectedRoute allowedRoles={['customer']}><CustomerIncidents /></ProtectedRoute>} />
        <Route path="/customer/incidents/:id" element={<ProtectedRoute allowedRoles={['customer']}><CustomerIncidents /></ProtectedRoute>} />
        <Route path="/customer/payments" element={<ProtectedRoute allowedRoles={['customer']}><CustomerPayments /></ProtectedRoute>} />
        <Route path="/customer/credentials" element={<ProtectedRoute allowedRoles={['customer']}><CustomerCredentials /></ProtectedRoute>} />
        <Route path="/customer/communications" element={<ProtectedRoute allowedRoles={['customer']}><CustomerCommunications /></ProtectedRoute>} />
        <Route path="/customer/security" element={<ProtectedRoute allowedRoles={['customer']}><CustomerSecurity /></ProtectedRoute>} />
        <Route path="/customer/settings" element={<ProtectedRoute allowedRoles={['customer']}><CustomerSettings /></ProtectedRoute>} />
      </Route>
      <Route element={<CyberLayout portalType="engineer" />}>
        <Route path="/engineer" element={<ProtectedRoute allowedRoles={['engineer']}><EngineerDashboard /></ProtectedRoute>} />
        <Route path="/engineer/sessions" element={<ProtectedRoute allowedRoles={['engineer']}><EngineerSessions /></ProtectedRoute>} />
        <Route path="/engineer/workspace" element={<ProtectedRoute allowedRoles={['engineer']}><EngineerWorkspace /></ProtectedRoute>} />
        <Route path="/engineer/workspace/:incidentId" element={<ProtectedRoute allowedRoles={['engineer']}><IncidentWorkspace /></ProtectedRoute>} />
        <Route path="/engineer/audit" element={<ProtectedRoute allowedRoles={['engineer']}><EngineerAudit /></ProtectedRoute>} />
        <Route path="/engineer/oncall" element={<ProtectedRoute allowedRoles={['engineer']}><EngineerOnCall /></ProtectedRoute>} />
        <Route path="/engineer/security" element={<ProtectedRoute allowedRoles={['engineer']}><EngineerSecurity /></ProtectedRoute>} />
        <Route path="/engineer/settings" element={<ProtectedRoute allowedRoles={['engineer']}><EngineerSettings /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════
export default function App() {
  const portal = useMemo(() => getCurrentPortal(), []);

  const routes = (() => {
    switch (portal.portal) {
      case 'customer': return <CustomerRoutes />;
      case 'hq':       return <HQRoutes />;
      case 'engineer': return <EngineerRoutes />;
      default:         return <LandingRoutes />;
    }
  })();

  return (
    <>
      {routes}
      <PortalSwitcher />
    </>
  );
}
