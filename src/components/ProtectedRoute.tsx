// ═══════════════════════════════════════════════════════════════
// PROTECTED ROUTE — BYPASS MODE
// All access granted. No authentication or role checks.
// ═══════════════════════════════════════════════════════════════

interface Props {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export function ProtectedRoute({ children }: Props) {
  return <>{children}</>;
}
