import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../core/database/prisma.service.js';
import {
  EMAIL_ALREADY_USED_MESSAGE,
  PASSWORD_POLICY_MESSAGE,
  UIT_STUDENT_EMAIL_MESSAGE,
} from '../auth/constants/auth.constants.js';
import {
  AdminStudentsService,
  STUDENT_IN_USE_MESSAGE,
  STUDENT_STILL_ACTIVE_MESSAGE,
} from './admin-students.service.js';

const counts = {
  submittedReports: 0,
  reportHistories: 0,
  assignmentsMade: 0,
  assignmentsReceived: 0,
  progressNotes: 0,
  resolutions: 0,
  incidentHistories: 0,
  uploadedMedia: 0,
};

describe('AdminStudentsService', () => {
  const row = (overrides: Record<string, unknown> = {}) => ({
    id: 4,
    email: 'student@gm.uit.edu.vn',
    fullName: 'Nguyen Van A',
    role: Role.STUDENT,
    avatarUrl: null,
    departmentId: null,
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    _count: counts,
    ...overrides,
  });

  function setup() {
    const tx = {
      user: {
        findUnique: vi.fn().mockResolvedValue({ role: Role.STUDENT, email: 'student@gm.uit.edu.vn' }),
        update: vi.fn().mockResolvedValue(row()),
      },
    };
    const prisma = {
      $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)),
      user: {
        findMany: vi.fn().mockResolvedValue([row({ _count: { ...counts, submittedReports: 2 } })]),
        findFirst: vi.fn().mockResolvedValue(row()),
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue(row()),
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };
    return { tx, prisma, service: new AdminStudentsService(prisma as unknown as PrismaService) };
  }

  it('lists only students and hides the password hash', async () => {
    const { prisma, service } = setup();
    const [student] = await service.list();
    expect(prisma.user.findMany.mock.calls[0][0].where).toEqual({ role: Role.STUDENT });
    expect(prisma.user.findMany.mock.calls[0][0].select.password).toBeUndefined();
    expect(student).toMatchObject({ id: 4, role: Role.STUDENT, referenceCount: 2 });
    expect(student).not.toHaveProperty('password');
    expect(student).not.toHaveProperty('_count');
  });

  it('returns 404 when the id is not a student', async () => {
    const { prisma, service } = setup();
    prisma.user.findFirst.mockResolvedValue(null);
    await expect(service.getById(9)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.user.findFirst.mock.calls[0][0].where).toEqual({ id: 9, role: Role.STUDENT });
  });

  it('creates an active student with a bcrypt cost of 12 and ignores privileged fields', async () => {
    const { prisma, service } = setup();
    const result = await service.create({
      fullName: '  Nguyen Van A  ',
      email: ' Student@GM.UIT.EDU.VN ',
      password: 'Secret12',
      role: Role.ADMIN,
      departmentId: 3,
      isActive: false,
    } as never);

    const data = prisma.user.create.mock.calls[0][0].data;
    expect(data).toMatchObject({
      email: 'student@gm.uit.edu.vn',
      fullName: 'Nguyen Van A',
      role: Role.STUDENT,
      departmentId: null,
      isActive: true,
    });
    expect(data.password).not.toBe('Secret12');
    expect(data.password.split('$')[2]).toBe('12');
    await expect(bcrypt.compare('Secret12', data.password)).resolves.toBe(true);
    expect(prisma.user.create.mock.calls[0][0].select.password).toBeUndefined();
    expect(result).not.toHaveProperty('password');
    expect(JSON.stringify(result)).not.toContain('Secret12');
  });

  it('rejects a non-student email before writing', async () => {
    const { prisma, service } = setup();
    await expect(service.create({
      fullName: 'Nguyen Van A',
      email: 'student@gmail.com',
      password: 'Secret12',
    })).rejects.toMatchObject({ message: UIT_STUDENT_EMAIL_MESSAGE });
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('rejects a weak password before writing', async () => {
    const { prisma, service } = setup();
    await expect(service.create({
      fullName: 'Nguyen Van A',
      email: 'student@gm.uit.edu.vn',
      password: 'onlyletters',
    })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.create({
      fullName: 'Nguyen Van A',
      email: 'student@gm.uit.edu.vn',
      password: 'onlyletters',
    })).rejects.toMatchObject({ message: PASSWORD_POLICY_MESSAGE });
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('rejects an email that is already registered', async () => {
    const { prisma, service } = setup();
    prisma.user.findUnique.mockResolvedValue({ id: 1 });
    await expect(service.create({
      fullName: 'Nguyen Van A',
      email: 'student@gm.uit.edu.vn',
      password: 'Secret12',
    })).rejects.toMatchObject({ message: EMAIL_ALREADY_USED_MESSAGE });
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('maps a concurrent unique violation to the email conflict', async () => {
    const { prisma, service } = setup();
    prisma.user.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('unique', {
      code: 'P2002',
      clientVersion: 'test',
    }));
    await expect(service.create({
      fullName: 'Nguyen Van A',
      email: 'student@gm.uit.edu.vn',
      password: 'Secret12',
    })).rejects.toBeInstanceOf(ConflictException);
  });

  it('updates name, email and status without touching role, department or password', async () => {
    const { tx, service } = setup();
    tx.user.findUnique
      .mockResolvedValueOnce({ role: Role.STUDENT, email: 'old@gm.uit.edu.vn' })
      .mockResolvedValueOnce(null);
    await service.update(4, { fullName: ' Tran Thi B ', email: ' New@GM.UIT.EDU.VN ', isActive: false });
    expect(tx.user.update.mock.calls[0][0].data).toEqual({
      fullName: 'Tran Thi B',
      email: 'new@gm.uit.edu.vn',
      isActive: false,
    });
    expect(tx.user.update.mock.calls[0][0].data).not.toHaveProperty('password');
    expect(tx.user.update.mock.calls[0][0].data).not.toHaveProperty('role');
    expect(tx.user.update.mock.calls[0][0].data).not.toHaveProperty('departmentId');
  });

  it('replaces the password with a bcrypt cost of 12 and does not return it', async () => {
    const { tx, service } = setup();
    tx.user.findUnique.mockResolvedValue({ role: Role.STUDENT, email: 'student@gm.uit.edu.vn' });
    const result = await service.update(4, { password: 'FreshPass9' });
    const stored = tx.user.update.mock.calls[0][0].data.password as string;
    expect(stored).not.toBe('FreshPass9');
    expect(stored.split('$')[2]).toBe('12');
    await expect(bcrypt.compare('FreshPass9', stored)).resolves.toBe(true);
    expect(result).not.toHaveProperty('password');
    expect(JSON.stringify(result)).not.toContain('FreshPass9');
  });

  it('rejects a weak replacement password before writing', async () => {
    const { tx, service } = setup();
    await expect(service.update(4, { password: 'onlyletters' })).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it('does not treat another role as a student account', async () => {
    const { tx, service } = setup();
    tx.user.findUnique.mockResolvedValue({ role: Role.ADMIN, email: 'admin@gm.uit.edu.vn' });
    await expect(service.update(2, { fullName: 'Admin' })).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it('rejects an email owned by another account', async () => {
    const { tx, service } = setup();
    tx.user.findUnique
      .mockResolvedValueOnce({ role: Role.STUDENT, email: 'old@gm.uit.edu.vn' })
      .mockResolvedValueOnce({ id: 8 });
    await expect(service.update(4, { email: 'taken@gm.uit.edu.vn' })).rejects.toBeInstanceOf(ConflictException);
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it('deletes only an inactive student with no business history', async () => {
    const { prisma, service } = setup();
    expect(await service.remove(4)).toEqual({ id: 4 });
    expect(prisma.user.deleteMany.mock.calls[0][0].where).toMatchObject({
      id: 4,
      role: Role.STUDENT,
      isActive: false,
      submittedReports: { none: {} },
      reportHistories: { none: {} },
      uploadedMedia: { none: {} },
    });
  });

  it.each([
    ['unknown', null, NotFoundException, undefined],
    ['admin', { role: Role.ADMIN, isActive: false }, NotFoundException, undefined],
    ['active student', { role: Role.STUDENT, isActive: true }, ConflictException, STUDENT_STILL_ACTIVE_MESSAGE],
    ['student with history', { role: Role.STUDENT, isActive: false }, ConflictException, STUDENT_IN_USE_MESSAGE],
  ])('refuses to delete an %s', async (_label, found, error, message) => {
    const { prisma, service } = setup();
    prisma.user.deleteMany.mockResolvedValue({ count: 0 });
    prisma.user.findUnique.mockResolvedValue(found);
    const rejection = service.remove(4);
    await expect(rejection).rejects.toBeInstanceOf(error);
    if (message) {
      await expect(rejection).rejects.toMatchObject({ message });
    }
  });

  it('maps a concurrent foreign-key violation to 409', async () => {
    const { prisma, service } = setup();
    prisma.user.deleteMany.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('fk', {
      code: 'P2003',
      clientVersion: 'test',
    }));
    await expect(service.remove(4)).rejects.toMatchObject({ message: STUDENT_IN_USE_MESSAGE });
  });
});
