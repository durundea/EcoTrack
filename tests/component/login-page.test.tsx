import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Providers } from '../../src/app/providers';
import { LoginPage } from '../../src/features/auth/LoginPage';
import { clearSession, getSession } from '../../src/features/auth/sessionStore';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

describe('LoginPage', () => {
  beforeEach(() => {
    clearSession();
    navigateMock.mockReset();
    vi.restoreAllMocks();
  });

  it('stores token and redirects after successful login', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          token: 'jwt-token',
          user: {
            id: 'U-001',
            name: 'Admin User',
            role: 'admin',
            email: 'admin@ecotrack.local',
          },
        }),
        { status: 200 }
      )
    );

    render(
      <Providers>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </Providers>
    );

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'admin@ecotrack.local' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'admin123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(getSession()?.token).toBe('jwt-token'));
    expect(navigateMock).toHaveBeenCalledWith('/dashboard');
  });
});
