import { Navigate } from 'react-router-dom';
import { canAccess, getCurrentRole } from './sessionStore';
import type { AppArea } from './types';

type Props = {
  area: AppArea;
  children: JSX.Element;
};

export function RequireRole({ area, children }: Props) {
  const role = getCurrentRole();
  if (!role) return <Navigate to="/login" replace />;
  if (!canAccess(role, area)) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-xl font-semibold text-[var(--status-danger)]">Access denied</p>
        <p className="text-sm text-[var(--text-muted)]">You do not have permission to view this page.</p>
      </div>
    );
  }
  return children;
}
