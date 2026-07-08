import { authService, healthService, inventoryService, salesService } from '../services';
import { dashboard } from './legacyClient';
import { collectionService } from '../../features/collection/collectionService';
import { recyclingService } from '../../features/recycling/recyclingService';
import { segregationService } from '../../features/segregation/segregationService';

export const api = {
  auth: authService,
  health: healthService,
  collection: collectionService,
  segregation: segregationService,
  recycling: recyclingService,
  dashboard,
  inventory: {
    getItems: inventoryService.getItems,
    createItem: inventoryService.createItem,
    updateItemPrice: inventoryService.updatePrice,
    syncInventoryFromConversions: inventoryService.syncInventoryFromConversions,
  },
  sales: salesService,
};
