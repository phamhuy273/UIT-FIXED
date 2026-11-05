import { apiClient } from '@/lib/axios';
import type { ApiResponse } from '@/types/api.type';
import type { AdminStudent, StudentInput, StudentUpdate } from '../types/admin.types';

export const adminStudentKeys = {
  all: ['admin', 'students'] as const,
  detail: (id: number) => ['admin', 'students', id] as const,
};

export async function getAdminStudents(signal?: AbortSignal) {
  return (await apiClient.get<never, ApiResponse<AdminStudent[]>>('/admin/students', { signal })).data;
}
export async function getAdminStudent(id: number, signal?: AbortSignal) {
  return (await apiClient.get<never, ApiResponse<AdminStudent>>(`/admin/students/${id}`, { signal })).data;
}
export async function createStudent(input: StudentInput) {
  return (await apiClient.post<never, ApiResponse<AdminStudent>>('/admin/students', input)).data;
}
export async function updateStudent(id: number, input: StudentUpdate) {
  return (await apiClient.patch<never, ApiResponse<AdminStudent>>(`/admin/students/${id}`, input)).data;
}
export async function deleteStudent(id: number) {
  return (await apiClient.delete<never, ApiResponse<{ id: number }>>(`/admin/students/${id}`)).data;
}
