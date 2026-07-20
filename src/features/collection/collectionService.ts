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
  PickupStatus,
} from '../../shared/api/contracts';
import { collection as legacyCollection } from '../../shared/api/legacyClient';
import { requestJson } from '../../shared/services/http';

type PickupTaskListResponse = {
  items: PickupTask[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

type PickupTaskPayload = PickupTaskDto[] | PickupTaskListResponseDto;

function normalizeText(value: string | null | undefined): string {
  return value ?? '';
}

function mapStatus(status: string): PickupTask['status'] {
  const lower = status.toLowerCase();
  if (lower === 'scheduled' || lower === 'assigned' || lower === 'collected') {
    return lower;
  }

  return lower as PickupTask['status'];
}

function scheduledDateFromUtc(utcValue: string): string {
  const date = new Date(utcValue);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toISOString().slice(0, 10);
}

function normalizeListPayload(payload: PickupTaskPayload): PickupTaskDto[] {
  return Array.isArray(payload) ? payload : payload.items ?? [];
}

export function mapPickupDtoToTask(dto: PickupTaskDto): PickupTask {
  return {
    id: dto.id,
    site: dto.siteName,
    status: mapStatus(dto.status),
    assignedCollectorId: dto.assignedCollectorUserId ?? undefined,
    scheduledDate: scheduledDateFromUtc(dto.scheduledAtUtc),
    estimatedWeightKg: dto.estimatedWeightKg ?? 0,
    lockedAfterCollection: dto.status.toLowerCase() === 'collected',
    pickupCode: dto.pickupCode,
    siteName: dto.siteName,
    siteAddressText: dto.siteAddressText,
    scheduledAtUtc: dto.scheduledAtUtc,
    collectedWeightKg: dto.collectedWeightKg ?? undefined,
    assignedCollectorDisplayName: normalizeText(dto.assignedCollectorDisplayName),
    notes: normalizeText(dto.notes),
    assignmentEvents: dto.assignmentEvents ?? [],
  };
}



function normalizeHistoryPayload(payload: PickupAssignmentHistoryResponseDto | { events?: PickupAssignmentEventDto[] }): PickupAssignmentEventDto[] {
  return payload.events ?? [];
}

function toListResponse(payload: PickupTaskPayload): PickupTaskListResponse {
  const dtoItems = normalizeListPayload(payload).map(mapPickupDtoToTask);

  if (Array.isArray(payload)) {
    return {
      items: dtoItems,
      page: 1,
      pageSize: dtoItems.length,
      totalCount: dtoItems.length,
      totalPages: 1,
    };
  }

  return {
    items: dtoItems,
    page: payload.page !== undefined ? payload.page : 1,
    pageSize: payload.pageSize !== undefined ? payload.pageSize : dtoItems.length,
    totalCount: payload.totalCount !== undefined ? payload.totalCount : dtoItems.length,
    totalPages: payload.totalPages !== undefined ? payload.totalPages : 1,
  };
}

async function readPickupList(): Promise<PickupTaskListResponse> {
  try {
    const payload = await requestJson<PickupTaskPayload>('/api/collection/pickups');
    return toListResponse(payload);
  } catch {
    const legacyItems = await legacyCollection.getSchedule();
    return {
      items: legacyItems,
      page: 1,
      pageSize: legacyItems.length,
      totalCount: legacyItems.length,
      totalPages: 1,
    };
  }
}

async function readPickupById(id: string): Promise<PickupTask> {
  return mapPickupDtoToTask(await requestJson<PickupTaskDto>(`/api/collection/pickups/${id}`));
}

export const collectionService = {
  async getSchedule(): Promise<PickupTaskListResponse> {
    return readPickupList();
  },
  async getDispatches(): Promise<any[]> {
    return requestJson<any[]>('/api/collection/dispatches');
  },
  async updateStatus(id: string, status: PickupStatus, input?: { assignedCollectorUserId?: string; note?: string; collectedWeightKg?: number }): Promise<PickupTask> {
    if (status === 'assigned') {
      const assignedCollectorUserId = input?.assignedCollectorUserId?.trim();
      if (!assignedCollectorUserId) {
        throw new Error('Assign action requires an assigned collector id.');
      }

      return this.assignTask(id, {
        assignedCollectorUserId,
        note: input?.note ?? 'Assigned from collection page',
      });
    }

    if (status === 'collected') {
      return this.markCollected(id, {
        collectedWeightKg: input?.collectedWeightKg ?? 0,
      });
    }

    return this.getPickupById(id);
  },
  async dispatchToSegregation(pickupTaskId: string): Promise<PickupTask> {
    return this.sendToSegregation(pickupTaskId);
  },
  async getPickupById(id: string): Promise<PickupTask> {
    return readPickupById(id);
  },
  async getAssignmentHistory(id: string): Promise<PickupAssignmentEventDto[]> {
    const payload = await requestJson<PickupAssignmentHistoryResponseDto>(`/api/collection/pickups/${id}/assignment-history`);
    return normalizeHistoryPayload(payload);
  },
  async createTask(input: PickupTaskCreateInputDto): Promise<PickupTask> {
    return mapPickupDtoToTask(
      await requestJson<PickupTaskDto>('/api/collection/pickups', {
        method: 'POST',
        body: JSON.stringify(input),
      })
    );
  },
  async updateTask(id: string, input: PickupTaskUpdateInputDto): Promise<PickupTask> {
    return mapPickupDtoToTask(
      await requestJson<PickupTaskDto>(`/api/collection/pickups/${id}`, {
        method: 'PUT',
        body: JSON.stringify(input),
      })
    );
  },
  async deleteTask(id: string, input: PickupTaskCancelInputDto): Promise<PickupTask> {
    return mapPickupDtoToTask(
      await requestJson<PickupTaskDto>(`/api/collection/pickups/${id}`, {
        method: 'DELETE',
        body: JSON.stringify(input),
      })
    );
  },
  async assignTask(id: string, input: PickupTaskAssignInputDto): Promise<PickupTask> {
    return mapPickupDtoToTask(
      await requestJson<PickupTaskDto>(`/api/collection/pickups/${id}/assign`, {
        method: 'POST',
        body: JSON.stringify(input),
      })
    );
  },
  async markCollected(id: string, input: PickupTaskMarkCollectedInputDto): Promise<PickupTask> {
    return mapPickupDtoToTask(
      await requestJson<PickupTaskDto>(`/api/collection/pickups/${id}/mark-collected`, {
        method: 'POST',
        body: JSON.stringify(input),
      })
    );
  },
  async sendToSegregation(id: string): Promise<PickupTask> {
    return mapPickupDtoToTask(
      await requestJson<PickupTaskDto>(`/api/collection/pickups/${id}/send-to-segregation`, {
        method: 'POST',
      })
    );
  },
};