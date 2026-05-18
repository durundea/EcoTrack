import { Suspense } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { AppShell } from './layouts/AppShell';
import { LoginPage } from '../features/auth/LoginPage';
import { RequireRole } from '../features/auth/RequireRole';
import { getSession } from '../features/auth/sessionStore';
import { DashboardPage } from '../features/dashboard/DashboardPage.tsx';
import { CollectionPage } from '../features/collection/CollectionPage.tsx';
import { SegregationPage } from '../features/segregation/SegregationPage.tsx';
import { RecyclingPage } from '../features/recycling/RecyclingPage.tsx';
import { InventoryPage } from '../features/inventory/InventoryPage.tsx';

function RequireAuth({ children }: { children: JSX.Element }) {
  const session = getSession();
  if (!session) return <Navigate to="/login" replace />;
  return children;
}

function ProtectedLayout() {
  return (
    <RequireAuth>
      <AppShell>
        <Outlet />
      </AppShell>
    </RequireAuth>
  );
}

export function AppRoutes() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-400">Loading…</div>}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/dashboard" element={<RequireRole area="dashboard"><DashboardPage /></RequireRole>} />
          <Route path="/collection" element={<RequireRole area="collection"><CollectionPage /></RequireRole>} />
          <Route path="/segregation" element={<RequireRole area="segregation"><SegregationPage /></RequireRole>} />
          <Route path="/recycling" element={<RequireRole area="recycling"><RecyclingPage /></RequireRole>} />
          <Route path="/inventory" element={<RequireRole area="inventory"><InventoryPage /></RequireRole>} />
        </Route>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
