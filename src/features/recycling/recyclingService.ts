import type {
  ProductConversion,
  RecyclingAdvanceStageInputDto,
  RecyclingBatch,
  RecyclingBatchDto,
  RecyclingBatchListResponseDto,
  RecyclingCreateProductConversionInputDto,
} from '../../shared/api/contracts';
import { requestJson } from '../../shared/services/http';
import { inventoryService, mapInventorySyncSummary } from '../../shared/services/inventoryService';

export { mapInventorySyncSummary } from '../../shared/services/inventoryService';

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

  syncInventoryFromConversions: inventoryService.syncInventoryFromConversions,
};
