// ═══════════════════════════════════════════════════════════════
// PROTECTED ROUTE — If not authenticated, redirect to /login.
// Uses React Router <Navigate>, no useEffect, no window.location.
// Admin passes all role checks.
// ═══════════════════════════════════════════════════════════════

import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import type { UserRole } from '@/lib/supabase/client';
import { Zap, Loader2, ShieldAlert } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: Props) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Zap className="w-5 h-5 text-[#a3e635] animate-pulse mx-auto" />
          <Loader2 className="w-6 h-6 text-[#a3e635] animate-spin mx-auto" />
          <p className="text-xs text-white/40 font-mono">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && role !== 'admin' && !allowedRoles.includes(role)) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center space-y-4 max-w-sm px-4">
          <ShieldAlert className="w-10 h-10 text-red-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">Access Denied</h2>
          <p className="text-sm text-white/50">Role: {role}</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
