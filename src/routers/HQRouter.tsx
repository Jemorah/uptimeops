// ═══════════════════════════════════════════════════════════════
// HQ ROUTER — dashboard.uptimeops.org
// 10 HQ/coordinator tabs. Protected — redirects to www login if no session.
// ═══════════════════════════════════════════════════════════════

import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LoadingScreen } from '@/components/LoadingScreen';
import { PortalLayout } from '@/layouts/PortalLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useWrongSubdomainCheck } from '@/hooks/useAuth';

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

export function HQRouter() {
  useWrongSubdomainCheck();

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route element={<PortalLayout portalType="admin" />}>
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
