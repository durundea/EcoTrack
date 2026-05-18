import type { AppArea, AuthUser, UserRole } from './types';

const SESSION_KEY = 'ecotrack_session';

const collectorAreas: AppArea[] = ['collection', 'segregation', 'recycling'];

export function canAccess(role: UserRole, area: AppArea): boolean {
  if (role === 'admin') return true;
  return collectorAreas.includes(area);
}

export function setSession(user: AuthUser): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

export function getSession(): AuthUser | null {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function getCurrentRole(): UserRole | null {
  return getSession()?.role ?? null;
}

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}
