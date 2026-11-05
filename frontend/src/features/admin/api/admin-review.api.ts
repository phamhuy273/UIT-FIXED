import { apiClient } from '@/lib/axios';
import type { ApiResponse } from '@/types/api.type';
import type { IncidentReport, ReportPage } from '@/features/incident-reports/types/incident-report.types';
import type { ReviewInput } from '../types/admin.types';

export async function getPendingReports(page: number, buildingId?: number, floorId?: number, signal?: AbortSignal) {
  return (await apiClient.get<never, ApiResponse<ReportPage>>('/incident-reports/pending', { params: { page, limit: 10, buildingId, floorId }, signal })).data;
}
export async function reviewReport(id: number, input: ReviewInput) {
  return (await apiClient.patch<never, ApiResponse<IncidentReport>>(`/incident-reports/${id}/review`, input)).data;
}
