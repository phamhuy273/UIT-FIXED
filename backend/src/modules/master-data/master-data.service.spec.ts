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
