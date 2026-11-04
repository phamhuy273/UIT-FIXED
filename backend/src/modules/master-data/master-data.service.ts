import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service.js';

@Injectable()
export class MasterDataService {
  constructor(private readonly prisma: PrismaService) {}

  async getLocations() {
    const buildings = await this.prisma.building.findMany({
      where: { isActive: true },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        name: true,
        description: true,
        floors: {
          where: { isActive: true },
          orderBy: [{ floorNumber: { sort: 'asc', nulls: 'last' } }, { name: 'asc' }, { id: 'asc' }],
          select: { id: true, name: true, floorNumber: true },
        },
        locations: {
          where: { isActive: true },
          orderBy: [{ name: 'asc' }, { id: 'asc' }],
          select: { id: true, name: true, description: true, locationType: true, floorId: true },
        },
      },
    });

    return buildings.map(({ floors, locations, ...building }) => ({
      ...building,
      floors: floors.map((floor) => ({
        ...floor,
        locations: locations.filter((location) => location.floorId === floor.id),
      })),
      // Areas directly under a building (lobby, courtyard) have no floor.
      // Locations referencing inactive or foreign-building floors are excluded.
      locations: locations.filter((location) => location.floorId === null),
    }));
  }

  getCategories() {
    return this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      select: { id: true, name: true, description: true },
    });
  }
}
