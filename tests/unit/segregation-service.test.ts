import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  mapPendingSegregationItem,
  mapSegregationDetail,
  mapSegregationListItem,
  segregationService,
} from '../../src/features/segregation/segregationService';
import { requestJson } from '../../src/shared/services/http';

vi.mock('../../src/shared/services/http', () => ({
  requestJson: vi.fn(),
}));

describe('segregation service mapping', () => {
  it('maps pending queue item fields', () => {
    const mapped = mapPendingSegregationItem({
      id: 'batch-1',
      pickupTaskId: 'pickup-1',
      batchCode: 'SB-001',
      pickupCode: 'PK-001',
      status: 'pending',
      recordedAtUtc: null,
      recycledAtUtc: null,
    });

    expect(mapped).toEqual({
      id: 'batch-1',
      pickupTaskId: 'pickup-1',
      batchCode: 'SB-001',
      pickupCode: 'PK-001',
      status: 'pending',
      recordedAtUtc: '',
      recycledAtUtc: '',
    });
  });

  it('maps detail payload numeric fields with defaults', () => {
    const mapped = mapSegregationDetail({
      id: 'batch-1',
      batchCode: 'SB-001',
      status: 'recorded',
      pickupTaskId: 'pickup-1',
      pickupCode: 'PK-001',
      siteName: 'North Campus',
      siteAddressText: '12 Green Street',
      scheduledAtUtc: '2026-06-30T10:00:00Z',
      collectedWeightKg: 120,
      plasticKg: undefined,
      organicKg: 40,
      metalKg: 20,
      paperKg: undefined,
      eWasteKg: 5,
      recordedByUserId: null,
      recordedAtUtc: null,
      recycledByUserId: null,
      recycledAtUtc: null,
      createdAtUtc: '2026-06-30T09:00:00Z',
      updatedAtUtc: '2026-06-30T09:10:00Z',
    });

    expect(mapped.plasticKg).toBe(0);
    expect(mapped.paperKg).toBe(0);
    expect(mapped.recordedAtUtc).toBe('');
  });

  it('maps history list payload', () => {
    const mapped = mapSegregationListItem({
      id: 'batch-2',
      pickupTaskId: 'pickup-2',
      batchCode: 'SB-002',
      pickupCode: 'PK-002',
      status: 'recycled',
      recordedAtUtc: '2026-06-30T08:00:00Z',
      recycledAtUtc: '2026-06-30T09:00:00Z',
    });

    expect(mapped.status).toBe('recycled');
    expect(mapped.batchCode).toBe('SB-002');
  });
});

describe('segregation service requests', () => {
  beforeEach(() => {
    vi.mocked(requestJson).mockReset();
  });

  it('posts record payload to record endpoint', async () => {
    vi.mocked(requestJson).mockResolvedValueOnce({
      id: 'batch-1',
      batchCode: 'SB-001',
      status: 'recorded',
      pickupTaskId: 'pickup-1',
      pickupCode: 'PK-001',
      siteName: 'North Campus',
      siteAddressText: '12 Green Street',
      scheduledAtUtc: '2026-06-30T10:00:00Z',
      collectedWeightKg: 120,
      plasticKg: 10,
      organicKg: 20,
      metalKg: 5,
      paperKg: 3,
      eWasteKg: 1,
      recordedByUserId: null,
      recordedAtUtc: null,
      recycledByUserId: null,
      recycledAtUtc: null,
      createdAtUtc: '2026-06-30T09:00:00Z',
      updatedAtUtc: '2026-06-30T09:10:00Z',
      createdRecyclingBatchIds: ['rb-1', 'rb-2'],
      createdRecyclingCount: 2,
    });

    const result = await segregationService.recordBatch('batch-1', {
      plasticKg: 10,
      organicKg: 20,
      metalKg: 5,
      paperKg: 3,
      eWasteKg: 1,
    });

    expect(result.createdRecyclingBatchIds).toEqual(['rb-1', 'rb-2']);
    expect(result.createdRecyclingCount).toBe(2);

    expect(vi.mocked(requestJson)).toHaveBeenCalledWith('/api/segregation/batches/batch-1/record', {
      method: 'POST',
      body: JSON.stringify({ plasticKg: 10, organicKg: 20, metalKg: 5, paperKg: 3, eWasteKg: 1 }),
    });
  });

  it('posts to mark-recycled endpoint', async () => {
    vi.mocked(requestJson).mockResolvedValueOnce({
      id: 'batch-1',
      batchCode: 'SB-001',
      status: 'recycled',
      pickupTaskId: 'pickup-1',
      pickupCode: 'PK-001',
      siteName: 'North Campus',
      siteAddressText: '12 Green Street',
      scheduledAtUtc: '2026-06-30T10:00:00Z',
      collectedWeightKg: 120,
      plasticKg: 10,
      organicKg: 20,
      metalKg: 5,
      paperKg: 3,
      eWasteKg: 1,
      recordedByUserId: null,
      recordedAtUtc: null,
      recycledByUserId: null,
      recycledAtUtc: null,
      createdAtUtc: '2026-06-30T09:00:00Z',
      updatedAtUtc: '2026-06-30T09:10:00Z',
    });

    await segregationService.markRecycled('batch-1');

    expect(vi.mocked(requestJson)).toHaveBeenCalledWith('/api/segregation/batches/batch-1/mark-recycled', {
      method: 'POST',
    });
  });
});
