import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../core/database/prisma.service.js';
import { MasterDataService } from './master-data.service.js';

describe('MasterDataService', () => {
  it('keeps floorless areas and excludes rooms on hidden or unrelated floors', async () => {
    const location = (id: number, floorId: number | null) => ({
      id, floorId, name: `Location ${id}`, description: null, locationType: null,
    });
    const findMany = vi.fn().mockResolvedValue([{
      id: 1, name: 'Tòa A', description: null,
      floors: [{ id: 10, name: 'Tầng 1', floorNumber: 1 }],
      locations: [location(101, 10), location(102, null), location(103, 99)],
    }]);
    const prisma = { building: { findMany } } as unknown as PrismaService;
    const [building] = await new MasterDataService(prisma).getLocations();

    expect(building.floors[0].locations.map(({ id }) => id)).toEqual([101]);
    expect(building.locations.map(({ id }) => id)).toEqual([102]);
    expect(findMany.mock.calls[0][0].where).toEqual({ isActive: true });
    expect(findMany.mock.calls[0][0].select.floors.where).toEqual({ isActive: true });
    expect(findMany.mock.calls[0][0].select.locations.where).toEqual({ isActive: true });
  });

  it('returns an empty tree when there are no active buildings', async () => {
    const prisma = { building: { findMany: vi.fn().mockResolvedValue([]) } } as unknown as PrismaService;
    expect(await new MasterDataService(prisma).getLocations()).toEqual([]);
  });
});

describe('MasterDataService categories', () => {
  const row = (overrides: Record<string, unknown> = {}) => ({
    id: 7, name: 'Máy chiếu', description: null, isActive: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'), updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    _count: { incidentReports: 3 }, ...overrides,
  });

  function setup() {
    const tx = {
      $executeRaw: vi.fn().mockResolvedValue(1),
      category: {
        findFirst: vi.fn().mockResolvedValue(null),
        findUnique: vi.fn().mockResolvedValue({ id: 7 }),
        create: vi.fn().mockResolvedValue(row()),
        update: vi.fn().mockResolvedValue(row()),
      },
    };
    const prisma = {
      $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)),
      category: {
        findMany: vi.fn().mockResolvedValue([row()]),
        findUnique: vi.fn().mockResolvedValue(row()),
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };
    return { tx, prisma, service: new MasterDataService(prisma as unknown as PrismaService) };
  }

  it('keeps the report-form list limited to active categories', async () => {
    const { prisma, service } = setup();
    await service.getCategories();
    expect(prisma.category.findMany.mock.calls[0][0].where).toEqual({ isActive: true });
  });

  it('lists every category for admins with its report count', async () => {
    const { prisma, service } = setup();
    const [category] = await service.listCategoriesForAdmin();
    expect(prisma.category.findMany.mock.calls[0][0].where).toBeUndefined();
    expect(category).toMatchObject({ id: 7, reportCount: 3 });
    expect(category).not.toHaveProperty('_count');
  });

  it('returns 404 for an unknown category', async () => {
    const { prisma, service } = setup();
    prisma.category.findUnique.mockResolvedValue(null);
    await expect(service.getCategoryForAdmin(99)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('checks names case-insensitively under a lock before creating', async () => {
    const { tx, service } = setup();
    await service.createCategory({ name: 'Máy chiếu', description: '' });
    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
    expect(tx.category.findFirst.mock.calls[0][0].where).toEqual({ name: { equals: 'Máy chiếu', mode: 'insensitive' } });
    expect(tx.category.create.mock.calls[0][0].data).toEqual({ name: 'Máy chiếu', description: null });
  });

  it('rejects a duplicate name without writing', async () => {
    const { tx, service } = setup();
    tx.category.findFirst.mockResolvedValue({ id: 1 });
    await expect(service.createCategory({ name: 'MÁY CHIẾU' })).rejects.toBeInstanceOf(ConflictException);
    expect(tx.category.create).not.toHaveBeenCalled();
  });

  it('excludes the edited category from the duplicate check and leaves omitted fields untouched', async () => {
    const { tx, service } = setup();
    await service.updateCategory(7, { name: 'Máy Chiếu' });
    expect(tx.category.findFirst.mock.calls[0][0].where).toEqual({ name: { equals: 'Máy Chiếu', mode: 'insensitive' }, id: { not: 7 } });
    expect(tx.category.update.mock.calls[0][0].data).toEqual({ name: 'Máy Chiếu', description: undefined, isActive: undefined });
  });

  it('toggles status without a name check', async () => {
    const { tx, service } = setup();
    await service.updateCategory(7, { isActive: false });
    expect(tx.$executeRaw).not.toHaveBeenCalled();
    expect(tx.category.update.mock.calls[0][0].data).toEqual({ name: undefined, description: undefined, isActive: false });
  });

  it('deletes only an inactive category without reports in one conditional statement', async () => {
    const { prisma, service } = setup();
    expect(await service.deleteCategory(7)).toEqual({ id: 7 });
    expect(prisma.category.deleteMany.mock.calls[0][0].where).toEqual({ id: 7, isActive: false, incidentReports: { none: {} } });
  });

  it.each([
    ['unknown', null, NotFoundException],
    ['active', { isActive: true }, ConflictException],
    ['referenced', { isActive: false }, ConflictException],
  ])('refuses to delete an %s category', async (_label, found, error) => {
    const { prisma, service } = setup();
    prisma.category.deleteMany.mockResolvedValue({ count: 0 });
    prisma.category.findUnique.mockResolvedValue(found);
    await expect(service.deleteCategory(7)).rejects.toBeInstanceOf(error);
  });

  it('maps a concurrent foreign-key violation to 409', async () => {
    const { prisma, service } = setup();
    const fkError = new Prisma.PrismaClientKnownRequestError('fk', { code: 'P2003', clientVersion: 'test' });
    prisma.category.deleteMany.mockRejectedValue(fkError);
    await expect(service.deleteCategory(7)).rejects.toBeInstanceOf(ConflictException);
  });

  it('returns 404 when updating an unknown category', async () => {
    const { tx, service } = setup();
    tx.category.findUnique.mockResolvedValue(null);
    await expect(service.updateCategory(99, { isActive: false })).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.category.update).not.toHaveBeenCalled();
  });
});

describe('MasterDataService departments', () => {
  const row = (overrides: Record<string, unknown> = {}) => ({
    id: 3, name: 'Phòng Quản trị', description: null, isActive: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'), updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    _count: { techStaff: 4, assignments: 9, defaultBuildings: 1 }, ...overrides,
  });

  function setup() {
    const groupBy = {
      user: vi.fn().mockResolvedValue([{ departmentId: 3, _count: { _all: 2 } }]),
      incidentAssignment: vi.fn().mockResolvedValue([{ departmentId: 3, _count: { _all: 1 } }]),
    };
    const tx = {
      $executeRaw: vi.fn().mockResolvedValue(1),
      department: {
        findFirst: vi.fn().mockResolvedValue(null),
        findUnique: vi.fn().mockResolvedValue({ id: 3 }),
        create: vi.fn().mockResolvedValue(row()),
        update: vi.fn().mockResolvedValue(row()),
      },
      user: { groupBy: groupBy.user, updateMany: vi.fn(), update: vi.fn() },
      incidentAssignment: { groupBy: groupBy.incidentAssignment, updateMany: vi.fn(), update: vi.fn() },
    };
    const prisma = {
      $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)),
      department: {
        findMany: vi.fn().mockResolvedValue([row()]),
        findUnique: vi.fn().mockResolvedValue(row()),
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      user: { groupBy: groupBy.user, findMany: vi.fn().mockResolvedValue([]) },
      incidentAssignment: { groupBy: groupBy.incidentAssignment },
    };
    return { tx, prisma, groupBy, service: new MasterDataService(prisma as unknown as PrismaService) };
  }

  it('lists every department with active staff, history and ongoing assignment counts', async () => {
    const { prisma, groupBy, service } = setup();
    const [department] = await service.listDepartmentsForAdmin();
    expect(prisma.department.findMany.mock.calls[0][0].where).toBeUndefined();
    expect(groupBy.user.mock.calls[0][0].where).toEqual({ role: 'TECH_STAFF', isActive: true, departmentId: { not: null } });
    expect(groupBy.incidentAssignment.mock.calls[0][0].where).toEqual({ isCurrent: true, incident: { status: { in: ['ASSIGNED', 'IN_PROGRESS'] } } });
    expect(department).toMatchObject({ id: 3, staffCount: 2, memberCount: 4, assignmentCount: 9, activeAssignmentCount: 1, buildingCount: 1 });
    expect(department).not.toHaveProperty('_count');
  });

  it('returns the department detail with its members and 404 for an unknown id', async () => {
    const { prisma, service } = setup();
    const detail = await service.getDepartmentForAdmin(3);
    expect(prisma.user.findMany.mock.calls[0][0].where).toEqual({ departmentId: 3 });
    expect(detail).toMatchObject({ id: 3, staff: [] });
    prisma.department.findUnique.mockResolvedValue(null);
    await expect(service.getDepartmentForAdmin(99)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('checks names case-insensitively under a lock before creating', async () => {
    const { tx, service } = setup();
    await service.createDepartment({ name: 'Phòng Quản trị', description: '' });
    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
    expect(tx.department.findFirst.mock.calls[0][0].where).toEqual({ name: { equals: 'Phòng Quản trị', mode: 'insensitive' } });
    expect(tx.department.create.mock.calls[0][0].data).toEqual({ name: 'Phòng Quản trị', description: null });
  });

  it('rejects a duplicate name without writing', async () => {
    const { tx, service } = setup();
    tx.department.findFirst.mockResolvedValue({ id: 1 });
    await expect(service.createDepartment({ name: 'PHÒNG QUẢN TRỊ' })).rejects.toBeInstanceOf(ConflictException);
    await expect(service.updateDepartment(3, { name: 'phòng quản trị' })).rejects.toBeInstanceOf(ConflictException);
    expect(tx.department.create).not.toHaveBeenCalled();
    expect(tx.department.update).not.toHaveBeenCalled();
  });

  it('excludes the edited department from the duplicate check and leaves omitted fields untouched', async () => {
    const { tx, service } = setup();
    await service.updateDepartment(3, { name: 'Phòng Quản Trị' });
    expect(tx.department.findFirst.mock.calls[0][0].where).toEqual({ name: { equals: 'Phòng Quản Trị', mode: 'insensitive' }, id: { not: 3 } });
    expect(tx.department.update.mock.calls[0][0].data).toEqual({ name: 'Phòng Quản Trị', description: undefined, isActive: undefined });
  });

  it('deactivates only the department row, never staff membership or assignments', async () => {
    const { tx, service } = setup();
    await service.updateDepartment(3, { isActive: false });
    expect(tx.$executeRaw).not.toHaveBeenCalled();
    expect(tx.department.update.mock.calls[0][0].data).toEqual({ name: undefined, description: undefined, isActive: false });
    expect(tx.user.update).not.toHaveBeenCalled();
    expect(tx.user.updateMany).not.toHaveBeenCalled();
    expect(tx.incidentAssignment.update).not.toHaveBeenCalled();
    expect(tx.incidentAssignment.updateMany).not.toHaveBeenCalled();
  });

  it('returns 404 when updating an unknown department', async () => {
    const { tx, service } = setup();
    tx.department.findUnique.mockResolvedValue(null);
    await expect(service.updateDepartment(99, { isActive: false })).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.department.update).not.toHaveBeenCalled();
  });

  it('deletes only an inactive, unreferenced department in one conditional statement', async () => {
    const { prisma, service } = setup();
    expect(await service.deleteDepartment(3)).toEqual({ id: 3 });
    expect(prisma.department.deleteMany.mock.calls[0][0].where).toEqual({
      id: 3, isActive: false, techStaff: { none: {} }, assignments: { none: {} }, defaultBuildings: { none: {} },
    });
  });

  it.each([
    ['unknown', null, NotFoundException],
    ['active', { isActive: true }, ConflictException],
    ['referenced', { isActive: false }, ConflictException],
  ])('refuses to delete an %s department', async (_label, found, error) => {
    const { prisma, service } = setup();
    prisma.department.deleteMany.mockResolvedValue({ count: 0 });
    prisma.department.findUnique.mockResolvedValue(found);
    await expect(service.deleteDepartment(3)).rejects.toBeInstanceOf(error);
  });

  it('maps a concurrent foreign-key violation to 409', async () => {
    const { prisma, service } = setup();
    const fkError = new Prisma.PrismaClientKnownRequestError('fk', { code: 'P2003', clientVersion: 'test' });
    prisma.department.deleteMany.mockRejectedValue(fkError);
    await expect(service.deleteDepartment(3)).rejects.toBeInstanceOf(ConflictException);
  });
});
