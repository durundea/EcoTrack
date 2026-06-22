import { describe, expect, it } from 'vitest';
import { formatAssignmentHistorySummary } from '../../src/features/collection/historySummary';

describe('collection history summary', () => {
  it('formats compact lines with who, when, and note', () => {
    const lines = formatAssignmentHistorySummary([
      {
        id: 'event-1',
        pickupTaskId: 'pickup-1',
        changedByUserId: 'user-1',
        changedByDisplayName: 'Asha Kumar',
        changedAtUtc: '2026-06-19T10:15:00Z',
        note: 'Collector reassigned due to route overlap',
      },
    ]);

    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('Changed by Asha Kumar at');
    expect(lines[0]).toContain('Collector reassigned due to route overlap');
  });

  it('uses safe placeholders for missing fields', () => {
    const lines = formatAssignmentHistorySummary([
      {
        id: 'event-2',
        pickupTaskId: 'pickup-1',
        changedAtUtc: 'bad-date',
      },
    ]);

    expect(lines[0]).toContain('Changed by Unknown user at Unknown time');
    expect(lines[0]).toContain('No note provided');
  });
});