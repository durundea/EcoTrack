import type { InventoryItem, InventorySyncSummaryDto } from '../api/contracts';
import { requestJson } from './http';

type InventoryItemDto = {
  id: string;
  name: string;
  category: 'rawWaste' | 'recycledProduct';
  quantityKg: number;
  unit: 'kg' | 'units';
  standardPriceInr: number;
};

function normalizeText(value: string | null | undefined): string {
  return value ?? '';
}

function normalizeNumber(value: number | null | undefined): number {
  return value ?? 0;
}

function toInventoryItem(dto: InventoryItemDto): InventoryItem {
  return {
    id: dto.id,
    name: dto.name,
    category: dto.category === 'rawWaste' ? 'raw-waste' : 'recycled-product',
    quantityKg: dto.quantityKg,
    unit: dto.unit,
    standardPriceINR: dto.standardPriceInr,
  };
}

export function mapInventorySyncSummary(dto: Partial<InventorySyncSummaryDto>): InventorySyncSummaryDto {
  return {
    updatedItemsCount: normalizeNumber(dto.updatedItemsCount),
    createdItemsCount: normalizeNumber(dto.createdItemsCount),
    skippedCount: normalizeNumber(dto.skippedCount),
    syncRunId: normalizeText(dto.syncRunId),
  };
}

export const inventoryService = {
  async getItems(): Promise<InventoryItem[]> {
    return (await requestJson<InventoryItemDto[]>('/api/inventory/items')).map(toInventoryItem);
  },
  async createItem(input: {
    name: string;
    category: InventoryItem['category'];
    quantityKg: number;
    unit: InventoryItem['unit'];
    standardPriceINR: number;
  }): Promise<InventoryItem> {
    const dto = await requestJson<InventoryItemDto>('/api/inventory/items', {
      method: 'POST',
      body: JSON.stringify({
        name: input.name,
        category: input.category === 'raw-waste' ? 'rawWaste' : 'recycledProduct',
        quantityKg: input.quantityKg,
        unit: input.unit,
        standardPriceInr: input.standardPriceINR,
      }),
    });

    return toInventoryItem(dto);
  },
  async updatePrice(id: string, standardPriceINR: number): Promise<InventoryItem> {
    const dto = await requestJson<InventoryItemDto>(`/api/inventory/items/${id}/price`, {
      method: 'PATCH',
      body: JSON.stringify({ standardPriceInr: standardPriceINR }),
    });

    return toInventoryItem(dto);
  },

  async syncInventoryFromConversions(): Promise<InventorySyncSummaryDto> {
    const dto = await requestJson<InventorySyncSummaryDto>('/api/recycling/conversions/sync-inventory', {
      method: 'POST',
    });

    return mapInventorySyncSummary(dto);
  },
};