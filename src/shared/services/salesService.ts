import type { SaleApprovalStatus, SaleRecord } from '../api/contracts';
import { requestJson } from './http';

type SaleRecordDto = {
  id: string;
  inventoryItemId: string;
  quantitySold: number;
  revenueInr: number;
  soldAtUtc: string;
  approvalStatus: 'draft' | 'pendingApproval' | 'pending_approval' | 'approved' | 'rejected';
  requestedByUserId: string;
  approvedByUserId?: string;
  approvedAtUtc?: string;
  rejectionReason?: string;
};

type PaginatedSalesDto = {
  items: SaleRecordDto[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

function extractSaleItems(payload: SaleRecordDto[] | PaginatedSalesDto): SaleRecordDto[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  return payload.items ?? [];
}

function toSaleRecord(dto: SaleRecordDto): SaleRecord {
  const statusMap: Record<SaleRecordDto['approvalStatus'], SaleApprovalStatus> = {
    draft: 'draft',
    pendingApproval: 'pending_approval',
    pending_approval: 'pending_approval',
    approved: 'approved',
    rejected: 'rejected',
  };

  return {
    id: dto.id,
    inventoryItemId: dto.inventoryItemId,
    quantitySold: dto.quantitySold,
    revenueINR: dto.revenueInr,
    soldAt: dto.soldAtUtc,
    approvalStatus: statusMap[dto.approvalStatus],
    requestedByUserId: dto.requestedByUserId,
    approvedByUserId: dto.approvedByUserId,
    approvedAt: dto.approvedAtUtc,
    rejectionReason: dto.rejectionReason,
  };
}

export const salesService = {
  async list(): Promise<SaleRecord[]> {
    const payload = await requestJson<SaleRecordDto[] | PaginatedSalesDto>('/api/inventory/sales');
    return extractSaleItems(payload).map(toSaleRecord);
  },
  async getById(id: string): Promise<SaleRecord> {
    return toSaleRecord(await requestJson<SaleRecordDto>(`/api/inventory/sales/${id}`));
  },
  async createDraft(input: { inventoryItemId: string; quantitySold: number; soldAt: string }): Promise<SaleRecord> {
    const dto = await requestJson<SaleRecordDto>('/api/inventory/sales', {
      method: 'POST',
      body: JSON.stringify({
        inventoryItemId: input.inventoryItemId,
        quantitySold: input.quantitySold,
        soldAtUtc: input.soldAt,
      }),
    });

    return toSaleRecord(dto);
  },
  async updateDraft(id: string, input: { inventoryItemId: string; quantitySold: number; soldAt: string }): Promise<SaleRecord> {
    const dto = await requestJson<SaleRecordDto>(`/api/inventory/sales/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        inventoryItemId: input.inventoryItemId,
        quantitySold: input.quantitySold,
        soldAtUtc: input.soldAt,
      }),
    });

    return toSaleRecord(dto);
  },
  async submitDraft(id: string): Promise<SaleRecord> {
    return toSaleRecord(await requestJson<SaleRecordDto>(`/api/inventory/sales/${id}/submit`, { method: 'POST' }));
  },
  async approveSale(id: string): Promise<SaleRecord> {
    return toSaleRecord(await requestJson<SaleRecordDto>(`/api/inventory/sales/${id}/approve`, { method: 'POST' }));
  },
};