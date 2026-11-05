import { BadRequestException, ConflictException, HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../core/database/prisma.service.js';
import { ConfirmReportDto, DuplicateCheckDto } from '../dto/duplicate-check.dto.js';
import { ReportQueryDto } from '../dto/report-query.dto.js';
import { classifyTime, cosine, observationDate, symptomSummary } from './duplicate-rules.js';
import { EmbeddingService, embeddingText } from './embedding.service.js';
import { reportVector } from './report-vector.js';

const candidateInclude = {
  category: { select: { name: true } }, location: { select: { name: true } },
  incident: { select: { id: true, status: true, resolutions: { orderBy: { resolvedAt: 'desc' as const }, take: 1, select: { resolvedAt: true } } } },
  _count: { select: { confirmations: true } },
} satisfies Prisma.IncidentReportInclude;
type Candidate = Prisma.IncidentReportGetPayload<{ include: typeof candidateInclude }>;

function safeSummary(report: Candidate) {
  // User-entered title/description/media and the author's identity are private.
  return { reportId: report.id, summary: `${report.category.name} tại phòng ${report.location.name}`,
    symptom: symptomSummary(`${report.title} ${report.description}`),
    incidentId: report.incident?.id ?? null,
    status: report.status === 'APPROVED' ? report.incident?.status ?? report.status : report.status,
    reportStatus: report.status, updatedAt: report.updatedAt.toISOString(),
    reportedAt: report.createdAt.toISOString(), resolvedAt: report.incident?.status === 'RESOLVED'
      ? report.incident.resolutions[0]?.resolvedAt.toISOString() ?? null : null,
    confirmationCount: report._count.confirmations };
}

@Injectable()
export class DuplicateService {
  private readonly checks = new Map<number, { until: number; count: number }>();
  private readonly inFlight = new Set<number>();
  constructor(private readonly db: PrismaService, private readonly embeddings: EmbeddingService) {}

  async check(studentId: number, dto: DuplicateCheckDto) {
    const observedAt = observationDate(dto.observedAt);
    const now = Date.now();
    for (const [key, item] of this.checks) if (item.until < now) this.checks.delete(key);
    const quota = this.checks.get(studentId) ?? { until: now + 60_000, count: 0 };
    if (quota.count >= 12 || this.inFlight.has(studentId) || this.inFlight.size >= 2 || this.checks.size >= 5000) {
      throw new HttpException('Vui lòng đợi một chút trước khi kiểm tra lại.', 429);
    }
    quota.count++; this.checks.set(studentId, quota);
    if (process.env.AI_DUPLICATES_ENABLED === 'false') return { availability: 'unavailable', candidates: [] };
    this.inFlight.add(studentId);
    try {
      const [location, category] = await Promise.all([
        this.db.location.findFirst({ where: { id: dto.locationId, isActive: true, building: { isActive: true } }, select: { id: true } }),
        this.db.category.findFirst({ where: { id: dto.categoryId, isActive: true }, select: { id: true } }),
      ]);
      if (!location || !category) throw new BadRequestException('Phòng hoặc danh mục không hợp lệ.');
    } catch (error) { this.inFlight.delete(studentId); throw error; }
    const task = this.findCandidates(studentId, dto, observedAt).catch(() => ({ availability: 'unavailable' as const, candidates: [] }));
    // Keep the underlying task tracked until it really finishes, even on timeout,
    // preventing a slow model warmup from creating an unbounded inference queue.
    void task.finally(() => this.inFlight.delete(studentId));
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([task, new Promise<{ availability: 'unavailable'; candidates: [] }>((resolve) => {
        timer = setTimeout(() => resolve({ availability: 'unavailable', candidates: [] }), 5000);
      })]);
    } finally { if (timer) clearTimeout(timer); }
  }

  private async findCandidates(studentId: number, dto: DuplicateCheckDto, observedAt: Date | null) {
    const reports = await this.db.incidentReport.findMany({
      where: { locationId: dto.locationId, categoryId: dto.categoryId, status: { in: ['PENDING', 'APPROVED'] }, OR: [
        { status: 'PENDING' }, { incident: { status: { not: 'RESOLVED' } } },
        { incident: { status: 'RESOLVED', resolutions: { some: { resolvedAt: { gte: new Date(Date.now() - 30 * 86400_000) } } } } },
      ] }, include: candidateInclude, orderBy: { updatedAt: 'desc' }, take: 101,
    });
    if (!reports.length) return { availability: 'ready' as const, candidates: [] };
    const vector = await this.embeddings.embed(embeddingText(dto.title, dto.description));
    const matches = [];
    const configured = Number(process.env.AI_DUPLICATE_THRESHOLD ?? '0.80');
    const threshold = Number.isFinite(configured) && configured >= 0 && configured <= 1 ? configured : 0.80;
    for (const report of reports.slice(0, 100)) {
      const candidateVector = await reportVector(this.db, this.embeddings, report);
      const similarity = cosine(vector, candidateVector);
      if (similarity < threshold) continue;
      const kind = classifyTime(report.incident?.status === 'RESOLVED' ? report.incident.resolutions[0]?.resolvedAt ?? null : null, observedAt);
      matches.push({ ...safeSummary(report), kind, isOwnReport: report.studentId === studentId,
        canConfirm: report.studentId !== studentId && (kind === 'POSSIBLE_DUPLICATE' || kind === 'PAST_EVENT'),
        rank: similarity });
    }
    return { availability: reports.length > 100 ? 'partial' as const : 'ready' as const,
      candidates: matches.sort((a, b) => b.rank - a.rank).slice(0, 3).map(({ rank: _rank, ...item }) => item) };
  }

  async confirm(studentId: number, reportId: number, dto: ConfirmReportDto) {
    const observedAt = observationDate(dto.observedAt);
    return this.db.$transaction(async (tx) => {
      // Serialize with cancellation/review on the report, then with staff resolution.
      await tx.$queryRaw`SELECT id FROM incident_reports WHERE id = ${reportId} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM incidents WHERE report_id = ${reportId} FOR UPDATE`;
      const existing = await tx.reportConfirmation.findUnique({ where: { reportId_studentId: { reportId, studentId } } });
      if (existing) return { id: existing.id, alreadyConfirmed: true };
      const report = await tx.incidentReport.findUnique({ where: { id: reportId }, include: candidateInclude });
      if (!report || !['PENDING', 'APPROVED'].includes(report.status)) throw new NotFoundException('Báo cáo không còn tiếp nhận xác nhận. Bạn có thể gửi báo cáo mới.');
      if (report.studentId === studentId) throw new BadRequestException('Bạn đã là người gửi báo cáo này.');
      if (report.updatedAt.getTime() !== new Date(dto.expectedUpdatedAt).getTime()) throw new ConflictException('Báo cáo đã thay đổi. Vui lòng kiểm tra lại.');
      const kind = classifyTime(report.incident?.status === 'RESOLVED' ? report.incident.resolutions[0]?.resolvedAt ?? null : null, observedAt, dto.relativeToRepair);
      if (kind === 'NEEDS_TIME' || kind === 'POSSIBLE_RECURRENCE') {
        throw new ConflictException('Sự cố đã được khắc phục. Hãy xác nhận thời điểm gặp lỗi hoặc gửi báo cáo tái phát.');
      }
      const created = await tx.reportConfirmation.create({ data: { reportId, studentId, observedAt } });
      return { id: created.id, alreadyConfirmed: false };
    });
  }

  async mine(studentId: number, query: ReportQueryDto) {
    const where = { studentId };
    const [items, total] = await this.db.$transaction([
      this.db.reportConfirmation.findMany({ where, skip: (query.page - 1) * query.limit, take: query.limit,
        orderBy: { createdAt: 'desc' }, include: { report: { include: candidateInclude } } }),
      this.db.reportConfirmation.count({ where }),
    ]);
    return { items: items.map((item) => ({ id: item.id, observedAt: item.observedAt, confirmedAt: item.createdAt,
      report: safeSummary(item.report) })), total, page: query.page, limit: query.limit, totalPages: Math.ceil(total / query.limit) };
  }
}
