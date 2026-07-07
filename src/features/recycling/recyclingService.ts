import type {
  InventorySyncSummaryDto,
  ProductConversion,
  RecyclingAdvanceStageInputDto,
  RecyclingBatch,
  RecyclingBatchDto,
  RecyclingBatchListResponseDto,
  RecyclingCreateProductConversionInputDto,
} from '../../shared/api/contracts';
import { requestJson } from '../../shared/services/http';

function normalizeText(value: string | null | undefined): string {
  return value ?? '';
}

function normalizeNumber(value: number | null | undefined): number {
  return value ?? 0;
}

function normalizeBatchList(payload: RecyclingBatchDto[] | RecyclingBatchListResponseDto): RecyclingBatchDto[] {
  return Array.isArray(payload) ? payload : payload.items ?? [];
}

export function mapRecyclingBatch(dto: RecyclingBatchDto): RecyclingBatch {
  return {
    id: dto.id,
    segregationBatchId: dto.segregationBatchId,
    stage: dto.stage,
    inputCategory: dto.sourceCategory,
    outputProduct: normalizeText(dto.outputProduct),
    inputWeightKg: normalizeNumber(dto.sourceWeightKg),
    outputQuantity: normalizeNumber(dto.outputQuantity),
    inventoryUpdated: Boolean(dto.inventoryUpdated),
    stageHistory: (dto.stageHistory ?? []).map((entry) => ({
      stage: entry.stage,
      at: normalizeText(entry.atUtc),
    })),
  };
}

export function mapInventorySyncSummary(dto: InventorySyncSummaryDto): InventorySyncSummaryDto {
  return {
    updatedItemsCount: normalizeNumber(dto.updatedItemsCount),
    createdItemsCount: normalizeNumber(dto.createdItemsCount),
    skippedCount: normalizeNumber(dto.skippedCount),
    syncRunId: normalizeText(dto.syncRunId),
  };
}

export const recyclingService = {
  async getBatches(page = 1, pageSize = 20): Promise<RecyclingBatch[]> {
    const payload = await requestJson<RecyclingBatchDto[] | RecyclingBatchListResponseDto>(
      `/api/recycling/batches?page=${page}&pageSize=${pageSize}`
    );

    return normalizeBatchList(payload).map(mapRecyclingBatch);
  },

  async advanceStage(id: string, input: RecyclingAdvanceStageInputDto): Promise<RecyclingBatch> {
    const payload = await requestJson<RecyclingBatchDto>(`/api/recycling/batches/${id}/advance-stage`, {
      method: 'POST',
      body: JSON.stringify(input),
    });

    return mapRecyclingBatch(payload);
  },

  async createProductConversion(input: RecyclingCreateProductConversionInputDto): Promise<ProductConversion> {
    const payload = await requestJson<ProductConversion>(
      `/api/recycling/batches/${input.recyclingBatchId}/conversions`,
      {
        method: 'POST',
        body: JSON.stringify({
          productName: input.productName,
          quantity: input.quantity,
          unit: input.unit,
        }),
      }
    );

    return payload;
  },

  async syncInventoryFromConversions(): Promise<InventorySyncSummaryDto> {
    const payload = await requestJson<InventorySyncSummaryDto>('/api/recycling/conversions/sync-inventory', {
      method: 'POST',
    });

    return mapInventorySyncSummary(payload);
  },
};
