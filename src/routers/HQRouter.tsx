// ═══════════════════════════════════════════════════════════════
// HQ ROUTER — dashboard.uptimeops.org
// 10 HQ/coordinator tabs. No auth required (admin bypass).
// ═══════════════════════════════════════════════════════════════

import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LoadingScreen } from '@/components/LoadingScreen';
import { PortalLayout } from '@/layouts/PortalLayout';

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
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route element={<PortalLayout portalType="admin" />}>
          <Route path="/" element={<HQDashboard />} />
          <Route path="/incidents" element={<HQIncidents />} />
          <Route path="/approvals" element={<HQApprovals />} />
          <Route path="/engineers" element={<HQEngineers />} />
          <Route path="/audit" element={<HQAudit />} />
          <Route path="/communications" element={<HQCommunications />} />
          <Route path="/gap-seal" element={<GapSealAudit />} />
          <Route path="/scanners" element={<HQScanners />} />
          <Route path="/guidelines" element={<HQGuidelines />} />
          <Route path="/settings" element={<HQSettings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
