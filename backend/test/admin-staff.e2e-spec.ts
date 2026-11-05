import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { IncidentStatus, IncidentUrgency, ReportStatus, Role } from '@prisma/client';
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
} from '../src/modules/auth/constants/auth.constants.js';
import {
  STAFF_DEPARTMENT_BUSY_MESSAGE,
  STAFF_DEPARTMENT_INACTIVE_MESSAGE,
  STAFF_DEPARTMENT_NOT_FOUND_MESSAGE,
} from '../src/modules/users/admin-staff.service.js';
import { STAFF_EMAIL_MESSAGE } from '../src/modules/users/dto/create-staff.dto.js';

describe('Admin staff management HTTP', () => {
  let app: INestApplication<App>;
  let db: PrismaService;
  let studentToken: string;
  let staffToken: string;
  let adminToken: string;
  let adminId: number;
  let studentId: number;
  let departmentId: number;
  let otherDepartmentId: number;
  let inactiveDepartmentId: number;
  let buildingId: number;
  let locationId: number;
  let categoryId: number;
  const prefix = `staff-${randomUUID()}`;
  const url = '/api/v1/admin/staff';
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
    departmentId = (await db.department.create({ data: { name: `${prefix}-a` } })).id;
    otherDepartmentId = (await db.department.create({ data: { name: `${prefix}-b` } })).id;
    inactiveDepartmentId = (await db.department.create({ data: { name: `${prefix}-off`, isActive: false } })).id;
    const fixturePassword = await bcrypt.hash('Fixture123', 4);
    const users = await Promise.all(([[Role.STUDENT, null], [Role.TECH_STAFF, departmentId], [Role.ADMIN, null]] as const).map(([role, deptId], index) =>
      db.user.create({ data: { email: `${prefix}-${index}@gm.uit.edu.vn`, fullName: `E2E ${role}`, password: fixturePassword, role, departmentId: deptId, isActive: true } })));
    studentId = users[0].id;
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
      const incidentIds = (await db.incident.findMany({
        where: { reportId: { in: reportIds } },
        select: { id: true },
      })).map(({ id }) => id);
      await db.$transaction([
        db.incidentHistory.deleteMany({ where: { OR: [{ incidentId: { in: incidentIds } }, { actorId: { in: ownedIds } }] } }),
        db.incidentProgressNote.deleteMany({ where: { OR: [{ incidentId: { in: incidentIds } }, { authorId: { in: ownedIds } }] } }),
        db.incidentResolution.deleteMany({ where: { OR: [{ incidentId: { in: incidentIds } }, { resolvedById: { in: ownedIds } }] } }),
        db.incidentAssignment.deleteMany({ where: { OR: [{ incidentId: { in: incidentIds } }, { assigneeId: { in: ownedIds } }, { assignedById: { in: ownedIds } }] } }),
        db.incident.deleteMany({ where: { id: { in: incidentIds } } }),
        db.incidentReportHistory.deleteMany({ where: { OR: [{ reportId: { in: reportIds } }, { actorId: { in: ownedIds } }] } }),
        db.incidentReport.deleteMany({ where: { id: { in: reportIds } } }),
        db.user.deleteMany({ where: { id: { in: ownedIds } } }),
        db.location.deleteMany({ where: { buildingId } }),
        db.building.deleteMany({ where: { id: buildingId } }),
        db.category.deleteMany({ where: { id: categoryId } }),
        db.department.deleteMany({ where: { id: { in: [departmentId, otherDepartmentId, inactiveDepartmentId] } } }),
      ]);
    }
    await app?.close();
  }, 30_000);

  const createStaff = async (localPart: string, body: Record<string, unknown> = {}) =>
    request(app.getHttpServer()).post(url).auth(adminToken, { type: 'bearer' }).send({
      fullName: 'Nguyen Van A',
      email: `${prefix}-${localPart}@gm.uit.edu.vn`,
      password,
      departmentId,
      ...body,
    });

  const assignOpenIncident = async (assigneeId: number, assignedDepartmentId: number) => {
    const report = await db.incidentReport.create({
      data: {
        studentId,
        categoryId,
        buildingId,
        locationId,
        title: `${prefix} sự cố`,
        description: 'Sự cố dùng để kiểm tra ràng buộc đổi phòng của kỹ thuật viên.',
        status: ReportStatus.APPROVED,
      },
    });
    const incident = await db.incident.create({
      data: { reportId: report.id, status: IncidentStatus.ASSIGNED, urgency: IncidentUrgency.MEDIUM },
    });
    const assignment = await db.incidentAssignment.create({
      data: {
        incidentId: incident.id,
        departmentId: assignedDepartmentId,
        assignedById: adminId,
        assigneeId,
        isCurrent: true,
        isActive: true,
      },
    });
    return { incident, assignment };
  };

  it('allows only authenticated ADMIN accounts', async () => {
    const created = await createStaff('auth');
    expect(created.status).toBe(201);
    const id = created.body.data.id as number;
    const calls = [
      () => request(app.getHttpServer()).get(url),
      () => request(app.getHttpServer()).get(`${url}/${id}`),
      () => request(app.getHttpServer()).post(url).send({
        fullName: 'Forbidden Staff',
        email: `${prefix}-forbidden@gm.uit.edu.vn`,
        password,
        departmentId,
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

  it('creates tech staff in an active department and keeps public registration on the student role', async () => {
    const created = await createStaff('created', {
      fullName: '  Le Thi C  ',
      email: `  ${prefix}-Created@GM.UIT.EDU.VN  `,
    });
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({
      email: `${prefix}-created@gm.uit.edu.vn`,
      fullName: 'Le Thi C',
      role: Role.TECH_STAFF,
      departmentId,
      isActive: true,
      referenceCount: 0,
      openAssignmentCount: 0,
      department: { id: departmentId, isActive: true },
    });
    expect(created.body.data.password).toBeUndefined();
    expect(JSON.stringify(created.body)).not.toContain(password);

    const stored = await db.user.findUniqueOrThrow({ where: { id: created.body.data.id } });
    expect(stored.password.split('$')[2]).toBe('12');
    await expect(bcrypt.compare(password, stored.password)).resolves.toBe(true);
    expect(stored.role).toBe(Role.TECH_STAFF);
    expect(stored.departmentId).toBe(departmentId);

    const registeredEmail = `${prefix}-public@gm.uit.edu.vn`;
    const registered = await request(app.getHttpServer()).post('/api/v1/auth/register').send({
      fullName: 'Public Student',
      email: registeredEmail,
      password,
      role: Role.TECH_STAFF,
      departmentId,
    });
    expect(registered.status).toBe(400);
    expect(await db.user.count({ where: { email: registeredEmail } })).toBe(0);

    const list = await request(app.getHttpServer()).get(url).auth(adminToken, { type: 'bearer' }).expect(200);
    const emails = list.body.data.map((item: { email: string }) => item.email);
    expect(emails).toContain(`${prefix}-created@gm.uit.edu.vn`);
    expect(emails).toContain(`${prefix}-1@gm.uit.edu.vn`);
    expect(emails).not.toContain(`${prefix}-0@gm.uit.edu.vn`);
    expect(emails).not.toContain(`${prefix}-2@gm.uit.edu.vn`);
    expect(JSON.stringify(list.body)).not.toContain(stored.password);
  });

  it('rejects invalid staff input, privileged fields, and inactive departments', async () => {
    const invalidEmails = ['staff@gmail.com', 'staff@uit.edu.vn', 'staff@gm.uit.edu.vn.fake.com', 'staff@sub.gm.uit.edu.vn'];
    for (const email of invalidEmails) {
      const response = await createStaff('ignored', { email });
      expect(response.status).toBe(400);
      expect(JSON.stringify(response.body.message)).toContain(STAFF_EMAIL_MESSAGE);
    }
    const malformed = await createStaff('ignored', { email: 'not-an-email' });
    expect(malformed.status).toBe(400);
    expect(JSON.stringify(malformed.body.message)).toContain(INVALID_EMAIL_MESSAGE);

    const weak = await createStaff('weak', { password: 'onlyletters' });
    expect(weak.status).toBe(400);
    expect(JSON.stringify(weak.body.message)).toContain(PASSWORD_POLICY_MESSAGE);

    for (const extra of [{ role: Role.ADMIN }, { role: Role.STUDENT }, { isActive: false }]) {
      const response = await createStaff(`extra-${Object.keys(extra)[0]}`, extra);
      expect(response.status).toBe(400);
    }
    const inactive = await createStaff('inactive-dept', { departmentId: inactiveDepartmentId });
    expect(inactive.status).toBe(400);
    expect(JSON.stringify(inactive.body.message)).toContain(STAFF_DEPARTMENT_INACTIVE_MESSAGE);
    const missing = await createStaff('missing-dept', { departmentId: 2_147_483_647 });
    expect(missing.status).toBe(404);
    expect(JSON.stringify(missing.body.message)).toContain(STAFF_DEPARTMENT_NOT_FOUND_MESSAGE);

    expect(await db.user.count({ where: { email: { startsWith: `${prefix}-extra-` } } })).toBe(0);
    expect(await db.user.count({ where: { email: { startsWith: `${prefix}-inactive-dept` } } })).toBe(0);
    expect(await db.user.count({ where: { role: Role.ADMIN, email: { startsWith: prefix } } })).toBe(1);
  });

  it('rejects a duplicate email and replaces the password without changing the role', async () => {
    const first = await createStaff('dup');
    expect(first.status).toBe(201);
    const duplicate = await createStaff('other', { email: ` ${prefix}-DUP@gm.uit.edu.vn ` });
    expect(duplicate.status).toBe(409);
    expect(JSON.stringify(duplicate.body.message)).toContain(EMAIL_ALREADY_USED_MESSAGE);

    const detail = await request(app.getHttpServer()).get(`${url}/${first.body.data.id}`).auth(adminToken, { type: 'bearer' }).expect(200);
    expect(detail.body.data.email).toBe(`${prefix}-dup@gm.uit.edu.vn`);
    expect(detail.body.data.password).toBeUndefined();
    await request(app.getHttpServer()).get(`${url}/${adminId}`).auth(adminToken, { type: 'bearer' }).expect(404);
    await request(app.getHttpServer()).patch(`${url}/${adminId}`).auth(adminToken, { type: 'bearer' }).send({ fullName: 'Hijack' }).expect(404);

    const updated = await request(app.getHttpServer()).patch(`${url}/${first.body.data.id}`).auth(adminToken, { type: 'bearer' })
      .send({ fullName: '  Pham Van D  ', email: ` ${prefix}-Renamed@GM.UIT.EDU.VN ` }).expect(200);
    expect(updated.body.data).toMatchObject({
      fullName: 'Pham Van D',
      email: `${prefix}-renamed@gm.uit.edu.vn`,
      role: Role.TECH_STAFF,
      departmentId,
    });
    await request(app.getHttpServer()).patch(`${url}/${first.body.data.id}`).auth(adminToken, { type: 'bearer' })
      .send({ role: Role.ADMIN }).expect(400);

    const nextPassword = 'FreshPass9';
    const reset = await request(app.getHttpServer()).patch(`${url}/${first.body.data.id}`).auth(adminToken, { type: 'bearer' })
      .send({ password: nextPassword }).expect(200);
    expect(reset.body.data.password).toBeUndefined();
    const stored = await db.user.findUniqueOrThrow({ where: { id: first.body.data.id } });
    expect(stored.role).toBe(Role.TECH_STAFF);
    expect(stored.password.split('$')[2]).toBe('12');
    await expect(bcrypt.compare(nextPassword, stored.password)).resolves.toBe(true);
    await request(app.getHttpServer()).post('/api/v1/auth/login').send({ email: stored.email, password }).expect(401);
    await request(app.getHttpServer()).post('/api/v1/auth/login').send({ email: stored.email, password: nextPassword }).expect(200);
  });

  it('blocks a department change while an incident is still assigned, then allows it after the incident is resolved', async () => {
    const created = await createStaff('busy');
    expect(created.status).toBe(201);
    const id = created.body.data.id as number;
    const { incident, assignment } = await assignOpenIncident(id, departmentId);
    const before = await db.incidentAssignment.findUniqueOrThrow({ where: { id: assignment.id } });

    const blocked = await request(app.getHttpServer()).patch(`${url}/${id}`).auth(adminToken, { type: 'bearer' })
      .send({ departmentId: otherDepartmentId });
    expect(blocked.status).toBe(409);
    expect(JSON.stringify(blocked.body.message)).toContain(STAFF_DEPARTMENT_BUSY_MESSAGE);

    const renamed = await request(app.getHttpServer()).patch(`${url}/${id}`).auth(adminToken, { type: 'bearer' })
      .send({ fullName: 'Dang Giu Viec' }).expect(200);
    expect(renamed.body.data).toMatchObject({ departmentId, openAssignmentCount: 1 });

    const afterBlock = await db.incidentAssignment.findUniqueOrThrow({ where: { id: assignment.id } });
    expect(afterBlock).toMatchObject({
      departmentId: before.departmentId,
      assigneeId: before.assigneeId,
      isCurrent: true,
      isActive: true,
    });
    expect((await db.incident.findUniqueOrThrow({ where: { id: incident.id } })).status).toBe(IncidentStatus.ASSIGNED);
    expect(await db.incidentHistory.count({ where: { incidentId: incident.id } })).toBe(0);

    await request(app.getHttpServer()).patch(`${url}/${id}`).auth(adminToken, { type: 'bearer' })
      .send({ isActive: false }).expect(200);
    const lockedAssignment = await db.incidentAssignment.findUniqueOrThrow({ where: { id: assignment.id } });
    expect(lockedAssignment.departmentId).toBe(departmentId);
    expect(lockedAssignment.assigneeId).toBe(id);
    const locked = await db.user.findUniqueOrThrow({ where: { id } });
    const lockedLogin = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
      email: locked.email,
      password,
    }).expect(401);
    expect(JSON.stringify(lockedLogin.body.message)).toContain(INVALID_CREDENTIALS_MESSAGE);
    const lockedToken = await app.get(JwtService).signAsync({ sub: id, role: Role.TECH_STAFF });
    await request(app.getHttpServer()).get('/api/v1/users/me').auth(lockedToken, { type: 'bearer' }).expect(401);

    await db.incident.update({ where: { id: incident.id }, data: { status: IncidentStatus.RESOLVED } });
    const moved = await request(app.getHttpServer()).patch(`${url}/${id}`).auth(adminToken, { type: 'bearer' })
      .send({ departmentId: otherDepartmentId, isActive: true }).expect(200);
    expect(moved.body.data).toMatchObject({ departmentId: otherDepartmentId, isActive: true, openAssignmentCount: 0 });
    const historical = await db.incidentAssignment.findUniqueOrThrow({ where: { id: assignment.id } });
    expect(historical).toMatchObject({ departmentId, assigneeId: id, isCurrent: true });
    expect((await db.incident.findUniqueOrThrow({ where: { id: incident.id } })).status).toBe(IncidentStatus.RESOLVED);

    const oldPool = await request(app.getHttpServer()).get(`/api/v1/master-data/departments/${departmentId}/staff`)
      .auth(adminToken, { type: 'bearer' }).expect(200);
    const newPool = await request(app.getHttpServer()).get(`/api/v1/master-data/departments/${otherDepartmentId}/staff`)
      .auth(adminToken, { type: 'bearer' }).expect(200);
    const oldIds = oldPool.body.data.map((item: { id: number }) => item.id);
    const newIds = newPool.body.data.map((item: { id: number }) => item.id);
    expect(oldIds).not.toContain(id);
    expect(newIds).toContain(id);

    await request(app.getHttpServer()).delete(`${url}/${id}`).auth(adminToken, { type: 'bearer' }).expect(409);
    await request(app.getHttpServer()).patch(`${url}/${id}`).auth(adminToken, { type: 'bearer' })
      .send({ isActive: false }).expect(200);
    const stillReferenced = await request(app.getHttpServer()).delete(`${url}/${id}`).auth(adminToken, { type: 'bearer' }).expect(409);
    expect(JSON.stringify(stillReferenced.body.message)).toContain('lịch sử');
    expect(await db.incidentAssignment.count({ where: { id: assignment.id } })).toBe(1);
    expect(await db.user.count({ where: { id } })).toBe(1);
  });

  it('deletes a staff account only after it is locked and has no history', async () => {
    const created = await createStaff('unused');
    expect(created.status).toBe(201);
    const id = created.body.data.id as number;
    await request(app.getHttpServer()).delete(`${url}/${id}`).auth(adminToken, { type: 'bearer' }).expect(409);
    await request(app.getHttpServer()).patch(`${url}/${id}`).auth(adminToken, { type: 'bearer' }).send({ isActive: false }).expect(200);
    const removed = await request(app.getHttpServer()).delete(`${url}/${id}`).auth(adminToken, { type: 'bearer' }).expect(200);
    expect(removed.body.data).toEqual({ id });
    expect(await db.user.count({ where: { id } })).toBe(0);
    await request(app.getHttpServer()).delete(`${url}/${id}`).auth(adminToken, { type: 'bearer' }).expect(404);
  });
});
