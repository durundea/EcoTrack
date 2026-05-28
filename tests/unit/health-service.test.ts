import { describe, expect, it, vi } from 'vitest';
import { healthService } from '../../src/shared/services';

describe('healthService', () => {
  it('calls the backend health endpoint', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ status: 'healthy' }), { status: 200 })
    );

    const result = await healthService.getHealth();

    expect(result.status).toBe('healthy');
    expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining('/health'), expect.any(Object));
  });
});
