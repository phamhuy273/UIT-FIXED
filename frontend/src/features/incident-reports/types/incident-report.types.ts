export type Urgency = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type ReportStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export interface ReportMedia { id: number; url: string; publicId: string; }
export interface IncidentReport {
  id: number; code: string; title: string; description: string;
  status: ReportStatus; urgency: Urgency | null; createdAt: string; updatedAt: string;
  categoryId: number; buildingId: number; locationId: number;
  student: { id: number; fullName: string | null; email: string };
  category: { id: number; name: string };
  building: { id: number; name: string };
  location: { id: number; name: string; floor: { id: number; name: string } | null };
  media: ReportMedia[];
  histories: { id: number; action: string; toStatus: ReportStatus; reason: string | null; createdAt: string; actor: { id: number; fullName: string | null } }[];
  incident: { id: number; status: 'PENDING_ASSIGNMENT' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED'; urgency: Urgency } | null;
}
export interface CreateReportInput {
  buildingId: number; locationId: number; categoryId: number;
  title: string; description: string; urgency?: Urgency; mediaIds: number[];
}
export interface ReportPage { items: IncidentReport[]; total: number; page: number; limit: number; totalPages: number; }
export const urgencyLabels: Record<Urgency, string> = { CRITICAL: 'Khẩn cấp', HIGH: 'Cao', MEDIUM: 'Bình thường', LOW: 'Thấp' };
