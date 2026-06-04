import { authService, healthService, inventoryService, salesService } from '../services';
import { collection, dashboard, inventoryLegacy, recycling, segregation } from './legacyClient';

export const api = {
  auth: authService,
  health: healthService,
  collection,
  segregation,
  recycling,
  dashboard,
  inventory: {
    getItems: inventoryService.getItems,
    createItem: inventoryService.createItem,
    updateItemPrice: inventoryService.updatePrice,
    syncInventoryFromConversions: inventoryLegacy.syncInventoryFromConversions,
  },
  sales: salesService,
};
