import { apiClient } from '@/lib/axios';
import type { ApiResponse } from '@/types/api.type';
import type { AdminCategory, CategoryInput, CategoryUpdate } from '../types/admin.types';

export const adminCategoryKeys = {
  all: ['admin', 'categories'] as const,
  detail: (id: number) => ['admin', 'categories', id] as const,
};

export async function getAdminCategories(signal?: AbortSignal) {
  return (await apiClient.get<never, ApiResponse<AdminCategory[]>>('/admin/categories', { signal })).data;
}
export async function getAdminCategory(id: number, signal?: AbortSignal) {
  return (await apiClient.get<never, ApiResponse<AdminCategory>>(`/admin/categories/${id}`, { signal })).data;
}
export async function createCategory(input: CategoryInput) {
  return (await apiClient.post<never, ApiResponse<AdminCategory>>('/admin/categories', input)).data;
}
export async function updateCategory(id: number, input: CategoryUpdate) {
  return (await apiClient.patch<never, ApiResponse<AdminCategory>>(`/admin/categories/${id}`, input)).data;
}
export async function deleteCategory(id: number) {
  return (await apiClient.delete<never, ApiResponse<{ id: number }>>(`/admin/categories/${id}`)).data;
}
