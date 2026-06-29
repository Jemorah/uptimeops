// ═══════════════════════════════════════════════════════════════
// CUSTOMER ROUTER — app.uptimeops.org
// 7 customer tabs. Admin allowed.
// ═══════════════════════════════════════════════════════════════

import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LoadingScreen } from '@/components/LoadingScreen';
import { PortalLayout } from '@/layouts/PortalLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';

const CustomerDashboard = lazy(() => import('@/pages/customer/CustomerDashboard').then(m => ({ default: m.CustomerDashboard })));
const CustomerIncidents = lazy(() => import('@/pages/customer/CustomerIncidents').then(m => ({ default: m.CustomerIncidents })));
const CustomerBilling   = lazy(() => import('@/pages/customer/CustomerBilling').then(m => ({ default: m.CustomerBilling })));
const CustomerVault     = lazy(() => import('@/pages/customer/CustomerVault').then(m => ({ default: m.CustomerVault })));
const CustomerComms     = lazy(() => import('@/pages/customer/CustomerComms').then(m => ({ default: m.CustomerComms })));
const CustomerSecurity  = lazy(() => import('@/pages/customer/CustomerSecurity').then(m => ({ default: m.CustomerSecurity })));
const CustomerSettings  = lazy(() => import('@/pages/customer/CustomerSettings').then(m => ({ default: m.CustomerSettings })));

export function CustomerRouter() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route element={<PortalLayout portalType="customer" />}>
          <Route path="/" element={<ProtectedRoute allowedRoles={['customer', 'admin']}><CustomerDashboard /></ProtectedRoute>} />
          <Route path="/incidents" element={<ProtectedRoute allowedRoles={['customer', 'admin']}><CustomerIncidents /></ProtectedRoute>} />
          <Route path="/billing" element={<ProtectedRoute allowedRoles={['customer', 'admin']}><CustomerBilling /></ProtectedRoute>} />
          <Route path="/vault" element={<ProtectedRoute allowedRoles={['customer', 'admin']}><CustomerVault /></ProtectedRoute>} />
          <Route path="/comms" element={<ProtectedRoute allowedRoles={['customer', 'admin']}><CustomerComms /></ProtectedRoute>} />
          <Route path="/security" element={<ProtectedRoute allowedRoles={['customer', 'admin']}><CustomerSecurity /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute allowedRoles={['customer', 'admin']}><CustomerSettings /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
