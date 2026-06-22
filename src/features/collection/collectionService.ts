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
  SegregationDispatch,
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
  // Unknown statuses default to scheduled until the page can explicitly surface
  // additional lifecycle states from the backend.
  if (status === 'scheduled' || status === 'assigned' || status === 'collected') {
    return status;
  }

  return 'scheduled';
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
    lockedAfterCollection: dto.status === 'collected',
    pickupCode: dto.pickupCode,
    siteName: dto.siteName,
    siteAddressText: dto.siteAddressText,
    scheduledAtUtc: dto.scheduledAtUtc,
    collectedWeightKg: dto.collectedWeightKg ?? 0,
    assignedCollectorDisplayName: normalizeText(dto.assignedCollectorDisplayName),
    notes: normalizeText(dto.notes),
    assignmentEvents: dto.assignmentEvents ?? [],
  };
}

function mapLegacyTasksToResponse(tasks: PickupTask[]): PickupTaskListResponse {
  const items = tasks.map((task) => ({
    ...task,
    assignmentEvents: task.assignmentEvents ?? [],
  }));

  return {
    items,
    page: 1,
    pageSize: items.length,
    totalCount: items.length,
    totalPages: 1,
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
    return mapLegacyTasksToResponse(await legacyCollection.getSchedule());
  }
}

async function readPickupById(id: string): Promise<PickupTask> {
  try {
    return mapPickupDtoToTask(await requestJson<PickupTaskDto>(`/api/collection/pickups/${id}`));
  } catch {
    // The legacy mock facade only exposes the schedule collection, so fallback
    // resolves the single pickup from the cached list instead of inventing a new API.
    const fallback = await legacyCollection.getSchedule();
    const match = fallback.find((task) => task.id === id);
    if (!match) {
      throw new Error(`Pickup ${id} not found`);
    }

    return {
      ...match,
      assignmentEvents: match.assignmentEvents ?? [],
    };
  }
}

export const collectionService = {
  async getSchedule(): Promise<PickupTaskListResponse> {
    return readPickupList();
  },
  async getDispatches(): Promise<SegregationDispatch[]> {
    return legacyCollection.getDispatches();
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
    try {
      const payload = await requestJson<PickupAssignmentHistoryResponseDto>(`/api/collection/pickups/${id}/assignment-history`);
      return normalizeHistoryPayload(payload);
    } catch {
      const fallback = await readPickupById(id);
      return fallback.assignmentEvents ?? [];
    }
  },
  // Mutations are intentionally online-only. Reads can fall back to legacy mock
  // data so the current page still renders while the backend rollout finishes.
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