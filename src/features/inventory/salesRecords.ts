import type { InventoryItem, SaleRecord } from '../../shared/api/contracts';

export type SalesRow = SaleRecord & {
  itemName: string;
  searchableItemName: string;
};

export function buildSalesRows(sales: SaleRecord[], items: InventoryItem[]): SalesRow[] {
  const itemNamesById = new Map(items.map((item) => [item.id, item.name]));

  return sales.map((sale) => {
    const itemName = itemNamesById.get(sale.inventoryItemId) ?? sale.inventoryItemId;

    return {
      ...sale,
      itemName,
      searchableItemName: itemName.toLowerCase(),
    };
  });
}

export function filterSalesRows(rows: SalesRow[], rawSearch: string): SalesRow[] {
  const search = rawSearch.trim().toLowerCase();

  if (!search) {
    return rows;
  }

  const exactIdMatches = rows.filter((row) => row.id.toLowerCase() === search);
  if (exactIdMatches.length > 0) {
    return exactIdMatches;
  }

  return rows.filter((row) => row.searchableItemName.includes(search));
}
