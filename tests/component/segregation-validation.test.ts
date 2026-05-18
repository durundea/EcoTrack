import { describe, expect, it } from 'vitest';
import { validateSegregationEntry } from '../../src/features/segregation/validation';

describe('segregation validation', () => {
  it('rejects negative weights', () => {
    const result = validateSegregationEntry({ plastic: -1, organic: 4, metal: 1, paper: 0, ewaste: 0 });
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/negative/i);
  });

  it('rejects all-zero entry', () => {
    const result = validateSegregationEntry({ plastic: 0, organic: 0, metal: 0, paper: 0, ewaste: 0 });
    expect(result.valid).toBe(false);
  });

  it('accepts valid partial entry', () => {
    const result = validateSegregationEntry({ plastic: 50, organic: 30, metal: 0, paper: 10, ewaste: 0 });
    expect(result.valid).toBe(true);
  });

  it('rejects entry exceeding 10000 kg total', () => {
    const result = validateSegregationEntry({ plastic: 5000, organic: 5001, metal: 0, paper: 0, ewaste: 0 });
    expect(result.valid).toBe(false);
  });
});
