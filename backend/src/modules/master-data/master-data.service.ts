import { Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
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
        defaultDepartmentId: true,
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

  async getDepartments() {
    const departments = await this.prisma.department.findMany({
      where: { isActive: true },
      orderBy: [{ id: 'asc' }],
      include: {
        _count: {
          select: {
            techStaff: {
              where: { isActive: true, role: Role.TECH_STAFF },
            },
          },
        },
      },
    });

    return departments.map((d) => ({
      id: d.id,
      name: d.name,
      description: d.description,
      staffCount: d._count.techStaff,
    }));
  }

  async getDepartmentStaff(departmentId: number) {
    const dept = await this.prisma.department.findUnique({
      where: { id: departmentId },
    });
    if (!dept || !dept.isActive) {
      throw new NotFoundException('Không tìm thấy phòng ban hoặc phòng ban đã ngừng hoạt động.');
    }

    const staffMembers = await this.prisma.user.findMany({
      where: {
        departmentId,
        role: Role.TECH_STAFF,
        isActive: true,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        avatarUrl: true,
        departmentId: true,
        assignmentsReceived: {
          where: {
            isCurrent: true,
            incident: {
              status: { in: ['ASSIGNED', 'IN_PROGRESS'] },
            },
          },
          select: {
            id: true,
            incident: {
              select: { status: true },
            },
          },
        },
      },
      orderBy: [{ fullName: 'asc' }, { id: 'asc' }],
    });

    return staffMembers.map((staff) => {
      const inProgressCount = staff.assignmentsReceived.filter(
        (a) => a.incident?.status === 'IN_PROGRESS',
      ).length;
      const assignedCount = staff.assignmentsReceived.filter(
        (a) => a.incident?.status === 'ASSIGNED',
      ).length;
      const activeTasksCount = inProgressCount + assignedCount;

      let workloadStatus: 'AVAILABLE' | 'BUSY' | 'OVERLOADED' = 'AVAILABLE';
      if (activeTasksCount >= 3) {
        workloadStatus = 'OVERLOADED';
      } else if (activeTasksCount > 0) {
        workloadStatus = 'BUSY';
      }

      return {
        id: staff.id,
        fullName: staff.fullName ?? 'Kỹ thuật viên',
        email: staff.email,
        avatarUrl: staff.avatarUrl,
        departmentId: staff.departmentId,
        activeTasksCount,
        inProgressCount,
        assignedCount,
        workloadStatus,
      };
    });
  }
}
