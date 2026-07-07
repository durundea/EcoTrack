import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SegregationPage } from '../../src/features/segregation/SegregationPage';

const apiMock = vi.hoisted(() => ({
  segregation: {
    getPendingBatches: vi.fn(),
    getBatches: vi.fn(),
    recordBatch: vi.fn(),
    getBatchById: vi.fn(),
    markRecycled: vi.fn(),
  },
}));

vi.mock('../../src/shared/api/client', () => ({
  api: apiMock,
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <SegregationPage />
    </QueryClientProvider>
  );
}

describe('SegregationPage integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    apiMock.segregation.getPendingBatches.mockResolvedValue([
      {
        id: 'batch-1',
        pickupTaskId: 'pickup-1',
        batchCode: 'SB-001',
        pickupCode: 'PK-001',
        status: 'pending',
        recordedAtUtc: '',
        recycledAtUtc: '',
      },
    ]);

    apiMock.segregation.getBatches.mockResolvedValue([
      {
        id: 'batch-1',
        pickupTaskId: 'pickup-1',
        batchCode: 'SB-001',
        pickupCode: 'PK-001',
        status: 'recorded',
        recordedAtUtc: '2026-06-30T08:00:00Z',
        recycledAtUtc: '',
      },
    ]);

    apiMock.segregation.recordBatch.mockResolvedValue({
      id: 'batch-1',
      createdRecyclingBatchIds: [],
      createdRecyclingCount: 0,
    });
    apiMock.segregation.markRecycled.mockResolvedValue({ id: 'batch-1' });

    apiMock.segregation.getBatchById.mockResolvedValue({
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
      recordedByUserId: 'user-1',
      recordedAtUtc: '2026-06-30T10:10:00Z',
      recycledByUserId: '',
      recycledAtUtc: '',
      createdAtUtc: '2026-06-30T09:00:00Z',
      updatedAtUtc: '2026-06-30T09:10:00Z',
    });
  });

  it('renders pending backend batches in dropdown', async () => {
    renderPage();

    expect(await screen.findByText(/SB-001 \| PK-001 \| pending/i)).toBeInTheDocument();
  });

  it('records selected batch using record endpoint', async () => {
    renderPage();

    await screen.findByText(/SB-001 \| PK-001 \| pending/i);

    fireEvent.change(screen.getByLabelText(/Segregation Queue Entry/i), { target: { value: 'batch-1' } });
    fireEvent.change(screen.getByLabelText(/Plastic \(kg\)/i), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: /Save Batch/i }));

    await waitFor(() => {
      expect(apiMock.segregation.recordBatch).toHaveBeenCalledWith('batch-1', {
        plasticKg: 10,
        organicKg: 0,
        metalKg: 0,
        paperKg: 0,
        eWasteKg: 0,
      });
    });
  });

  it('shows created recycling batch count after successful save', async () => {
    apiMock.segregation.recordBatch.mockResolvedValueOnce({
      id: 'batch-1',
      createdRecyclingBatchIds: ['rb-1', 'rb-2'],
      createdRecyclingCount: 2,
    });

    renderPage();

    await screen.findByText(/SB-001 \| PK-001 \| pending/i);

    fireEvent.change(screen.getByLabelText(/Segregation Queue Entry/i), { target: { value: 'batch-1' } });
    fireEvent.change(screen.getByLabelText(/Plastic \(kg\)/i), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: /Save Batch/i }));

    expect(await screen.findByText('Created 2 recycling batch(es).')).toBeInTheDocument();
  });

  it('loads detail endpoint when view action is clicked', async () => {
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: /View/i }));

    await waitFor(() => {
      expect(apiMock.segregation.getBatchById).toHaveBeenCalledWith('batch-1');
    });
    expect(await screen.findByRole('dialog', { name: /Segregation batch details/i })).toBeInTheDocument();
    expect(await screen.findByText(/North Campus/i)).toBeInTheDocument();
  });

  it('calls mark-recycled from action button', async () => {
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: /Send to Recycling/i }));

    await waitFor(() => {
      expect(apiMock.segregation.markRecycled).toHaveBeenCalledWith('batch-1');
    });
  });
});
