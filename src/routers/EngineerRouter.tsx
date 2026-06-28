// ═══════════════════════════════════════════════════════════════
// ENGINEER ROUTER — engineers.uptimeops.org
// 6 engineer workspace tabs. No auth required (admin bypass).
// ═══════════════════════════════════════════════════════════════

import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LoadingScreen } from '@/components/LoadingScreen';
import { PortalLayout } from '@/layouts/PortalLayout';

const EngineerDashboard   = lazy(() => import('@/pages/engineer/EngineerDashboard').then(m => ({ default: m.EngineerDashboard })));
const EngineerSessions    = lazy(() => import('@/pages/engineer/EngineerSessions').then(m => ({ default: m.EngineerSessions })));
const EngineerWorkspace   = lazy(() => import('@/pages/engineer/EngineerWorkspace').then(m => ({ default: m.EngineerWorkspace })));
const IncidentWorkspace   = lazy(() => import('@/pages/engineer/IncidentWorkspace').then(m => ({ default: m.IncidentWorkspace })));
const EngineerAudit       = lazy(() => import('@/pages/engineer/EngineerAudit').then(m => ({ default: m.EngineerAudit })));
const EngineerOnCall      = lazy(() => import('@/pages/engineer/EngineerOnCall').then(m => ({ default: m.EngineerOnCall })));
const EngineerSecurity    = lazy(() => import('@/pages/engineer/EngineerSecurity').then(m => ({ default: m.EngineerSecurity })));
const EngineerSettings    = lazy(() => import('@/pages/engineer/EngineerSettings').then(m => ({ default: m.EngineerSettings })));

export function EngineerRouter() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route element={<PortalLayout portalType="engineer" />}>
          <Route path="/" element={<EngineerDashboard />} />
          <Route path="/sessions" element={<EngineerSessions />} />
          <Route path="/workspace/:incidentId" element={<EngineerWorkspace />} />
          <Route path="/incident/:incidentId" element={<IncidentWorkspace />} />
          <Route path="/audit" element={<EngineerAudit />} />
          <Route path="/oncall" element={<EngineerOnCall />} />
          <Route path="/security" element={<EngineerSecurity />} />
          <Route path="/settings" element={<EngineerSettings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
