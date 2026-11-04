import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ReportStatus } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service.js';
import { CreateIncidentReportDto } from './dto/create-incident-report.dto.js';
import { ReportQueryDto } from './dto/report-query.dto.js';
import { presentReport, reportInclude } from './report-response.js';

@Injectable()
export class IncidentReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(studentId: number, dto: CreateIncidentReportDto) {
    return this.prisma.$transaction(async (tx) => {
      const location = await tx.location.findFirst({
        where: { id: dto.locationId, buildingId: dto.buildingId, isActive: true, building: { isActive: true } },
        include: { floor: { select: { buildingId: true, isActive: true } } },
      });
      if (!location || (location.floor && (!location.floor.isActive || location.floor.buildingId !== dto.buildingId))) {
        throw new BadRequestException('Phòng học không hợp lệ hoặc không thuộc tòa nhà đã chọn.');
      }
      if (!await tx.category.findFirst({ where: { id: dto.categoryId, isActive: true } })) {
        throw new BadRequestException('Danh mục không tồn tại hoặc đã ngừng sử dụng.');
      }
      const report = await tx.incidentReport.create({
        data: { studentId, buildingId: dto.buildingId, locationId: dto.locationId, categoryId: dto.categoryId,
          title: dto.title, description: dto.description, urgency: dto.urgency,
          histories: { create: { actorId: studentId, action: 'CREATED', toStatus: 'PENDING' } },
        },
      });
      const mediaIds = dto.mediaIds ?? [];
      if (mediaIds.length) {
        // The conditional update atomically claims only this user's temporary uploads.
        // Clear userId because the schema allows one parent type per media record.
        const attached = await tx.media.updateMany({
          where: { id: { in: mediaIds }, userId: studentId, reportId: null, resolutionId: null },
          data: { userId: null, reportId: report.id },
        });
        if (attached.count !== mediaIds.length) throw new BadRequestException('Ảnh không thuộc tài khoản hoặc đã được sử dụng.');
      }
      return presentReport(await tx.incidentReport.findUniqueOrThrow({ where: { id: report.id }, include: reportInclude }));
    });
  }

  async myReports(studentId: number, query: ReportQueryDto) {
    const where: Prisma.IncidentReportWhereInput = { studentId, ...(query.buildingId ? { buildingId: query.buildingId } : {}) };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.incidentReport.findMany({ where, include: reportInclude,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (query.page - 1) * query.limit, take: query.limit }),
      this.prisma.incidentReport.count({ where }),
    ]);
    return { items: items.map(presentReport), total, page: query.page, limit: query.limit, totalPages: Math.ceil(total / query.limit) };
  }

  async cancel(studentId: number, id: number, reason: string) {
    return this.prisma.$transaction(async (tx) => {
      const report = await tx.incidentReport.findFirst({ where: { id, studentId } });
      if (!report) throw new NotFoundException('Không tìm thấy báo cáo của bạn.');
      const result = await tx.incidentReport.updateMany({ where: { id, studentId, status: ReportStatus.PENDING }, data: { status: 'CANCELLED' } });
      if (result.count !== 1) throw new ConflictException('Chỉ có thể hủy báo cáo đang chờ duyệt.');
      await tx.incidentReportHistory.create({ data: { reportId: id, actorId: studentId, action: 'CANCELLED', fromStatus: 'PENDING', toStatus: 'CANCELLED', reason } });
      return presentReport(await tx.incidentReport.findUniqueOrThrow({ where: { id }, include: reportInclude }));
    });
  }
}
