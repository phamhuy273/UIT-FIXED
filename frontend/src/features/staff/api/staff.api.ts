import { apiClient } from '@/lib/axios';
import type { ApiResponse } from '@/types/api.type';
import type { IncidentQueueItem } from '@/features/admin/api/dispatch.api';

export interface StaffTasksResponse {
  items: IncidentQueueItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  counts: {
    all: number;
    assigned: number;
    inProgress: number;
    resolved: number;
  };
  department: {
    id: number;
    name: string;
  } | null;
}

export async function getStaffTasks(params: {
  tab?: 'ALL' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED';
  page?: number;
  limit?: number;
}): Promise<StaffTasksResponse> {
  const res = await apiClient.get<never, ApiResponse<StaffTasksResponse>>('/staff/incidents', { params });
  return res.data;
}

export async function getStaffTaskDetail(id: number): Promise<IncidentQueueItem> {
  const res = await apiClient.get<never, ApiResponse<IncidentQueueItem>>(`/staff/incidents/${id}`);
  return res.data;
}

export async function acceptStaffTask(id: number): Promise<IncidentQueueItem> {
  const res = await apiClient.patch<never, ApiResponse<IncidentQueueItem>>(`/staff/incidents/${id}/accept`);
  return res.data;
}

export async function addStaffProgressNote(id: number, content: string): Promise<{ id: number; content: string; createdAt: string }> {
  const res = await apiClient.post<never, ApiResponse<{ id: number; content: string; createdAt: string }>>(`/staff/incidents/${id}/progress`, {
    content,
  });
  return res.data;
}

export async function resolveStaffTask(
  id: number,
  data: { resolutionNote: string; mediaIds?: number[] },
): Promise<IncidentQueueItem> {
  const res = await apiClient.patch<never, ApiResponse<IncidentQueueItem>>(`/staff/incidents/${id}/resolve`, data);
  return res.data;
}
