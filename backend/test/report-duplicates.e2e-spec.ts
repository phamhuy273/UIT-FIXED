import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { Role } from '@prisma/client';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/core/database/prisma.service.js';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor.js';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter.js';
import { EmbeddingService } from '../src/modules/incident-reports/duplicates/embedding.service.js';
import { periodStart } from '../src/modules/incident-reports/duplicates/duplicate-rules.js';

describe('Student duplicate warning and shared tracking HTTP', () => {
  let app: INestApplication<App>;
  let db: PrismaService;
  const prefix = `duplicates-${randomUUID()}`;
  const users: number[] = [];
  const tokens: string[] = [];
  const buildings: number[] = [];
  const locations: number[] = [];
  let categoryId: number;
  const extraCategories: number[] = [];
  const embed = vi.fn(async (text: string) => {
    if (text.includes('OFFLINE')) throw new Error('Model unavailable');
    return Array.from({ length: 384 }, (_, i) => i === (text.includes('khác triệu chứng') ? 1 : 0) ? 1 : 0);
  });
  const observedAt = new Date(Date.now() - 60_000).toISOString();
  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(EmbeddingService).useValue({ embed, modelVersion: 'deterministic-test-model' }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalInterceptors(new TransformInterceptor()); app.useGlobalFilters(new AllExceptionsFilter());
    await app.init(); db = app.get(PrismaService);
    const jwt = app.get(JwtService);
    for (const [index, role] of [Role.STUDENT, Role.STUDENT, Role.STUDENT, Role.ADMIN].entries()) {
      const user = await db.user.create({ data: { email: `${prefix}-${index}@gm.uit.edu.vn`, password: randomUUID(), fullName: 'PRIVATE AUTHOR', role, isActive: true } });
      users.push(user.id); tokens.push(await jwt.signAsync({ sub: user.id, role }));
    }
    categoryId = (await db.category.create({ data: { name: prefix } })).id;
  });
  afterAll(async () => {
    if (db) {
      const reports = await db.incidentReport.findMany({ where: { studentId: { in: users } }, select: { id: true } });
      const reportIds = reports.map((r) => r.id);
      const incidents = await db.incident.findMany({ where: { reportId: { in: reportIds } }, select: { id: true } });
      const incidentIds = incidents.map((r) => r.id);
      await db.$transaction([
        db.reportConfirmation.deleteMany({ where: { OR: [{ studentId: { in: users } }, { reportId: { in: reportIds } }] } }),
        db.reportEmbedding.deleteMany({ where: { reportId: { in: reportIds } } }),
        db.incidentReport.updateMany({ where: { id: { in: reportIds } }, data: { recurrenceOfIncidentId: null } }),
        db.incidentHistory.deleteMany({ where: { incidentId: { in: incidentIds } } }),
        db.incidentResolution.deleteMany({ where: { incidentId: { in: incidentIds } } }),
        db.incident.deleteMany({ where: { id: { in: incidentIds } } }),
        db.incidentReportHistory.deleteMany({ where: { reportId: { in: reportIds } } }),
        db.incidentReport.deleteMany({ where: { id: { in: reportIds } } }),
        db.location.deleteMany({ where: { id: { in: locations } } }),
        db.building.deleteMany({ where: { id: { in: buildings } } }),
        db.category.deleteMany({ where: { id: { in: [categoryId ?? -1, ...extraCategories] } } }),
        db.user.deleteMany({ where: { id: { in: users } } }),
      ]);
    }
    await app?.close();
  });

  async function fixture(resolved = false) {
    const building = await db.building.create({ data: { name: prefix } }); buildings.push(building.id);
    const location = await db.location.create({ data: { buildingId: building.id, name: prefix, locationType: 'LT' } }); locations.push(location.id);
    const report = await db.incidentReport.create({ data: { studentId: users[0], categoryId, buildingId: building.id, locationId: location.id,
      title: 'PRIVATE TITLE máy chiếu không lên nguồn', description: 'PRIVATE DESCRIPTION email@example.com máy chiếu không khởi động',
      status: resolved ? 'APPROVED' : 'PENDING' } });
    const incident = resolved ? await db.incident.create({ data: { reportId: report.id, urgency: 'HIGH', status: 'RESOLVED',
      resolutions: { create: { resolvedById: users[3], resolutionNote: 'PRIVATE REPAIR', resolvedAt: new Date(Date.now() - 2 * 86400_000) } } } }) : null;
    return { report, incident, payload: { locationId: location.id, categoryId,
      title: 'Máy chiếu bật không được', description: 'Máy chiếu không khởi động dù đã cắm điện.' } };
  }
  const check = (payload: object, index = 1) => request(app.getHttpServer()).post('/api/v1/incident-reports/check-duplicates').auth(tokens[index], { type: 'bearer' }).send(payload);
  const confirm = (report: { id: number; updatedAt: Date }, index = 1, extra = {}) => request(app.getHttpServer()).post(`/api/v1/incident-reports/${report.id}/confirmations`)
    .auth(tokens[index], { type: 'bearer' }).send({ expectedUpdatedAt: report.updatedAt.toISOString(), ...extra });

  it('warns before posting, persists a versioned embedding and returns no private report fields', async () => {
    const f = await fixture();
    const before = await db.incidentReport.count({ where: { studentId: users[1] } });
    const result = await check(f.payload).expect(201);
    expect(result.body.data.candidates[0]).toMatchObject({ reportId: f.report.id, kind: 'POSSIBLE_DUPLICATE', canConfirm: true });
    const shared = JSON.stringify(result.body.data);
    for (const privateText of ['PRIVATE', 'email@example.com', 'studentId', 'description', 'media', 'contentHash', 'vector']) expect(shared).not.toContain(privateText);
    expect(await db.incidentReport.count({ where: { studentId: users[1] } })).toBe(before);
    expect(await db.reportEmbedding.findUnique({ where: { reportId: f.report.id } })).toMatchObject({ modelVersion: 'deterministic-test-model' });
  });
  it('does not match different rooms or different symptoms and excludes cancelled reports', async () => {
    const f = await fixture();
    expect((await check({ ...f.payload, description: 'khác triệu chứng hình ảnh mờ' }).expect(201)).body.data.candidates).toEqual([]);
    await db.incidentReport.update({ where: { id: f.report.id }, data: { status: 'CANCELLED' } });
    expect((await check(f.payload).expect(201)).body.data.candidates).toEqual([]);
  });
  it('creates one confirmation under concurrent retries without creating extra reports', async () => {
    const f = await fixture();
    const results = await Promise.all([confirm(f.report), confirm(f.report)]);
    expect(results.map((r) => r.status)).toEqual([201, 201]);
    expect(results[0].body.data.id).toBe(results[1].body.data.id);
    expect(await db.reportConfirmation.count({ where: { reportId: f.report.id, studentId: users[1] } })).toBe(1);
    expect(await db.incidentReport.count({ where: { studentId: users[1] } })).toBe(0);
    const mine = await request(app.getHttpServer()).get('/api/v1/incident-reports/my-confirmations').auth(tokens[1], { type: 'bearer' }).expect(200);
    expect(mine.body.data.items.some((r: { report: { reportId: number } }) => r.report.reportId === f.report.id)).toBe(true);
    expect(JSON.stringify(mine.body)).not.toContain('PRIVATE');
    const other = await request(app.getHttpServer()).get('/api/v1/incident-reports/my-confirmations').auth(tokens[2], { type: 'bearer' }).expect(200);
    expect(other.body.data.total).toBe(0);
  });
  it('shows cancellation to existing followers and rejects new confirmations', async () => {
    const f = await fixture(); await confirm(f.report).expect(201);
    await db.incidentReport.update({ where: { id: f.report.id }, data: { status: 'CANCELLED' } });
    await confirm(f.report, 2).expect(404);
    const mine = await request(app.getHttpServer()).get('/api/v1/incident-reports/my-confirmations').auth(tokens[1], { type: 'bearer' }).expect(200);
    expect(mine.body.data.items.find((r: { report: { reportId: number } }) => r.report.reportId === f.report.id).report.status).toBe('CANCELLED');
  });
  it('keeps an afternoon failure separate from a morning resolution and validates recurrence references', async () => {
    const f = await fixture(true);
    const result = await check({ ...f.payload, observedAt }).expect(201);
    expect(result.body.data.candidates[0]).toMatchObject({ kind: 'POSSIBLE_RECURRENCE', canConfirm: false });
    await confirm(f.report, 1, { observedAt }).expect(409);
    const body = { ...f.payload, buildingId: f.report.buildingId, observedAt, recurrenceOfIncidentId: f.incident!.id };
    const created = await request(app.getHttpServer()).post('/api/v1/incident-reports').auth(tokens[2], { type: 'bearer' }).send(body).expect(201);
    expect(created.body.data).toMatchObject({ status: 'PENDING', recurrenceOfIncidentId: f.incident!.id });
    expect(await db.incident.findUnique({ where: { id: f.incident!.id } })).toMatchObject({ status: 'RESOLVED' });
    await request(app.getHttpServer()).post('/api/v1/incident-reports').auth(tokens[2], { type: 'bearer' })
      .send({ ...body, observedAt: new Date(Date.now() - 3 * 86400_000).toISOString() }).expect(400);
  });
  it('allows a late confirmation only with an observation before repair', async () => {
    const f = await fixture(true);
    await confirm(f.report).expect(409);
    const past = new Date(Date.now() - 3 * 86400_000).toISOString();
    const result = await check({ ...f.payload, observedAt: past }).expect(201);
    expect(result.body.data.candidates[0].kind).toBe('PAST_EVENT');
    await confirm(f.report, 1, { observedAt: past }).expect(201);
  });
  it('rejects stale confirmation, self-confirmation, future times, invalid inputs and wrong roles', async () => {
    const f = await fixture();
    await confirm(f.report, 0).expect(400);
    await confirm(f.report, 1, { expectedUpdatedAt: '2020-01-01T00:00:00Z' }).expect(409);
    await confirm(f.report, 1, { observedAt: new Date(Date.now() + 3600_000).toISOString() }).expect(400);
    await check(f.payload, 3).expect(403);
    await request(app.getHttpServer()).post('/api/v1/incident-reports/check-duplicates').send(f.payload).expect(401);
    await check({ ...f.payload, studentId: users[0] }).expect(400);
    await check({ ...f.payload, locationId: -1 }).expect(400);
  });
  it('falls back when AI is unavailable while ordinary posting remains functional', async () => {
    const f = await fixture();
    const result = await check({ ...f.payload, title: 'OFFLINE model test' }, 2).expect(201);
    expect(result.body.data).toEqual({ availability: 'unavailable', candidates: [] });
    await request(app.getHttpServer()).post('/api/v1/incident-reports').auth(tokens[2], { type: 'bearer' })
      .send({ ...f.payload, buildingId: f.report.buildingId }).expect(201);
  });
  it('refreshes a stale cached embedding after a report edit', async () => {
    const f = await fixture();
    await check(f.payload, 2).expect(201);
    const before = await db.reportEmbedding.findUniqueOrThrow({ where: { reportId: f.report.id } });
    await db.incidentReport.update({ where: { id: f.report.id }, data: { description: 'khác triệu chứng hình ảnh mờ' } });
    const result = await check(f.payload, 2).expect(201);
    expect(result.body.data.candidates).toEqual([]);
    expect((await db.reportEmbedding.findUniqueOrThrow({ where: { reportId: f.report.id } })).contentHash).not.toBe(before.contentHash);
  });
  it('rechecks a repair that happens between the warning and confirmation', async () => {
    const f = await fixture();
    await db.incidentReport.update({ where: { id: f.report.id }, data: { status: 'APPROVED' } });
    const report = await db.incidentReport.findUniqueOrThrow({ where: { id: f.report.id } });
    const incident = await db.incident.create({ data: { reportId: report.id, urgency: 'HIGH', status: 'IN_PROGRESS' } });
    const warning = await check(f.payload, 2).expect(201);
    expect(warning.body.data.candidates[0].kind).toBe('POSSIBLE_DUPLICATE');
    await db.incident.update({ where: { id: incident.id }, data: { status: 'RESOLVED', resolutions: {
      create: { resolvedById: users[3], resolutionNote: 'Repair during draft', resolvedAt: new Date() },
    } } });
    await confirm(report, 2).expect(409);
    expect(await db.reportConfirmation.count({ where: { reportId: report.id } })).toBe(0);
  });
  it('does not offer self-confirmation and limits check requests per authenticated student', async () => {
    const f = await fixture();
    for (let i = 0; i < 12; i++) {
      const result = await check(f.payload, 0).expect(201);
      expect(result.body.data.candidates[0]).toMatchObject({ isOwnReport: true, canConfirm: false });
    }
    await check(f.payload, 0).expect(429);
  });
  it('treats a reopened issue as open even when it retains past resolution history', async () => {
    const f = await fixture(true);
    await db.incident.update({ where: { id: f.incident!.id }, data: { status: 'IN_PROGRESS' } });
    const result = await check(f.payload, 2).expect(201);
    expect(result.body.data.candidates[0]).toMatchObject({ status: 'IN_PROGRESS', resolvedAt: null, kind: 'POSSIBLE_DUPLICATE', canConfirm: true });
  });
  it('filters by category before calling AI even for identical text in the same room', async () => {
    const f = await fixture();
    const category = await db.category.create({ data: { name: `${prefix}-other-category` } }); extraCategories.push(category.id);
    const before = embed.mock.calls.length;
    const result = await check({ ...f.payload, categoryId: category.id }, 2).expect(201);
    expect(result.body.data.candidates).toEqual([]);
    expect(embed.mock.calls.length).toBe(before);
    await check(f.payload, 2).expect(201);
    expect(embed.mock.calls.length).toBeGreaterThan(before);
  });
  it('asks about before/after repair within the same half-day without requiring exact time', async () => {
    const f = await fixture(true);
    // Previous day's morning makes this independent of the wall clock/test hour.
    const start = new Date(periodStart(new Date()).getTime() - 86400_000);
    await db.incidentResolution.updateMany({ where: { incidentId: f.incident!.id }, data: { resolvedAt: new Date(start.getTime() + 3600_000) } });
    const bucket = start.toISOString();
    const warning = await check({ ...f.payload, observedAt: bucket }, 2).expect(201);
    expect(warning.body.data.candidates[0]).toMatchObject({ kind: 'NEEDS_TIME', canConfirm: false });
    await confirm(f.report, 2, { observedAt: bucket }).expect(409);
    await confirm(f.report, 2, { observedAt: bucket, relativeToRepair: 'BEFORE' }).expect(201);
    const body = { ...f.payload, buildingId: f.report.buildingId, observedAt: bucket, recurrenceOfIncidentId: f.incident!.id };
    await request(app.getHttpServer()).post('/api/v1/incident-reports').auth(tokens[1], { type: 'bearer' }).send(body).expect(400);
    await request(app.getHttpServer()).post('/api/v1/incident-reports').auth(tokens[1], { type: 'bearer' })
      .send({ ...body, relativeToRepair: 'AFTER' }).expect(201);
  });
  it('groups pending reports before pagination for admins without merging or changing their statuses', async () => {
    const f = await fixture();
    const similar = await db.incidentReport.create({ data: { studentId: users[1], categoryId, buildingId: f.report.buildingId, locationId: f.report.locationId,
      title: 'Máy chiếu không lên nguồn', description: 'Máy chiếu không thể bật dù đã cắm điện.', urgency: 'CRITICAL' } });
    await db.incidentReport.create({ data: { studentId: users[2], categoryId, buildingId: f.report.buildingId, locationId: f.report.locationId,
      title: 'Máy chiếu hiển thị mờ', description: 'khác triệu chứng hình ảnh mờ', urgency: 'HIGH' } });
    const url = `/api/v1/incident-reports/pending-groups?buildingId=${f.report.buildingId}&limit=1`;
    const result = await request(app.getHttpServer()).get(url).auth(tokens[3], { type: 'bearer' }).expect(200);
    expect(result.body.data).toMatchObject({ total: 2, totalReports: 3, totalPages: 2, availability: 'ready' });
    expect(result.body.data.items[0]).toMatchObject({ kind: 'SIMILAR', urgency: 'CRITICAL' });
    expect(result.body.data.items[0].reports.map((r: { id: number }) => r.id).sort()).toEqual([f.report.id, similar.id].sort());
    expect(await db.incidentReport.count({ where: { buildingId: f.report.buildingId, status: 'PENDING' } })).toBe(3);
    expect(await db.incident.count({ where: { reportId: { in: [f.report.id, similar.id] } } })).toBe(0);
    const second = await request(app.getHttpServer()).get(url + '&page=2').auth(tokens[3], { type: 'bearer' }).expect(200);
    expect(second.body.data.items[0].kind).toBe('SINGLE');
    // Each report still goes through the original, individually authorized review.
    await request(app.getHttpServer()).patch(`/api/v1/incident-reports/${similar.id}/review`).auth(tokens[3], { type: 'bearer' })
      .send({ action: 'REJECT', reason: `Trùng với báo cáo ${f.report.id} sau khi đối chiếu.` }).expect(200);
    const updated = await request(app.getHttpServer()).get(url).auth(tokens[3], { type: 'bearer' }).expect(200);
    expect(updated.body.data.totalReports).toBe(2);
    expect(updated.body.data.items[0].kind).toBe('SINGLE');
    expect(await db.incidentReport.findUniqueOrThrow({ where: { id: f.report.id } })).toMatchObject({ status: 'PENDING' });
    expect(await db.incidentReportHistory.count({ where: { reportId: similar.id, action: 'REJECTED' } })).toBe(1);
  });
  it('guards admin grouping and validates pagination without exposing reports to students', async () => {
    await request(app.getHttpServer()).get('/api/v1/incident-reports/pending-groups').expect(401);
    await request(app.getHttpServer()).get('/api/v1/incident-reports/pending-groups').auth(tokens[1], { type: 'bearer' }).expect(403);
    await request(app.getHttpServer()).get('/api/v1/incident-reports/pending-groups?page=0').auth(tokens[3], { type: 'bearer' }).expect(400);
  });
  it('keeps individual report review available when grouping AI fails', async () => {
    const f = await fixture();
    await db.incidentReport.create({ data: { studentId: users[1], categoryId, buildingId: f.report.buildingId, locationId: f.report.locationId,
      title: 'OFFLINE model unavailable', description: 'Temporary grouping model failure.' } });
    const result = await request(app.getHttpServer()).get(`/api/v1/incident-reports/pending-groups?buildingId=${f.report.buildingId}`)
      .auth(tokens[3], { type: 'bearer' }).expect(200);
    expect(result.body.data).toMatchObject({ availability: 'unavailable', totalReports: 2, total: 2 });
    expect(result.body.data.items.every((group: { kind: string }) => group.kind === 'SINGLE')).toBe(true);
  });
});
