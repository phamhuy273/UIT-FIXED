import { apiClient } from '@/lib/axios';
import type { ApiResponse } from '@/types/api.type';
import type { BuildingOption, CategoryOption } from '../types/master-data.types';

export async function getLocations(signal?: AbortSignal): Promise<BuildingOption[]> {
  // apiClient's response interceptor already unwraps AxiosResponse.
  const response = await apiClient.get<never, ApiResponse<BuildingOption[]>>('/master-data/locations', { signal });
  return response.data;
}

export async function getCategories(signal?: AbortSignal): Promise<CategoryOption[]> {
  const response = await apiClient.get<never, ApiResponse<CategoryOption[]>>('/master-data/categories', { signal });
  return response.data;
}
