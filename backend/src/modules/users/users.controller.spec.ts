import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { Role } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { AllExceptionsFilter } from '../../common/filters/http-exception.filter.js';
import { TransformInterceptor } from '../../common/interceptors/transform.interceptor.js';
import { PrismaService } from '../../core/database/prisma.service.js';
import { INVALID_SESSION_MESSAGE } from '../auth/constants/auth.constants.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { JwtStrategy } from '../auth/strategies/jwt.strategy.js';
import { publicUserSelect, PublicUser } from '../auth/utils/public-user.js';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

const JWT_SECRET = 'users-me-test-jwt-secret';

describe('GET /users/me', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;
  const users = new Map<number, PublicUser>();
  const prisma = {
    user: {
      findUnique: vi.fn(async ({ where }: { where: { id: number } }) => users.get(where.id) ?? null),
    },
  };

  const student = buildUser(1, Role.STUDENT, null);
  const admin = buildUser(2, Role.ADMIN, null);
  const techStaff = buildUser(3, Role.TECH_STAFF, 8);
  const inactive = buildUser(4, Role.STUDENT, null, false);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({
          secret: JWT_SECRET,
          signOptions: { expiresIn: '15m' },
        }),
      ],
      controllers: [UsersController],
      providers: [
        UsersService,
        JwtStrategy,
        JwtAuthGuard,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => (key === 'JWT_SECRET' ? JWT_SECRET : undefined),
          },
        },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalInterceptors(new TransformInterceptor());
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
    jwtService = app.get(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    users.clear();
    for (const user of [student, admin, techStaff, inactive]) {
      users.set(user.id, user);
    }
    vi.clearAllMocks();
  });

  it.each([
    ['STUDENT', student],
    ['ADMIN', admin],
    ['TECH_STAFF', techStaff],
  ])('returns the %s identified by the token', async (_label, user) => {
    const token = await jwtService.signAsync({ sub: user.id, role: Role.STUDENT });

    const response = await request(app.getHttpServer())
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.data).toMatchObject({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      avatarUrl: null,
      departmentId: user.departmentId,
      isActive: true,
    });
    expect(response.body.data.password).toBeUndefined();
    expect(JSON.stringify(response.body)).not.toContain('password');
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: user.id },
      select: publicUserSelect,
    });
  });

  it('ignores a userId supplied by the client', async () => {
    const token = await jwtService.signAsync({ sub: student.id, role: Role.STUDENT });

    const response = await request(app.getHttpServer())
      .get('/api/v1/users/me')
      .query({ userId: admin.id })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.data.id).toBe(student.id);
    const requestedIds = prisma.user.findUnique.mock.calls.map((call) => call[0].where.id);
    expect(requestedIds).toEqual([student.id, student.id]);
  });

  it('has no route for reading another profile by id', async () => {
    const token = await jwtService.signAsync({ sub: admin.id, role: Role.ADMIN });

    await request(app.getHttpServer())
      .get(`/api/v1/users/${student.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });

  it('rejects a request without a token', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/users/me').expect(401);
    expect(response.body.message).toBe(INVALID_SESSION_MESSAGE);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('rejects an inactive account', async () => {
    const token = await jwtService.signAsync({ sub: inactive.id, role: Role.STUDENT });

    const response = await request(app.getHttpServer())
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);

    expect(response.body.message).toBe(INVALID_SESSION_MESSAGE);
    expect(response.body.data).toBeUndefined();
  });
});

function buildUser(
  id: number,
  role: Role,
  departmentId: number | null,
  isActive = true,
): PublicUser {
  return {
    id,
    email: `user${id}@gm.uit.edu.vn`,
    fullName: `User ${id}`,
    role,
    avatarUrl: null,
    departmentId,
    isActive,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  };
}
