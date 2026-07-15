import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { mapApiError } from '../../shared/errors/mapApiError';
import { authService } from '../../shared/services';
import { Button, Input } from '../../shared/ui/primitives';
import { setSession } from './sessionStore';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const loginMutation = useMutation({
    mutationFn: () => authService.login({ email, password }),
    onSuccess: (session) => {
      setSession(session);
      navigate(session.user.role === 'admin' ? '/dashboard' : '/collection');
    },
    onError: (err: unknown) => {
      setError(mapApiError(err).message);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    loginMutation.mutate();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--surface-app)]">
      <div className="radius-lg w-full max-w-sm border border-[var(--border-subtle)] bg-[var(--surface-panel)] p-8 shadow-xl">
        <h1 className="mb-6 text-2xl font-bold text-brand-500">EcoTrack</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="email"
            label="Email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={setEmail}
          />
          <Input
            id="password"
            label="Password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={setPassword}
          />
          {error && <p className="text-sm text-[var(--status-danger)]">{error}</p>}
          <Button
            type="submit"
            disabled={loginMutation.isPending}
            className="w-full"
          >
            {loginMutation.isPending ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>
      </div>
    </div>
  );
}
