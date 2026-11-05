import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { IncidentStatus, Role } from '@prisma/client';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter.js';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor.js';
import { PrismaService } from '../src/core/database/prisma.service.js';
import { CloudinaryService } from '../src/shared/cloudinary/cloudinary.service.js';

describe('Resolution media ownership and incident queue validation HTTP', () => {
  let app: INestApplication<App>;
  let db: PrismaService;
  let studentId: number;
  let adminId: number;
  let staffId: number;
  let otherStaffId: number;
  let student: string;
  let admin: string;
  let staff: string;
  let otherStaff: string;
  let departmentId: number;
  let buildingId: number;
  let locationId: number;
  let categoryId: number;
  const userIds: number[] = [];
  const prefix = `resolution-${randomUUID()}`;
  const note = 'Đã kiểm tra và khắc phục sự cố thử nghiệm.';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(CloudinaryService).useValue({
        uploadFile: vi.fn(async () => ({ public_id: `${prefix}/${randomUUID()}`, secure_url: 'https://example.com/test.png', format: 'png', bytes: 68 })),
        deleteFile: vi.fn(async () => ({ result: 'ok' })),
      }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalInterceptors(new TransformInterceptor());
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
    db = app.get(PrismaService);
    departmentId = (await db.department.create({ data: { name: prefix } })).id;
    const jwt = app.get(JwtService);
    const tokens: string[] = [];
    for (const [index, role] of [Role.STUDENT, Role.ADMIN, Role.TECH_STAFF, Role.TECH_STAFF].entries()) {
      const user = await db.user.create({ data: {
        email: `${prefix}-${index}@gm.uit.edu.vn`, fullName: `E2E ${role}`, password: randomUUID(), role, isActive: true,
        ...(role === Role.TECH_STAFF ? { departmentId } : {}),
      } });
      userIds.push(user.id);
      tokens.push(await jwt.signAsync({ sub: user.id, role }));
    }
    [studentId, adminId, staffId, otherStaffId] = userIds;
    [student, admin, staff, otherStaff] = tokens;
    buildingId = (await db.building.create({ data: { name: prefix } })).id;
    locationId = (await db.location.create({ data: { buildingId, name: prefix, locationType: 'LT' } })).id;
    categoryId = (await db.category.create({ data: { name: prefix } })).id;
  }, 30_000);

  afterAll(async () => {
    if (db) {
      const reports = await db.incidentReport.findMany({ where: { studentId: { in: userIds } }, select: { id: true } });
      const reportIds = reports.map(({ id }) => id);
      const incidents = await db.incident.findMany({ where: { reportId: { in: reportIds } }, select: { id: true } });
      const incidentIds = incidents.map(({ id }) => id);
      const resolutions = await db.incidentResolution.findMany({ where: { incidentId: { in: incidentIds } }, select: { id: true } });
      // Only this suite's users, media and campus fixtures are removed.
      await db.$transaction([
        db.incidentHistory.deleteMany({ where: { incidentId: { in: incidentIds } } }),
        db.incidentProgressNote.deleteMany({ where: { incidentId: { in: incidentIds } } }),
        db.media.deleteMany({ where: { OR: [
          { userId: { in: userIds } }, { reportId: { in: reportIds } }, { resolutionId: { in: resolutions.map(({ id }) => id) } },
        ] } }),
        db.incidentResolution.deleteMany({ where: { incidentId: { in: incidentIds } } }),
        db.incidentAssignment.deleteMany({ where: { incidentId: { in: incidentIds } } }),
        db.incident.deleteMany({ where: { id: { in: incidentIds } } }),
        db.incidentReportHistory.deleteMany({ where: { reportId: { in: reportIds } } }),
        db.incidentReport.deleteMany({ where: { id: { in: reportIds } } }),
        db.location.deleteMany({ where: { buildingId: buildingId ?? -1 } }),
        db.building.deleteMany({ where: { id: buildingId ?? -1 } }),
        db.category.deleteMany({ where: { id: categoryId ?? -1 } }),
        db.user.deleteMany({ where: { id: { in: userIds } } }),
        db.department.deleteMany({ where: { id: departmentId ?? -1 } }),
      ]);
    }
    await app?.close();
  }, 30_000);

  async function createIncident(status: IncidentStatus = IncidentStatus.IN_PROGRESS) {
    const report = await db.incidentReport.create({ data: {
      studentId, buildingId, locationId, categoryId, title: prefix, description: 'Resolution fixture only.', status: 'APPROVED', urgency: 'HIGH',
    } });
    return db.incident.create({ data: {
      reportId: report.id, status, urgency: 'HIGH',
      assignments: { create: { departmentId, assigneeId: staffId, assignedById: adminId } },
    } });
  }

  function resolve(id: number, mediaIds?: unknown[], token = staff) {
    return request(app.getHttpServer()).patch(`/api/v1/staff/incidents/${id}/resolve`)
      .auth(token, { type: 'bearer' }).send({ resolutionNote: note, ...(mediaIds === undefined ? {} : { mediaIds }) });
  }

  function temporaryMedia(owner = staffId) {
    return db.media.create({ data: { publicId: `${prefix}/${randomUUID()}`, url: 'https://example.com/test.png', userId: owner, format: 'png' } });
  }

  async function expectUnchanged(incidentId: number) {
    expect(await db.incident.findUniqueOrThrow({ where: { id: incidentId } })).toMatchObject({ status: 'IN_PROGRESS' });
    expect(await db.incidentResolution.count({ where: { incidentId } })).toBe(0);
    expect(await db.incidentHistory.count({ where: { incidentId, action: 'RESOLVED' } })).toBe(0);
  }

  it('completes with an owned multipart upload and transfers its single parent atomically', async () => {
    const incident = await createIncident();
    const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1kAAAAASUVORK5CYII=', 'base64');
    const upload = await request(app.getHttpServer()).post('/api/v1/media/upload').auth(staff, { type: 'bearer' })
      .attach('file', image, { filename: 'test.png', contentType: 'image/png' }).expect(201);
    const mediaId = upload.body.data.id;
    const result = await resolve(incident.id, [mediaId]).expect(200);
    expect(result.body.data.status).toBe('RESOLVED');
    expect(result.body.data.resolution.media.map(({ id }: { id: number }) => id)).toEqual([mediaId]);
    expect(await db.media.findUniqueOrThrow({ where: { id: mediaId } })).toMatchObject({
      userId: null, reportId: null, resolutionId: result.body.data.resolution.id,
    });
    expect(await db.incidentHistory.count({ where: { incidentId: incident.id, action: 'RESOLVED' } })).toBe(1);
  });

  it('still completes without photos', async () => {
    const incident = await createIncident();
    const result = await resolve(incident.id).expect(200);
    expect(result.body.data.status).toBe('RESOLVED');
    expect(result.body.data.resolution.media).toEqual([]);
  });

  it('rolls back a partial claim when an image ID does not exist', async () => {
    const incident = await createIncident();
    const media = await temporaryMedia();
    // Delete our own temporary row to obtain a positive ID known to be absent.
    const unused = await db.media.create({ data: { publicId: `${prefix}/${randomUUID()}`, url: 'https://example.com/missing.png', userId: staffId } });
    await db.media.delete({ where: { id: unused.id } });
    await resolve(incident.id, [media.id, unused.id]).expect(400);
    await expectUnchanged(incident.id);
    expect(await db.media.findUniqueOrThrow({ where: { id: media.id } })).toMatchObject({ userId: staffId, resolutionId: null });
  });

  it('rejects another staff member’s image without changing either owner or incident', async () => {
    const incident = await createIncident();
    const media = await temporaryMedia(otherStaffId);
    await resolve(incident.id, [media.id]).expect(400);
    await expectUnchanged(incident.id);
    expect(await db.media.findUniqueOrThrow({ where: { id: media.id } })).toMatchObject({ userId: otherStaffId, resolutionId: null });
  });

  it('does not reuse original report evidence', async () => {
    const incident = await createIncident();
    const media = await db.media.create({ data: { publicId: `${prefix}/${randomUUID()}`, url: 'https://example.com/report.png', reportId: incident.reportId } });
    await resolve(incident.id, [media.id]).expect(400);
    await expectUnchanged(incident.id);
    expect(await db.media.findUniqueOrThrow({ where: { id: media.id } })).toMatchObject({ reportId: incident.reportId, resolutionId: null });
  });

  it('does not reuse an image already attached to a resolution', async () => {
    const original = await createIncident();
    const media = await temporaryMedia();
    await resolve(original.id, [media.id]).expect(200);
    const owner = await db.media.findUniqueOrThrow({ where: { id: media.id } });
    const next = await createIncident();
    await resolve(next.id, [media.id]).expect(400);
    await expectUnchanged(next.id);
    expect(await db.media.findUniqueOrThrow({ where: { id: media.id } })).toMatchObject({ resolutionId: owner.resolutionId });
  });

  it.each([[0], [-1], [1.5], ['1'], [1, 1], [1, 2, 3, 4, 5, 6]].map((ids) => [ids]))(
    'rejects invalid media IDs %j before changing state', async (ids) => {
      const incident = await createIncident();
      await resolve(incident.id, ids).expect(400);
      await expectUnchanged(incident.id);
    },
  );

  it('allows only one concurrent resolution to claim a shared temporary image', async () => {
    const first = await createIncident();
    const second = await createIncident();
    const media = await temporaryMedia();
    const responses = await Promise.all([resolve(first.id, [media.id]), resolve(second.id, [media.id])]);
    expect(responses.map(({ status }) => status).sort()).toEqual([200, 400]);
    const winner = [first, second][responses.findIndex(({ status }) => status === 200)];
    const loser = [first, second][responses.findIndex(({ status }) => status === 400)];
    await expectUnchanged(loser.id);
    const resolution = await db.incidentResolution.findFirstOrThrow({ where: { incidentId: winner.id } });
    expect(await db.media.findUniqueOrThrow({ where: { id: media.id } })).toMatchObject({ userId: null, resolutionId: resolution.id });
  });

  it('allows only one concurrent completion of the same incident', async () => {
    const incident = await createIncident();
    const responses = await Promise.all([resolve(incident.id), resolve(incident.id)]);
    expect(responses.map(({ status }) => status).sort()).toEqual([200, 409]);
    expect(await db.incidentResolution.count({ where: { incidentId: incident.id } })).toBe(1);
    expect(await db.incidentHistory.count({ where: { incidentId: incident.id, action: 'RESOLVED' } })).toBe(1);
  });

  it('keeps role, assignment and state restrictions when resolving with photos', async () => {
    const incident = await createIncident();
    const media = await temporaryMedia();
    await resolve(incident.id, [media.id], student).expect(403);
    await resolve(incident.id, [media.id], otherStaff).expect(403);
    await expectUnchanged(incident.id);
    const assigned = await createIncident(IncidentStatus.ASSIGNED);
    await resolve(assigned.id, [media.id]).expect(409);
  });

  it.each([
    'status=NOT_A_STATUS', 'status=', 'page=0', 'page=-1', 'page=1.5', 'page=1abc',
    'limit=0', 'limit=101', 'limit=NaN', 'buildingId=-1', 'buildingId=0', 'buildingId=1.5', 'buildingId=1abc',
  ])('rejects invalid queue query %s with 400', async (query) => {
    await request(app.getHttpServer()).get(`/api/v1/incidents/queue?${query}`).auth(admin, { type: 'bearer' }).expect(400);
  });

  it('accepts queue defaults and valid enum, building and pagination filters', async () => {
    const incident = await createIncident();
    const defaults = await request(app.getHttpServer()).get('/api/v1/incidents/queue').auth(admin, { type: 'bearer' }).expect(200);
    expect(defaults.body.data).toMatchObject({ page: 1, limit: 10 });
    const filtered = await request(app.getHttpServer()).get(`/api/v1/incidents/queue?status=IN_PROGRESS&buildingId=${buildingId}&page=1&limit=100`)
      .auth(admin, { type: 'bearer' }).expect(200);
    expect(filtered.body.data.items.some(({ id }: { id: number }) => id === incident.id)).toBe(true);
    expect(filtered.body.data.items.every((item: { status: string; report: { building: { id: number } } }) =>
      item.status === 'IN_PROGRESS' && item.report.building.id === buildingId)).toBe(true);
  });
});
