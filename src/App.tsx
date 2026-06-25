import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { PublicLayout } from '@/layouts/PublicLayout';
import { PortalLayout } from '@/layouts/PortalLayout';

// Public pages
import { LandingPage } from '@/pages/public/LandingPage';
import { PricingPage } from '@/pages/public/PricingPage';
import { EmergencyPage } from '@/pages/public/EmergencyPage';
import { StatusPage } from '@/pages/public/StatusPage';
import { LoginPage } from '@/pages/public/LoginPage';
import { SignupPage } from '@/pages/public/SignupPage';
import { ForgotPasswordPage } from '@/pages/public/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/public/ResetPasswordPage';
import { AuthCallbackPage } from '@/pages/public/AuthCallbackPage';

// Customer portal
import { CustomerDashboard } from '@/pages/customer/CustomerDashboard';
import { CustomerIncidents } from '@/pages/customer/CustomerIncidents';
import { CustomerBilling } from '@/pages/customer/CustomerBilling';
import { CustomerSettings } from '@/pages/customer/CustomerSettings';
import { CustomerVault } from '@/pages/customer/CustomerVault';
import { CustomerComms } from '@/pages/customer/CustomerComms';

// Temporary fix portal
import { FixDashboard } from '@/pages/temporary/FixDashboard';
import { FixLog } from '@/pages/temporary/FixLog';
import { FixAIProgress } from '@/pages/temporary/FixAIProgress';

// Engineer portal
import { EngineerDashboard } from '@/pages/engineer/EngineerDashboard';
import { EngineerWorkspace } from '@/pages/engineer/EngineerWorkspace';
import { EngineerSessions } from '@/pages/engineer/EngineerSessions';
import { EngineerOnCall } from '@/pages/engineer/EngineerOnCall';
import { EngineerAudit } from '@/pages/engineer/EngineerAudit';
import { EngineerSettings } from '@/pages/engineer/EngineerSettings';

// HQ Control Center
import { HQDashboard } from '@/pages/hq/HQDashboard';
import { HQIncidents } from '@/pages/hq/HQIncidents';
import { HQEngineers } from '@/pages/hq/HQEngineers';
import { HQAudit } from '@/pages/hq/HQAudit';
import { HQSettings } from '@/pages/hq/HQSettings';
import { HQApprovals } from '@/pages/hq/HQApprovals';
import { HQCommunications } from '@/pages/hq/HQCommunications';

// Lifecycle Demo
import { LifecycleDemo } from '@/pages/LifecycleDemo';

import { Toaster } from '@/components/ui/sonner';

function PublicWrapper({ children }: { children: React.ReactNode }) {
  return <PublicLayout>{children}</PublicLayout>;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* ═══════════════════════════════════════════
            PUBLIC ROUTES (no auth required)
        ═══════════════════════════════════════════ */}
        <Route path="/" element={<PublicWrapper><LandingPage /></PublicWrapper>} />
        <Route path="/pricing" element={<PublicWrapper><PricingPage /></PublicWrapper>} />
        <Route path="/emergency" element={<PublicWrapper><EmergencyPage /></PublicWrapper>} />
        <Route path="/status" element={<PublicWrapper><StatusPage /></PublicWrapper>} />

        {/* Auth routes (no layout wrapper) */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />

        {/* ═══════════════════════════════════════════
            CUSTOMER PORTAL (customer/coordinator/admin)
        ═══════════════════════════════════════════ */}
        <Route path="/customer" element={
          <ProtectedRoute allowedRoles={['customer', 'coordinator', 'admin']}>
            <PortalLayout allowedRoles={['customer', 'coordinator', 'admin']}>
              <CustomerDashboard />
            </PortalLayout>
          </ProtectedRoute>
        } />
        <Route path="/customer/incidents" element={
          <ProtectedRoute allowedRoles={['customer', 'coordinator', 'admin']}>
            <PortalLayout allowedRoles={['customer', 'coordinator', 'admin']}>
              <CustomerIncidents />
            </PortalLayout>
          </ProtectedRoute>
        } />
        <Route path="/customer/billing" element={
          <ProtectedRoute allowedRoles={['customer', 'coordinator', 'admin']}>
            <PortalLayout allowedRoles={['customer', 'coordinator', 'admin']}>
              <CustomerBilling />
            </PortalLayout>
          </ProtectedRoute>
        } />
        <Route path="/customer/vault" element={
          <ProtectedRoute allowedRoles={['customer', 'coordinator', 'admin']}>
            <PortalLayout allowedRoles={['customer', 'coordinator', 'admin']}>
              <CustomerVault />
            </PortalLayout>
          </ProtectedRoute>
        } />
        <Route path="/customer/settings" element={
          <ProtectedRoute allowedRoles={['customer', 'coordinator', 'admin']}>
            <PortalLayout allowedRoles={['customer', 'coordinator', 'admin']}>
              <CustomerSettings />
            </PortalLayout>
          </ProtectedRoute>
        } />
        <Route path="/customer/comms" element={
          <ProtectedRoute allowedRoles={['customer', 'coordinator', 'admin']}>
            <PortalLayout allowedRoles={['customer', 'coordinator', 'admin']}>
              <CustomerComms />
            </PortalLayout>
          </ProtectedRoute>
        } />

        {/* ═══════════════════════════════════════════
            TEMPORARY FIX PORTAL (public, token-based)
        ═══════════════════════════════════════════ */}
        <Route path="/fix/:ticketId" element={<FixDashboard />} />
        <Route path="/fix/:ticketId/log" element={<FixLog />} />
        <Route path="/fix/:ticketId/ai" element={<FixAIProgress />} />

        {/* ═══════════════════════════════════════════
            ENGINEER PORTAL (engineer/coordinator/admin)
        ═══════════════════════════════════════════ */}
        <Route path="/engineer" element={
          <ProtectedRoute allowedRoles={['engineer', 'coordinator', 'admin']}>
            <PortalLayout allowedRoles={['engineer', 'coordinator', 'admin']}>
              <EngineerDashboard />
            </PortalLayout>
          </ProtectedRoute>
        } />
        <Route path="/engineer/sessions" element={
          <ProtectedRoute allowedRoles={['engineer', 'coordinator', 'admin']}>
            <PortalLayout allowedRoles={['engineer', 'coordinator', 'admin']}>
              <EngineerSessions />
            </PortalLayout>
          </ProtectedRoute>
        } />
        <Route path="/engineer/oncall" element={
          <ProtectedRoute allowedRoles={['engineer', 'coordinator', 'admin']}>
            <PortalLayout allowedRoles={['engineer', 'coordinator', 'admin']}>
              <EngineerOnCall />
            </PortalLayout>
          </ProtectedRoute>
        } />
        <Route path="/engineer/audit" element={
          <ProtectedRoute allowedRoles={['engineer', 'coordinator', 'admin']}>
            <PortalLayout allowedRoles={['engineer', 'coordinator', 'admin']}>
              <EngineerAudit />
            </PortalLayout>
          </ProtectedRoute>
        } />
        <Route path="/engineer/settings" element={
          <ProtectedRoute allowedRoles={['engineer', 'coordinator', 'admin']}>
            <PortalLayout allowedRoles={['engineer', 'coordinator', 'admin']}>
              <EngineerSettings />
            </PortalLayout>
          </ProtectedRoute>
        } />
        <Route path="/engineer/workspace/:incidentId" element={
          <ProtectedRoute allowedRoles={['engineer', 'coordinator', 'admin']}>
            <PortalLayout allowedRoles={['engineer', 'coordinator', 'admin']}>
              <EngineerWorkspace />
            </PortalLayout>
          </ProtectedRoute>
        } />

        {/* ═══════════════════════════════════════════
            LIFECYCLE DEMO (public, no auth)
        ═══════════════════════════════════════════ */}
        <Route path="/lifecycle" element={<LifecycleDemo />} />

        {/* ═══════════════════════════════════════════
            HQ CONTROL CENTER (coordinator/admin only)
        ═══════════════════════════════════════════ */}
        <Route path="/hq" element={
          <ProtectedRoute allowedRoles={['coordinator', 'admin']}>
            <PortalLayout allowedRoles={['coordinator', 'admin']}>
              <HQDashboard />
            </PortalLayout>
          </ProtectedRoute>
        } />
        <Route path="/hq/incidents" element={
          <ProtectedRoute allowedRoles={['coordinator', 'admin']}>
            <PortalLayout allowedRoles={['coordinator', 'admin']}>
              <HQIncidents />
            </PortalLayout>
          </ProtectedRoute>
        } />
        <Route path="/hq/engineers" element={
          <ProtectedRoute allowedRoles={['coordinator', 'admin']}>
            <PortalLayout allowedRoles={['coordinator', 'admin']}>
              <HQEngineers />
            </PortalLayout>
          </ProtectedRoute>
        } />
        <Route path="/hq/audit" element={
          <ProtectedRoute allowedRoles={['coordinator', 'admin']}>
            <PortalLayout allowedRoles={['coordinator', 'admin']}>
              <HQAudit />
            </PortalLayout>
          </ProtectedRoute>
        } />
        <Route path="/hq/settings" element={
          <ProtectedRoute allowedRoles={['coordinator', 'admin']}>
            <PortalLayout allowedRoles={['coordinator', 'admin']}>
              <HQSettings />
            </PortalLayout>
          </ProtectedRoute>
        } />
        <Route path="/hq/approvals" element={
          <ProtectedRoute allowedRoles={['coordinator', 'admin']}>
            <PortalLayout allowedRoles={['coordinator', 'admin']}>
              <HQApprovals />
            </PortalLayout>
          </ProtectedRoute>
        } />
        <Route path="/hq/communications" element={
          <ProtectedRoute allowedRoles={['coordinator', 'admin']}>
            <PortalLayout allowedRoles={['coordinator', 'admin']}>
              <HQCommunications />
            </PortalLayout>
          </ProtectedRoute>
        } />
      </Routes>
      <Toaster />
    </AuthProvider>
  );
}
