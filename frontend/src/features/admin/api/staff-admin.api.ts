import { apiClient } from '@/lib/axios';
import type { ApiResponse } from '@/types/api.type';
import type { AdminStaff, StaffInput, StaffUpdate } from '../types/admin.types';

export const adminStaffKeys = {
  all: ['admin', 'staff'] as const,
  detail: (id: number) => ['admin', 'staff', id] as const,
};

export async function getAdminStaff(signal?: AbortSignal) {
  return (await apiClient.get<never, ApiResponse<AdminStaff[]>>('/admin/staff', { signal })).data;
}
export async function getAdminStaffMember(id: number, signal?: AbortSignal) {
  return (await apiClient.get<never, ApiResponse<AdminStaff>>(`/admin/staff/${id}`, { signal })).data;
}
export async function createStaff(input: StaffInput) {
  return (await apiClient.post<never, ApiResponse<AdminStaff>>('/admin/staff', input)).data;
}
export async function updateStaff(id: number, input: StaffUpdate) {
  return (await apiClient.patch<never, ApiResponse<AdminStaff>>(`/admin/staff/${id}`, input)).data;
}
export async function deleteStaff(id: number) {
  return (await apiClient.delete<never, ApiResponse<{ id: number }>>(`/admin/staff/${id}`)).data;
}
