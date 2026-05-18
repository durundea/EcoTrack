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
    async createTask(input: Omit<PickupTask, 'id'>): Promise<PickupTask> {
      await delay();
      const newTask: PickupTask = {
        ...input,
        id: `P-${Math.floor(1000 + Math.random() * 9000)}`,
      };
      pickupTasks.unshift(newTask);
      return { ...newTask };
    },
    async updateTask(id: string, payload: Partial<Omit<PickupTask, 'id'>>): Promise<PickupTask> {
      await delay();
      const task = pickupTasks.find((t) => t.id === id);
      if (!task) throw new Error(`Task ${id} not found`);
      Object.assign(task, payload);
      return { ...task };
    },
    async deleteTask(id: string): Promise<{ id: string }> {
      await delay();
      const index = pickupTasks.findIndex((t) => t.id === id);
      if (index === -1) throw new Error(`Task ${id} not found`);
      pickupTasks.splice(index, 1);
      return { id };
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
    async updateItem(id: string, payload: Partial<Omit<InventoryItem, 'id'>>): Promise<InventoryItem> {
      await delay();
      const item = inventoryItems.find((i) => i.id === id);
      if (!item) throw new Error(`Inventory item ${id} not found`);
      Object.assign(item, payload);
      return { ...item };
    },
    async deleteItem(id: string): Promise<{ id: string }> {
      await delay();
      const index = inventoryItems.findIndex((i) => i.id === id);
      if (index === -1) throw new Error(`Inventory item ${id} not found`);
      inventoryItems.splice(index, 1);
      return { id };
    },
    async updateSale(id: string, payload: Partial<Omit<SaleRecord, 'id'>>): Promise<SaleRecord> {
      await delay();
      const sale = saleRecords.find((s) => s.id === id);
      if (!sale) throw new Error(`Sale record ${id} not found`);
      Object.assign(sale, payload);
      return { ...sale };
    },
    async deleteSale(id: string): Promise<{ id: string }> {
      await delay();
      const index = saleRecords.findIndex((s) => s.id === id);
      if (index === -1) throw new Error(`Sale record ${id} not found`);
      saleRecords.splice(index, 1);
      return { id };
    },
  },

  dashboard: {
    async getSummary(): Promise<DashboardSummary> {
      await delay();
      return { ...dashboardSummary };
    },
  },
};
