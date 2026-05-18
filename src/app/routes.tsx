import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './layouts/AppShell';
import { LoginPage } from '../features/auth/LoginPage';
import { RequireRole } from '../features/auth/RequireRole';
import { getSession } from '../features/auth/sessionStore';

const DashboardPage = lazy(() => import('../features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const CollectionPage = lazy(() => import('../features/collection/CollectionPage').then((m) => ({ default: m.CollectionPage })));
const SegregationPage = lazy(() => import('../features/segregation/SegregationPage').then((m) => ({ default: m.SegregationPage })));
const RecyclingPage = lazy(() => import('../features/recycling/RecyclingPage').then((m) => ({ default: m.RecyclingPage })));
const InventoryPage = lazy(() => import('../features/inventory/InventoryPage').then((m) => ({ default: m.InventoryPage })));

function RequireAuth({ children }: { children: JSX.Element }) {
  const session = getSession();
  if (!session) return <Navigate to="/login" replace />;
  return children;
}

export function AppRoutes() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-400">Loading…</div>}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/*"
          element={
            <RequireAuth>
              <AppShell>
                <Routes>
                  <Route path="dashboard" element={<RequireRole area="dashboard"><DashboardPage /></RequireRole>} />
                  <Route path="collection" element={<RequireRole area="collection"><CollectionPage /></RequireRole>} />
                  <Route path="segregation" element={<RequireRole area="segregation"><SegregationPage /></RequireRole>} />
                  <Route path="recycling" element={<RequireRole area="recycling"><RecyclingPage /></RequireRole>} />
                  <Route path="inventory" element={<RequireRole area="inventory"><InventoryPage /></RequireRole>} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </AppShell>
            </RequireAuth>
          }
        />
      </Routes>
    </Suspense>
  );
}
