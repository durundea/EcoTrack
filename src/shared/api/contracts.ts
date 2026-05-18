// ─── Shared ────────────────────────────────────────────────────────────────
export type WasteCategory = 'plastic' | 'organic' | 'metal' | 'paper' | 'ewaste';

// ─── Collection ────────────────────────────────────────────────────────────
export type PickupStatus = 'scheduled' | 'assigned' | 'collected';

export type PickupTask = {
  id: string;
  site: string;
  status: PickupStatus;
  assignedCollectorId?: string;
  scheduledDate: string;
  estimatedWeightKg: number;
};

// ─── Segregation ───────────────────────────────────────────────────────────
export type SegregationBatch = {
  id: string;
  pickupTaskId: string;
  weights: Record<WasteCategory, number>;
  status: 'pending' | 'complete';
  createdAt: string;
};

// ─── Recycling ─────────────────────────────────────────────────────────────
export type RecyclingStage = 'collected' | 'segregated' | 'processing' | 'converted';

export type RecyclingBatch = {
  id: string;
  segregationBatchId: string;
  stage: RecyclingStage;
  inputCategory: WasteCategory;
  outputProduct: string;
  inputWeightKg: number;
  outputQuantity: number;
  stageHistory: { stage: RecyclingStage; at: string }[];
};

// ─── Inventory ─────────────────────────────────────────────────────────────
export type InventoryItem = {
  id: string;
  name: string;
  category: 'raw-waste' | 'recycled-product';
  quantityKg: number;
  unit: 'kg' | 'units';
};

export type SaleRecord = {
  id: string;
  inventoryItemId: string;
  quantitySold: number;
  revenueINR: number;
  soldAt: string;
};

// ─── Dashboard ─────────────────────────────────────────────────────────────
export type DashboardSummary = {
  totalWasteProcessedKg: number;
  revenueINR: number;
  recyclingEfficiencyPct: number;
  co2ReductionKg: number;
  byCategory: Record<WasteCategory, number>;
};
