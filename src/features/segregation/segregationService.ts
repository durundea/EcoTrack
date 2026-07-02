import type {
  SegregationBatchDetailDto,
  SegregationBatchListItemDto,
  SegregationBatchListResponseDto,
  SegregationRecordInputDto,
} from '../../shared/api/contracts';
import { requestJson } from '../../shared/services/http';

export type SegregationBatchSummary = {
  id: string;
  pickupTaskId: string;
  batchCode: string;
  pickupCode: string;
  status: string;
  recordedAtUtc: string;
  recycledAtUtc: string;
};

export type SegregationBatchDetail = {
  id: string;
  batchCode: string;
  status: string;
  pickupTaskId: string;
  pickupCode: string;
  siteName: string;
  siteAddressText: string;
  scheduledAtUtc: string;
  collectedWeightKg: number;
  plasticKg: number;
  organicKg: number;
  metalKg: number;
  paperKg: number;
  eWasteKg: number;
  recordedByUserId: string;
  recordedAtUtc: string;
  recycledByUserId: string;
  recycledAtUtc: string;
  createdAtUtc: string;
  updatedAtUtc: string;
};

function normalizeText(value: string | null | undefined): string {
  return value ?? '';
}

function normalizeNumber(value: number | null | undefined): number {
  return value ?? 0;
}

function normalizeListPayload(payload: SegregationBatchListItemDto[] | SegregationBatchListResponseDto): SegregationBatchListItemDto[] {
  return Array.isArray(payload) ? payload : payload.items ?? [];
}

export function mapPendingSegregationItem(dto: SegregationBatchListItemDto): SegregationBatchSummary {
  return {
    id: dto.id,
    pickupTaskId: dto.pickupTaskId,
    batchCode: normalizeText(dto.batchCode),
    pickupCode: normalizeText(dto.pickupCode),
    status: normalizeText(dto.status),
    recordedAtUtc: normalizeText(dto.recordedAtUtc),
    recycledAtUtc: normalizeText(dto.recycledAtUtc),
  };
}

export const mapSegregationListItem = mapPendingSegregationItem;

export function mapSegregationDetail(dto: SegregationBatchDetailDto): SegregationBatchDetail {
  return {
    id: dto.id,
    batchCode: normalizeText(dto.batchCode),
    status: normalizeText(dto.status),
    pickupTaskId: dto.pickupTaskId,
    pickupCode: normalizeText(dto.pickupCode),
    siteName: normalizeText(dto.siteName),
    siteAddressText: normalizeText(dto.siteAddressText),
    scheduledAtUtc: normalizeText(dto.scheduledAtUtc),
    collectedWeightKg: normalizeNumber(dto.collectedWeightKg),
    plasticKg: normalizeNumber(dto.plasticKg),
    organicKg: normalizeNumber(dto.organicKg),
    metalKg: normalizeNumber(dto.metalKg),
    paperKg: normalizeNumber(dto.paperKg),
    eWasteKg: normalizeNumber(dto.eWasteKg),
    recordedByUserId: normalizeText(dto.recordedByUserId),
    recordedAtUtc: normalizeText(dto.recordedAtUtc),
    recycledByUserId: normalizeText(dto.recycledByUserId),
    recycledAtUtc: normalizeText(dto.recycledAtUtc),
    createdAtUtc: normalizeText(dto.createdAtUtc),
    updatedAtUtc: normalizeText(dto.updatedAtUtc),
  };
}

export const segregationService = {
  async getBatches(page = 1, pageSize = 20): Promise<SegregationBatchSummary[]> {
    const payload = await requestJson<SegregationBatchListItemDto[] | SegregationBatchListResponseDto>(
      `/api/segregation/batches?page=${page}&pageSize=${pageSize}`
    );

    return normalizeListPayload(payload).map(mapSegregationListItem);
  },

  async getPendingBatches(page = 1, pageSize = 20): Promise<SegregationBatchSummary[]> {
    const payload = await requestJson<SegregationBatchListItemDto[] | SegregationBatchListResponseDto>(
      `/api/segregation/batches/pending?page=${page}&pageSize=${pageSize}`
    );

    return normalizeListPayload(payload).map(mapPendingSegregationItem);
  },

  async getBatchById(id: string): Promise<SegregationBatchDetail> {
    const payload = await requestJson<SegregationBatchDetailDto>(`/api/segregation/batches/${id}`);
    return mapSegregationDetail(payload);
  },

  async recordBatch(id: string, input: SegregationRecordInputDto): Promise<SegregationBatchDetail> {
    const payload = await requestJson<SegregationBatchDetailDto>(`/api/segregation/batches/${id}/record`, {
      method: 'POST',
      body: JSON.stringify(input),
    });

    return mapSegregationDetail(payload);
  },

  async markRecycled(id: string): Promise<SegregationBatchDetail> {
    const payload = await requestJson<SegregationBatchDetailDto>(`/api/segregation/batches/${id}/mark-recycled`, {
      method: 'POST',
    });

    return mapSegregationDetail(payload);
  },
};
