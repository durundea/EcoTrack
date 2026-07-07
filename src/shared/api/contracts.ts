// ─── Shared ────────────────────────────────────────────────────────────────
export type WasteCategory = 'plastic' | 'organic' | 'metal' | 'paper' | 'ewaste';

// ─── Collection ────────────────────────────────────────────────────────────
export type PickupStatus =
  | 'scheduled'
  | 'assigned'
  | 'collected'
  | 'cancelled'
  | 'sent_to_aggregation'
  | 'sent_to_aggregation_round';

export type PickupTask = {
  id: string;
  /** @deprecated Use siteName once the collection page is fully migrated. */
  site: string;
  status: PickupStatus;
  /** @deprecated Use assignedCollectorUserId once the collection page is fully migrated. */
  assignedCollectorId?: string;
  /** @deprecated Use scheduledAtUtc once the collection page is fully migrated. */
  scheduledDate: string;
  estimatedWeightKg: number;
  lockedAfterCollection?: boolean;
  segregatedWeightKg?: number;
  // Compatibility fields keep the current collection UI stable while later tasks
  // migrate row rendering to the richer backend pickup model.
  pickupCode?: string;
  siteName?: string;
  siteAddressText?: string;
  scheduledAtUtc?: string;
  collectedWeightKg?: number;
  assignedCollectorDisplayName?: string;
  notes?: string;
  assignmentEvents?: PickupAssignmentEventDto[];
};

export type PickupAssignmentEventDto = {
  id: string;
  pickupTaskId: string;
  previousCollectorUserId?: string | null;
  newCollectorUserId?: string | null;
  changedByUserId?: string | null;
  changedByDisplayName?: string | null;
  changedAtUtc: string;
  note?: string | null;
};

export type PickupAssignmentHistoryResponseDto = {
  events: PickupAssignmentEventDto[];
};

export type PickupTaskDto = {
  id: string;
  pickupCode: string;
  siteName: string;
  siteAddressText: string;
  scheduledAtUtc: string;
  estimatedWeightKg: number;
  collectedWeightKg: number;
  status: string;
  assignedCollectorUserId?: string | null;
  assignedCollectorDisplayName?: string | null;
  notes?: string | null;
  createdByUserId?: string | null;
  createdAtUtc?: string | null;
  updatedAtUtc?: string | null;
  cancelledByUserId?: string | null;
  cancelledAtUtc?: string | null;
  cancelReason?: string | null;
  assignmentEvents?: PickupAssignmentEventDto[];
};

export type PickupTaskListResponseDto = {
  items: PickupTaskDto[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

export type PickupTaskCreateInputDto = {
  siteName: string;
  siteAddressText: string;
  scheduledAtUtc: string;
  estimatedWeightKg: number;
  notes: string;
};

export type PickupTaskUpdateInputDto = PickupTaskCreateInputDto;

export type PickupTaskAssignInputDto = {
  assignedCollectorUserId: string;
  note: string;
};

export type PickupTaskMarkCollectedInputDto = {
  collectedWeightKg: number;
};

export type PickupTaskCancelInputDto = {
  reason: string;
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

export type SegregationBatchListItemDto = {
  id: string;
  pickupTaskId: string;
  batchCode: string;
  pickupCode: string;
  status: string;
  recordedAtUtc?: string | null;
  recycledAtUtc?: string | null;
};

export type SegregationBatchListResponseDto = {
  items: SegregationBatchListItemDto[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

export type SegregationBatchDetailDto = {
  id: string;
  batchCode: string;
  status: string;
  pickupTaskId: string;
  pickupCode: string;
  siteName: string;
  siteAddressText: string;
  scheduledAtUtc: string;
  collectedWeightKg: number;
  plasticKg?: number | null;
  organicKg?: number | null;
  metalKg?: number | null;
  paperKg?: number | null;
  eWasteKg?: number | null;
  recordedByUserId?: string | null;
  recordedAtUtc?: string | null;
  recycledByUserId?: string | null;
  recycledAtUtc?: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
};

export type SegregationRecordInputDto = {
  plasticKg: number;
  organicKg: number;
  metalKg: number;
  paperKg: number;
  eWasteKg: number;
};

export type SegregationRecordResultDto = SegregationBatchDetailDto & {
  createdRecyclingBatchIds: string[];
  createdRecyclingCount: number;
};

// ─── Recycling ─────────────────────────────────────────────────────────────
export type RecyclingStage = 'collected' | 'segregated' | 'processing' | 'converted';

export type RecyclingStageDto = 'collected' | 'segregated' | 'processing' | 'converted';

export type RecyclingStageHistoryDto = {
  stage: RecyclingStageDto;
  atUtc: string;
};

export type RecyclingBatchDto = {
  id: string;
  segregationBatchId: string;
  pickupTaskId: string;
  sourceCategory: WasteCategory;
  sourceWeightKg: number;
  stage: RecyclingStageDto;
  outputProduct: string;
  outputQuantity: number;
  inventoryUpdated: boolean;
  stageHistory: RecyclingStageHistoryDto[];
};

export type RecyclingBatchListResponseDto = {
  items: RecyclingBatchDto[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

export type RecyclingAdvanceStageInputDto = {
  stage: Exclude<RecyclingStage, 'collected' | 'segregated'>;
};

export type InventorySyncSummaryDto = {
  updatedItemsCount: number;
  createdItemsCount: number;
  skippedCount: number;
  syncRunId: string;
};

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

export type DashboardSummaryPendingApprovals = DashboardPendingSalesApprovals;

export type DashboardSummary = {
  totalWasteProcessedKg: number;
  revenueINR: number;
  recyclingEfficiencyPct: number;
  co2ReductionKg: number;
  byCategory: Record<WasteCategory, number>;
  pendingSalesApprovals: DashboardSummaryPendingApprovals;
};
