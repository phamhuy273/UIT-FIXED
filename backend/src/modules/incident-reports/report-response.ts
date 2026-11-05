import { Prisma } from '@prisma/client';

export const reportInclude = {
  _count: { select: { confirmations: true } },
  student: { select: { id: true, fullName: true, email: true } },
  category: { select: { id: true, name: true } },
  building: { select: { id: true, name: true, defaultDepartmentId: true } },
  location: { select: { id: true, name: true, floor: { select: { id: true, name: true } } } },
  media: { select: { id: true, url: true, publicId: true }, orderBy: { id: 'asc' } },
  histories: {
    select: { id: true, action: true, fromStatus: true, toStatus: true, reason: true, createdAt: true, actor: { select: { id: true, fullName: true } } },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  },
  incident: { select: { id: true, status: true, urgency: true } },
} satisfies Prisma.IncidentReportInclude;

export function presentReport<T extends { id: number; createdAt: Date; _count?: { confirmations: number } }>(report: T) {
  return { ...report, confirmationCount: report._count?.confirmations ?? 0,
    code: `IR-${report.createdAt.getUTCFullYear()}-${String(report.id).padStart(4, '0')}` };
}
