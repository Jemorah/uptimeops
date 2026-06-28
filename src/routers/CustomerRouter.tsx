// ═══════════════════════════════════════════════════════════════
// CUSTOMER ROUTER — app.uptimeops.org
// 7 customer tabs. No auth required (admin bypass).
// ═══════════════════════════════════════════════════════════════

import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LoadingScreen } from '@/components/LoadingScreen';
import { PortalLayout } from '@/layouts/PortalLayout';

const CustomerDashboard    = lazy(() => import('@/pages/customer/CustomerDashboard').then(m => ({ default: m.CustomerDashboard })));
const CustomerIncidents    = lazy(() => import('@/pages/customer/CustomerIncidents').then(m => ({ default: m.CustomerIncidents })));
const CustomerBilling      = lazy(() => import('@/pages/customer/CustomerBilling').then(m => ({ default: m.CustomerBilling })));
const CustomerVault        = lazy(() => import('@/pages/customer/CustomerVault').then(m => ({ default: m.CustomerVault })));
const CustomerComms        = lazy(() => import('@/pages/customer/CustomerComms').then(m => ({ default: m.CustomerComms })));
const CustomerSecurity     = lazy(() => import('@/pages/customer/CustomerSecurity').then(m => ({ default: m.CustomerSecurity })));
const CustomerSettings     = lazy(() => import('@/pages/customer/CustomerSettings').then(m => ({ default: m.CustomerSettings })));

export function CustomerRouter() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route element={<PortalLayout portalType="customer" />}>
          <Route path="/" element={<CustomerDashboard />} />
          <Route path="/incidents" element={<CustomerIncidents />} />
          <Route path="/billing" element={<CustomerBilling />} />
          <Route path="/vault" element={<CustomerVault />} />
          <Route path="/comms" element={<CustomerComms />} />
          <Route path="/security" element={<CustomerSecurity />} />
          <Route path="/settings" element={<CustomerSettings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
