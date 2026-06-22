import type {
  PickupAssignmentEventDto,
  PickupAssignmentHistoryResponseDto,
  PickupTask,
  PickupTaskAssignInputDto,
  PickupTaskCancelInputDto,
  PickupTaskCreateInputDto,
  PickupTaskDto,
  PickupTaskListResponseDto,
  PickupTaskMarkCollectedInputDto,
  PickupTaskUpdateInputDto,
} from '../api/contracts';
import { collection as legacyCollection } from '../api/legacyClient';
import { requestJson } from './http';

type PickupTaskListResponse = {
  items: PickupTask[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

type PickupTaskPayload = PickupTaskDto[] | PickupTaskListResponseDto;
export * from '../../features/collection/collectionService';