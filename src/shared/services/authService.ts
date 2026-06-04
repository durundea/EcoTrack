import type { AuthSession, AuthUser, LoginCredentials } from '../../features/auth/types';
import { requestJson } from './http';

export const authService = {
  login(credentials: LoginCredentials) {
    return requestJson<AuthSession>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },
  me() {
    return requestJson<AuthUser>('/api/auth/me');
  },
};