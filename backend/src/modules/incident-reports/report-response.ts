import { Prisma } from '@prisma/client';

export const reportInclude = {
  student: { select: { id: true, fullName: true, email: true } },
  category: { select: { id: true, name: true } },
  building: { select: { id: true, name: true } },
  location: { select: { id: true, name: true, floor: { select: { id: true, name: true } } } },
  media: { select: { id: true, url: true, publicId: true }, orderBy: { id: 'asc' } },
  histories: {
    select: { id: true, action: true, fromStatus: true, toStatus: true, reason: true, createdAt: true, actor: { select: { id: true, fullName: true } } },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  },
  incident: { select: { id: true, status: true, urgency: true } },
} satisfies Prisma.IncidentReportInclude;

export function presentReport<T extends { id: number; createdAt: Date }>(report: T) {
  return { ...report, code: `IR-${report.createdAt.getUTCFullYear()}-${String(report.id).padStart(4, '0')}` };
}
