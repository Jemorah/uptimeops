// ═══════════════════════════════════════════════════════════════
// ENGINEER ROUTER — engineers.uptimeops.org
// 6 engineer workspace tabs. Admin allowed.
// ═══════════════════════════════════════════════════════════════

import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LoadingScreen } from '@/components/LoadingScreen';
import { PortalLayout } from '@/layouts/PortalLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';

const EngineerDashboard = lazy(() => import('@/pages/engineer/EngineerDashboard').then(m => ({ default: m.EngineerDashboard })));
const EngineerSessions  = lazy(() => import('@/pages/engineer/EngineerSessions').then(m => ({ default: m.EngineerSessions })));
const EngineerWorkspace = lazy(() => import('@/pages/engineer/EngineerWorkspace').then(m => ({ default: m.EngineerWorkspace })));
const IncidentWorkspace = lazy(() => import('@/pages/engineer/IncidentWorkspace').then(m => ({ default: m.IncidentWorkspace })));
const EngineerAudit     = lazy(() => import('@/pages/engineer/EngineerAudit').then(m => ({ default: m.EngineerAudit })));
const EngineerOnCall    = lazy(() => import('@/pages/engineer/EngineerOnCall').then(m => ({ default: m.EngineerOnCall })));
const EngineerSecurity  = lazy(() => import('@/pages/engineer/EngineerSecurity').then(m => ({ default: m.EngineerSecurity })));
const EngineerSettings  = lazy(() => import('@/pages/engineer/EngineerSettings').then(m => ({ default: m.EngineerSettings })));

export function EngineerRouter() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route element={<PortalLayout portalType="engineer" />}>
          <Route path="/" element={<ProtectedRoute allowedRoles={['engineer', 'admin']}><EngineerDashboard /></ProtectedRoute>} />
          <Route path="/sessions" element={<ProtectedRoute allowedRoles={['engineer', 'admin']}><EngineerSessions /></ProtectedRoute>} />
          <Route path="/workspace/:incidentId" element={<ProtectedRoute allowedRoles={['engineer', 'admin']}><EngineerWorkspace /></ProtectedRoute>} />
          <Route path="/incident/:incidentId" element={<ProtectedRoute allowedRoles={['engineer', 'admin']}><IncidentWorkspace /></ProtectedRoute>} />
          <Route path="/audit" element={<ProtectedRoute allowedRoles={['engineer', 'admin']}><EngineerAudit /></ProtectedRoute>} />
          <Route path="/oncall" element={<ProtectedRoute allowedRoles={['engineer', 'admin']}><EngineerOnCall /></ProtectedRoute>} />
          <Route path="/security" element={<ProtectedRoute allowedRoles={['engineer', 'admin']}><EngineerSecurity /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute allowedRoles={['engineer', 'admin']}><EngineerSettings /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
