// ═══════════════════════════════════════════════════════════════
// APP — Unified Routes for v2.2
// All routes use CyberLayout with unified design system
// ═══════════════════════════════════════════════════════════════

import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LoadingScreen } from '@/components/LoadingScreen';
import CyberLayout from '@/layouts/CyberLayout';
import AuthLayout from '@/layouts/AuthLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';

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

// ── HQ pages (Interface C) ──
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

// ── Customer pages (Interface A) ──
const CustomerDashboard = lazy(() => import('@/pages/customer/CustomerDashboard').then(m => ({ default: m.CustomerDashboard })));
const CustomerIncidents = lazy(() => import('@/pages/customer/CustomerIncidents').then(m => ({ default: m.CustomerIncidents })));
const CustomerBilling   = lazy(() => import('@/pages/customer/CustomerBilling').then(m => ({ default: m.CustomerBilling })));
const CustomerVault     = lazy(() => import('@/pages/customer/CustomerVault').then(m => ({ default: m.CustomerVault })));
const CustomerOnboarding = lazy(() => import('@/pages/customer/CustomerOnboarding').then(m => ({ default: m.CustomerOnboarding })));
const CustomerSecurity  = lazy(() => import('@/pages/customer/CustomerSecurity').then(m => ({ default: m.CustomerSecurity })));
const CustomerSettings  = lazy(() => import('@/pages/customer/CustomerSettings').then(m => ({ default: m.CustomerSettings })));

// ── Engineer pages (Interface B) ──
const EngineerDashboard = lazy(() => import('@/pages/engineer/EngineerDashboard').then(m => ({ default: m.EngineerDashboard })));
const EngineerSessions  = lazy(() => import('@/pages/engineer/EngineerSessions').then(m => ({ default: m.EngineerSessions })));
const EngineerWorkspace = lazy(() => import('@/pages/engineer/EngineerWorkspace').then(m => ({ default: m.EngineerWorkspace })));
const IncidentWorkspace = lazy(() => import('@/pages/engineer/IncidentWorkspace').then(m => ({ default: m.IncidentWorkspace })));
const EngineerAudit     = lazy(() => import('@/pages/engineer/EngineerAudit').then(m => ({ default: m.EngineerAudit })));
const EngineerOnCall    = lazy(() => import('@/pages/engineer/EngineerOnCall').then(m => ({ default: m.EngineerOnCall })));
const EngineerSecurity  = lazy(() => import('@/pages/engineer/EngineerSecurity').then(m => ({ default: m.EngineerSecurity })));
const EngineerSettings  = lazy(() => import('@/pages/engineer/EngineerSettings').then(m => ({ default: m.EngineerSettings })));

export default function App() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        {/* ═══ PUBLIC ═══ */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* ═══ AUTH SUITE (50/50 Split Layout) ═══ */}
        <Route path="/login" element={<AuthLayout><AuthConsole /></AuthLayout>} />
        <Route path="/signup" element={<AuthLayout><AuthConsole /></AuthLayout>} />
        <Route path="/forgot-password" element={<AuthLayout><ForgotPassword /></AuthLayout>} />
        <Route path="/reset-password" element={<AuthLayout><ResetPassword /></AuthLayout>} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/emergency" element={<EmergencyPage />} />
        <Route path="/status" element={<StatusPage />} />
        <Route path="/engineer/onboard" element={<EngineerOnboard />} />

        {/* ═══ HQ PORTAL (Interface C) ═══ */}
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

        {/* ═══ CUSTOMER PORTAL (Interface A) ═══ */}
        <Route element={<CyberLayout portalType="customer" />}>
          <Route path="/customer/onboard" element={<ProtectedRoute allowedRoles={['customer']}><CustomerOnboarding /></ProtectedRoute>} />
          <Route path="/customer" element={<ProtectedRoute allowedRoles={['customer']}><CustomerDashboard /></ProtectedRoute>} />
          <Route path="/customer/incidents" element={<ProtectedRoute allowedRoles={['customer']}><CustomerIncidents /></ProtectedRoute>} />
          <Route path="/customer/billing" element={<ProtectedRoute allowedRoles={['customer']}><CustomerBilling /></ProtectedRoute>} />
          <Route path="/customer/vault" element={<ProtectedRoute allowedRoles={['customer']}><CustomerVault /></ProtectedRoute>} />
          <Route path="/customer/security" element={<ProtectedRoute allowedRoles={['customer']}><CustomerSecurity /></ProtectedRoute>} />
          <Route path="/customer/settings" element={<ProtectedRoute allowedRoles={['customer']}><CustomerSettings /></ProtectedRoute>} />
        </Route>

        {/* ═══ ENGINEER PORTAL (Interface B) ═══ */}
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

        {/* ═══ Fallback ═══ */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
