import { describe, expect, it } from 'vitest';
import { upsertById } from '../../src/shared/services/queryListCache';

describe('upsertById', () => {
  it('prepends the created record when id is not present', () => {
    const existing = [
      { id: 'a', value: 'old-a' },
      { id: 'b', value: 'old-b' },
    ];
    const created = { id: 'c', value: 'new-c' };

    const result = upsertById(existing, created);

    expect(result).toEqual([
      { id: 'c', value: 'new-c' },
      { id: 'a', value: 'old-a' },
      { id: 'b', value: 'old-b' },
    ]);
  });

  it('replaces existing id and keeps the created record first without duplicates', () => {
    const existing = [
      { id: 'a', value: 'old-a' },
      { id: 'b', value: 'old-b' },
      { id: 'c', value: 'old-c' },
    ];
    const created = { id: 'b', value: 'new-b' };

    const result = upsertById(existing, created);

    expect(result).toEqual([
      { id: 'b', value: 'new-b' },
      { id: 'a', value: 'old-a' },
      { id: 'c', value: 'old-c' },
    ]);
    expect(result.filter((item) => item.id === 'b')).toHaveLength(1);
  });

  it('supports undefined existing items by returning a single-element list', () => {
    const created = { id: 'only', value: 'new-only' };

    const result = upsertById(undefined, created);

    expect(result).toEqual([{ id: 'only', value: 'new-only' }]);
  });
});
