import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { IncidentUrgency, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/core/database/prisma.service.js';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter.js';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor.js';
import { CloudinaryService } from '../src/shared/cloudinary/cloudinary.service.js';

describe('Student intake and admin review HTTP', () => {
  let app: INestApplication<App>;
  let db: PrismaService;
  let studentId: number;
  let otherId: number;
  let adminId: number;
  let student: string;
  let other: string;
  let admin: string;
  let buildingId: number;
  let secondBuildingId: number;
  let locationId: number;
  let categoryId: number;
  let inactiveCategoryId: number;
  const prefix = `workflow-${randomUUID()}`;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(CloudinaryService).useValue({
        uploadFile: vi.fn(async () => ({ public_id: `e2e/${randomUUID()}`, secure_url: 'https://example.com/test-image.png', format: 'png', bytes: 68 })),
        deleteFile: vi.fn(async () => ({ result: 'ok' })),
      }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalInterceptors(new TransformInterceptor());
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
    db = app.get(PrismaService);
    const password = await bcrypt.hash('Workflow123', 4);
    const users = await Promise.all([Role.STUDENT, Role.STUDENT, Role.ADMIN].map((role, index) =>
      db.user.create({ data: { email: `${prefix}-${index}@gm.uit.edu.vn`, fullName: `E2E ${role}`, password, role, isActive: true } })));
    [studentId, otherId, adminId] = users.map((user) => user.id);
    const jwt = app.get(JwtService);
    [student, other, admin] = await Promise.all(users.map((user) => jwt.signAsync({ sub: user.id, role: user.role })));
    const building = await db.building.create({ data: { name: prefix, floors: { create: { name: 'Tầng test', floorNumber: 1 } } }, include: { floors: true } });
    buildingId = building.id;
    secondBuildingId = (await db.building.create({ data: { name: `${prefix}-other` } })).id;
    locationId = (await db.location.create({ data: { buildingId, floorId: building.floors[0].id, name: `${prefix}-room`, locationType: 'LT' } })).id;
    categoryId = (await db.category.create({ data: { name: prefix } })).id;
    inactiveCategoryId = (await db.category.create({ data: { name: `${prefix}-inactive`, isActive: false } })).id;
  }, 30_000);

  afterAll(async () => {
    if (db && studentId) {
      // Delete only this test's fixtures, never campus seed or other users' data.
      const userIds = [studentId, otherId, adminId];
      const reportIds = (await db.incidentReport.findMany({ where: { studentId: { in: userIds } }, select: { id: true } })).map(({ id }) => id);
      const incidentIds = (await db.incident.findMany({ where: { reportId: { in: reportIds } }, select: { id: true } })).map(({ id }) => id);
      await db.$transaction([
        db.incidentHistory.deleteMany({ where: { incidentId: { in: incidentIds } } }),
        db.incident.deleteMany({ where: { id: { in: incidentIds } } }),
        db.incidentReportHistory.deleteMany({ where: { reportId: { in: reportIds } } }),
        db.media.deleteMany({ where: { OR: [{ userId: { in: userIds } }, { reportId: { in: reportIds } }] } }),
        db.incidentReport.deleteMany({ where: { id: { in: reportIds } } }),
        db.location.deleteMany({ where: { buildingId: { in: [buildingId, secondBuildingId] } } }),
        db.floor.deleteMany({ where: { buildingId: { in: [buildingId, secondBuildingId] } } }),
        db.building.deleteMany({ where: { id: { in: [buildingId, secondBuildingId] } } }),
        db.category.deleteMany({ where: { id: { in: [categoryId, inactiveCategoryId] } } }),
        db.user.deleteMany({ where: { id: { in: userIds } } }),
      ]);
    }
    await app?.close();
  }, 30_000);

  const payload = () => ({ buildingId, locationId, categoryId, title: 'Máy chiếu không lên nguồn', description: 'Máy chiếu đã cắm điện nhưng không thể bật được.', urgency: 'HIGH', mediaIds: [] });
  const create = async (urgency: IncidentUrgency | null = 'HIGH') => {
    const body: Record<string, unknown> = payload();
    if (urgency === null) delete body.urgency; else body.urgency = urgency;
    const result = await request(app.getHttpServer()).post('/api/v1/incident-reports').auth(student, { type: 'bearer' }).send(body).expect(201);
    return result.body.data as { id: number; code: string; status: string; histories: { action: string }[]; media: { id: number }[] };
  };

  it('enforces authentication and separate student/admin roles', async () => {
    await request(app.getHttpServer()).post('/api/v1/incident-reports').send(payload()).expect(401);
    await request(app.getHttpServer()).post('/api/v1/incident-reports').auth(admin, { type: 'bearer' }).send(payload()).expect(403);
    await request(app.getHttpServer()).get('/api/v1/incident-reports/pending').auth(student, { type: 'bearer' }).expect(403);
    await request(app.getHttpServer()).post('/api/v1/media/upload').expect(401);
  });

  it('creates a pending report with code, history and no sensitive user fields', async () => {
    const report = await create();
    expect(report.code).toMatch(/^IR-\d{4}-\d{4,}$/);
    expect(report.status).toBe('PENDING');
    expect(report.histories.map((event) => event.action)).toEqual(['CREATED']);
    expect(JSON.stringify(report)).not.toContain('password');
  });

  it('rejects spoofed identity, invalid pagination, inactive category and mismatched location', async () => {
    for (const body of [{ ...payload(), studentId: otherId }, { ...payload(), categoryId: inactiveCategoryId }, { ...payload(), buildingId: secondBuildingId }]) {
      await request(app.getHttpServer()).post('/api/v1/incident-reports').auth(student, { type: 'bearer' }).send(body).expect(400);
    }
    await request(app.getHttpServer()).get('/api/v1/incident-reports/my?page=0').auth(student, { type: 'bearer' }).expect(400);
    await request(app.getHttpServer()).get('/api/v1/incident-reports/pending?limit=101').auth(admin, { type: 'bearer' }).expect(400);
  });

  it('shows only the authenticated student reports and blocks another student cancellation', async () => {
    const report = await create();
    const mine = await request(app.getHttpServer()).get('/api/v1/incident-reports/my').auth(other, { type: 'bearer' }).expect(200);
    expect(mine.body.data.total).toBe(0);
    await request(app.getHttpServer()).delete(`/api/v1/incident-reports/${report.id}`).auth(other, { type: 'bearer' }).send({ reason: 'Báo cáo trùng lặp' }).expect(404);
  });

  it('cancels only pending reports and requires a reason', async () => {
    const report = await create();
    await request(app.getHttpServer()).delete(`/api/v1/incident-reports/${report.id}`).auth(student, { type: 'bearer' }).send({ reason: ' ' }).expect(400);
    const result = await request(app.getHttpServer()).delete(`/api/v1/incident-reports/${report.id}`).auth(student, { type: 'bearer' }).send({ reason: 'Đã có bạn khác báo cáo' }).expect(200);
    expect(result.body.data.status).toBe('CANCELLED');
    expect(result.body.data.histories.at(-1).reason).toBe('Đã có bạn khác báo cáo');
    await request(app.getHttpServer()).delete(`/api/v1/incident-reports/${report.id}`).auth(student, { type: 'bearer' }).send({ reason: 'Hủy lần nữa' }).expect(409);
  });

  it('orders the pending queue CRITICAL/HIGH/MEDIUM/LOW/null and filters by building', async () => {
    for (const urgency of ['LOW', 'CRITICAL', 'MEDIUM', null] as const) await create(urgency);
    const result = await request(app.getHttpServer()).get(`/api/v1/incident-reports/pending?buildingId=${buildingId}&limit=100`).auth(admin, { type: 'bearer' }).expect(200);
    const items = result.body.data.items as { urgency: IncidentUrgency | null; buildingId: number }[];
    const rank = (urgency: IncidentUrgency | null) => urgency === null ? 4 : ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].indexOf(urgency);
    expect(items.every((item) => item.buildingId === buildingId)).toBe(true);
    const ranks = items.map((item) => rank(item.urgency));
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    expect(items[0].urgency).toBe('CRITICAL');
    expect(items.at(-1)?.urgency).toBeNull();
  });

  it('approves atomically and creates exactly one unassigned incident', async () => {
    const report = await create(null);
    const url = `/api/v1/incident-reports/${report.id}/review`;
    await request(app.getHttpServer()).patch(url).auth(admin, { type: 'bearer' }).send({ action: 'APPROVE' }).expect(400);
    const results = await Promise.all([1, 2].map(() => request(app.getHttpServer()).patch(url).auth(admin, { type: 'bearer' }).send({ action: 'APPROVE', categoryId, urgency: 'CRITICAL' })));
    expect(results.map((result) => result.status).sort()).toEqual([200, 409]);
    expect(await db.incident.count({ where: { reportId: report.id } })).toBe(1);
    expect(await db.incidentReportHistory.count({ where: { reportId: report.id, action: 'APPROVED' } })).toBe(1);
    const incident = await db.incident.findUniqueOrThrow({ where: { reportId: report.id }, include: { histories: true } });
    expect(incident.status).toBe('PENDING_ASSIGNMENT');
    expect(incident.urgency).toBe('CRITICAL');
    expect(incident.histories).toHaveLength(1);
    await request(app.getHttpServer()).delete(`/api/v1/incident-reports/${report.id}`).auth(student, { type: 'bearer' }).send({ reason: 'Muốn hủy sau duyệt' }).expect(409);
  });

  it('rejects with an audit reason without creating an incident', async () => {
    const report = await create();
    const url = `/api/v1/incident-reports/${report.id}/review`;
    await request(app.getHttpServer()).patch(url).auth(admin, { type: 'bearer' }).send({ action: 'REJECT' }).expect(400);
    const result = await request(app.getHttpServer()).patch(url).auth(admin, { type: 'bearer' }).send({ action: 'REJECT', reason: 'Báo cáo trùng với phiếu đã tiếp nhận' }).expect(200);
    expect(result.body.data.status).toBe('REJECTED');
    expect(result.body.data.histories.at(-1).reason).toContain('trùng');
    expect(await db.incident.count({ where: { reportId: report.id } })).toBe(0);
  });

  it('serializes concurrent student cancellation and admin approval', async () => {
    const report = await create();
    const results = await Promise.all([
      request(app.getHttpServer()).delete(`/api/v1/incident-reports/${report.id}`).auth(student, { type: 'bearer' }).send({ reason: 'Báo cáo gửi nhầm' }),
      request(app.getHttpServer()).patch(`/api/v1/incident-reports/${report.id}/review`).auth(admin, { type: 'bearer' }).send({ action: 'APPROVE', urgency: 'HIGH' }),
    ]);
    expect(results.map((result) => result.status).sort()).toEqual([200, 409]);
    const stored = await db.incidentReport.findUniqueOrThrow({ where: { id: report.id }, include: { incident: true, histories: true } });
    expect(['APPROVED', 'CANCELLED']).toContain(stored.status);
    expect(Boolean(stored.incident)).toBe(stored.status === 'APPROVED');
    expect(stored.histories).toHaveLength(2);
  });

  it('attaches only owned temporary media and prevents reuse or stealing', async () => {
    const image = await db.media.create({ data: { publicId: `${prefix}/owned`, url: 'https://example.com/test.png', userId: studentId } });
    const stolen = await db.media.create({ data: { publicId: `${prefix}/other`, url: 'https://example.com/other.png', userId: otherId } });
    const before = await db.incidentReport.count({ where: { studentId } });
    await request(app.getHttpServer()).post('/api/v1/incident-reports').auth(student, { type: 'bearer' }).send({ ...payload(), mediaIds: [image.id, stolen.id] }).expect(400);
    expect(await db.incidentReport.count({ where: { studentId } })).toBe(before);
    expect((await db.media.findUniqueOrThrow({ where: { id: image.id } })).reportId).toBeNull();
    const result = await request(app.getHttpServer()).post('/api/v1/incident-reports').auth(student, { type: 'bearer' }).send({ ...payload(), mediaIds: [image.id] }).expect(201);
    expect(result.body.data.media[0].id).toBe(image.id);
    expect((await db.media.findUniqueOrThrow({ where: { id: image.id } })).userId).toBeNull();
    await request(app.getHttpServer()).post('/api/v1/incident-reports').auth(student, { type: 'bearer' }).send({ ...payload(), mediaIds: [image.id] }).expect(400);
    await request(app.getHttpServer()).delete(`/api/v1/media/${image.id}`).auth(student, { type: 'bearer' }).expect(404);
    await request(app.getHttpServer()).delete(`/api/v1/media/${stolen.id}`).auth(student, { type: 'bearer' }).expect(404);
  });

  it('uploads a validated image with the authenticated owner, then attaches it', async () => {
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jLZkAAAAASUVORK5CYII=', 'base64');
    const upload = await request(app.getHttpServer()).post('/api/v1/media/upload').auth(student, { type: 'bearer' })
      .attach('file', png, { filename: 'test.png', contentType: 'image/png' }).expect(201);
    const imageId = upload.body.data.id as number;
    expect((await db.media.findUniqueOrThrow({ where: { id: imageId } })).userId).toBe(studentId);
    const submitted = await request(app.getHttpServer()).post('/api/v1/incident-reports').auth(student, { type: 'bearer' })
      .send({ ...payload(), mediaIds: [imageId] }).expect(201);
    expect(submitted.body.data.media[0].id).toBe(imageId);
    await request(app.getHttpServer()).post('/api/v1/media/upload').auth(student, { type: 'bearer' })
      .attach('file', Buffer.from('not an image'), { filename: 'fake.png', contentType: 'image/png' }).expect(400);
  });

  it('enforces three unique photos and atomically claims an upload only once', async () => {
    await request(app.getHttpServer()).post('/api/v1/incident-reports').auth(student, { type: 'bearer' })
      .send({ ...payload(), mediaIds: [1, 2, 3, 4] }).expect(400);
    const image = await db.media.create({ data: { publicId: `${prefix}/race`, url: 'https://example.com/race.png', userId: studentId } });
    const results = await Promise.all([1, 2].map(() => request(app.getHttpServer()).post('/api/v1/incident-reports').auth(student, { type: 'bearer' })
      .send({ ...payload(), mediaIds: [image.id] })));
    expect(results.map((result) => result.status).sort()).toEqual([201, 400]);
    expect((await db.media.findUniqueOrThrow({ where: { id: image.id } })).reportId).not.toBeNull();
  });
});
