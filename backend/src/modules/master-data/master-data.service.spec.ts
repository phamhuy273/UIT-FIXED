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
