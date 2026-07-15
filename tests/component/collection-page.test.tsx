import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CollectionPage } from '../../src/features/collection/CollectionPage';
import { ConfirmDialogProvider } from '../../src/shared/ui/confirm/ConfirmDialogProvider';

const {
  useCollectionScheduleMock,
  useSegregationDispatchesMock,
  useCreatePickupTaskMock,
  useUpdatePickupTaskMock,
  useDeletePickupTaskMock,
  useDispatchToSegregationMock,
  useUpdatePickupStatusMock,
  usePickupAssignmentHistoryMock,
} = vi.hoisted(() => ({
  useCollectionScheduleMock: vi.fn(() => ({
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
  })),
  useSegregationDispatchesMock: vi.fn(() => ({ data: [] })),
  useCreatePickupTaskMock: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useUpdatePickupTaskMock: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useDeletePickupTaskMock: vi.fn(() => ({ mutate: vi.fn() })),
  useDispatchToSegregationMock: vi.fn(() => ({ mutate: vi.fn() })),
  useUpdatePickupStatusMock: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  usePickupAssignmentHistoryMock: vi.fn(() => ({
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
  })),
}));

vi.mock('../../src/features/collection/useCollection', () => ({
  useCollectionSchedule: useCollectionScheduleMock,
  useSegregationDispatches: useSegregationDispatchesMock,
  useCreatePickupTask: useCreatePickupTaskMock,
  useUpdatePickupTask: useUpdatePickupTaskMock,
  useDeletePickupTask: useDeletePickupTaskMock,
  useDispatchToSegregation: useDispatchToSegregationMock,
  useUpdatePickupStatus: useUpdatePickupStatusMock,
  usePickupAssignmentHistory: usePickupAssignmentHistoryMock,
}));

vi.mock('../../src/features/auth/sessionStore', async () => {
  const actual = await vi.importActual('../../src/features/auth/sessionStore');
  return {
    ...actual,
    getCurrentRole: () => 'admin',
  };
});

describe('CollectionPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useCollectionScheduleMock).mockReturnValue({
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
    });
  });

  it('renders collection rows and history icon for each pickup', () => {
    render(
      <ConfirmDialogProvider>
        <CollectionPage />
      </ConfirmDialogProvider>
    );

    expect(screen.getByText('North Campus')).toBeInTheDocument();
    expect(screen.getByLabelText('View assignment history for pickup-1')).toBeInTheDocument();
  });

  it('renders sent-to-aggregation status as Sent to Aggregation Round', () => {
    vi.mocked(useCollectionScheduleMock).mockReturnValue({
      data: [
        {
          id: 'pickup-2',
          site: 'South Campus',
          status: 'sent_to_aggregation',
          assignedCollectorId: 'collector-2',
          scheduledDate: '2026-06-21',
          estimatedWeightKg: 30,
        },
      ],
      isLoading: false,
      isError: false,
    });

    render(
      <ConfirmDialogProvider>
        <CollectionPage />
      </ConfirmDialogProvider>
    );

    expect(screen.getByText('Sent to Aggregation Round')).toBeInTheDocument();
  });

  it('uses global confirm dialog before deleting a pickup task', async () => {
    const user = userEvent.setup();
    const deleteMutate = vi.fn();

    vi.mocked(useDeletePickupTaskMock).mockReturnValue({ mutate: deleteMutate });

    render(
      <ConfirmDialogProvider>
        <CollectionPage />
      </ConfirmDialogProvider>
    );

    await user.click(screen.getByRole('button', { name: 'Delete' }));

    const dialog = screen.getByRole('dialog', { name: /delete pickup task/i });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText('Delete pickup task pickup-1?')).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: /^Delete$/i }));

    expect(deleteMutate).toHaveBeenCalledWith('pickup-1');
  });
});