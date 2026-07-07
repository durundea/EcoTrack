import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RecyclingPage } from '../../src/features/recycling/RecyclingPage';

const apiMock = vi.hoisted(() => ({
  recycling: {
    getBatches: vi.fn(),
    advanceStage: vi.fn(),
    createProductConversion: vi.fn(),
  },
  inventory: {
    syncInventoryFromConversions: vi.fn(),
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
      <RecyclingPage />
    </QueryClientProvider>
  );
}

describe('RecyclingPage integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    apiMock.recycling.getBatches.mockResolvedValue([
      {
        id: 'rb-1',
        segregationBatchId: 'sb-1',
        stage: 'segregated',
        inputCategory: 'plastic',
        outputProduct: 'Flakes',
        inputWeightKg: 12,
        outputQuantity: 5,
        inventoryUpdated: false,
        stageHistory: [{ stage: 'segregated', at: '2026-07-07T10:00:00Z' }],
      },
    ]);

    apiMock.recycling.advanceStage.mockResolvedValue({
      id: 'rb-1',
      segregationBatchId: 'sb-1',
      stage: 'processing',
      inputCategory: 'plastic',
      outputProduct: 'Flakes',
      inputWeightKg: 12,
      outputQuantity: 5,
      inventoryUpdated: false,
      stageHistory: [
        { stage: 'segregated', at: '2026-07-07T10:00:00Z' },
        { stage: 'processing', at: '2026-07-07T10:10:00Z' },
      ],
    });

    apiMock.inventory.syncInventoryFromConversions.mockResolvedValue({
      updatedItemsCount: 2,
      createdItemsCount: 1,
      skippedCount: 0,
      syncRunId: 'sync-1',
    });
  });

  it('calls advance stage endpoint from action button', async () => {
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: /Advance to Processing/i }));

    await waitFor(() => {
      expect(apiMock.recycling.advanceStage).toHaveBeenCalledWith('rb-1', { stage: 'processing' });
    });
  });

  it('calls manual inventory sync endpoint and shows summary', async () => {
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: /Push Converted Products to Inventory/i }));

    await waitFor(() => {
      expect(apiMock.inventory.syncInventoryFromConversions).toHaveBeenCalledTimes(1);
    });

    expect(
      await screen.findByText('Inventory sync complete. Updated 2, created 1, skipped 0.')
    ).toBeInTheDocument();
  });
});
