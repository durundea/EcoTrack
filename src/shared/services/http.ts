import { getAccessToken } from '../../features/auth/sessionStore';

export class ServiceHttpError extends Error {
  constructor(
    public statusCode: number,
    public bodyText: string,
  ) {
    super(bodyText || 'Request failed');
    this.name = 'ServiceHttpError';
  }
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim();

export async function requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error('VITE_API_BASE_URL is not configured. Add it to your .env file.');
  }

  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');

  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const token = getAccessToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const bodyText = await response.text();
    throw new ServiceHttpError(response.status, bodyText);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}