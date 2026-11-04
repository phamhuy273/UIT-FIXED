import { apiClient } from '@/lib/axios';
import type { ApiResponse } from '@/types/api.type';
import type { IncidentStats, StatsRange, StatsScope } from '../types/admin.types';

export async function getIncidentStats(days: StatsRange | null, scope: StatsScope, signal?: AbortSignal) {
  return (await apiClient.get<never, ApiResponse<IncidentStats>>('/incident-reports/stats', { params: { days: days ?? undefined, scope }, signal })).data;
}
