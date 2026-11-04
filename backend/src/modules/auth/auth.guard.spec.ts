import { Controller, Get, INestApplication, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { Role } from '@prisma/client';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { App } from 'supertest/types';
import { AllExceptionsFilter } from '../../common/filters/http-exception.filter.js';
import { PrismaService } from '../../core/database/prisma.service.js';
import { FORBIDDEN_MESSAGE, INVALID_SESSION_MESSAGE } from './constants/auth.constants.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { Public } from './decorators/public.decorator.js';
import { Roles } from './decorators/roles.decorator.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { RolesGuard } from './guards/roles.guard.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { PublicUser } from './utils/public-user.js';

const JWT_SECRET = 'guard-test-jwt-secret';

@Controller('access')
class AccessController {
  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: PublicUser) {
    return user;
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  admin(@CurrentUser() user: PublicUser) {
    return { role: user.role };
  }

  @Get('operators')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TECH_STAFF)
  operators(@CurrentUser() user: PublicUser) {
    return { role: user.role };
  }

  @Get('open')
  open() {
    return { open: true };
  }
}

@Controller('admin-area')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
class AdminAreaController {
  @Public()
  @Get('health')
  health() {
    return { ok: true };
  }

  @Get('dashboard')
  dashboard() {
    return { ok: true };
  }
}

describe('JWT guards', () => {
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
  const techStaff = buildUser(3, Role.TECH_STAFF, 10);
  const inactive = buildUser(4, Role.ADMIN, null, false);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({
          secret: JWT_SECRET,
          signOptions: { expiresIn: '15m' },
        }),
      ],
      controllers: [AccessController, AdminAreaController],
      providers: [
        JwtStrategy,
        JwtAuthGuard,
        RolesGuard,
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

  it('allows a public route without a token', async () => {
    await request(app.getHttpServer()).get('/api/v1/access/open').expect(200);
  });

  it('allows a @Public route when the controller requires an admin token', async () => {
    await request(app.getHttpServer()).get('/api/v1/admin-area/health').expect(200);
  });

  it('rejects a protected route without a token', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/access/me').expect(401);
    expect(response.body.message).toBe(INVALID_SESSION_MESSAGE);
  });

  it.each(['not-a-token', 'Bearer', 'abc.def.ghi'])(
    'rejects a malformed token %s',
    async (headerValue) => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/access/me')
        .set('Authorization', headerValue.startsWith('Bearer') ? headerValue : `Bearer ${headerValue}`)
        .expect(401);

      expect(response.body.message).toBe(INVALID_SESSION_MESSAGE);
    },
  );

  it('rejects a token signed with another secret', async () => {
    const token = jwt.sign({ sub: student.id, role: Role.STUDENT }, 'another-secret');

    const response = await request(app.getHttpServer())
      .get('/api/v1/access/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);

    expect(response.body.message).toBe(INVALID_SESSION_MESSAGE);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('rejects an expired token', async () => {
    const token = await jwtService.signAsync(
      { sub: student.id, role: Role.STUDENT },
      { expiresIn: -1 },
    );

    const response = await request(app.getHttpServer())
      .get('/api/v1/access/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);

    expect(response.body.message).toBe(INVALID_SESSION_MESSAGE);
  });

  it('rejects a token whose subject is not a user id', async () => {
    const token = jwt.sign({ sub: 'student', role: Role.ADMIN }, JWT_SECRET);

    await request(app.getHttpServer())
      .get('/api/v1/access/admin')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);

    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('returns the current database user and omits the password', async () => {
    const token = await jwtService.signAsync({ sub: student.id, role: Role.ADMIN });

    const response = await request(app.getHttpServer())
      .get('/api/v1/access/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body).toMatchObject({
      id: student.id,
      email: student.email,
      role: Role.STUDENT,
    });
    expect(response.body.password).toBeUndefined();
    expect(JSON.stringify(response.body)).not.toContain('password');
  });

  it('rejects a token after the account becomes inactive', async () => {
    const token = await jwtService.signAsync({ sub: inactive.id, role: Role.ADMIN });

    const response = await request(app.getHttpServer())
      .get('/api/v1/access/admin')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);

    expect(response.body.message).toBe(INVALID_SESSION_MESSAGE);
  });

  it('rejects a token after the account is removed', async () => {
    users.delete(student.id);
    const token = await jwtService.signAsync({ sub: student.id, role: Role.STUDENT });

    await request(app.getHttpServer())
      .get('/api/v1/access/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
  });

  it.each([
    ['STUDENT', student],
    ['TECH_STAFF', techStaff],
  ])('denies %s on an admin route', async (_label, user) => {
    const token = await jwtService.signAsync({ sub: user.id, role: user.role });

    const response = await request(app.getHttpServer())
      .get('/api/v1/access/admin')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    expect(response.body.message).toBe(FORBIDDEN_MESSAGE);
  });

  it('allows ADMIN on an admin route', async () => {
    const token = await jwtService.signAsync({ sub: admin.id, role: Role.STUDENT });

    const response = await request(app.getHttpServer())
      .get('/api/v1/access/admin')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.role).toBe(Role.ADMIN);
  });

  it('uses the role stored in the database when the token role is stale', async () => {
    const token = await jwtService.signAsync({ sub: student.id, role: Role.ADMIN });

    const response = await request(app.getHttpServer())
      .get('/api/v1/access/admin')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    expect(response.body.message).toBe(FORBIDDEN_MESSAGE);
  });

  it.each([
    ['ADMIN', admin],
    ['TECH_STAFF', techStaff],
  ])('allows %s on a multi-role route', async (_label, user) => {
    const token = await jwtService.signAsync({ sub: user.id, role: Role.STUDENT });

    const response = await request(app.getHttpServer())
      .get('/api/v1/access/operators')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.role).toBe(user.role);
  });

  it('denies STUDENT on a multi-role route', async () => {
    const token = await jwtService.signAsync({ sub: student.id, role: Role.STUDENT });

    await request(app.getHttpServer())
      .get('/api/v1/access/operators')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('returns 401 instead of 403 when the admin route has no token', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/admin-area/dashboard').expect(401);
    expect(response.body.message).toBe(INVALID_SESSION_MESSAGE);
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
