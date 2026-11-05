import { apiClient } from '@/lib/axios';
import type { ApiResponse } from '@/types/api.type';

export interface DepartmentOption {
  id: number;
  name: string;
  description: string | null;
  staffCount: number;
}

export interface StaffMemberOption {
  id: number;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  departmentId: number;
  activeTasksCount: number;
  inProgressCount?: number;
  assignedCount?: number;
  workloadStatus: 'AVAILABLE' | 'BUSY' | 'OVERLOADED';
}

export interface AssignInput {
  departmentId: number;
  assigneeId: number;
  deadline?: string;
  note?: string;
}

export interface IncidentQueueItem {
  id: number;
  reportId: number;
  status: 'PENDING_ASSIGNMENT' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED';
  urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  deadline: string | null;
  createdAt: string;
  updatedAt: string;
  report: {
    id: number;
    code: string;
    title: string;
    description: string;
    urgency: string | null;
    status: string;
    createdAt: string;
    building: { id: number; name: string; defaultDepartmentId?: number | null };
    location: { id: number; name: string; floor?: { id: number; name: string } | null };
    category: { id: number; name: string };
    student: { id: number; email: string; fullName: string | null };
    media: { id: number; url: string; format: string | null }[];
  };
  assignment: {
    id: number;
    departmentId: number;
    departmentName: string;
    assignee: { id: number; fullName: string | null; email: string };
    assignedBy: { id: number; fullName: string | null; email: string };
    createdAt: string;
  } | null;
  progressNotes: {
    id: number;
    content: string;
    createdAt: string;
    author: { id: number; fullName: string | null; email: string };
  }[];
  resolution: {
    id: number;
    note: string;
    resolvedAt: string;
    resolvedBy: { id: number; fullName: string | null; email: string };
    media: { id: number; url: string }[];
  } | null;
}

export interface IncidentQueueResponse {
  items: IncidentQueueItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function getDepartments(): Promise<DepartmentOption[]> {
  const res = await apiClient.get<never, ApiResponse<DepartmentOption[]>>('/master-data/departments');
  return res.data;
}

export async function getDepartmentStaff(departmentId: number): Promise<StaffMemberOption[]> {
  const res = await apiClient.get<never, ApiResponse<StaffMemberOption[]>>(`/master-data/departments/${departmentId}/staff`);
  return res.data;
}

export async function getIncidentsQueue(params: {
  status?: string;
  buildingId?: number;
  floorId?: number;
  page?: number;
  limit?: number;
}): Promise<IncidentQueueResponse> {
  const res = await apiClient.get<never, ApiResponse<IncidentQueueResponse>>('/incidents/queue', { params });
  return res.data;
}

export async function assignIncident(incidentId: number, data: AssignInput): Promise<IncidentQueueItem> {
  const res = await apiClient.post<never, ApiResponse<IncidentQueueItem>>(`/incidents/${incidentId}/assign`, data);
  return res.data;
}
