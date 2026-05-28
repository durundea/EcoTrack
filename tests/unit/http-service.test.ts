import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requestJson, ServiceHttpError } from '../../src/shared/services/http';
import { clearSession, setSession } from '../../src/features/auth/sessionStore';

describe('requestJson', () => {
  beforeEach(() => {
    clearSession();
    vi.restoreAllMocks();
  });

  it('adds bearer token and base url to outgoing requests', async () => {
    setSession({
      token: 'jwt-token',
      user: {
        id: 'U-001',
        name: 'Admin User',
        role: 'admin',
        email: 'admin@ecotrack.local',
      },
    });

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    );

    await requestJson('/api/auth/me');

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/me'),
      expect.objectContaining({ headers: expect.any(Headers) })
    );

    const [, init] = fetchSpy.mock.calls[0];
    const headers = init?.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer jwt-token');
  });

  it('throws ServiceHttpError when the response is not ok', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('Unauthorized', { status: 401 }));

    await expect(requestJson('/api/auth/me')).rejects.toBeInstanceOf(ServiceHttpError);
  });
});