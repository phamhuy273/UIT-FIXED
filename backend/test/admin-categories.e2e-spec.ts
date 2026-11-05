import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/core/database/prisma.service.js';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter.js';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor.js';

describe('Admin category management HTTP', () => {
  let app: INestApplication<App>;
  let db: PrismaService;
  let userIds: number[] = [];
  let student: string;
  let staff: string;
  let admin: string;
  let departmentId: number;
  let buildingId: number;
  let locationId: number;
  const prefix = `category-${randomUUID()}`;
  const url = '/api/v1/admin/categories';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalInterceptors(new TransformInterceptor());
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
    db = app.get(PrismaService);
    departmentId = (await db.department.create({ data: { name: prefix } })).id;
    const password = await bcrypt.hash('Category123', 4);
    const users = await Promise.all(([[Role.STUDENT, null], [Role.TECH_STAFF, departmentId], [Role.ADMIN, null]] as const).map(([role, deptId], index) =>
      db.user.create({ data: { email: `${prefix}-${index}@gm.uit.edu.vn`, fullName: `E2E ${role}`, password, role, departmentId: deptId, isActive: true } })));
    userIds = users.map((user) => user.id);
    const jwt = app.get(JwtService);
    [student, staff, admin] = await Promise.all(users.map((user) => jwt.signAsync({ sub: user.id, role: user.role })));
    buildingId = (await db.building.create({ data: { name: prefix } })).id;
    locationId = (await db.location.create({ data: { buildingId, name: `${prefix}-room` } })).id;
  }, 30_000);

  afterAll(async () => {
    if (db && userIds.length) {
      // Delete only this test's fixtures, never seeded categories or other users' data.
      const reportIds = (await db.incidentReport.findMany({ where: { studentId: { in: userIds } }, select: { id: true } })).map(({ id }) => id);
      await db.$transaction([
        db.incidentReportHistory.deleteMany({ where: { reportId: { in: reportIds } } }),
        db.incidentReport.deleteMany({ where: { id: { in: reportIds } } }),
        db.location.deleteMany({ where: { buildingId } }),
        db.building.deleteMany({ where: { id: buildingId } }),
        db.category.deleteMany({ where: { name: { startsWith: prefix, mode: 'insensitive' } } }),
        db.user.deleteMany({ where: { id: { in: userIds } } }),
        db.department.deleteMany({ where: { id: departmentId } }),
      ]);
    }
    await app?.close();
  }, 30_000);

  const create = async (name: string, description?: string) =>
    (await request(app.getHttpServer()).post(url).auth(admin, { type: 'bearer' }).send({ name, description }).expect(201)).body.data as {
      id: number; name: string; description: string | null; isActive: boolean; reportCount: number;
    };

  it('allows only authenticated ADMIN accounts', async () => {
    const category = await create(`${prefix}-auth`);
    const calls = [
      () => request(app.getHttpServer()).get(url),
      () => request(app.getHttpServer()).get(`${url}/${category.id}`),
      () => request(app.getHttpServer()).post(url).send({ name: `${prefix}-forbidden` }),
      () => request(app.getHttpServer()).patch(`${url}/${category.id}`).send({ isActive: false }),
      () => request(app.getHttpServer()).delete(`${url}/${category.id}`),
    ];
    for (const call of calls) {
      await call().expect(401);
      await call().auth(student, { type: 'bearer' }).expect(403);
      await call().auth(staff, { type: 'bearer' }).expect(403);
    }
    expect(await db.category.count({ where: { name: `${prefix}-forbidden` } })).toBe(0);
    expect((await db.category.findUniqueOrThrow({ where: { id: category.id } })).isActive).toBe(true);
  });

  it('creates, lists, reads and updates categories with trimmed values', async () => {
    const category = await create(`  ${prefix}-projector  `, '  Máy chiếu phòng học  ');
    expect(category).toMatchObject({ name: `${prefix}-projector`, description: 'Máy chiếu phòng học', isActive: true, reportCount: 0 });

    const detail = await request(app.getHttpServer()).get(`${url}/${category.id}`).auth(admin, { type: 'bearer' }).expect(200);
    expect(detail.body.data.name).toBe(`${prefix}-projector`);

    const updated = await request(app.getHttpServer()).patch(`${url}/${category.id}`).auth(admin, { type: 'bearer' })
      .send({ name: `${prefix}-Projector`, description: '' }).expect(200);
    expect(updated.body.data).toMatchObject({ name: `${prefix}-Projector`, description: null });

    const inactive = await request(app.getHttpServer()).patch(`${url}/${category.id}`).auth(admin, { type: 'bearer' })
      .send({ isActive: false }).expect(200);
    expect(inactive.body.data.isActive).toBe(false);
    const list = await request(app.getHttpServer()).get(url).auth(admin, { type: 'bearer' }).expect(200);
    expect(list.body.data.find((item: { id: number }) => item.id === category.id)).toMatchObject({ isActive: false });
  });

  it('rejects invalid input, unknown ids and duplicate names regardless of case or status', async () => {
    const first = await create(`${prefix}-network`);
    const second = await create(`${prefix}-power`);
    await request(app.getHttpServer()).patch(`${url}/${first.id}`).auth(admin, { type: 'bearer' }).send({ isActive: false }).expect(200);

    for (const body of [{}, { name: '   ' }, { name: 'x'.repeat(101) }, { name: 42 }, { name: `${prefix}-x`, description: 'x'.repeat(501) },
      { name: `${prefix}-x`, isActive: false }, { name: `${prefix}-x`, id: 1 }]) {
      await request(app.getHttpServer()).post(url).auth(admin, { type: 'bearer' }).send(body).expect(400);
    }
    for (const body of [{ name: null }, { name: '' }, { isActive: null }, { isActive: 'false' }, { reportCount: 0 }]) {
      await request(app.getHttpServer()).patch(`${url}/${second.id}`).auth(admin, { type: 'bearer' }).send(body).expect(400);
    }
    await request(app.getHttpServer()).get(`${url}/abc`).auth(admin, { type: 'bearer' }).expect(400);
    await request(app.getHttpServer()).get(`${url}/2147483000`).auth(admin, { type: 'bearer' }).expect(404);
    await request(app.getHttpServer()).patch(`${url}/2147483000`).auth(admin, { type: 'bearer' }).send({ isActive: true }).expect(404);

    await request(app.getHttpServer()).post(url).auth(admin, { type: 'bearer' }).send({ name: ` ${prefix}-NETWORK ` }).expect(409);
    await request(app.getHttpServer()).patch(`${url}/${second.id}`).auth(admin, { type: 'bearer' }).send({ name: `${prefix}-Network` }).expect(409);
    await request(app.getHttpServer()).patch(`${url}/${second.id}`).auth(admin, { type: 'bearer' }).send({ name: `${prefix}-POWER` }).expect(200);
    expect(await db.category.count({ where: { name: { equals: `${prefix}-x`, mode: 'insensitive' } } })).toBe(0);
  });

  it('serializes concurrent creates with the same name', async () => {
    const results = await Promise.all([`${prefix}-race`, `${prefix}-RACE`].map((name) =>
      request(app.getHttpServer()).post(url).auth(admin, { type: 'bearer' }).send({ name })));
    expect(results.map((result) => result.status).sort()).toEqual([201, 409]);
    expect(await db.category.count({ where: { name: { equals: `${prefix}-race`, mode: 'insensitive' } } })).toBe(1);
  });

  it('hides inactive categories from new reports while old reports keep their category', async () => {
    const category = await create(`${prefix}-aircon`);
    const report = { buildingId, locationId, categoryId: category.id, title: 'Máy lạnh không chạy', description: 'Máy lạnh phòng học không hoạt động từ sáng.' };
    const created = await request(app.getHttpServer()).post('/api/v1/incident-reports').auth(student, { type: 'bearer' }).send(report).expect(201);

    await request(app.getHttpServer()).patch(`${url}/${category.id}`).auth(admin, { type: 'bearer' }).send({ isActive: false }).expect(200);

    const options = await request(app.getHttpServer()).get('/api/v1/master-data/categories').expect(200);
    expect(options.body.data.some((item: { id: number }) => item.id === category.id)).toBe(false);
    await request(app.getHttpServer()).post('/api/v1/incident-reports').auth(student, { type: 'bearer' }).send(report).expect(400);

    const stored = await db.incidentReport.findUniqueOrThrow({ where: { id: created.body.data.id } });
    expect(stored.categoryId).toBe(category.id);
    const mine = await request(app.getHttpServer()).get('/api/v1/incident-reports/my').auth(student, { type: 'bearer' }).expect(200);
    expect(mine.body.data.items.find((item: { id: number }) => item.id === stored.id).category).toEqual({ id: category.id, name: category.name });
    const detail = await request(app.getHttpServer()).get(`${url}/${category.id}`).auth(admin, { type: 'bearer' }).expect(200);
    expect(detail.body.data).toMatchObject({ isActive: false, reportCount: 1 });

    await request(app.getHttpServer()).delete(`${url}/${category.id}`).auth(admin, { type: 'bearer' }).expect(409);
    expect(await db.category.count({ where: { id: category.id } })).toBe(1);

    await request(app.getHttpServer()).patch(`${url}/${category.id}`).auth(admin, { type: 'bearer' }).send({ isActive: true }).expect(200);
    const restored = await request(app.getHttpServer()).get('/api/v1/master-data/categories').expect(200);
    expect(restored.body.data.some((item: { id: number }) => item.id === category.id)).toBe(true);
  });

  it('deletes a category only after it is inactive and no report references it', async () => {
    const category = await create(`${prefix}-unused`);
    await request(app.getHttpServer()).delete(`${url}/${category.id}`).auth(admin, { type: 'bearer' }).expect(409);
    await request(app.getHttpServer()).patch(`${url}/${category.id}`).auth(admin, { type: 'bearer' }).send({ isActive: false }).expect(200);

    const result = await request(app.getHttpServer()).delete(`${url}/${category.id}`).auth(admin, { type: 'bearer' }).expect(200);
    expect(result.body.data).toEqual({ id: category.id });
    expect(await db.category.count({ where: { id: category.id } })).toBe(0);
    await request(app.getHttpServer()).delete(`${url}/${category.id}`).auth(admin, { type: 'bearer' }).expect(404);
    await request(app.getHttpServer()).delete(`${url}/abc`).auth(admin, { type: 'bearer' }).expect(400);
  });
});
