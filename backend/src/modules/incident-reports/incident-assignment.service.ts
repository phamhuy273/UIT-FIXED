import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { IncidentStatus, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service.js';
import { AssignIncidentDto } from './dto/assign-incident.dto.js';
import { presentReport, reportInclude } from './report-response.js';

export const incidentDetailInclude = {
  report: {
    include: reportInclude,
  },
  assignments: {
    where: { isCurrent: true },
    include: {
      department: true,
      assignee: {
        select: { id: true, fullName: true, email: true, avatarUrl: true },
      },
      assignedBy: {
        select: { id: true, fullName: true, email: true },
      },
    },
  },
  progressNotes: {
    include: {
      author: {
        select: { id: true, fullName: true, email: true, role: true },
      },
    },
    orderBy: { createdAt: 'desc' as const },
  },
  resolutions: {
    include: {
      resolvedBy: {
        select: { id: true, fullName: true, email: true },
      },
      media: true,
    },
    orderBy: { resolvedAt: 'desc' as const },
  },
  histories: {
    include: {
      actor: {
        select: { id: true, fullName: true, email: true, role: true },
      },
      assignment: {
        include: { department: true, assignee: { select: { fullName: true } } },
      },
    },
    orderBy: { createdAt: 'desc' as const },
  },
};

export function presentIncident(inc: any) {
  const currentAssignment = inc.assignments?.[0] ?? null;
  const resolution = inc.resolutions?.[0] ?? null;

  return {
    id: inc.id,
    reportId: inc.reportId,
    status: inc.status,
    urgency: inc.urgency,
    deadline: inc.deadline ? inc.deadline.toISOString() : null,
    createdAt: inc.createdAt.toISOString(),
    updatedAt: inc.updatedAt.toISOString(),
    report: presentReport(inc.report),
    assignment: currentAssignment
      ? {
          id: currentAssignment.id,
          departmentId: currentAssignment.departmentId,
          departmentName: currentAssignment.department?.name,
          assignee: currentAssignment.assignee,
          assignedBy: currentAssignment.assignedBy,
          createdAt: currentAssignment.createdAt.toISOString(),
        }
      : null,
    progressNotes: (inc.progressNotes ?? []).map((n: any) => ({
      id: n.id,
      content: n.content,
      createdAt: n.createdAt.toISOString(),
      author: n.author,
    })),
    resolution: resolution
      ? {
          id: resolution.id,
          note: resolution.resolutionNote,
          resolvedAt: resolution.resolvedAt.toISOString(),
          resolvedBy: resolution.resolvedBy,
          media: (resolution.media ?? []).map((m: any) => ({
            id: m.id,
            url: m.url,
            format: m.format,
          })),
        }
      : null,
    histories: (inc.histories ?? []).map((h: any) => ({
      id: h.id,
      action: h.action,
      fromStatus: h.fromStatus,
      toStatus: h.toStatus,
      reason: h.reason,
      createdAt: h.createdAt.toISOString(),
      actor: h.actor,
      assignedTo: h.assignment?.assignee?.fullName,
      department: h.assignment?.department?.name,
    })),
  };
}

@Injectable()
export class IncidentAssignmentService {
  constructor(private readonly prisma: PrismaService) {}

  async getIncidentsQueue(query: { status?: IncidentStatus; buildingId?: number; page?: number; limit?: number }) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 10));

    const where: Prisma.IncidentWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.buildingId ? { report: { buildingId: query.buildingId } } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.incident.findMany({
        where,
        include: incidentDetailInclude,
        orderBy: [{ urgency: 'asc' }, { createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.incident.count({ where }),
    ]);

    return {
      items: items.map(presentIncident),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async assign(adminId: number, incidentOrReportId: number, dto: AssignIncidentDto) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Find incident by ID or reportId
      const incident = await tx.incident.findFirst({
        where: {
          OR: [{ id: incidentOrReportId }, { reportId: incidentOrReportId }],
        },
        include: { assignments: { where: { isCurrent: true } } },
      });

      if (!incident) {
        throw new NotFoundException('Không tìm thấy sự cố.');
      }

      if (incident.status === IncidentStatus.RESOLVED) {
        throw new ConflictException('Sự cố đã được hoàn thành giải quyết, không thể phân công lại.');
      }

      // 2. Validate Department
      const dept = await tx.department.findUnique({
        where: { id: dto.departmentId },
      });
      if (!dept || !dept.isActive) {
        throw new BadRequestException('Phòng ban không tồn tại hoặc đã ngừng hoạt động.');
      }

      // 3. Validate Assignee (must be TECH_STAFF in that department)
      const assignee = await tx.user.findUnique({
        where: { id: dto.assigneeId },
      });
      if (!assignee || !assignee.isActive || assignee.role !== Role.TECH_STAFF || assignee.departmentId !== dto.departmentId) {
        throw new BadRequestException('Kỹ thuật viên không hợp lệ hoặc không thuộc phòng ban được chọn.');
      }

      const isReassign = incident.assignments.length > 0;
      const now = new Date();

      // 4. Archive previous current assignment
      if (isReassign) {
        await tx.incidentAssignment.updateMany({
          where: { incidentId: incident.id, isCurrent: true },
          data: { isCurrent: false, endedAt: now },
        });
      }

      // 5. Create new current assignment
      const newAssignment = await tx.incidentAssignment.create({
        data: {
          incidentId: incident.id,
          departmentId: dto.departmentId,
          assignedById: adminId,
          assigneeId: dto.assigneeId,
          isCurrent: true,
          isActive: true,
        },
      });

      // 6. Update incident status to ASSIGNED and update deadline
      const deadlineDate = dto.deadline ? new Date(dto.deadline) : incident.deadline;
      await tx.incident.update({
        where: { id: incident.id },
        data: {
          status: IncidentStatus.ASSIGNED,
          deadline: deadlineDate,
        },
      });

      // 7. Log history
      await tx.incidentHistory.create({
        data: {
          incidentId: incident.id,
          actorId: adminId,
          assignmentId: newAssignment.id,
          action: isReassign ? 'REASSIGNED' : 'ASSIGNED',
          fromStatus: incident.status,
          toStatus: IncidentStatus.ASSIGNED,
          reason: dto.note?.trim() || null,
        },
      });

      // 8. Return fresh updated incident
      const updated = await tx.incident.findUniqueOrThrow({
        where: { id: incident.id },
        include: incidentDetailInclude,
      });

      return presentIncident(updated);
    });
  }
}
