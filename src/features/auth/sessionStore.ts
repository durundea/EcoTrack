import type { AppArea, AuthSession, AuthUser, UserRole } from './types';

const SESSION_KEY = 'ecotrack_session';

const collectorAreas: AppArea[] = ['collection', 'segregation', 'recycling', 'inventory'];

type SessionState = AuthUser | { token: string; user: AuthUser };

function isSessionWithToken(session: SessionState): session is { token: string; user: AuthUser } {
  return 'user' in session;
}

function readSession(): SessionState | null {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as SessionState;
  } catch {
    return null;
  }
}

function normalizeSession(session: SessionState): AuthSession {
  return isSessionWithToken(session) ? session : { token: '', user: session };
}

export function canAccess(role: UserRole, area: AppArea): boolean {
  if (role === 'admin') return true;
  return collectorAreas.includes(area);
}

export function setSession(session: SessionState): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(normalizeSession(session)));
}

export function getSession(): AuthSession | null {
  const session = readSession();
  if (!session) return null;

  return normalizeSession(session);
}

export function getCurrentRole(): UserRole | null {
  return getSession()?.user.role ?? null;
}

export function getAccessToken(): string | null {
  return getSession()?.token ?? null;
}

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}
