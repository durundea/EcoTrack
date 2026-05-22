import { describe, expect, it, beforeEach } from 'vitest';
import { canAccess, setSession, getCurrentRole, clearSession } from '../../src/features/auth/sessionStore';

describe('role access', () => {
  beforeEach(() => clearSession());

  it('allows collector on inventory routes', () => {
    expect(canAccess('collector', 'inventory')).toBe(true);
  });

  it('blocks collector from dashboard', () => {
    expect(canAccess('collector', 'dashboard')).toBe(false);
  });

  it('allows collector on collection', () => {
    expect(canAccess('collector', 'collection')).toBe(true);
  });

  it('allows admin on all areas', () => {
    const areas = ['dashboard', 'collection', 'segregation', 'recycling', 'inventory'] as const;
    areas.forEach((area) => expect(canAccess('admin', area)).toBe(true));
  });
});

describe('session store', () => {
  beforeEach(() => clearSession());

  it('returns null role when no session', () => {
    expect(getCurrentRole()).toBeNull();
  });

  it('returns role after setSession', () => {
    setSession({ id: 'U-1', name: 'Test', role: 'admin', email: 'a@b.com' });
    expect(getCurrentRole()).toBe('admin');
  });
});
