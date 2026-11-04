import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { App } from 'supertest/types';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter.js';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor.js';
import { PrismaService } from '../src/core/database/prisma.service.js';
import { AppModule } from '../src/app.module.js';
import { INVALID_CREDENTIALS_MESSAGE } from '../src/modules/auth/constants/auth.constants.js';

describe('Auth HTTP (e2e)', () => {
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

  it('stores a bcrypt hash and logs the new student in', async () => {
    const email = nextEmail(emails);

    const registered = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ fullName: 'Nguyen Van A', email, password })
      .expect(201);

    expect(registered.body.data.user).toMatchObject({
      email,
      role: Role.STUDENT,
      departmentId: null,
      isActive: true,
    });
    expect(registered.body.data.user.password).toBeUndefined();

    const stored = await prisma.user.findUnique({ where: { email } });
    expect(stored?.password).not.toBe(password);
    expect(stored?.password.startsWith('$2')).toBe(true);
    expect(stored?.role).toBe(Role.STUDENT);
    expect(stored?.departmentId).toBeNull();
    expect(stored?.isActive).toBe(true);
    await expect(bcrypt.compare(password, stored!.password)).resolves.toBe(true);

    const loggedIn = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);

    expect(loggedIn.body.data.accessToken).toEqual(expect.any(String));
    expect(loggedIn.body.data.user.password).toBeUndefined();
    expect(JSON.stringify(loggedIn.body)).not.toContain(stored!.password);
  }, 30000);

  it('does not issue a token for an inactive account', async () => {
    const email = nextEmail(emails);
    await prisma.user.create({
      data: {
        email,
        password: await bcrypt.hash(password, 12),
        fullName: 'Inactive Student',
        role: Role.STUDENT,
        departmentId: null,
        isActive: false,
      },
    });

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(401);

    expect(response.body.message).toBe(INVALID_CREDENTIALS_MESSAGE);
    expect(JSON.stringify(response.body)).not.toContain('accessToken');
  }, 30000);
});

function nextEmail(emails: string[]) {
  const email = `dev1auth${Date.now()}${Math.floor(Math.random() * 100000)}@gm.uit.edu.vn`;
  emails.push(email);
  return email;
}
