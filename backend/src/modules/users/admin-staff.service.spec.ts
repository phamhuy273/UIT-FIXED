import { ConflictException, NotFoundException } from '@nestjs/common';
import { IncidentStatus, Prisma, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../core/database/prisma.service.js';
import {
  EMAIL_ALREADY_USED_MESSAGE,
  PASSWORD_POLICY_MESSAGE,
} from '../auth/constants/auth.constants.js';
import {
  AdminStaffService,
  STAFF_DEPARTMENT_BUSY_MESSAGE,
  STAFF_DEPARTMENT_INACTIVE_MESSAGE,
  STAFF_DEPARTMENT_NOT_FOUND_MESSAGE,
  STAFF_IN_USE_MESSAGE,
  STAFF_STILL_ACTIVE_MESSAGE,
} from './admin-staff.service.js';
import { STAFF_EMAIL_MESSAGE } from './dto/create-staff.dto.js';

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

const openAssignmentWhere = {
  assigneeId: 4,
  isCurrent: true,
  incident: { status: { in: [IncidentStatus.ASSIGNED, IncidentStatus.IN_PROGRESS] } },
};

describe('AdminStaffService', () => {
  const departmentRow = { id: 3, name: 'Phòng Điện', isActive: true };
  const row = (overrides: Record<string, unknown> = {}) => ({
    id: 4,
    email: 'staff@gm.uit.edu.vn',
    fullName: 'Nguyen Van A',
    role: Role.TECH_STAFF,
    avatarUrl: null,
    departmentId: 3,
    department: departmentRow,
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    assignmentsReceived: [] as { id: number }[],
    _count: counts,
    ...overrides,
  });

  function setup() {
    const department = {
      findUnique: vi.fn().mockResolvedValue({ id: 3, isActive: true }),
    };
    const incidentAssignment = {
      count: vi.fn().mockResolvedValue(0),
      updateMany: vi.fn(),
    };
    const tx = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          role: Role.TECH_STAFF,
          email: 'staff@gm.uit.edu.vn',
          departmentId: 3,
        }),
        update: vi.fn().mockResolvedValue(row()),
      },
      department,
      incidentAssignment,
    };
    const prisma = {
      $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)),
      user: {
        findMany: vi.fn().mockResolvedValue([row({ _count: { ...counts, assignmentsReceived: 2 }, assignmentsReceived: [{ id: 9 }] })]),
        findFirst: vi.fn().mockResolvedValue(row()),
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue(row()),
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      department,
      incidentAssignment,
    };
    return { tx, prisma, service: new AdminStaffService(prisma as unknown as PrismaService) };
  }

  it('lists only tech staff and hides the password hash', async () => {
    const { prisma, service } = setup();
    const [staff] = await service.list();
    expect(prisma.user.findMany.mock.calls[0][0].where).toEqual({ role: Role.TECH_STAFF });
    expect(prisma.user.findMany.mock.calls[0][0].select.password).toBeUndefined();
    expect(staff).toMatchObject({
      id: 4,
      role: Role.TECH_STAFF,
      departmentId: 3,
      referenceCount: 2,
      openAssignmentCount: 1,
    });
    expect(staff).not.toHaveProperty('password');
    expect(staff).not.toHaveProperty('_count');
    expect(staff).not.toHaveProperty('assignmentsReceived');
  });

  it('returns 404 when the id is not tech staff', async () => {
    const { prisma, service } = setup();
    prisma.user.findFirst.mockResolvedValue(null);
    await expect(service.getById(9)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.user.findFirst.mock.calls[0][0].where).toEqual({ id: 9, role: Role.TECH_STAFF });
  });

  it('creates an active staff account in the chosen department and ignores privileged fields', async () => {
    const { prisma, service } = setup();
    const result = await service.create({
      fullName: '  Nguyen Van A  ',
      email: ' Staff@GM.UIT.EDU.VN ',
      password: 'Secret12',
      departmentId: 3,
      role: Role.ADMIN,
      isActive: false,
    } as never);

    const data = prisma.user.create.mock.calls[0][0].data;
    expect(data).toMatchObject({
      email: 'staff@gm.uit.edu.vn',
      fullName: 'Nguyen Van A',
      role: Role.TECH_STAFF,
      departmentId: 3,
      isActive: true,
    });
    expect(data.password).not.toBe('Secret12');
    expect(data.password.split('$')[2]).toBe('12');
    await expect(bcrypt.compare('Secret12', data.password)).resolves.toBe(true);
    expect(prisma.user.create.mock.calls[0][0].select.password).toBeUndefined();
    expect(result).not.toHaveProperty('password');
    expect(JSON.stringify(result)).not.toContain('Secret12');
    expect(prisma.incidentAssignment.updateMany).not.toHaveBeenCalled();
  });

  it('rejects a non-UIT email, a weak password, and a missing department before writing', async () => {
    const { prisma, service } = setup();
    await expect(service.create({
      fullName: 'Nguyen Van A',
      email: 'staff@gmail.com',
      password: 'Secret12',
      departmentId: 3,
    })).rejects.toMatchObject({ message: STAFF_EMAIL_MESSAGE });
    await expect(service.create({
      fullName: 'Nguyen Van A',
      email: 'staff@gm.uit.edu.vn',
      password: 'onlyletters',
      departmentId: 3,
    })).rejects.toMatchObject({ message: PASSWORD_POLICY_MESSAGE });
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('rejects an inactive or unknown department before writing', async () => {
    const { prisma, service } = setup();
    prisma.department.findUnique.mockResolvedValueOnce({ id: 9, isActive: false });
    await expect(service.create({
      fullName: 'Nguyen Van A',
      email: 'staff@gm.uit.edu.vn',
      password: 'Secret12',
      departmentId: 9,
    })).rejects.toMatchObject({ message: STAFF_DEPARTMENT_INACTIVE_MESSAGE });

    prisma.department.findUnique.mockResolvedValueOnce(null);
    await expect(service.create({
      fullName: 'Nguyen Van A',
      email: 'staff@gm.uit.edu.vn',
      password: 'Secret12',
      departmentId: 99,
    })).rejects.toMatchObject({ message: STAFF_DEPARTMENT_NOT_FOUND_MESSAGE });
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('rejects an email that is already registered', async () => {
    const { prisma, service } = setup();
    prisma.user.findUnique.mockResolvedValue({ id: 1 });
    await expect(service.create({
      fullName: 'Nguyen Van A',
      email: 'staff@gm.uit.edu.vn',
      password: 'Secret12',
      departmentId: 3,
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
      email: 'staff@gm.uit.edu.vn',
      password: 'Secret12',
      departmentId: 3,
    })).rejects.toBeInstanceOf(ConflictException);
  });

  it('updates name, email, status and password without rewriting assignments', async () => {
    const { tx, service } = setup();
    tx.user.findUnique
      .mockResolvedValueOnce({ role: Role.TECH_STAFF, email: 'old@gm.uit.edu.vn', departmentId: 3 })
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
    expect(tx.incidentAssignment.count).not.toHaveBeenCalled();
    expect(tx.incidentAssignment.updateMany).not.toHaveBeenCalled();

    tx.user.findUnique.mockResolvedValue({ role: Role.TECH_STAFF, email: 'staff@gm.uit.edu.vn', departmentId: 3 });
    const result = await service.update(4, { password: 'FreshPass9' });
    const stored = tx.user.update.mock.calls[1][0].data.password as string;
    expect(stored.split('$')[2]).toBe('12');
    await expect(bcrypt.compare('FreshPass9', stored)).resolves.toBe(true);
    expect(result).not.toHaveProperty('password');
    expect(JSON.stringify(result)).not.toContain('FreshPass9');
  });

  it('moves a staff member only when the new department is active and no incident is still assigned', async () => {
    const { tx, service } = setup();
    tx.department.findUnique.mockResolvedValue({ id: 8, isActive: true });
    await service.update(4, { departmentId: 8 });
    expect(tx.incidentAssignment.count).toHaveBeenCalledWith({ where: openAssignmentWhere });
    expect(tx.user.update.mock.calls[0][0].data.departmentId).toBe(8);
    expect(tx.incidentAssignment.updateMany).not.toHaveBeenCalled();
  });

  it('keeps the current department when the submitted department is unchanged', async () => {
    const { tx, service } = setup();
    await service.update(4, { departmentId: 3, fullName: 'Nguyen Van A' });
    expect(tx.incidentAssignment.count).not.toHaveBeenCalled();
    expect(tx.department.findUnique).not.toHaveBeenCalled();
    expect(tx.user.update.mock.calls[0][0].data).not.toHaveProperty('departmentId');
  });

  it('blocks a department change while a current assignment is still open', async () => {
    const { tx, service } = setup();
    tx.incidentAssignment.count.mockResolvedValue(2);
    tx.department.findUnique.mockResolvedValue({ id: 8, isActive: true });
    await expect(service.update(4, { departmentId: 8 })).rejects.toMatchObject({
      message: STAFF_DEPARTMENT_BUSY_MESSAGE,
    });
    expect(tx.user.update).not.toHaveBeenCalled();
    expect(tx.incidentAssignment.updateMany).not.toHaveBeenCalled();
  });

  it('still allows locking a staff member who has open assignments', async () => {
    const { tx, service } = setup();
    tx.incidentAssignment.count.mockResolvedValue(2);
    await service.update(4, { isActive: false });
    expect(tx.user.update.mock.calls[0][0].data).toEqual({ isActive: false });
    expect(tx.incidentAssignment.count).not.toHaveBeenCalled();
    expect(tx.incidentAssignment.updateMany).not.toHaveBeenCalled();
  });

  it('rejects a move into an inactive department before writing', async () => {
    const { tx, service } = setup();
    tx.department.findUnique.mockResolvedValue({ id: 8, isActive: false });
    await expect(service.update(4, { departmentId: 8 })).rejects.toMatchObject({
      message: STAFF_DEPARTMENT_INACTIVE_MESSAGE,
    });
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it('does not treat another role as a staff account', async () => {
    const { tx, service } = setup();
    tx.user.findUnique.mockResolvedValue({ role: Role.STUDENT, email: 'student@gm.uit.edu.vn', departmentId: null });
    await expect(service.update(2, { fullName: 'Student' })).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it('deletes only an inactive staff account with no business history', async () => {
    const { prisma, service } = setup();
    expect(await service.remove(4)).toEqual({ id: 4 });
    expect(prisma.user.deleteMany.mock.calls[0][0].where).toMatchObject({
      id: 4,
      role: Role.TECH_STAFF,
      isActive: false,
      submittedReports: { none: {} },
      assignmentsReceived: { none: {} },
      incidentHistories: { none: {} },
      uploadedMedia: { none: {} },
    });
  });

  it.each([
    ['unknown', null, NotFoundException, undefined],
    ['student', { role: Role.STUDENT, isActive: false }, NotFoundException, undefined],
    ['active staff', { role: Role.TECH_STAFF, isActive: true }, ConflictException, STAFF_STILL_ACTIVE_MESSAGE],
    ['staff with history', { role: Role.TECH_STAFF, isActive: false }, ConflictException, STAFF_IN_USE_MESSAGE],
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
    await expect(service.remove(4)).rejects.toMatchObject({ message: STAFF_IN_USE_MESSAGE });
  });
});
