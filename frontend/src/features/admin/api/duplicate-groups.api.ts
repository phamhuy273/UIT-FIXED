import { apiClient } from '@/lib/axios';
import type { ApiResponse } from '@/types/api.type';
import type { IncidentReport, Urgency } from '@/features/incident-reports/types/incident-report.types';

export interface PendingGroup {
  id: string; kind: 'SIMILAR'; referenceId: number; urgency: Urgency | null; reports: IncidentReport[];
}
export interface PendingGroupsPage {
  items: PendingGroup[]; total: number; totalReports: number; consideredReports: number;
  page: number; limit: number; totalPages: number; availability: 'ready' | 'partial' | 'unavailable';
}
export async function getPendingGroups(page: number, buildingId?: number, floorId?: number, signal?: AbortSignal) {
  return (await apiClient.get<never, ApiResponse<PendingGroupsPage>>('/incident-reports/pending-groups', {
    params: { page, limit: 10, buildingId, floorId }, signal,
  })).data;
}
