import { beforeEach, describe, expect, it } from 'vitest';
import { clearSession, getAccessToken, getSession, setSession } from '../../src/features/auth/sessionStore';

describe('auth session store', () => {
  beforeEach(() => {
    sessionStorage.clear();
    clearSession();
  });

  it('persists token and user in one session object', () => {
    setSession({
      token: 'jwt-token',
      user: {
        id: 'U-001',
        name: 'Admin User',
        role: 'admin',
        email: 'admin@ecotrack.local',
      },
    });

    expect(getAccessToken()).toBe('jwt-token');
    expect(getSession()?.user.role).toBe('admin');
  });

  it('normalizes legacy user-only sessions', () => {
    setSession({
      id: 'U-002',
      name: 'Field Collector',
      role: 'collector',
      email: 'collector@ecotrack.local',
    });

    expect(getAccessToken()).toBe('');
    expect(getSession()?.user.id).toBe('U-002');
  });
});
