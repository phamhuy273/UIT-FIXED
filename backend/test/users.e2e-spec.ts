import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Role } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter.js';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor.js';
import { PrismaService } from '../src/core/database/prisma.service.js';
import { INVALID_SESSION_MESSAGE } from '../src/modules/auth/constants/auth.constants.js';

describe('GET /users/me (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const emails: string[] = [];
  const password = 'Secret12';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalInterceptors(new TransformInterceptor());
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
    prisma = app.get(PrismaService);
  }, 30000);

  afterAll(async () => {
    if (prisma && emails.length > 0) {
      await prisma.user.deleteMany({ where: { email: { in: emails } } });
    }
    if (app) {
      await app.close();
    }
  }, 30000);

  it('returns the authenticated student and ignores a client userId', async () => {
    const email = nextEmail(emails);
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ fullName: 'Nguyen Van A', email, password })
      .expect(201);

    const loggedIn = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
    const token = loggedIn.body.data.accessToken as string;

    const response = await request(app.getHttpServer())
      .get('/api/v1/users/me')
      .query({ userId: 999999 })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const stored = await prisma.user.findUnique({ where: { email } });
    expect(response.body.data).toMatchObject({
      id: stored?.id,
      email,
      fullName: 'Nguyen Van A',
      role: Role.STUDENT,
      departmentId: null,
      isActive: true,
    });
    expect(response.body.data.createdAt).toEqual(expect.any(String));
    expect(response.body.data.password).toBeUndefined();
    expect(JSON.stringify(response.body)).not.toContain(stored!.password);

    await request(app.getHttpServer())
      .get(`/api/v1/users/${stored?.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  }, 30000);

  it('rejects a missing token and an inactive account', async () => {
    await request(app.getHttpServer()).get('/api/v1/users/me').expect(401);

    const email = nextEmail(emails);
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ fullName: 'Inactive Later', email, password })
      .expect(201);
    const loggedIn = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);

    await prisma.user.update({ where: { email }, data: { isActive: false } });

    const response = await request(app.getHttpServer())
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${loggedIn.body.data.accessToken}`)
      .expect(401);

    expect(response.body.message).toBe(INVALID_SESSION_MESSAGE);
    expect(JSON.stringify(response.body)).not.toContain('password');
  }, 30000);
});

function nextEmail(emails: string[]) {
  const email = `dev1users${Date.now()}${Math.floor(Math.random() * 100000)}@gm.uit.edu.vn`;
  emails.push(email);
  return email;
}
