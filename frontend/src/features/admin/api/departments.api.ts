import { apiClient } from '@/lib/axios';
import type { ApiResponse } from '@/types/api.type';
import type { AdminDepartment, AdminDepartmentDetail, DepartmentInput, DepartmentUpdate } from '../types/admin.types';

export const adminDepartmentKeys = {
  all: ['admin', 'departments'] as const,
  detail: (id: number) => ['admin', 'departments', id] as const,
};

export async function getAdminDepartments(signal?: AbortSignal) {
  return (await apiClient.get<never, ApiResponse<AdminDepartment[]>>('/admin/departments', { signal })).data;
}
export async function getAdminDepartment(id: number, signal?: AbortSignal) {
  return (await apiClient.get<never, ApiResponse<AdminDepartmentDetail>>(`/admin/departments/${id}`, { signal })).data;
}
export async function createDepartment(input: DepartmentInput) {
  return (await apiClient.post<never, ApiResponse<AdminDepartment>>('/admin/departments', input)).data;
}
export async function updateDepartment(id: number, input: DepartmentUpdate) {
  return (await apiClient.patch<never, ApiResponse<AdminDepartment>>(`/admin/departments/${id}`, input)).data;
}
export async function deleteDepartment(id: number) {
  return (await apiClient.delete<never, ApiResponse<{ id: number }>>(`/admin/departments/${id}`)).data;
}
