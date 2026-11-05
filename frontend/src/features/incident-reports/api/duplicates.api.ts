import { apiClient } from '@/lib/axios';
import type { ApiResponse } from '@/types/api.type';

export interface DuplicateInput {
  locationId: number; categoryId: number; title: string; description: string; observedAt?: string;
}
export interface SharedReport {
  reportId: number; incidentId: number | null; summary: string; symptom: string; status: string; reportStatus: string;
  updatedAt: string; reportedAt: string; resolvedAt: string | null; confirmationCount: number;
}
export interface DuplicateCandidate extends SharedReport {
  isOwnReport: boolean;
  kind: 'POSSIBLE_DUPLICATE' | 'POSSIBLE_RECURRENCE' | 'PAST_EVENT' | 'NEEDS_TIME'; canConfirm: boolean;
}
export interface DuplicateResult { availability: 'ready' | 'partial' | 'unavailable'; candidates: DuplicateCandidate[]; }
export async function checkDuplicates(input: DuplicateInput, signal?: AbortSignal) {
  return (await apiClient.post<never, ApiResponse<DuplicateResult>>('/incident-reports/check-duplicates', input, { signal })).data;
}
export async function confirmDuplicate(candidate: DuplicateCandidate, observedAt?: string, relativeToRepair?: 'BEFORE' | 'AFTER') {
  return (await apiClient.post('/incident-reports/' + candidate.reportId + '/confirmations', {
    expectedUpdatedAt: candidate.updatedAt, ...(observedAt ? { observedAt } : {}),
    ...(relativeToRepair ? { relativeToRepair } : {}),
  })).data;
}
export interface ConfirmationPage {
  items: { id: number; confirmedAt: string; observedAt: string | null; report: SharedReport }[];
  totalPages: number; total: number;
}
export async function myConfirmations(page: number, signal?: AbortSignal) {
  return (await apiClient.get<never, ApiResponse<ConfirmationPage>>('/incident-reports/my-confirmations', { params: { page, limit: 10 }, signal })).data;
}

export const sharedStatusLabels: Record<string, string> = {
  PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt', PENDING_ASSIGNMENT: 'Chờ phân công', ASSIGNED: 'Đã phân công',
  IN_PROGRESS: 'Đang xử lý', RESOLVED: 'Đã khắc phục', REJECTED: 'Bị từ chối', CANCELLED: 'Đã hủy',
};
