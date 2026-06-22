import { authService, healthService, inventoryService, salesService } from '../services';
import { dashboard, inventoryLegacy, recycling, segregation } from './legacyClient';
import { collectionService } from '../../features/collection/collectionService';

export const api = {
  auth: authService,
  health: healthService,
  collection: collectionService,
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
