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
import {
  EMAIL_ALREADY_USED_MESSAGE,
  INVALID_CREDENTIALS_MESSAGE,
  INVALID_EMAIL_MESSAGE,
  PASSWORD_POLICY_MESSAGE,
  UIT_STUDENT_EMAIL_MESSAGE,
} from '../src/modules/auth/constants/auth.constants.js';

describe('Admin student management HTTP', () => {
  let app: INestApplication<App>;
  let db: PrismaService;
  let studentToken: string;
  let staffToken: string;
  let adminToken: string;
  let adminId: number;
  let departmentId: number;
  let buildingId: number;
  let locationId: number;
  let categoryId: number;
  const prefix = `student-${randomUUID()}`;
  const url = '/api/v1/admin/students';
  const password = 'Secret12';

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
    const fixturePassword = await bcrypt.hash('Fixture123', 4);
    const users = await Promise.all(([[Role.STUDENT, null], [Role.TECH_STAFF, departmentId], [Role.ADMIN, null]] as const).map(([role, deptId], index) =>
      db.user.create({ data: { email: `${prefix}-${index}@gm.uit.edu.vn`, fullName: `E2E ${role}`, password: fixturePassword, role, departmentId: deptId, isActive: true } })));
    adminId = users[2].id;
    const jwt = app.get(JwtService);
    [studentToken, staffToken, adminToken] = await Promise.all(users.map((user) => jwt.signAsync({ sub: user.id, role: user.role })));
    buildingId = (await db.building.create({ data: { name: prefix } })).id;
    locationId = (await db.location.create({ data: { buildingId, name: `${prefix}-room` } })).id;
    categoryId = (await db.category.create({ data: { name: prefix } })).id;
  }, 30_000);

  afterAll(async () => {
    if (db && departmentId && buildingId && categoryId) {
      const ownedIds = (await db.user.findMany({
        where: { email: { startsWith: prefix, mode: 'insensitive' } },
        select: { id: true },
      })).map(({ id }) => id);
      const reportIds = (await db.incidentReport.findMany({
        where: { studentId: { in: ownedIds } },
        select: { id: true },
      })).map(({ id }) => id);
      await db.$transaction([
        db.incidentReportHistory.deleteMany({ where: { reportId: { in: reportIds } } }),
        db.incidentReport.deleteMany({ where: { id: { in: reportIds } } }),
        db.user.deleteMany({ where: { id: { in: ownedIds } } }),
        db.location.deleteMany({ where: { buildingId } }),
        db.building.deleteMany({ where: { id: buildingId } }),
        db.category.deleteMany({ where: { id: categoryId } }),
        db.department.deleteMany({ where: { id: departmentId } }),
      ]);
    }
    await app?.close();
  }, 30_000);

  const createStudent = async (localPart: string, body: Record<string, unknown> = {}) =>
    request(app.getHttpServer()).post(url).auth(adminToken, { type: 'bearer' }).send({
      fullName: 'Nguyen Van A',
      email: `${prefix}-${localPart}@gm.uit.edu.vn`,
      password,
      ...body,
    });

  it('allows only authenticated ADMIN accounts', async () => {
    const created = await createStudent('auth');
    expect(created.status).toBe(201);
    const id = created.body.data.id as number;
    const calls = [
      () => request(app.getHttpServer()).get(url),
      () => request(app.getHttpServer()).get(`${url}/${id}`),
      () => request(app.getHttpServer()).post(url).send({
        fullName: 'Forbidden Student',
        email: `${prefix}-forbidden@gm.uit.edu.vn`,
        password,
      }),
      () => request(app.getHttpServer()).patch(`${url}/${id}`).send({ isActive: false }),
      () => request(app.getHttpServer()).delete(`${url}/${id}`),
    ];
    for (const call of calls) {
      await call().expect(401);
      await call().auth(studentToken, { type: 'bearer' }).expect(403);
      await call().auth(staffToken, { type: 'bearer' }).expect(403);
    }
    expect(await db.user.count({ where: { email: `${prefix}-forbidden@gm.uit.edu.vn` } })).toBe(0);
    expect((await db.user.findUniqueOrThrow({ where: { id } })).isActive).toBe(true);
  });

  it('creates a student on its own route and keeps public registration working', async () => {
    const created = await createStudent('created', {
      fullName: '  Le Thi C  ',
      email: `  ${prefix}-Created@GM.UIT.EDU.VN  `,
    });
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({
      email: `${prefix}-created@gm.uit.edu.vn`,
      fullName: 'Le Thi C',
      role: Role.STUDENT,
      departmentId: null,
      isActive: true,
      referenceCount: 0,
    });
    expect(created.body.data.password).toBeUndefined();
    expect(JSON.stringify(created.body)).not.toContain(password);

    const stored = await db.user.findUniqueOrThrow({ where: { id: created.body.data.id } });
    expect(stored.password.split('$')[2]).toBe('12');
    await expect(bcrypt.compare(password, stored.password)).resolves.toBe(true);
    expect(stored.role).toBe(Role.STUDENT);
    expect(stored.departmentId).toBeNull();

    const registeredEmail = `${prefix}-public@gm.uit.edu.vn`;
    const registered = await request(app.getHttpServer()).post('/api/v1/auth/register').send({
      fullName: 'Public Student',
      email: registeredEmail,
      password,
    }).expect(201);
    expect(registered.body.data.user).toMatchObject({ email: registeredEmail, role: Role.STUDENT, isActive: true });
    expect(registered.body.data.user.password).toBeUndefined();

    const list = await request(app.getHttpServer()).get(url).auth(adminToken, { type: 'bearer' }).expect(200);
    const emails = list.body.data.map((item: { email: string }) => item.email);
    expect(emails).toContain(`${prefix}-created@gm.uit.edu.vn`);
    expect(emails).toContain(registeredEmail);
    expect(emails).not.toContain(`${prefix}-2@gm.uit.edu.vn`);
    expect(JSON.stringify(list.body)).not.toContain(stored.password);
  });

  it('rejects invalid student input and privileged fields', async () => {
    const invalidEmails = ['student@gmail.com', 'student@uit.edu.vn', 'student@gm.uit.edu.vn.fake.com', 'student@sub.gm.uit.edu.vn'];
    for (const email of invalidEmails) {
      const response = await createStudent('ignored', { email });
      expect(response.status).toBe(400);
      expect(JSON.stringify(response.body.message)).toContain(UIT_STUDENT_EMAIL_MESSAGE);
    }
    const malformed = await createStudent('ignored', { email: 'not-an-email' });
    expect(malformed.status).toBe(400);
    expect(JSON.stringify(malformed.body.message)).toContain(INVALID_EMAIL_MESSAGE);

    const weak = await createStudent('weak', { password: 'onlyletters' });
    expect(weak.status).toBe(400);
    expect(JSON.stringify(weak.body.message)).toContain(PASSWORD_POLICY_MESSAGE);

    for (const extra of [{ role: Role.ADMIN }, { role: Role.TECH_STAFF }, { departmentId: departmentId }, { isActive: false }]) {
      const response = await createStudent(`extra-${Object.keys(extra)[0]}`, extra);
      expect(response.status).toBe(400);
    }
    expect(await db.user.count({ where: { email: { startsWith: `${prefix}-extra-` } } })).toBe(0);
    expect(await db.user.count({ where: { role: Role.ADMIN, email: { startsWith: prefix } } })).toBe(1);
  });

  it('rejects a duplicate email and reads or updates only student accounts', async () => {
    const first = await createStudent('dup');
    expect(first.status).toBe(201);
    const duplicate = await createStudent('other', { email: ` ${prefix}-DUP@gm.uit.edu.vn ` });
    expect(duplicate.status).toBe(409);
    expect(JSON.stringify(duplicate.body.message)).toContain(EMAIL_ALREADY_USED_MESSAGE);

    const detail = await request(app.getHttpServer()).get(`${url}/${first.body.data.id}`).auth(adminToken, { type: 'bearer' }).expect(200);
    expect(detail.body.data.email).toBe(`${prefix}-dup@gm.uit.edu.vn`);
    expect(detail.body.data.password).toBeUndefined();

    await request(app.getHttpServer()).get(`${url}/${adminId}`).auth(adminToken, { type: 'bearer' }).expect(404);
    await request(app.getHttpServer()).patch(`${url}/${adminId}`).auth(adminToken, { type: 'bearer' }).send({ fullName: 'Hijack' }).expect(404);
    await request(app.getHttpServer()).get(`${url}/abc`).auth(adminToken, { type: 'bearer' }).expect(400);

    const updated = await request(app.getHttpServer()).patch(`${url}/${first.body.data.id}`).auth(adminToken, { type: 'bearer' })
      .send({ fullName: '  Pham Van D  ', email: ` ${prefix}-Renamed@GM.UIT.EDU.VN ` }).expect(200);
    expect(updated.body.data).toMatchObject({
      fullName: 'Pham Van D',
      email: `${prefix}-renamed@gm.uit.edu.vn`,
      role: Role.STUDENT,
      departmentId: null,
    });
    await request(app.getHttpServer()).patch(`${url}/${first.body.data.id}`).auth(adminToken, { type: 'bearer' })
      .send({ role: Role.ADMIN }).expect(400);
    await request(app.getHttpServer()).patch(`${url}/${first.body.data.id}`).auth(adminToken, { type: 'bearer' })
      .send({ departmentId: departmentId }).expect(400);
    const nextPassword = 'FreshPass9';
    const reset = await request(app.getHttpServer()).patch(`${url}/${first.body.data.id}`).auth(adminToken, { type: 'bearer' })
      .send({ password: nextPassword }).expect(200);
    expect(reset.body.data.password).toBeUndefined();
    expect(JSON.stringify(reset.body)).not.toContain(nextPassword);
    const stored = await db.user.findUniqueOrThrow({ where: { id: first.body.data.id } });
    expect(stored.role).toBe(Role.STUDENT);
    expect(stored.password.split('$')[2]).toBe('12');
    await expect(bcrypt.compare(nextPassword, stored.password)).resolves.toBe(true);
    await expect(bcrypt.compare(password, stored.password)).resolves.toBe(false);
    await request(app.getHttpServer()).post('/api/v1/auth/login').send({
      email: stored.email,
      password,
    }).expect(401);
    await request(app.getHttpServer()).post('/api/v1/auth/login').send({
      email: stored.email,
      password: nextPassword,
    }).expect(200);
    await request(app.getHttpServer()).patch(`${url}/${first.body.data.id}`).auth(adminToken, { type: 'bearer' })
      .send({ password: 'onlyletters' }).expect(400);
    expect((await db.user.findUniqueOrThrow({ where: { id: first.body.data.id } })).password).toBe(stored.password);
  });

  it('blocks login and protected API access after the account is locked, without deleting history', async () => {
    const created = await createStudent('history');
    expect(created.status).toBe(201);
    const login = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
      email: created.body.data.email,
      password,
    }).expect(200);
    const token = login.body.data.accessToken as string;

    const report = await request(app.getHttpServer()).post('/api/v1/incident-reports').auth(token, { type: 'bearer' }).send({
      buildingId,
      locationId,
      categoryId,
      title: 'Bóng đèn hành lang',
      description: 'Bóng đèn hành lang tầng một không sáng từ tối qua.',
    }).expect(201);

    const detail = await request(app.getHttpServer()).get(`${url}/${created.body.data.id}`).auth(adminToken, { type: 'bearer' }).expect(200);
    expect(detail.body.data.referenceCount).toBeGreaterThan(0);

    await request(app.getHttpServer()).delete(`${url}/${created.body.data.id}`).auth(adminToken, { type: 'bearer' }).expect(409);
    await request(app.getHttpServer()).patch(`${url}/${created.body.data.id}`).auth(adminToken, { type: 'bearer' })
      .send({ isActive: false }).expect(200);
    const blocked = await request(app.getHttpServer()).delete(`${url}/${created.body.data.id}`).auth(adminToken, { type: 'bearer' }).expect(409);
    expect(JSON.stringify(blocked.body.message)).toContain('lịch sử');

    expect(await db.incidentReport.count({ where: { id: report.body.data.id } })).toBe(1);
    expect(await db.user.count({ where: { id: created.body.data.id } })).toBe(1);
    const lockedLogin = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
      email: created.body.data.email,
      password,
    }).expect(401);
    expect(JSON.stringify(lockedLogin.body.message)).toContain(INVALID_CREDENTIALS_MESSAGE);
    await request(app.getHttpServer()).get('/api/v1/users/me').auth(token, { type: 'bearer' }).expect(401);

    await request(app.getHttpServer()).patch(`${url}/${created.body.data.id}`).auth(adminToken, { type: 'bearer' })
      .send({ isActive: true }).expect(200);
    await request(app.getHttpServer()).post('/api/v1/auth/login').send({
      email: created.body.data.email,
      password,
    }).expect(200);
  });

  it('deletes a student only after the account is locked and has no history', async () => {
    const created = await createStudent('unused');
    expect(created.status).toBe(201);
    const id = created.body.data.id as number;
    await request(app.getHttpServer()).delete(`${url}/${id}`).auth(adminToken, { type: 'bearer' }).expect(409);
    await request(app.getHttpServer()).patch(`${url}/${id}`).auth(adminToken, { type: 'bearer' }).send({ isActive: false }).expect(200);

    const removed = await request(app.getHttpServer()).delete(`${url}/${id}`).auth(adminToken, { type: 'bearer' }).expect(200);
    expect(removed.body.data).toEqual({ id });
    expect(await db.user.count({ where: { id } })).toBe(0);
    await request(app.getHttpServer()).delete(`${url}/${id}`).auth(adminToken, { type: 'bearer' }).expect(404);
    await request(app.getHttpServer()).delete(`${url}/${adminId}`).auth(adminToken, { type: 'bearer' }).expect(404);
  });
});
