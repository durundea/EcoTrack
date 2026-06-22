import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CollectionPage } from '../../src/features/collection/CollectionPage';

vi.mock('../../src/features/collection/useCollection', () => ({
  useCollectionSchedule: () => ({
    data: [
      {
        id: 'pickup-1',
        site: 'North Campus',
        status: 'scheduled',
        assignedCollectorId: 'collector-1',
        scheduledDate: '2026-06-20',
        estimatedWeightKg: 25,
      },
    ],
    isLoading: false,
    isError: false,
  }),
  useSegregationDispatches: () => ({ data: [] }),
  useCreatePickupTask: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdatePickupTask: () => ({ mutate: vi.fn(), isPending: false }),
  useDeletePickupTask: () => ({ mutate: vi.fn() }),
  useDispatchToSegregation: () => ({ mutate: vi.fn() }),
  useUpdatePickupStatus: () => ({ mutate: vi.fn(), isPending: false }),
  usePickupAssignmentHistory: () => ({
    data: [
      {
        id: 'event-1',
        pickupTaskId: 'pickup-1',
        changedByDisplayName: 'Admin User',
        changedAtUtc: '2026-06-20T10:00:00Z',
        note: 'Assigned after route review',
      },
    ],
    isLoading: false,
  }),
}));

vi.mock('../../src/features/auth/sessionStore', async () => {
  const actual = await vi.importActual('../../src/features/auth/sessionStore');
  return {
    ...actual,
    getCurrentRole: () => 'admin',
  };
});

describe('CollectionPage', () => {
  it('renders collection rows and history icon for each pickup', () => {
    render(<CollectionPage />);

    expect(screen.getByText('North Campus')).toBeInTheDocument();
    expect(screen.getByLabelText('View assignment history for pickup-1')).toBeInTheDocument();
  });
});