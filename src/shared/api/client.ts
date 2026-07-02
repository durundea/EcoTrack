import { authService, healthService, inventoryService, salesService } from '../services';
import { dashboard, inventoryLegacy, recycling } from './legacyClient';
import { collectionService } from '../../features/collection/collectionService';
import { segregationService } from '../../features/segregation/segregationService';

export const api = {
  auth: authService,
  health: healthService,
  collection: collectionService,
  segregation: segregationService,
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
