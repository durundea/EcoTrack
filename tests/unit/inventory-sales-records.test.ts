import { describe, expect, it } from 'vitest';
import type { InventoryItem, SaleRecord } from '../../src/shared/api/contracts';
import { buildSalesRows, filterSalesRows } from '../../src/features/inventory/salesRecords';

function makeSale(overrides: Partial<SaleRecord>): SaleRecord {
  return {
    id: 'SALE-001',
    inventoryItemId: 'INV-001',
    quantitySold: 1,
    revenueINR: 100,
    soldAt: '2026-06-01T00:00:00Z',
    approvalStatus: 'approved',
    requestedByUserId: 'U-001',
    ...overrides,
  };
}

function makeItem(overrides: Partial<InventoryItem>): InventoryItem {
  return {
    id: 'INV-001',
    name: 'Compost Bag',
    category: 'recycled-product',
    quantityKg: 10,
    unit: 'units',
    standardPriceINR: 120,
    ...overrides,
  };
}

describe('salesRecords helpers', () => {
  it('buildSalesRows joins item name and falls back to inventoryItemId for unresolved items', () => {
    const sales: SaleRecord[] = [
      makeSale({ id: 'SALE-100', inventoryItemId: 'INV-001' }),
      makeSale({ id: 'SALE-101', inventoryItemId: 'INV-404' }),
    ];

    const items: InventoryItem[] = [
      makeItem({ id: 'INV-001', name: 'Compost Bag' }),
    ];

    const rows = buildSalesRows(sales, items);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      id: 'SALE-100',
      inventoryItemId: 'INV-001',
      itemName: 'Compost Bag',
      searchableItemName: 'compost bag',
    });

    expect(rows[1]).toMatchObject({
      id: 'SALE-101',
      inventoryItemId: 'INV-404',
      itemName: 'INV-404',
      searchableItemName: 'inv-404',
    });
  });

  it('filterSalesRows prefers exact sale id matches over item-name partial matches', () => {
    const rows = buildSalesRows(
      [
        makeSale({ id: 'SALE-200', inventoryItemId: 'INV-001' }),
        makeSale({ id: 'SALE-201', inventoryItemId: 'INV-002' }),
      ],
      [
        makeItem({ id: 'INV-001', name: 'Bottle Flake' }),
        makeItem({ id: 'INV-002', name: 'Sale-200 Collectors Bundle' }),
      ],
    );

    const exact = filterSalesRows(rows, '  sale-200  ');
    expect(exact).toHaveLength(1);
    expect(exact[0].id).toBe('SALE-200');

    const partial = filterSalesRows(rows, 'collector');
    expect(partial).toHaveLength(1);
    expect(partial[0].id).toBe('SALE-201');
  });

  it('filterSalesRows returns all rows for empty search after trimming', () => {
    const rows = buildSalesRows(
      [
        makeSale({ id: 'SALE-300', inventoryItemId: 'INV-001' }),
        makeSale({ id: 'SALE-301', inventoryItemId: 'INV-002' }),
      ],
      [
        makeItem({ id: 'INV-001', name: 'Glass Granules' }),
        makeItem({ id: 'INV-002', name: 'Paper Pulp' }),
      ],
    );

    expect(filterSalesRows(rows, '   ')).toEqual(rows);
  });
});
