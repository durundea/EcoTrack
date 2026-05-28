import type {
  DashboardSummary,
  PickupStatus,
  PickupTask,
  ProductConversion,
  RecyclingBatch,
  RecyclingStage,
  SegregationBatch,
  SegregationDispatch,
  WasteCategory,
} from './contracts';
import {
  dashboardSummary,
  pickupTasks,
  productConversions,
  recyclingBatches,
  segregationBatches,
  segregationDispatches,
} from './mockData';

const delay = (ms = 200) => new Promise((resolve) => setTimeout(resolve, ms));
const totalWeight = (weights: Record<WasteCategory, number>) =>
  Object.values(weights).reduce((sum, value) => sum + value, 0);

export const collection = {
  async getSchedule(): Promise<PickupTask[]> {
    await delay();
    return [...pickupTasks];
  },
  async updateStatus(id: string, status: PickupStatus): Promise<PickupTask> {
    await delay();
    const task = pickupTasks.find((entry) => entry.id === id);
    if (!task) throw new Error(`Task ${id} not found`);
    task.status = status;
    if (status === 'collected') task.lockedAfterCollection = true;
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
    const task = pickupTasks.find((entry) => entry.id === id);
    if (!task) throw new Error(`Task ${id} not found`);
    if (task.status === 'collected') {
      throw new Error(`Collected task ${id} is locked and cannot be edited`);
    }
    Object.assign(task, payload);
    return { ...task };
  },
  async deleteTask(id: string): Promise<{ id: string }> {
    await delay();
    const index = pickupTasks.findIndex((entry) => entry.id === id);
    if (index === -1) throw new Error(`Task ${id} not found`);
    if (pickupTasks[index].status === 'collected') {
      throw new Error(`Collected task ${id} is locked and cannot be deleted`);
    }
    pickupTasks.splice(index, 1);
    return { id };
  },
  async getDispatches(): Promise<SegregationDispatch[]> {
    await delay();
    return [...segregationDispatches];
  },
  async dispatchToSegregation(pickupTaskId: string, dispatchedWeightKg: number): Promise<SegregationDispatch> {
    await delay();
    const task = pickupTasks.find((entry) => entry.id === pickupTaskId);
    if (!task) throw new Error(`Task ${pickupTaskId} not found`);
    if (task.status !== 'collected') throw new Error('Only collected tasks can be dispatched to segregation');

    const alreadyDispatched = segregationDispatches
      .filter((dispatch) => dispatch.pickupTaskId === pickupTaskId)
      .reduce((sum, dispatch) => sum + dispatch.dispatchedWeightKg, 0);

    const available = task.estimatedWeightKg - alreadyDispatched;
    if (dispatchedWeightKg <= 0 || dispatchedWeightKg > available) {
      throw new Error(`Dispatch must be within available collected weight (${available} kg)`);
    }

    const created: SegregationDispatch = {
      id: `SD-${Date.now()}`,
      pickupTaskId,
      dispatchedWeightKg,
      segregatedWeightKg: 0,
      pendingSegregationWeightKg: dispatchedWeightKg,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    segregationDispatches.unshift(created);
    return { ...created };
  },
};

export const segregation = {
  async getBatches(): Promise<SegregationBatch[]> {
    await delay();
    return [...segregationBatches];
  },
  async createBatch(dispatchId: string, weights: Record<WasteCategory, number>): Promise<SegregationBatch> {
    await delay();
    const dispatch = segregationDispatches.find((entry) => entry.id === dispatchId);
    if (!dispatch) throw new Error(`Dispatch ${dispatchId} not found`);

    const sum = totalWeight(weights);
    if (sum <= 0 || sum > dispatch.pendingSegregationWeightKg) {
      throw new Error(`Segregation total must be <= pending weight (${dispatch.pendingSegregationWeightKg} kg)`);
    }

    dispatch.segregatedWeightKg += sum;
    dispatch.pendingSegregationWeightKg -= sum;
    dispatch.status = dispatch.pendingSegregationWeightKg === 0 ? 'complete' : 'partial';

    const pickupTask = pickupTasks.find((task) => task.id === dispatch.pickupTaskId);
    if (pickupTask) {
      pickupTask.segregatedWeightKg = (pickupTask.segregatedWeightKg ?? 0) + sum;
    }

    const batch: SegregationBatch = {
      id: `SB-${Date.now()}`,
      pickupTaskId: dispatch.pickupTaskId,
      dispatchId,
      weights,
      inputWeightKg: sum,
      status: 'complete',
      createdAt: new Date().toISOString(),
    };

    segregationBatches.unshift(batch);
    return { ...batch };
  },
};

export const recycling = {
  async getBatches(): Promise<RecyclingBatch[]> {
    await delay();
    return [...recyclingBatches];
  },
  async advanceStage(id: string, stage: RecyclingStage): Promise<RecyclingBatch> {
    await delay();
    const batch = recyclingBatches.find((entry) => entry.id === id);
    if (!batch) throw new Error(`Recycling batch ${id} not found`);
    batch.stage = stage;
    batch.stageHistory.push({ stage, at: new Date().toISOString() });
    return { ...batch };
  },
  async createProductConversion(input: {
    recyclingBatchId: string;
    productName: string;
    quantity: number;
    unit: 'kg' | 'units';
  }): Promise<ProductConversion> {
    await delay();
    const batch = recyclingBatches.find((entry) => entry.id === input.recyclingBatchId);
    if (!batch) throw new Error(`Recycling batch ${input.recyclingBatchId} not found`);
    if (batch.stage !== 'converted') throw new Error('Products can be created only after recycling is converted');
    if (!input.productName.trim() || input.quantity <= 0) {
      throw new Error('Valid product name and quantity are required');
    }

    const conversion: ProductConversion = {
      id: `PC-${Date.now()}`,
      recyclingBatchId: input.recyclingBatchId,
      productName: input.productName.trim(),
      quantity: input.quantity,
      unit: input.unit,
      createdAt: new Date().toISOString(),
    };

    productConversions.unshift(conversion);
    return { ...conversion };
  },
};

export const inventoryLegacy = {
  async syncInventoryFromConversions(): Promise<{ updated: number }> {
    await delay();
    let updated = 0;
    while (productConversions.length > 0) {
      const conversion = productConversions.shift();
      if (!conversion) break;
      updated += 1;
    }
    return { updated };
  },
};

export const dashboard = {
  async getSummary(): Promise<DashboardSummary> {
    await delay();
    return { ...dashboardSummary };
  },
};