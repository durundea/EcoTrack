import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { setSession } from './sessionStore';
import type { AuthUser } from './types';

// Mock credentials for development (replaced by real API adapter later)
const MOCK_USERS: Record<string, AuthUser & { password: string }> = {
  'admin@ecotrack.local': {
    id: 'U-001',
    name: 'Admin User',
    role: 'admin',
    email: 'admin@ecotrack.local',
    password: 'admin123',
  },
  'collector@ecotrack.local': {
    id: 'U-002',
    name: 'Field Collector',
    role: 'collector',
    email: 'collector@ecotrack.local',
    password: 'collector123',
  },
};

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const user = MOCK_USERS[email];
    if (!user || user.password !== password) {
      setError('Invalid email or password.');
      return;
    }
    const { password: _, ...authUser } = user;
    setSession(authUser);
    navigate(authUser.role === 'admin' ? '/dashboard' : '/collection');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950">
      <div className="w-full max-w-sm rounded-lg border border-slate-800 bg-slate-900 p-8 shadow-xl">
        <h1 className="mb-6 text-2xl font-bold text-brand-500">EcoTrack</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm text-slate-400">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 focus:border-brand-500 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm text-slate-400">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 focus:border-brand-500 focus:outline-none"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            className="w-full rounded bg-brand-600 py-2 font-semibold text-white hover:bg-brand-700 transition-colors"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
