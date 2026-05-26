import type {
  DashboardSummary,
  InventoryItem,
  PickupTask,
  PickupStatus,
  ProductConversion,
  RecyclingBatch,
  RecyclingStage,
  SaleApprovalStatus,
  SaleRecord,
  SegregationBatch,
  SegregationDispatch,
  WasteCategory,
} from './contracts';

type Actor = {
  actorRole: 'admin' | 'collector';
  actorUserId: string;
};
import {
  dashboardSummary,
  inventoryItems,
  pickupTasks,
  productConversions,
  recyclingBatches,
  saleRecords,
  segregationDispatches,
  segregationBatches,
} from './mockData';

// Simulate async latency
const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms));
const totalWeight = (weights: Record<WasteCategory, number>) =>
  Object.values(weights).reduce((sum, value) => sum + value, 0);

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
      if (status === 'collected') {
        task.lockedAfterCollection = true;
      }
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
      if (task.status === 'collected') {
        throw new Error(`Collected task ${id} is locked and cannot be edited`);
      }
      Object.assign(task, payload);
      return { ...task };
    },
    async deleteTask(id: string): Promise<{ id: string }> {
      await delay();
      const index = pickupTasks.findIndex((t) => t.id === id);
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
      const task = pickupTasks.find((t) => t.id === pickupTaskId);
      if (!task) throw new Error(`Task ${pickupTaskId} not found`);
      if (task.status !== 'collected') {
        throw new Error('Only collected tasks can be dispatched to segregation');
      }

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
  },

  segregation: {
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
    async createProductConversion(input: {
      recyclingBatchId: string;
      productName: string;
      quantity: number;
      unit: 'kg' | 'units';
    }): Promise<ProductConversion> {
      await delay();
      const batch = recyclingBatches.find((entry) => entry.id === input.recyclingBatchId);
      if (!batch) throw new Error(`Recycling batch ${input.recyclingBatchId} not found`);
      if (batch.stage !== 'converted') {
        throw new Error('Products can be created only after recycling is converted');
      }
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
    async getSalesByStatus(status: SaleApprovalStatus): Promise<SaleRecord[]> {
      await delay();
      return saleRecords.filter((sale) => sale.approvalStatus === status).map((sale) => ({ ...sale }));
    },
    async updateItem(id: string, payload: Partial<Omit<InventoryItem, 'id'>>): Promise<InventoryItem> {
      await delay();
      const item = inventoryItems.find((i) => i.id === id);
      if (!item) throw new Error(`Inventory item ${id} not found`);
      if (typeof payload.standardPriceINR === 'number') {
        throw new Error('Use updateItemPrice for standard price updates');
      }
      Object.assign(item, payload);
      return { ...item };
    },
    async updateItemPrice(id: string, standardPriceINR: number, actor: Actor): Promise<InventoryItem> {
      await delay();
      if (actor.actorRole !== 'admin') {
        throw new Error('Only admin can update standard price');
      }
      if (standardPriceINR < 0) {
        throw new Error('Standard price must be non-negative');
      }
      const item = inventoryItems.find((i) => i.id === id);
      if (!item) throw new Error(`Inventory item ${id} not found`);
      item.standardPriceINR = standardPriceINR;
      return { ...item };
    },
    async deleteItem(id: string): Promise<{ id: string }> {
      await delay();
      const index = inventoryItems.findIndex((i) => i.id === id);
      if (index === -1) throw new Error(`Inventory item ${id} not found`);
      inventoryItems.splice(index, 1);
      return { id };
    },
    async createSaleDraft(input: {
      inventoryItemId: string;
      quantitySold: number;
      soldAt: string;
      requestedByUserId: string;
    }): Promise<SaleRecord> {
      await delay();
      if (input.quantitySold <= 0) {
        throw new Error('Quantity sold must be greater than 0');
      }
      const item = inventoryItems.find((i) => i.id === input.inventoryItemId);
      if (!item) {
        throw new Error('Inventory item not found');
      }
      const created: SaleRecord = {
        id: `SALE-${Date.now()}`,
        inventoryItemId: input.inventoryItemId,
        quantitySold: input.quantitySold,
        revenueINR: item.standardPriceINR * input.quantitySold,
        soldAt: input.soldAt,
        approvalStatus: 'draft',
        requestedByUserId: input.requestedByUserId,
      };
      saleRecords.unshift(created);
      return { ...created };
    },
    async submitSaleForApproval(id: string, actor: Actor): Promise<SaleRecord> {
      await delay();
      const sale = saleRecords.find((entry) => entry.id === id);
      if (!sale) throw new Error(`Sale record ${id} not found`);
      if (sale.approvalStatus !== 'draft') {
        throw new Error('Only draft sale can be submitted');
      }
      if (sale.requestedByUserId !== actor.actorUserId && actor.actorRole !== 'admin') {
        throw new Error('Only creator or admin can submit this sale');
      }
      sale.approvalStatus = 'pending_approval';
      return { ...sale };
    },
    async approveSale(id: string, actor: Actor): Promise<SaleRecord> {
      await delay();
      if (actor.actorRole !== 'admin') {
        throw new Error('Only admin can approve sales');
      }
      const sale = saleRecords.find((entry) => entry.id === id);
      if (!sale) throw new Error(`Sale record ${id} not found`);
      if (sale.approvalStatus !== 'pending_approval') {
        throw new Error('Only pending sale can be approved');
      }
      sale.approvalStatus = 'approved';
      sale.approvedByUserId = actor.actorUserId;
      sale.approvedAt = new Date().toISOString();
      return { ...sale };
    },
    async updateSale(id: string, payload: Partial<Omit<SaleRecord, 'id'>>, actor: Actor): Promise<SaleRecord> {
      await delay();
      const sale = saleRecords.find((s) => s.id === id);
      if (!sale) throw new Error(`Sale record ${id} not found`);
      if (sale.approvalStatus === 'approved') {
        throw new Error(`Sale ${id} is approved and cannot be edited`);
      }
      if (actor.actorRole === 'collector' && sale.requestedByUserId !== actor.actorUserId) {
        throw new Error('Collectors can update only their own sales');
      }
      if (actor.actorRole !== 'admin') {
        const approvalFields: Array<keyof SaleRecord> = ['approvalStatus', 'approvedByUserId', 'approvedAt', 'rejectionReason'];
        for (const field of approvalFields) {
          if (field in payload) throw new Error(`Only admin can modify ${field}`);
        }
      }
      Object.assign(sale, payload);
      return { ...sale };
    },
    async deleteSale(id: string, actor: Actor): Promise<{ id: string }> {
      await delay();
      const index = saleRecords.findIndex((s) => s.id === id);
      if (index === -1) throw new Error(`Sale record ${id} not found`);
      const sale = saleRecords[index];
      if (sale.approvalStatus === 'approved') {
        throw new Error(`Sale ${id} is approved and cannot be deleted`);
      }
      if (actor.actorRole === 'collector' && sale.requestedByUserId !== actor.actorUserId) {
        throw new Error('Collectors can delete only their own sales');
      }
      saleRecords.splice(index, 1);
      return { id };
    },
    async syncInventoryFromConversions(): Promise<{ updated: number }> {
      await delay();
      let updated = 0;

      while (productConversions.length > 0) {
        const conversion = productConversions.shift();
        if (!conversion) break;

        const existing = inventoryItems.find(
          (item) => item.name === conversion.productName && item.category === 'recycled-product'
        );

        if (existing) {
          existing.quantityKg += conversion.quantity;
          existing.unit = conversion.unit;
        } else {
          inventoryItems.unshift({
            id: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
            name: conversion.productName,
            category: 'recycled-product',
            quantityKg: conversion.quantity,
            unit: conversion.unit,
            standardPriceINR: 0,
          });
        }

        updated += 1;
      }

      return { updated };
    },
  },

  dashboard: {
    async getSummary(): Promise<DashboardSummary> {
      await delay();
      return { ...dashboardSummary };
    },
  },
};
