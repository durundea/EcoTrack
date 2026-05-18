import { describe, expect, it } from 'vitest';
import { mapApiError } from '../../src/shared/errors/mapApiError';

describe('mapApiError', () => {
  it('maps 401 to access denied', () => {
    expect(mapApiError(401).title).toBe('Access denied');
    expect(mapApiError(401).retryable).toBe(false);
  });

  it('maps 409 to conflict message', () => {
    const result = mapApiError(409);
    expect(result.title).toBe('Conflict detected');
    expect(result.retryable).toBe(true);
  });

  it('maps 404 to not found', () => {
    expect(mapApiError(404).title).toBe('Record not found');
  });

  it('maps 500 as retryable server error', () => {
    const result = mapApiError(500);
    expect(result.retryable).toBe(true);
    expect(result.title).toBe('Unexpected server error');
  });
});
