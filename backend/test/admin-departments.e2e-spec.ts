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

describe('Admin department management HTTP', () => {
  let app: INestApplication<App>;
  let db: PrismaService;
  let userIds: number[] = [];
  let student: string;
  let staff: string;
  let admin: string;
  let staffId: number;
  let otherStaffId: number;
  let departmentId: number;
  let otherDepartmentId: number;
  let buildingId: number;
  let locationId: number;
  let categoryId: number;
  const prefix = `department-${randomUUID()}`;
  const url = '/api/v1/admin/departments';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalInterceptors(new TransformInterceptor());
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
    db = app.get(PrismaService);
    departmentId = (await db.department.create({ data: { name: `${prefix}-electric` } })).id;
    otherDepartmentId = (await db.department.create({ data: { name: `${prefix}-water` } })).id;
    const password = await bcrypt.hash('Department123', 4);
    const users = await Promise.all(([
      [Role.STUDENT, null], [Role.TECH_STAFF, departmentId], [Role.ADMIN, null], [Role.TECH_STAFF, otherDepartmentId],
    ] as const).map(([role, deptId], index) =>
      db.user.create({ data: { email: `${prefix}-${index}@gm.uit.edu.vn`, fullName: `E2E ${role} ${index}`, password, role, departmentId: deptId, isActive: true } })));
    userIds = users.map((user) => user.id);
    staffId = users[1].id;
    otherStaffId = users[3].id;
    const jwt = app.get(JwtService);
    [student, staff, admin] = await Promise.all(users.slice(0, 3).map((user) => jwt.signAsync({ sub: user.id, role: user.role })));
    buildingId = (await db.building.create({ data: { name: prefix } })).id;
    locationId = (await db.location.create({ data: { buildingId, name: `${prefix}-room` } })).id;
    categoryId = (await db.category.create({ data: { name: prefix } })).id;
  }, 30_000);

  afterAll(async () => {
    if (db && userIds.length) {
      // Delete only this test's fixtures, never seeded departments or other users' data.
      const reportIds = (await db.incidentReport.findMany({ where: { studentId: { in: userIds } }, select: { id: true } })).map(({ id }) => id);
      const incidentIds = (await db.incident.findMany({ where: { reportId: { in: reportIds } }, select: { id: true } })).map(({ id }) => id);
      await db.$transaction([
        db.incidentHistory.deleteMany({ where: { incidentId: { in: incidentIds } } }),
        db.incidentAssignment.deleteMany({ where: { incidentId: { in: incidentIds } } }),
        db.incident.deleteMany({ where: { id: { in: incidentIds } } }),
        db.incidentReportHistory.deleteMany({ where: { reportId: { in: reportIds } } }),
        db.incidentReport.deleteMany({ where: { id: { in: reportIds } } }),
        db.location.deleteMany({ where: { building: { name: { startsWith: prefix } } } }),
        db.building.deleteMany({ where: { name: { startsWith: prefix } } }),
        db.category.deleteMany({ where: { id: categoryId } }),
        db.user.deleteMany({ where: { id: { in: userIds } } }),
        db.department.deleteMany({ where: { name: { startsWith: prefix, mode: 'insensitive' } } }),
      ]);
    }
    await app?.close();
  }, 30_000);

  const http = () => request(app.getHttpServer());
  const create = async (name: string, description?: string) =>
    (await http().post(url).auth(admin, { type: 'bearer' }).send({ name, description }).expect(201)).body.data as {
      id: number; name: string; description: string | null; isActive: boolean; staffCount: number; assignmentCount: number;
    };

  it('allows only authenticated ADMIN accounts', async () => {
    const department = await create(`${prefix}-auth`);
    const calls = [
      () => http().get(url),
      () => http().get(`${url}/${department.id}`),
      () => http().post(url).send({ name: `${prefix}-forbidden` }),
      () => http().patch(`${url}/${department.id}`).send({ isActive: false }),
      () => http().delete(`${url}/${department.id}`),
    ];
    for (const call of calls) {
      await call().expect(401);
      await call().auth(student, { type: 'bearer' }).expect(403);
      await call().auth(staff, { type: 'bearer' }).expect(403);
    }
    expect(await db.department.count({ where: { name: `${prefix}-forbidden` } })).toBe(0);
    expect((await db.department.findUniqueOrThrow({ where: { id: department.id } })).isActive).toBe(true);
  });

  it('creates, lists, reads and updates departments with trimmed values', async () => {
    const department = await create(`  ${prefix}-hvac  `, '  Điều hòa và thông gió  ');
    expect(department).toMatchObject({ name: `${prefix}-hvac`, description: 'Điều hòa và thông gió', isActive: true, staffCount: 0, assignmentCount: 0 });

    const updated = await http().patch(`${url}/${department.id}`).auth(admin, { type: 'bearer' })
      .send({ name: `${prefix}-HVAC`, description: '' }).expect(200);
    expect(updated.body.data).toMatchObject({ name: `${prefix}-HVAC`, description: null });

    const inactive = await http().patch(`${url}/${department.id}`).auth(admin, { type: 'bearer' }).send({ isActive: false }).expect(200);
    expect(inactive.body.data.isActive).toBe(false);
    const list = await http().get(url).auth(admin, { type: 'bearer' }).expect(200);
    expect(list.body.data.find((item: { id: number }) => item.id === department.id)).toMatchObject({ isActive: false });

    const detail = await http().get(`${url}/${departmentId}`).auth(admin, { type: 'bearer' }).expect(200);
    expect(detail.body.data).toMatchObject({ id: departmentId, staffCount: 1, memberCount: 1 });
    expect(detail.body.data.staff).toEqual([expect.objectContaining({ id: staffId, role: 'TECH_STAFF', isActive: true })]);
    expect(detail.body.data.staff[0]).not.toHaveProperty('password');
  });

  it('rejects invalid input, unknown ids and duplicate names regardless of case or status', async () => {
    const first = await create(`${prefix}-network`);
    const second = await create(`${prefix}-power`);
    await http().patch(`${url}/${first.id}`).auth(admin, { type: 'bearer' }).send({ isActive: false }).expect(200);

    for (const body of [{}, { name: '   ' }, { name: 'x'.repeat(101) }, { name: 42 }, { name: `${prefix}-x`, description: 'x'.repeat(501) },
      { name: `${prefix}-x`, isActive: false }, { name: `${prefix}-x`, id: 1 }, { name: `${prefix}-x`, role: 'ADMIN' }]) {
      await http().post(url).auth(admin, { type: 'bearer' }).send(body).expect(400);
    }
    for (const body of [{ name: null }, { name: '' }, { isActive: null }, { isActive: 'false' }, { staffCount: 0 }, { userIds: [staffId] }]) {
      await http().patch(`${url}/${second.id}`).auth(admin, { type: 'bearer' }).send(body).expect(400);
    }
    await http().get(`${url}/abc`).auth(admin, { type: 'bearer' }).expect(400);
    await http().get(`${url}/2147483000`).auth(admin, { type: 'bearer' }).expect(404);
    await http().patch(`${url}/2147483000`).auth(admin, { type: 'bearer' }).send({ isActive: true }).expect(404);

    await http().post(url).auth(admin, { type: 'bearer' }).send({ name: ` ${prefix}-NETWORK ` }).expect(409);
    await http().patch(`${url}/${second.id}`).auth(admin, { type: 'bearer' }).send({ name: `${prefix}-Network` }).expect(409);
    await http().patch(`${url}/${second.id}`).auth(admin, { type: 'bearer' }).send({ name: `${prefix}-POWER` }).expect(200);
    expect(await db.department.count({ where: { name: { equals: `${prefix}-x`, mode: 'insensitive' } } })).toBe(0);
  });

  it('serializes concurrent creates with the same name', async () => {
    const results = await Promise.all([`${prefix}-race`, `${prefix}-RACE`].map((name) =>
      http().post(url).auth(admin, { type: 'bearer' }).send({ name })));
    expect(results.map((result) => result.status).sort()).toEqual([201, 409]);
    expect(await db.department.count({ where: { name: { equals: `${prefix}-race`, mode: 'insensitive' } } })).toBe(1);
  });

  it('blocks new assignments to an inactive department while current work and history stay intact', async () => {
    const report = { buildingId, locationId, categoryId, title: 'Mất điện phòng học', description: 'Phòng học mất điện toàn bộ từ sáng nay.' };
    const reports = await Promise.all([1, 2].map(async () =>
      (await http().post('/api/v1/incident-reports').auth(student, { type: 'bearer' }).send(report).expect(201)).body.data.id as number));
    for (const id of reports) {
      await http().patch(`/api/v1/incident-reports/${id}/review`).auth(admin, { type: 'bearer' }).send({ action: 'APPROVE', categoryId, urgency: 'HIGH' }).expect(200);
    }
    const [incidentId, otherIncidentId] = await Promise.all(reports.map(async (reportId) =>
      (await db.incident.findFirstOrThrow({ where: { reportId }, select: { id: true } })).id));

    const staffOptions = await http().get(`/api/v1/master-data/departments/${departmentId}/staff`).auth(admin, { type: 'bearer' }).expect(200);
    expect(staffOptions.body.data.map((item: { id: number }) => item.id)).toEqual([staffId]);
    await http().post(`/api/v1/incidents/${incidentId}/assign`).auth(admin, { type: 'bearer' })
      .send({ departmentId, assigneeId: otherStaffId }).expect(400);
    await http().post(`/api/v1/incidents/${incidentId}/assign`).auth(admin, { type: 'bearer' })
      .send({ departmentId, assigneeId: staffId }).expect(201);

    const before = await http().get(`${url}/${departmentId}`).auth(admin, { type: 'bearer' }).expect(200);
    expect(before.body.data).toMatchObject({ assignmentCount: 1, activeAssignmentCount: 1 });

    await http().patch(`${url}/${departmentId}`).auth(admin, { type: 'bearer' }).send({ isActive: false }).expect(200);

    const options = await http().get('/api/v1/master-data/departments').expect(200);
    expect(options.body.data.some((item: { id: number }) => item.id === departmentId)).toBe(false);
    expect(options.body.data.some((item: { id: number }) => item.id === otherDepartmentId)).toBe(true);
    await http().get(`/api/v1/master-data/departments/${departmentId}/staff`).auth(admin, { type: 'bearer' }).expect(404);
    await http().post(`/api/v1/incidents/${otherIncidentId}/assign`).auth(admin, { type: 'bearer' })
      .send({ departmentId, assigneeId: staffId }).expect(400);

    expect((await db.user.findUniqueOrThrow({ where: { id: staffId } })).departmentId).toBe(departmentId);
    const assignment = await db.incidentAssignment.findFirstOrThrow({ where: { incidentId } });
    expect(assignment).toMatchObject({ departmentId, assigneeId: staffId, isCurrent: true });

    const tasks = await http().get('/api/v1/staff/incidents').auth(staff, { type: 'bearer' }).expect(200);
    expect(tasks.body.data.items.map((item: { id: number }) => item.id)).toContain(incidentId);
    await http().patch(`/api/v1/staff/incidents/${incidentId}/accept`).auth(staff, { type: 'bearer' }).expect(200);

    await http().delete(`${url}/${departmentId}`).auth(admin, { type: 'bearer' }).expect(409);
    expect(await db.department.count({ where: { id: departmentId } })).toBe(1);

    await http().patch(`${url}/${departmentId}`).auth(admin, { type: 'bearer' }).send({ isActive: true }).expect(200);
    await http().post(`/api/v1/incidents/${otherIncidentId}/assign`).auth(admin, { type: 'bearer' })
      .send({ departmentId, assigneeId: staffId }).expect(201);
  });

  it('deletes a department only after it is inactive and nothing references it', async () => {
    const department = await create(`${prefix}-unused`);
    await http().delete(`${url}/${department.id}`).auth(admin, { type: 'bearer' }).expect(409);
    await http().patch(`${url}/${department.id}`).auth(admin, { type: 'bearer' }).send({ isActive: false }).expect(200);

    const result = await http().delete(`${url}/${department.id}`).auth(admin, { type: 'bearer' }).expect(200);
    expect(result.body.data).toEqual({ id: department.id });
    expect(await db.department.count({ where: { id: department.id } })).toBe(0);
    await http().delete(`${url}/${department.id}`).auth(admin, { type: 'bearer' }).expect(404);
    await http().delete(`${url}/abc`).auth(admin, { type: 'bearer' }).expect(400);

    const withMember = await create(`${prefix}-member`);
    const member = await db.user.create({
      data: { email: `${prefix}-member@gm.uit.edu.vn`, password: 'x', role: Role.TECH_STAFF, departmentId: withMember.id, isActive: false },
    });
    userIds.push(member.id);
    const withBuilding = await create(`${prefix}-building`);
    await db.building.create({ data: { name: `${prefix}-default`, defaultDepartmentId: withBuilding.id } });
    for (const { id } of [withMember, withBuilding]) {
      await http().patch(`${url}/${id}`).auth(admin, { type: 'bearer' }).send({ isActive: false }).expect(200);
      await http().delete(`${url}/${id}`).auth(admin, { type: 'bearer' }).expect(409);
      expect(await db.department.count({ where: { id } })).toBe(1);
    }
  });
});
