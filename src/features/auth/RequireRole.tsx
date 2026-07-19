import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import type { UserRole } from "@/types";

interface RequireRoleProps {
  allow?: UserRole[]; // omit to require any signed-in role (FR-024)
  children: ReactNode;
}

export function RequireRole({ allow, children }: RequireRoleProps) {
  const { session, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[var(--color-ink-muted)]">
        Đang tải...
      </div>
    );
  }

  if (!session || !role) {
    return <Navigate to="/dang-nhap" state={{ from: location.pathname }} replace />;
  }

  if (allow && !allow.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
