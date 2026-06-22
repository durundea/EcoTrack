import { beforeEach, describe, expect, it, vi } from 'vitest';
import { collectionService, mapPickupDtoToTask } from '../../src/shared/services/collectionService';
import { requestJson } from '../../src/shared/services/http';

vi.mock('../../src/shared/services/http', () => ({
  requestJson: vi.fn(),
}));

describe('collection service', () => {
  beforeEach(() => {
    vi.mocked(requestJson).mockReset();
  });

  it('maps pickup dto fields into the current frontend pickup model', () => {
    const task = mapPickupDtoToTask({
      id: 'pickup-1',
      pickupCode: 'PK-001',
      siteName: 'North Campus',
      siteAddressText: '12 Green Street',
      scheduledAtUtc: '2026-06-19T10:00:00Z',
      estimatedWeightKg: 45,
      collectedWeightKg: 30,
      status: 'assigned',
      assignedCollectorUserId: 'user-2',
      assignedCollectorDisplayName: 'Asha Kumar',
      notes: 'Back gate access',
    });

    expect(task).toMatchObject({
      id: 'pickup-1',
      site: 'North Campus',
      status: 'assigned',
      assignedCollectorId: 'user-2',
      scheduledDate: '2026-06-19',
      estimatedWeightKg: 45,
      lockedAfterCollection: false,
      pickupCode: 'PK-001',
      siteAddressText: '12 Green Street',
      scheduledAtUtc: '2026-06-19T10:00:00Z',
      collectedWeightKg: 30,
      assignedCollectorDisplayName: 'Asha Kumar',
      notes: 'Back gate access',
      assignmentEvents: [],
    });
  });

  it('falls back to empty strings for nullable text fields', () => {
    const task = mapPickupDtoToTask({
      id: 'pickup-2',
      pickupCode: 'PK-002',
      siteName: 'South Campus',
      siteAddressText: '99 Lake Road',
      scheduledAtUtc: '2026-06-20T10:00:00Z',
      estimatedWeightKg: 20,
      collectedWeightKg: 0,
      status: 'scheduled',
      assignedCollectorUserId: null,
      assignedCollectorDisplayName: null,
      notes: undefined,
    });

    expect(task.assignedCollectorDisplayName).toBe('');
    expect(task.notes).toBe('');
  });

  it('accepts either a raw array or a paginated envelope for pickup lists', async () => {
    vi.mocked(requestJson).mockResolvedValueOnce([
      {
        id: 'pickup-1',
        pickupCode: 'PK-001',
        siteName: 'North Campus',
        siteAddressText: '12 Green Street',
        scheduledAtUtc: '2026-06-19T10:00:00Z',
        estimatedWeightKg: 45,
        collectedWeightKg: 30,
        status: 'assigned',
      },
    ]);

    const list = await collectionService.getSchedule();

    expect(list.page).toBe(1);
    expect(list.totalCount).toBe(1);
    expect(list.items[0]).toMatchObject({ id: 'pickup-1', site: 'North Campus' });
  });

  it('preserves paginated response metadata from the backend envelope', async () => {
    vi.mocked(requestJson).mockResolvedValueOnce({
      items: [
        {
          id: 'pickup-2',
          pickupCode: 'PK-002',
          siteName: 'South Campus',
          siteAddressText: '99 Lake Road',
          scheduledAtUtc: '2026-06-20T10:00:00Z',
          estimatedWeightKg: 20,
          collectedWeightKg: 0,
          status: 'scheduled',
        },
      ],
      page: 2,
      pageSize: 10,
      totalCount: 25,
      totalPages: 3,
    });

    const list = await collectionService.getSchedule();

    expect(list.page).toBe(2);
    expect(list.pageSize).toBe(10);
    expect(list.totalCount).toBe(25);
    expect(list.totalPages).toBe(3);
    expect(list.items[0]).toMatchObject({ id: 'pickup-2', site: 'South Campus' });
  });

  it('falls back to legacy pickup data when the list request fails', async () => {
    vi.mocked(requestJson).mockRejectedValueOnce(new Error('backend unavailable'));

    const list = await collectionService.getSchedule();

    expect(list.items.length).toBeGreaterThan(0);
    expect(list.totalCount).toBe(list.items.length);
    expect(list.items[0]).toMatchObject({
      id: expect.any(String),
      site: expect.any(String),
      scheduledDate: expect.any(String),
    });
  });

  it('calls the pickup assign endpoint with the expected payload', async () => {
    vi.mocked(requestJson).mockResolvedValueOnce({
      id: 'pickup-1',
      pickupCode: 'PK-001',
      siteName: 'North Campus',
      siteAddressText: '12 Green Street',
      scheduledAtUtc: '2026-06-19T10:00:00Z',
      estimatedWeightKg: 45,
      collectedWeightKg: 30,
      status: 'assigned',
    });

    await collectionService.assignTask('pickup-1', {
      assignedCollectorUserId: 'user-9',
      note: 'Route changed',
    });

    expect(vi.mocked(requestJson)).toHaveBeenCalledWith('/api/collection/pickups/pickup-1/assign', {
      method: 'POST',
      body: JSON.stringify({ assignedCollectorUserId: 'user-9', note: 'Route changed' }),
    });
  });

  it('maps assignment history responses into event arrays', async () => {
    vi.mocked(requestJson).mockResolvedValueOnce({
      events: [
        {
          id: 'event-1',
          pickupTaskId: 'pickup-1',
          previousCollectorUserId: 'user-1',
          newCollectorUserId: 'user-2',
          changedByUserId: 'admin-1',
          changedByDisplayName: 'Asha Kumar',
          changedAtUtc: '2026-06-19T11:00:00Z',
          note: 'Reassigned after call',
        },
      ],
    });

    const events = await collectionService.getAssignmentHistory('pickup-1');

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      id: 'event-1',
      changedByDisplayName: 'Asha Kumar',
      note: 'Reassigned after call',
    });
  });

  it('calls the pickup delete endpoint with the expected payload', async () => {
    vi.mocked(requestJson).mockResolvedValueOnce({
      id: 'pickup-1',
      pickupCode: 'PK-001',
      siteName: 'North Campus',
      siteAddressText: '12 Green Street',
      scheduledAtUtc: '2026-06-19T10:00:00Z',
      estimatedWeightKg: 45,
      collectedWeightKg: 30,
      status: 'collected',
    });

    await collectionService.deleteTask('pickup-1', { reason: 'Cancelled by site' });

    expect(vi.mocked(requestJson)).toHaveBeenCalledWith('/api/collection/pickups/pickup-1', {
      method: 'DELETE',
      body: JSON.stringify({ reason: 'Cancelled by site' }),
    });
  });
});