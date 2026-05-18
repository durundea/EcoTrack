import type {
  DashboardSummary,
  InventoryItem,
  PickupTask,
  PickupStatus,
  RecyclingBatch,
  RecyclingStage,
  SaleRecord,
  SegregationBatch,
  WasteCategory,
} from './contracts';
import {
  dashboardSummary,
  inventoryItems,
  pickupTasks,
  recyclingBatches,
  saleRecords,
  segregationBatches,
} from './mockData';

// Simulate async latency
const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms));

export const api = {
  collection: {
    async getSchedule(): Promise<PickupTask[]> {
      await delay();
      return [...pickupTasks];
    },
    async updateStatus(id: string, status: PickupStatus): Promise<PickupTask> {
      await delay();
      const task = pickupTasks.find((t) => t.id === id);
      if (!task) throw new Error(`Task ${id} not found`);
      task.status = status;
      return { ...task };
    },
  },

  segregation: {
    async getBatches(): Promise<SegregationBatch[]> {
      await delay();
      return [...segregationBatches];
    },
    async createBatch(
      pickupTaskId: string,
      weights: Record<WasteCategory, number>
    ): Promise<SegregationBatch> {
      await delay();
      const batch: SegregationBatch = {
        id: `SB-${Date.now()}`,
        pickupTaskId,
        weights,
        status: 'complete',
        createdAt: new Date().toISOString(),
      };
      segregationBatches.push(batch);
      return batch;
    },
  },

  recycling: {
    async getBatches(): Promise<RecyclingBatch[]> {
      await delay();
      return [...recyclingBatches];
    },
    async advanceStage(id: string, stage: RecyclingStage): Promise<RecyclingBatch> {
      await delay();
      const batch = recyclingBatches.find((b) => b.id === id);
      if (!batch) throw new Error(`Recycling batch ${id} not found`);
      batch.stage = stage;
      batch.stageHistory.push({ stage, at: new Date().toISOString() });
      return { ...batch };
    },
  },

  inventory: {
    async getItems(): Promise<InventoryItem[]> {
      await delay();
      return [...inventoryItems];
    },
    async getSales(): Promise<SaleRecord[]> {
      await delay();
      return [...saleRecords];
    },
  },

  dashboard: {
    async getSummary(): Promise<DashboardSummary> {
      await delay();
      return { ...dashboardSummary };
    },
  },
};
