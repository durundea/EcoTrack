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
  lockedAfterCollection?: boolean;
  segregatedWeightKg?: number;
};

export type SegregationDispatch = {
  id: string;
  pickupTaskId: string;
  dispatchedWeightKg: number;
  segregatedWeightKg: number;
  pendingSegregationWeightKg: number;
  status: 'pending' | 'partial' | 'complete';
  createdAt: string;
};

// ─── Segregation ───────────────────────────────────────────────────────────
export type SegregationBatch = {
  id: string;
  pickupTaskId: string;
  dispatchId: string;
  weights: Record<WasteCategory, number>;
  inputWeightKg: number;
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
  inventoryUpdated?: boolean;
  stageHistory: { stage: RecyclingStage; at: string }[];
};

export type ProductConversion = {
  id: string;
  recyclingBatchId: string;
  productName: string;
  quantity: number;
  unit: 'kg' | 'units';
  createdAt: string;
};

// ─── Inventory ─────────────────────────────────────────────────────────────
export type InventoryItem = {
  id: string;
  name: string;
  category: 'raw-waste' | 'recycled-product';
  quantityKg: number;
  unit: 'kg' | 'units';
  standardPriceINR: number;
};

export type SaleApprovalStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected';

export type SaleRecord = {
  id: string;
  inventoryItemId: string;
  quantitySold: number;
  revenueINR: number;
  soldAt: string;
  approvalStatus: SaleApprovalStatus;
  requestedByUserId: string;
  approvedByUserId?: string;
  approvedAt?: string;
  rejectionReason?: string;
};

// ─── Dashboard ─────────────────────────────────────────────────────────────
// These transport DTOs intentionally preserve backend field names and casing.
// UI-facing code should map them into DashboardSummary before rendering.
export type DashboardAnalyticsKpis = {
  totalWasteProcessedKg: number;
  revenueInr: number;
  recyclingEfficiencyPercent: number;
  co2ReductionKg: number;
};

export type DashboardWasteCategory = {
  // Backend transport field; mapper normalizes this into known WasteCategory keys.
  category: string;
  weightKg: number;
  sharePercent: number;
};

export type DashboardPendingSalesApprovals = {
  count: number;
  isDataAvailable: boolean;
  message: string;
};

export type DashboardAnalyticsRange = {
  fromUtc: string;
  toUtc: string;
  label: string;
};

export type DashboardAnalyticsResponse = {
  range: DashboardAnalyticsRange;
  kpis: DashboardAnalyticsKpis;
  wasteByCategory: DashboardWasteCategory[];
  categoryDistribution: DashboardWasteCategory[];
  pendingSalesApprovals: DashboardPendingSalesApprovals;
};

export type DashboardSummary = {
  totalWasteProcessedKg: number;
  revenueINR: number;
  recyclingEfficiencyPct: number;
  co2ReductionKg: number;
  byCategory: Record<WasteCategory, number>;
};
