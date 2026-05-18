import { type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';

type Props = { children: ReactNode };

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/collection', label: 'Collection' },
  { to: '/segregation', label: 'Segregation' },
  { to: '/recycling', label: 'Recycling' },
  { to: '/inventory', label: 'Inventory' },
];

export function AppShell({ children }: Props) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="flex items-center gap-3 border-b border-slate-800 px-6 py-3">
        <span className="text-brand-500 font-bold text-lg">EcoTrack</span>
      </header>
      <div className="grid grid-cols-[240px_1fr] min-h-[calc(100vh-49px)]">
        <nav aria-label="Primary" className="border-r border-slate-800 p-4">
          <ul className="space-y-1">
            {navItems.map(({ to, label }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  className={({ isActive }) =>
                    `block rounded px-3 py-2 text-sm transition-colors ${
                      isActive
                        ? 'bg-brand-600 text-white'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                    }`
                  }
                >
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
