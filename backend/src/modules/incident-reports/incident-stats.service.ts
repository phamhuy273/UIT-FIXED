import { Injectable } from '@nestjs/common';
import { IncidentStatus, IncidentUrgency, Prisma, ReportStatus } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service.js';
import { StatsQueryDto } from './dto/stats-query.dto.js';

const TOP_LOCATIONS = 10;
const DAY_MS = 24 * 60 * 60 * 1000;
// Bucket boundaries follow campus time, not the server's timezone.
const CAMPUS_TZ = 'Asia/Ho_Chi_Minh';
const CAMPUS_OFFSET_MS = 7 * 60 * 60 * 1000;
// Rejected and cancelled reports are not confirmed damage, so they stay out of the breakdowns.
const SCOPE_STATUSES: Record<StatsQueryDto['scope'], ReportStatus[]> = {
  active: ['PENDING', 'APPROVED'],
  approved: ['APPROVED'],
};

export type TrendUnit = 'day' | 'week' | 'month';
type Counted<K extends string> = Record<K, number> & { _count: { _all: number } };
type TrendRow = { bucket: string; total: number; approved: number; rejected: number };

@Injectable()
export class IncidentStatsService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(query: StatsQueryDto, now = new Date()) {
    const scope = query.scope ?? 'active';
    const since = query.days ? new Date(now.getTime() - query.days * DAY_MS) : null;
    const unit: TrendUnit = !query.days ? 'month' : query.days > 30 ? 'week' : 'day';
    const inRange: Prisma.IncidentReportWhereInput = since ? { createdAt: { gte: since } } : {};
    const damage: Prisma.IncidentReportWhereInput = { ...inRange, status: { in: SCOPE_STATUSES[scope] } };

    const [reportStatuses, incidentStatuses, buildingCounts, categoryCounts, locationCounts, urgencyCounts, buildings, categories, trendRows] =
      await this.prisma.$transaction([
        this.prisma.incidentReport.groupBy({ by: ['status'], where: inRange, _count: { _all: true }, orderBy: { status: 'asc' } }),
        this.prisma.incident.groupBy({ by: ['status'], where: { report: inRange }, _count: { _all: true }, orderBy: { status: 'asc' } }),
        this.prisma.incidentReport.groupBy({ by: ['buildingId'], where: damage, _count: { _all: true }, orderBy: { buildingId: 'asc' } }),
        this.prisma.incidentReport.groupBy({ by: ['categoryId'], where: damage, _count: { _all: true }, orderBy: { categoryId: 'asc' } }),
        this.prisma.incidentReport.groupBy({ by: ['locationId'], where: damage, _count: { _all: true },
          orderBy: [{ _count: { locationId: 'desc' } }, { locationId: 'asc' }], take: TOP_LOCATIONS }),
        this.prisma.incidentReport.groupBy({ by: ['urgency'], where: damage, _count: { _all: true }, orderBy: { urgency: 'asc' } }),
        this.prisma.building.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
        this.prisma.category.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
        this.prisma.$queryRaw<TrendRow[]>`
          SELECT to_char(date_trunc(${unit}, created_at AT TIME ZONE ${CAMPUS_TZ}), 'YYYY-MM-DD') AS bucket,
                 count(*)::int AS total,
                 (count(*) FILTER (WHERE status = 'APPROVED'))::int AS approved,
                 (count(*) FILTER (WHERE status = 'REJECTED'))::int AS rejected
          FROM incident_reports
          ${since ? Prisma.sql`WHERE created_at >= ${since}` : Prisma.empty}
          GROUP BY 1 ORDER BY 1`,
      ]);

    const locationIds = (locationCounts as Counted<'locationId'>[]).map((row) => row.locationId);
    const locations = locationIds.length ? await this.prisma.location.findMany({
      where: { id: { in: locationIds } },
      select: { id: true, name: true, building: { select: { name: true } }, floor: { select: { name: true } } },
    }) : [];
    const locationById = new Map(locations.map((location) => [location.id, location]));

    const reportsByStatus = tally(Object.values(ReportStatus), reportStatuses as { status: ReportStatus; _count: { _all: number } }[]);
    const incidentsByStatus = tally(Object.values(IncidentStatus), incidentStatuses as { status: IncidentStatus; _count: { _all: number } }[]);
    const urgencyRows = urgencyCounts as { urgency: IncidentUrgency | null; _count: { _all: number } }[];
    const byUrgency = Object.fromEntries([...Object.values(IncidentUrgency), 'UNSET'].map((key) => [key, 0])) as Record<IncidentUrgency | 'UNSET', number>;
    for (const row of urgencyRows) byUrgency[row.urgency ?? 'UNSET'] = row._count._all;

    return {
      range: { days: query.days ?? null, since: since?.toISOString() ?? null },
      scope,
      reports: { total: sum(reportsByStatus), byStatus: reportsByStatus },
      incidents: { total: sum(incidentsByStatus), byStatus: incidentsByStatus },
      byUrgency,
      byBuilding: withCounts(buildings, buildingCounts as Counted<'buildingId'>[], 'buildingId'),
      byCategory: withCounts(categories, categoryCounts as Counted<'categoryId'>[], 'categoryId'),
      topLocations: (locationCounts as Counted<'locationId'>[]).flatMap((row) => {
        const location = locationById.get(row.locationId);
        return location ? [{
          id: location.id, name: location.name, buildingName: location.building.name,
          floorName: location.floor?.name ?? null, count: row._count._all,
        }] : [];
      }),
      trend: { unit, points: fillTrend(trendRows as TrendRow[], unit, since, now) },
    };
  }
}

function tally<S extends string>(keys: S[], rows: { status: S; _count: { _all: number } }[]) {
  const counts = Object.fromEntries(keys.map((key) => [key, 0])) as Record<S, number>;
  for (const row of rows) counts[row.status] = row._count._all;
  return counts;
}

function sum(counts: Record<string, number>) {
  return Object.values(counts).reduce((total, value) => total + value, 0);
}

function withCounts<K extends 'buildingId' | 'categoryId'>(items: { id: number; name: string }[], rows: Counted<K>[], field: K) {
  const countById = new Map(rows.map((row) => [row[field] as number, row._count._all]));
  return items
    .map((item) => ({ id: item.id, name: item.name, count: countById.get(item.id) ?? 0 }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'vi'));
}

/** Returns every bucket between the range start and now, so charts show quiet periods as zero. */
export function fillTrend(rows: TrendRow[], unit: TrendUnit, since: Date | null, now: Date) {
  const byBucket = new Map(rows.map((row) => [row.bucket, row]));
  const end = bucketStart(toCampusDate(now), unit);
  const first = since ? bucketStart(toCampusDate(since), unit) : rows[0] ? new Date(`${rows[0].bucket}T00:00:00Z`) : end;
  const points: TrendRow[] = [];
  for (let cursor = first; cursor <= end; cursor = nextBucket(cursor, unit)) {
    const bucket = cursor.toISOString().slice(0, 10);
    const row = byBucket.get(bucket);
    points.push({ bucket, total: row?.total ?? 0, approved: row?.approved ?? 0, rejected: row?.rejected ?? 0 });
  }
  return points;
}

/** A UTC-midnight Date whose calendar fields equal the campus-local date. */
function toCampusDate(instant: Date) {
  const local = new Date(instant.getTime() + CAMPUS_OFFSET_MS);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()));
}

function bucketStart(date: Date, unit: TrendUnit) {
  if (unit === 'month') return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  if (unit === 'week') return new Date(date.getTime() - ((date.getUTCDay() + 6) % 7) * DAY_MS);
  return date;
}

function nextBucket(date: Date, unit: TrendUnit) {
  if (unit === 'month') return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
  return new Date(date.getTime() + (unit === 'week' ? 7 : 1) * DAY_MS);
}
