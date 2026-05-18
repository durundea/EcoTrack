import { describe, expect, it } from 'vitest';
import { nextStage, isTerminalStage } from '../../src/features/recycling/recyclingRules';

describe('recycling stage transition', () => {
  it('moves collected to segregated', () => {
    expect(nextStage('collected')).toBe('segregated');
  });

  it('moves segregated to processing', () => {
    expect(nextStage('segregated')).toBe('processing');
  });

  it('moves processing to converted', () => {
    expect(nextStage('processing')).toBe('converted');
  });

  it('keeps converted as terminal', () => {
    expect(nextStage('converted')).toBe('converted');
    expect(isTerminalStage('converted')).toBe(true);
  });

  it('marks non-converted stages as non-terminal', () => {
    expect(isTerminalStage('processing')).toBe(false);
  });
});
