import { useMemo, useState, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { ConnectivityBadge } from '../../shared/ui/ConnectivityBadge';
import { ErrorBoundary } from '../../shared/errors/ErrorBoundary';
import { clearSession, getSession } from '../../features/auth/sessionStore';

type Props = { children: ReactNode };

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/collection', label: 'Collection' },
  { to: '/segregation', label: 'Segregation' },
  { to: '/recycling', label: 'Recycling' },
  { to: '/inventory', label: 'Inventory' },
];

export function AppShell({ children }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const user = useMemo(() => getSession(), []);

  function handleLogout() {
    clearSession();
    window.location.href = '/login';
  }

  return (
    <div className="min-h-screen text-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-800/80 bg-slate-950/90 px-6 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-brand-500 shadow-[0_0_14px_rgba(34,197,94,0.7)]" />
            <span className="text-lg font-bold tracking-tight text-brand-500">EcoTrack</span>
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs uppercase tracking-[0.08em] text-slate-300"
            >
              <span>{user?.name ?? 'User'}</span>
              <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">{user?.role ?? 'guest'}</span>
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-44 rounded-lg border border-slate-700 bg-slate-900 p-1 shadow-xl">
                {/* <a
                  href="/login"
                  className="block rounded px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
                >
                  Go to Login
                </a> */}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="block w-full rounded px-3 py-2 text-left text-sm text-rose-300 hover:bg-slate-800"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto grid min-h-[calc(100vh-57px)] max-w-[1400px] grid-cols-1 md:grid-cols-[240px_1fr]">
        <nav aria-label="Primary" className="border-b border-slate-800 px-4 py-4 md:border-b-0 md:border-r">
          <ul className="flex gap-2 overflow-x-auto md:block md:space-y-1 md:gap-0">
            {navItems.map(({ to, label }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  className={({ isActive }) =>
                    `block whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-brand-600 text-white shadow shadow-brand-900/40'
                        : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-100'
                    }`
                  }
                >
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <main className="p-4 md:p-6">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>

      <ConnectivityBadge />
    </div>
  );
}
