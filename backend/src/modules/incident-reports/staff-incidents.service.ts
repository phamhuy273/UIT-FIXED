import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { IncidentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service.js';
import { StaffIncidentQueryDto, StaffIncidentTab } from './dto/staff-incident-query.dto.js';
import { ResolveIncidentDto } from './dto/resolve-incident.dto.js';
import { incidentDetailInclude, presentIncident } from './incident-assignment.service.js';

@Injectable()
export class StaffIncidentsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyTasks(staffId: number, query: StaffIncidentQueryDto) {
    const staff = await this.prisma.user.findUnique({
      where: { id: staffId },
      include: { department: true },
    });
    if (!staff || !staff.departmentId) {
      throw new ForbiddenException('Tài khoản kỹ thuật viên chưa được gán vào phòng ban.');
    }

    const baseWhere: Prisma.IncidentWhereInput = {
      assignments: {
        some: {
          assigneeId: staffId,
          isCurrent: true,
        },
      },
    };

    // Calculate count per tab
    const [assignedCount, inProgressCount, resolvedCount] = await Promise.all([
      this.prisma.incident.count({ where: { ...baseWhere, status: IncidentStatus.ASSIGNED } }),
      this.prisma.incident.count({ where: { ...baseWhere, status: IncidentStatus.IN_PROGRESS } }),
      this.prisma.incident.count({ where: { ...baseWhere, status: IncidentStatus.RESOLVED } }),
    ]);

    let statusFilter: IncidentStatus | undefined;
    if (query.tab === StaffIncidentTab.ASSIGNED) statusFilter = IncidentStatus.ASSIGNED;
    else if (query.tab === StaffIncidentTab.IN_PROGRESS) statusFilter = IncidentStatus.IN_PROGRESS;
    else if (query.tab === StaffIncidentTab.RESOLVED) statusFilter = IncidentStatus.RESOLVED;

    const where: Prisma.IncidentWhereInput = {
      ...baseWhere,
      ...(statusFilter ? { status: statusFilter } : {}),
    };

    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 10));

    const [items, total] = await this.prisma.$transaction([
      this.prisma.incident.findMany({
        where,
        include: incidentDetailInclude,
        orderBy: [
          { urgency: 'asc' },
          { deadline: { sort: 'asc', nulls: 'last' } },
          { createdAt: 'desc' },
        ],
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
      counts: {
        all: assignedCount + inProgressCount + resolvedCount,
        assigned: assignedCount,
        inProgress: inProgressCount,
        resolved: resolvedCount,
      },
      department: staff.department
        ? {
            id: staff.department.id,
            name: staff.department.name,
          }
        : null,
    };
  }

  async getTaskDetail(staffId: number, incidentId: number) {
    const incident = await this.prisma.incident.findUnique({
      where: { id: incidentId },
      include: incidentDetailInclude,
    });
    if (!incident) {
      throw new NotFoundException('Không tìm thấy sự cố.');
    }

    const currentAssignment = incident.assignments?.[0];
    if (!currentAssignment || currentAssignment.assigneeId !== staffId) {
      throw new ForbiddenException('Bạn không được phân công phụ trách sự cố này.');
    }

    return presentIncident(incident);
  }

  async acceptTask(staffId: number, incidentId: number) {
    return this.prisma.$transaction(async (tx) => {
      const incident = await tx.incident.findUnique({
        where: { id: incidentId },
        include: { assignments: { where: { isCurrent: true } } },
      });
      if (!incident) throw new NotFoundException('Không tìm thấy sự cố.');

      const currentAssignment = incident.assignments[0];
      if (!currentAssignment || currentAssignment.assigneeId !== staffId) {
        throw new ForbiddenException('Bạn không phải là kỹ thuật viên được giao việc này.');
      }

      if (incident.status !== IncidentStatus.ASSIGNED) {
        throw new ConflictException('Sự cố không ở trạng thái chờ tiếp nhận.');
      }

      // Transition to IN_PROGRESS
      await tx.incident.update({
        where: { id: incident.id },
        data: { status: IncidentStatus.IN_PROGRESS },
      });

      // Log history
      await tx.incidentHistory.create({
        data: {
          incidentId: incident.id,
          actorId: staffId,
          assignmentId: currentAssignment.id,
          action: 'ASSIGNED',
          fromStatus: IncidentStatus.ASSIGNED,
          toStatus: IncidentStatus.IN_PROGRESS,
          reason: 'Kỹ thuật viên đã tiếp nhận công việc.',
        },
      });

      const updated = await tx.incident.findUniqueOrThrow({
        where: { id: incident.id },
        include: incidentDetailInclude,
      });

      return presentIncident(updated);
    });
  }

  async addProgressNote(staffId: number, incidentId: number, content: string) {
    const incident = await this.prisma.incident.findUnique({
      where: { id: incidentId },
      include: { assignments: { where: { isCurrent: true } } },
    });
    if (!incident) throw new NotFoundException('Không tìm thấy sự cố.');

    const currentAssignment = incident.assignments[0];
    if (!currentAssignment || currentAssignment.assigneeId !== staffId) {
      throw new ForbiddenException('Bạn không được giao việc này.');
    }

    if (incident.status !== IncidentStatus.IN_PROGRESS) {
      throw new ConflictException('Chỉ có thể ghi chú tiến độ cho sự cố đang xử lý (IN_PROGRESS).');
    }

    const note = await this.prisma.incidentProgressNote.create({
      data: {
        incidentId,
        authorId: staffId,
        content: content.trim(),
      },
      include: {
        author: { select: { id: true, fullName: true, email: true } },
      },
    });

    return {
      id: note.id,
      content: note.content,
      createdAt: note.createdAt.toISOString(),
      author: note.author,
    };
  }

  async resolveTask(staffId: number, incidentId: number, dto: ResolveIncidentDto) {
    return this.prisma.$transaction(async (tx) => {
      const incident = await tx.incident.findUnique({
        where: { id: incidentId },
        include: { assignments: { where: { isCurrent: true } } },
      });
      if (!incident) throw new NotFoundException('Không tìm thấy sự cố.');

      const currentAssignment = incident.assignments[0];
      if (!currentAssignment || currentAssignment.assigneeId !== staffId) {
        throw new ForbiddenException('Bạn không được giao việc này.');
      }

      if (incident.status !== IncidentStatus.IN_PROGRESS) {
        throw new ConflictException('Sự cố phải đang ở trạng thái xử lý (IN_PROGRESS) trước khi hoàn tất.');
      }

      // Recheck state and assignment when acquiring the write lock: only one
      // concurrent completion may create a resolution/history for this incident.
      const changed = await tx.incident.updateMany({
        where: {
          id: incident.id,
          status: IncidentStatus.IN_PROGRESS,
          assignments: { some: { id: currentAssignment.id, assigneeId: staffId, isCurrent: true } },
        },
        data: { status: IncidentStatus.RESOLVED },
      });
      if (changed.count !== 1) {
        throw new ConflictException('Sự cố vừa được xử lý hoặc thay đổi phân công. Vui lòng tải lại.');
      }

      // Create resolution
      const resolution = await tx.incidentResolution.create({
        data: {
          incidentId: incident.id,
          resolvedById: staffId,
          resolutionNote: dto.resolutionNote.trim(),
          resolvedAt: new Date(),
        },
      });

      // Atomically claim only this staff member's unused uploads. Clearing the
      // temporary owner preserves the single-parent media constraint.
      if (dto.mediaIds && dto.mediaIds.length > 0) {
        const attached = await tx.media.updateMany({
          where: { id: { in: dto.mediaIds }, userId: staffId, reportId: null, resolutionId: null },
          data: { userId: null, resolutionId: resolution.id },
        });
        if (attached.count !== dto.mediaIds.length) {
          throw new BadRequestException('Ảnh không thuộc tài khoản hoặc đã được sử dụng.');
        }
      }

      // Log history
      await tx.incidentHistory.create({
        data: {
          incidentId: incident.id,
          actorId: staffId,
          resolutionId: resolution.id,
          action: 'RESOLVED',
          fromStatus: IncidentStatus.IN_PROGRESS,
          toStatus: IncidentStatus.RESOLVED,
          reason: dto.resolutionNote.trim(),
        },
      });

      const updated = await tx.incident.findUniqueOrThrow({
        where: { id: incident.id },
        include: incidentDetailInclude,
      });

      return presentIncident(updated);
    });
  }
}
