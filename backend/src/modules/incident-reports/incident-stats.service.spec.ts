import { describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../core/database/prisma.service.js';
import { IncidentStatsService, fillTrend } from './incident-stats.service.js';

const counted = <K extends string>(field: K, value: unknown, count: number) => ({ [field]: value, _count: { _all: count } });

function setup() {
  const reportGroupBy = vi.fn()
    .mockResolvedValueOnce([counted('status', 'PENDING', 3), counted('status', 'APPROVED', 2), counted('status', 'REJECTED', 1)])
    .mockResolvedValueOnce([counted('buildingId', 2, 4), counted('buildingId', 1, 1)])
    .mockResolvedValueOnce([counted('categoryId', 7, 5)])
    .mockResolvedValueOnce([counted('locationId', 101, 3), counted('locationId', 999, 2)])
    .mockResolvedValueOnce([counted('urgency', 'HIGH', 4), counted('urgency', null, 1)]);
  const prisma = {
    incidentReport: { groupBy: reportGroupBy },
    incident: { groupBy: vi.fn().mockResolvedValue([counted('status', 'IN_PROGRESS', 2)]) },
    building: { findMany: vi.fn().mockResolvedValue([{ id: 1, name: 'Tòa A' }, { id: 2, name: 'Tòa B' }, { id: 3, name: 'Tòa C' }]) },
    category: { findMany: vi.fn().mockResolvedValue([{ id: 7, name: 'Điện' }, { id: 8, name: 'Nước' }]) },
    location: { findMany: vi.fn().mockResolvedValue([{ id: 101, name: 'A101', building: { name: 'Tòa A' }, floor: { name: 'Tầng 1' } }]) },
    $queryRaw: vi.fn().mockResolvedValue([{ bucket: '2026-11-02', total: 2, approved: 1, rejected: 0 }]),
    $transaction: vi.fn((queries: Promise<unknown>[]) => Promise.all(queries)),
  };
  return { prisma, service: new IncidentStatsService(prisma as unknown as PrismaService) };
}

const now = new Date('2026-11-04T03:00:00.000Z');

describe('IncidentStatsService', () => {
  it('zero-fills statuses, urgencies, buildings and categories and sorts breakdowns by count', async () => {
    const { service } = setup();
    const stats = await service.summary({ scope: 'active' }, now);

    expect(stats.range).toEqual({ days: null, since: null });
    expect(stats.reports).toEqual({ total: 6, byStatus: { PENDING: 3, APPROVED: 2, REJECTED: 1, CANCELLED: 0 } });
    expect(stats.incidents).toEqual({ total: 2, byStatus: { PENDING_ASSIGNMENT: 0, ASSIGNED: 0, IN_PROGRESS: 2, RESOLVED: 0 } });
    expect(stats.byUrgency).toEqual({ CRITICAL: 0, HIGH: 4, MEDIUM: 0, LOW: 0, UNSET: 1 });
    expect(stats.byBuilding).toEqual([
      { id: 2, name: 'Tòa B', count: 4 }, { id: 1, name: 'Tòa A', count: 1 }, { id: 3, name: 'Tòa C', count: 0 },
    ]);
    expect(stats.byCategory).toEqual([{ id: 7, name: 'Điện', count: 5 }, { id: 8, name: 'Nước', count: 0 }]);
    expect(stats.trend.unit).toBe('month');
  });

  it('drops top locations that no longer exist', async () => {
    const { service } = setup();
    const stats = await service.summary({ scope: 'active' }, now);
    expect(stats.topLocations).toEqual([{ id: 101, name: 'A101', buildingName: 'Tòa A', floorName: 'Tầng 1', count: 3 }]);
  });

  it('counts pending and approved reports as damage within the requested range', async () => {
    const { prisma, service } = setup();
    const stats = await service.summary({ days: 7, scope: 'active' }, now);
    const since = new Date('2026-10-28T03:00:00.000Z');

    expect(stats.range).toEqual({ days: 7, since: since.toISOString() });
    expect(stats.trend.unit).toBe('day');
    const [statusQuery, buildingQuery] = prisma.incidentReport.groupBy.mock.calls.map(([args]) => args);
    expect(statusQuery.where).toEqual({ createdAt: { gte: since } });
    expect(buildingQuery.where).toEqual({ createdAt: { gte: since }, status: { in: ['PENDING', 'APPROVED'] } });
    expect(prisma.incident.groupBy.mock.calls[0][0].where).toEqual({ report: { createdAt: { gte: since } } });
  });

  it('limits breakdowns to approved reports when scope is approved', async () => {
    const { prisma, service } = setup();
    const stats = await service.summary({ days: 90, scope: 'approved' }, now);
    expect(stats.scope).toBe('approved');
    expect(stats.trend.unit).toBe('week');
    expect(prisma.incidentReport.groupBy.mock.calls[1][0].where.status).toEqual({ in: ['APPROVED'] });
  });
});

describe('fillTrend', () => {
  it('fills missing days with zero up to today in campus time', () => {
    const points = fillTrend([{ bucket: '2026-11-02', total: 2, approved: 1, rejected: 0 }], 'day',
      new Date('2026-10-31T20:00:00.000Z'), now);
    expect(points.map((point) => [point.bucket, point.total])).toEqual([
      ['2026-11-01', 0], ['2026-11-02', 2], ['2026-11-03', 0], ['2026-11-04', 0],
    ]);
  });

  it('aligns weeks to Monday and months to the first day', () => {
    expect(fillTrend([], 'week', new Date('2026-10-22T00:00:00.000Z'), now).map((point) => point.bucket))
      .toEqual(['2026-10-19', '2026-10-26', '2026-11-02']);
    expect(fillTrend([{ bucket: '2026-09-01', total: 1, approved: 0, rejected: 0 }], 'month', null, now).map((point) => point.bucket))
      .toEqual(['2026-09-01', '2026-10-01', '2026-11-01']);
  });
});
