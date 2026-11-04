import { apiClient } from '@/lib/axios';
import type { ApiResponse } from '@/types/api.type';
import type { CreateReportInput, IncidentReport, ReportPage } from '../types/incident-report.types';

export async function createReport(data: CreateReportInput) {
  return (await apiClient.post<never, ApiResponse<IncidentReport>>('/incident-reports', data)).data;
}
export async function getMyReports(page: number, signal?: AbortSignal) {
  return (await apiClient.get<never, ApiResponse<ReportPage>>('/incident-reports/my', { params: { page, limit: 10 }, signal })).data;
}
export async function cancelReport(id: number, reason: string) {
  return (await apiClient.delete<never, ApiResponse<IncidentReport>>(`/incident-reports/${id}`, { data: { reason } })).data;
}
