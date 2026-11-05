import type { Role } from '@/features/auth/types/auth.types';
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

export interface AdminDepartment {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  staffCount: number;
  memberCount: number;
  assignmentCount: number;
  activeAssignmentCount: number;
  buildingCount: number;
}
export interface DepartmentMember {
  id: number;
  fullName: string | null;
  email: string;
  role: Role;
  isActive: boolean;
}
export interface AdminDepartmentDetail extends AdminDepartment { staff: DepartmentMember[]; }
export interface DepartmentInput { name: string; description: string | null; }
export type DepartmentUpdate = Partial<DepartmentInput> & { isActive?: boolean };

export interface AdminStudent {
  id: number;
  email: string;
  fullName: string | null;
  role: Role;
  avatarUrl: string | null;
  departmentId: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  referenceCount: number;
}
export interface StudentInput {
  fullName: string;
  email: string;
  password: string;
}
export interface StudentUpdate {
  fullName?: string;
  email?: string;
  isActive?: boolean;
  password?: string;
}

export interface AdminStaffDepartment {
  id: number;
  name: string;
  isActive: boolean;
}
export interface AdminStaff {
  id: number;
  email: string;
  fullName: string | null;
  role: Role;
  avatarUrl: string | null;
  departmentId: number | null;
  department: AdminStaffDepartment | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  referenceCount: number;
  openAssignmentCount: number;
}
export interface StaffInput {
  fullName: string;
  email: string;
  password: string;
  departmentId: number;
}
export interface StaffUpdate {
  fullName?: string;
  email?: string;
  isActive?: boolean;
  password?: string;
  departmentId?: number;
}

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
