import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { App } from 'supertest/types';
import { AllExceptionsFilter } from '../../common/filters/http-exception.filter.js';
import { TransformInterceptor } from '../../common/interceptors/transform.interceptor.js';
import { PrismaService } from '../../core/database/prisma.service.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import {
  EMAIL_ALREADY_USED_MESSAGE,
  INVALID_CREDENTIALS_MESSAGE,
  INVALID_EMAIL_MESSAGE,
  PASSWORD_POLICY_MESSAGE,
  REGISTER_SUCCESS_MESSAGE,
  UIT_STUDENT_EMAIL_MESSAGE,
} from './constants/auth.constants.js';

const password = 'Secret12';

describe('AuthController', () => {
  let app: INestApplication<App>;
  const prisma = {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  };
  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: 'unit-test-jwt-secret-not-for-production',
          signOptions: { expiresIn: '15m' },
        }),
      ],
      controllers: [AuthController],
      providers: [AuthService, { provide: PrismaService, useValue: prisma }],
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
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockImplementation(async ({ data }) => ({
      id: 1,
      email: data.email,
      fullName: data.fullName,
      role: data.role,
      avatarUrl: null,
      departmentId: data.departmentId,
      isActive: data.isActive,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    }));
  });

  describe('POST /api/v1/auth/register', () => {
    it('registers a UIT student and hides the password', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          fullName: ' Nguyen Van A ',
          email: ' Student@GM.UIT.EDU.VN ',
          password,
        })
        .expect(201);

      expect(response.body.data.message).toBe(REGISTER_SUCCESS_MESSAGE);
      expect(response.body.data.user).toMatchObject({
        email: 'student@gm.uit.edu.vn',
        fullName: 'Nguyen Van A',
        role: Role.STUDENT,
        departmentId: null,
        isActive: true,
      });
      expect(response.body.data.user.password).toBeUndefined();
      expect(JSON.stringify(response.body)).not.toContain(password);

      const storedPassword = prisma.user.create.mock.calls[0][0].data.password as string;
      expect(storedPassword).not.toBe(password);
      await expect(bcrypt.compare(password, storedPassword)).resolves.toBe(true);
    });

    it.each([
      'student@gmail.com',
      'student@uit.edu.vn',
      'student@gm.uit.edu.vn.fake.com',
      'student@fake-gm.uit.edu.vn',
      'student@sub.gm.uit.edu.vn',
    ])('rejects %s', async (email) => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ fullName: 'Nguyen Van A', email, password })
        .expect(400);

      expect(messageText(response.body.message)).toContain(UIT_STUDENT_EMAIL_MESSAGE);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('rejects an email that is not a valid address', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ fullName: 'Nguyen Van A', email: 'not-an-email', password })
        .expect(400);

      expect(messageText(response.body.message)).toContain(INVALID_EMAIL_MESSAGE);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('rejects a weak password', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          fullName: 'Nguyen Van A',
          email: 'student@gm.uit.edu.vn',
          password: 'onlyletters',
        })
        .expect(400);

      expect(messageText(response.body.message)).toContain(PASSWORD_POLICY_MESSAGE);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('rejects a duplicate email', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 2 });

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ fullName: 'Nguyen Van A', email: 'student@gm.uit.edu.vn', password })
        .expect(409);

      expect(messageText(response.body.message)).toContain(EMAIL_ALREADY_USED_MESSAGE);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it.each(['role', 'departmentId', 'isActive'])(
      'rejects a client-supplied %s',
      async (field) => {
        const response = await request(app.getHttpServer())
          .post('/api/v1/auth/register')
          .send({
            fullName: 'Nguyen Van A',
            email: 'student@gm.uit.edu.vn',
            password,
            [field]: field === 'departmentId' ? 1 : field === 'isActive' ? false : 'ADMIN',
          })
          .expect(400);

        expect(messageText(response.body.message).toLowerCase()).toContain(field.toLowerCase());
        expect(prisma.user.create).not.toHaveBeenCalled();
      },
    );
  });

  describe('POST /api/v1/auth/login', () => {
    const hash = bcrypt.hashSync(password, 12);
    const user = {
      id: 9,
      email: 'student@gm.uit.edu.vn',
      password: hash,
      fullName: 'Nguyen Van A',
      role: Role.STUDENT,
      avatarUrl: null,
      departmentId: null,
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };

    it('returns an access token without the password hash', async () => {
      prisma.user.findUnique.mockResolvedValue(user);

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: ' Student@GM.UIT.EDU.VN ', password })
        .expect(200);

      const payload = decodePayload(response.body.data.accessToken);
      expect(payload).toMatchObject({ sub: 9, role: Role.STUDENT });
      expect(payload).not.toHaveProperty('email');
      expect(payload).not.toHaveProperty('password');
      expect(response.body.data.user.password).toBeUndefined();
      expect(JSON.stringify(response.body)).not.toContain(hash);
      expect(JSON.stringify(response.body)).not.toContain(password);
    });

    it.each([
      ['unknown email', null, password],
      ['wrong password', user, 'WrongPass1'],
      ['inactive account', { ...user, isActive: false }, password],
    ])('rejects %s without a token', async (_label, storedUser, attempt) => {
      prisma.user.findUnique.mockResolvedValue(storedUser);

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'student@gm.uit.edu.vn', password: attempt })
        .expect(401);

      expect(messageText(response.body.message)).toBe(INVALID_CREDENTIALS_MESSAGE);
      expect(response.body.data).toBeUndefined();
      expect(JSON.stringify(response.body)).not.toContain('accessToken');
    });
  });
});

function messageText(message: unknown) {
  return Array.isArray(message) ? message.join(' ') : String(message);
}

function decodePayload(token: string) {
  const segment = token.split('.')[1];
  return JSON.parse(Buffer.from(segment, 'base64url').toString('utf8')) as Record<string, unknown>;
}
