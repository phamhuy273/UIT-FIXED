import type { IncidentReport, ReportStatus, Urgency } from '@/features/incident-reports/types/incident-report.types';
export type ReviewInput = { action: 'APPROVE'; categoryId: number; urgency: Urgency } | { action: 'REJECT'; reason: string };

export interface AdminCategory {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  reportCount: number;
}
export interface CategoryInput { name: string; description: string | null; }
export type CategoryUpdate = Partial<CategoryInput> & { isActive?: boolean };

export type StatsRange = 7 | 30 | 90;
export type StatsScope = 'active' | 'approved';
export type IncidentStatus = NonNullable<IncidentReport['incident']>['status'];
export interface NamedCount { id: number; name: string; count: number; }
export interface TrendPoint { bucket: string; total: number; approved: number; rejected: number; }
export interface IncidentStats {
  range: { days: StatsRange | null; since: string | null };
  scope: StatsScope;
  reports: { total: number; byStatus: Record<ReportStatus, number> };
  incidents: { total: number; byStatus: Record<IncidentStatus, number> };
  byUrgency: Record<Urgency | 'UNSET', number>;
  byBuilding: NamedCount[];
  byCategory: NamedCount[];
  topLocations: (NamedCount & { buildingName: string; floorName: string | null })[];
  trend: { unit: 'day' | 'week' | 'month'; points: TrendPoint[] };
}
