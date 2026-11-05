import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service.js';
import { AdminReportQueryDto } from '../dto/admin-report-query.dto.js';
import { presentReport, reportInclude } from '../report-response.js';
import { EmbeddingService, contentHash } from './embedding.service.js';
import { groupReports } from './group-reports.js';
import { reportVector } from './report-vector.js';

@Injectable()
export class AdminDuplicateGroupsService {
  private readonly cache = new Map<string, Promise<Map<number, number[]>>>();
  private running = false;
  constructor(private readonly db: PrismaService, private readonly embeddings: EmbeddingService) {}

  async pending(query: AdminReportQueryDto) {
    const where = { status: 'PENDING' as const, ...(query.buildingId ? { buildingId: query.buildingId } : {}),
      ...(query.floorId ? { location: { floorId: query.floorId } } : {}) };
    const [reports, totalReports] = await this.db.$transaction([
      this.db.incidentReport.findMany({ where, include: reportInclude, take: 200,
        orderBy: [{ urgency: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }, { id: 'asc' }] }),
      this.db.incidentReport.count({ where }),
    ]);
    let availability: 'ready' | 'unavailable' | 'partial' = totalReports > reports.length ? 'partial' : 'ready';
    let vectors = new Map<number, number[]>();
    // One report cannot form a duplicate group. Do not pay model startup cost.
    const buckets = new Map<string, typeof reports>();
    for (const report of reports) {
      const key = `${report.locationId}:${report.categoryId}:${report.recurrenceOfIncidentId ?? 'original'}`;
      const bucket = buckets.get(key) ?? []; bucket.push(report); buckets.set(key, bucket);
    }
    const candidates = [...buckets.values()].filter((bucket) => bucket.length > 1).flat();
    if (candidates.length && process.env.AI_DUPLICATES_ENABLED !== 'false') {
      const signature = contentHash(this.embeddings.modelVersion + candidates.map((report) => `${report.id}:${report.updatedAt.toISOString()}`).join(','));
      let task = this.cache.get(signature);
      if (!task && !this.running) {
        this.running = true;
        task = (async () => {
          const result = new Map<number, number[]>();
          for (const report of candidates) result.set(report.id, await reportVector(this.db, this.embeddings, report));
          return result;
        })();
        this.cache.set(signature, task);
        if (this.cache.size > 20) this.cache.delete(this.cache.keys().next().value!);
        void task.then(() => { this.running = false; }, () => { this.running = false; this.cache.delete(signature); });
      }
      if (task) {
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
          const found = await Promise.race([task.catch(() => null), new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), 5000); })]);
          if (found) vectors = found;
          else availability = 'unavailable';
        } finally { if (timer) clearTimeout(timer); }
      } else availability = 'unavailable';
    } else if (candidates.length) availability = 'unavailable';
    const configured = Number(process.env.AI_DUPLICATE_THRESHOLD ?? '0.80');
    const threshold = Number.isFinite(configured) && configured >= 0 && configured <= 1 ? configured : 0.80;
    // This view contains duplicate suggestions only. Filter before pagination so
    // single reports cannot occupy pages or inflate the number of groups.
    const grouped = groupReports(reports, vectors, threshold).filter((members) => members.length > 1);
    const items = grouped.slice((query.page - 1) * query.limit, query.page * query.limit).map((members) => ({
      id: `group-${members.map((report) => report.id).sort((a, b) => a - b).join('-')}`,
      kind: 'SIMILAR',
      // A display reference only, never a merged/canonical Report.
      referenceId: members[0].id, urgency: members[0].urgency,
      reports: members.map(presentReport),
    }));
    return { items, total: grouped.length, totalReports, consideredReports: reports.length,
      page: query.page, limit: query.limit, totalPages: Math.ceil(grouped.length / query.limit), availability };
  }
}
