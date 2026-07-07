import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  mapRecyclingBatch,
  mapInventorySyncSummary,
  recyclingService,
} from '../../src/features/recycling/recyclingService';
import { requestJson } from '../../src/shared/services/http';

vi.mock('../../src/shared/services/http', () => ({
  requestJson: vi.fn(),
}));

describe('recycling service mapping', () => {
  it('maps recycling batch dto into ui model', () => {
    const mapped = mapRecyclingBatch({
      id: 'RB-1',
      segregationBatchId: 'SB-1',
      pickupTaskId: 'pickup-1',
      sourceCategory: 'plastic',
      sourceWeightKg: 12,
      stage: 'segregated',
      outputProduct: 'Flakes',
      outputQuantity: 5,
      inventoryUpdated: false,
      stageHistory: [{ stage: 'segregated', atUtc: '2026-07-07T10:00:00Z' }],
    });

    expect(mapped.id).toBe('RB-1');
    expect(mapped.inputCategory).toBe('plastic');
    expect(mapped.inputWeightKg).toBe(12);
  });

  it('maps sync summary dto defaults', () => {
    const mapped = mapInventorySyncSummary({
      updatedItemsCount: 2,
      createdItemsCount: 1,
      skippedCount: 0,
      syncRunId: 'sync-1',
    });

    expect(mapped).toEqual({
      updatedItemsCount: 2,
      createdItemsCount: 1,
      skippedCount: 0,
      syncRunId: 'sync-1',
    });
  });
});

describe('recycling service requests', () => {
  beforeEach(() => {
    vi.mocked(requestJson).mockReset();
  });

  it('POST /api/recycling/batches/:id/advance-stage sends stage payload', async () => {
    vi.mocked(requestJson).mockResolvedValueOnce({
      id: 'RB-1',
      segregationBatchId: 'SB-1',
      pickupTaskId: 'pickup-1',
      sourceCategory: 'plastic',
      sourceWeightKg: 12,
      stage: 'processing',
      outputProduct: 'Flakes',
      outputQuantity: 5,
      inventoryUpdated: false,
      stageHistory: [
        { stage: 'segregated', atUtc: '2026-07-07T10:00:00Z' },
        { stage: 'processing', atUtc: '2026-07-07T10:10:00Z' },
      ],
    });

    await recyclingService.advanceStage('RB-1', { stage: 'processing' });

    expect(vi.mocked(requestJson)).toHaveBeenCalledWith('/api/recycling/batches/RB-1/advance-stage', {
      method: 'POST',
      body: JSON.stringify({ stage: 'processing' }),
    });
  });

  it('POST /api/recycling/conversions/sync-inventory triggers inventory sync', async () => {
    vi.mocked(requestJson).mockResolvedValueOnce({
      updatedItemsCount: 2,
      createdItemsCount: 1,
      skippedCount: 0,
      syncRunId: 'sync-1',
    });

    await recyclingService.syncInventoryFromConversions();

    expect(vi.mocked(requestJson)).toHaveBeenCalledWith('/api/recycling/conversions/sync-inventory', {
      method: 'POST',
    });
  });
});
