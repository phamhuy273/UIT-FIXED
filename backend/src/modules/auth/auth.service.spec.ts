import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma, Role } from '@prisma/client';
import { Test } from '@nestjs/testing';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../../core/database/prisma.service.js';
import { AuthService } from './auth.service.js';
import {
  EMAIL_ALREADY_USED_MESSAGE,
  INVALID_CREDENTIALS_MESSAGE,
  REGISTER_SUCCESS_MESSAGE,
} from './constants/auth.constants.js';

const password = 'Secret12';

describe('AuthService', () => {
  let service: AuthService;
  const prisma = {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  };
  const jwtService = {
    signAsync: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  describe('register', () => {
    it('creates an active student and stores a password hash', async () => {
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

      const result = await service.register({
        fullName: '  Nguyen Van A  ',
        email: '  Student@GM.UIT.EDU.VN ',
        password,
      });

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'student@gm.uit.edu.vn',
            fullName: 'Nguyen Van A',
            role: Role.STUDENT,
            departmentId: null,
            isActive: true,
          }),
        }),
      );
      const storedPassword = prisma.user.create.mock.calls[0][0].data.password as string;
      expect(storedPassword).not.toBe(password);
      expect(storedPassword.startsWith('$2')).toBe(true);
      await expect(bcrypt.compare(password, storedPassword)).resolves.toBe(true);
      expect(result.message).toBe(REGISTER_SUCCESS_MESSAGE);
      expect(result.user).not.toHaveProperty('password');
      expect(JSON.stringify(result)).not.toContain(storedPassword);
    });

    it('rejects an email that is already registered', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 4 });

      await expect(
        service.register({
          fullName: 'Nguyen Van A',
          email: 'student@gm.uit.edu.vn',
          password,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('maps a unique constraint race to the same conflict', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '6.4.1',
        }),
      );

      await expect(
        service.register({
          fullName: 'Nguyen Van A',
          email: 'student@gm.uit.edu.vn',
          password,
        }),
      ).rejects.toThrow(EMAIL_ALREADY_USED_MESSAGE);
    });
  });

  describe('login', () => {
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

    it('returns a JWT and the public user when credentials match', async () => {
      prisma.user.findUnique.mockResolvedValue(user);
      jwtService.signAsync.mockResolvedValue('signed-token');

      const result = await service.login({
        email: ' Student@GM.UIT.EDU.VN ',
        password,
      });

      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: 9,
        role: Role.STUDENT,
      });
      expect(result.accessToken).toBe('signed-token');
      expect(result.user).not.toHaveProperty('password');
      expect(JSON.stringify(result)).not.toContain(hash);
    });

    it.each([
      ['missing user', null, password],
      ['wrong password', user, 'WrongPass1'],
      ['inactive user', { ...user, isActive: false }, password],
    ])('rejects %s with one generic message and no token', async (_label, storedUser, attempt) => {
      prisma.user.findUnique.mockResolvedValue(storedUser);

      await expect(
        service.login({ email: 'student@gm.uit.edu.vn', password: attempt }),
      ).rejects.toThrow(new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE));
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });
  });
});
