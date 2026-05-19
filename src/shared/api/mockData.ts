import type {
  DashboardSummary,
  InventoryItem,
  PickupTask,
  ProductConversion,
  RecyclingBatch,
  SaleRecord,
  SegregationDispatch,
  SegregationBatch,
} from './contracts';

export const pickupTasks: PickupTask[] = [
  {
    id: 'P-1001',
    site: 'Green Residency, Block A',
    status: 'scheduled',
    scheduledDate: '2026-05-19',
    estimatedWeightKg: 120,
  },
  {
    id: 'P-1002',
    site: 'Ward 18 Block C',
    status: 'assigned',
    assignedCollectorId: 'U-002',
    scheduledDate: '2026-05-19',
    estimatedWeightKg: 85,
  },
  {
    id: 'P-1003',
    site: 'Sunrise Apartments',
    status: 'collected',
    lockedAfterCollection: true,
    segregatedWeightKg: 120,
    assignedCollectorId: 'U-002',
    scheduledDate: '2026-05-18',
    estimatedWeightKg: 200,
  },
];

export const segregationDispatches: SegregationDispatch[] = [
  {
    id: 'SD-001',
    pickupTaskId: 'P-1003',
    dispatchedWeightKg: 200,
    segregatedWeightKg: 120,
    pendingSegregationWeightKg: 80,
    status: 'partial',
    createdAt: '2026-05-18T09:00:00Z',
  },
];

export const segregationBatches: SegregationBatch[] = [
  {
    id: 'SB-001',
    pickupTaskId: 'P-1003',
    dispatchId: 'SD-001',
    weights: { plastic: 60, organic: 90, metal: 20, paper: 15, ewaste: 15 },
    inputWeightKg: 200,
    status: 'complete',
    createdAt: '2026-05-18T10:00:00Z',
  },
];

export const recyclingBatches: RecyclingBatch[] = [
  {
    id: 'RB-001',
    segregationBatchId: 'SB-001',
    stage: 'processing',
    inputCategory: 'organic',
    outputProduct: 'Compost',
    inputWeightKg: 90,
    outputQuantity: 45,
    inventoryUpdated: false,
    stageHistory: [
      { stage: 'collected', at: '2026-05-18T08:00:00Z' },
      { stage: 'segregated', at: '2026-05-18T10:30:00Z' },
      { stage: 'processing', at: '2026-05-18T12:00:00Z' },
    ],
  },
];

export const productConversions: ProductConversion[] = [];

export const inventoryItems: InventoryItem[] = [
  { id: 'INV-001', name: 'Compost (Organic)', category: 'recycled-product', quantityKg: 45, unit: 'kg' },
  { id: 'INV-002', name: 'Eco-bricks (Plastic)', category: 'recycled-product', quantityKg: 60, unit: 'units' },
  { id: 'INV-003', name: 'Raw Scrap Metal', category: 'raw-waste', quantityKg: 20, unit: 'kg' },
];

export const saleRecords: SaleRecord[] = [
  {
    id: 'SALE-001',
    inventoryItemId: 'INV-001',
    quantitySold: 20,
    revenueINR: 1200,
    soldAt: '2026-05-17T09:00:00Z',
  },
];

export const dashboardSummary: DashboardSummary = {
  totalWasteProcessedKg: 1840,
  revenueINR: 42500,
  recyclingEfficiencyPct: 78,
  co2ReductionKg: 920,
  byCategory: { plastic: 480, organic: 620, metal: 310, paper: 270, ewaste: 160 },
};
