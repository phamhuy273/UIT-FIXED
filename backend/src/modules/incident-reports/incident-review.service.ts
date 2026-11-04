import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service.js';
import { ReportQueryDto } from './dto/report-query.dto.js';
import { ReviewIncidentReportDto } from './dto/review-incident-report.dto.js';
import { presentReport, reportInclude } from './report-response.js';

@Injectable()
export class IncidentReviewService {
  constructor(private readonly prisma: PrismaService) {}

  async pending(query: ReportQueryDto) {
    const where: Prisma.IncidentReportWhereInput = { status: 'PENDING', ...(query.buildingId ? { buildingId: query.buildingId } : {}) };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.incidentReport.findMany({ where, include: reportInclude,
        // PostgreSQL enum declaration order is CRITICAL, HIGH, MEDIUM, LOW.
        orderBy: [{ urgency: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }, { id: 'asc' }],
        skip: (query.page - 1) * query.limit, take: query.limit }),
      this.prisma.incidentReport.count({ where }),
    ]);
    return { items: items.map(presentReport), total, page: query.page, limit: query.limit, totalPages: Math.ceil(total / query.limit) };
  }

  async review(adminId: number, id: number, dto: ReviewIncidentReportDto) {
    return this.prisma.$transaction(async (tx) => {
      const report = await tx.incidentReport.findUnique({ where: { id } });
      if (!report) throw new NotFoundException('Không tìm thấy báo cáo.');
      if (report.status !== 'PENDING') throw new ConflictException('Báo cáo đã được xử lý. Hãy tải lại hàng đợi.');
      const approved = dto.action === 'APPROVE';
      const urgency = dto.urgency ?? report.urgency;
      const categoryId = dto.categoryId ?? report.categoryId;
      if (approved) {
        if (!urgency) throw new BadRequestException('Vui lòng xác nhận mức độ khẩn cấp.');
        if (!await tx.category.findFirst({ where: { id: categoryId, isActive: true } })) throw new BadRequestException('Danh mục đã ngừng sử dụng.');
      } else if (!dto.reason?.trim()) throw new BadRequestException('Vui lòng nhập lý do từ chối.');
      const status = approved ? 'APPROVED' : 'REJECTED';
      const changed = await tx.incidentReport.updateMany({
        where: { id, status: 'PENDING' },
        data: { status, ...(approved ? { categoryId, urgency } : {}) },
      });
      if (changed.count !== 1) throw new ConflictException('Báo cáo vừa được xử lý bởi thao tác khác.');
      await tx.incidentReportHistory.create({ data: { reportId: id, actorId: adminId,
        action: status, fromStatus: 'PENDING', toStatus: status, reason: dto.reason ?? null } });
      if (approved && urgency) {
        await tx.incident.create({ data: { reportId: id, urgency, status: 'PENDING_ASSIGNMENT',
          histories: { create: { actorId: adminId, action: 'CREATED', toStatus: 'PENDING_ASSIGNMENT' } },
        } });
      }
      return presentReport(await tx.incidentReport.findUniqueOrThrow({ where: { id }, include: reportInclude }));
    });
  }
}
