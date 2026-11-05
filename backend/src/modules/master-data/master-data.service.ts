import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { IncidentStatus, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { CreateDepartmentDto } from './dto/create-department.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';
import { UpdateDepartmentDto } from './dto/update-department.dto.js';

const adminCategorySelect = {
  id: true,
  name: true,
  description: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { incidentReports: true } },
} satisfies Prisma.CategorySelect;

type AdminCategoryRow = Prisma.CategoryGetPayload<{ select: typeof adminCategorySelect }>;

const presentAdminCategory = ({ _count, ...category }: AdminCategoryRow) => ({
  ...category,
  reportCount: _count.incidentReports,
});

export const CATEGORY_NOT_FOUND_MESSAGE = 'Không tìm thấy danh mục.';
export const CATEGORY_NAME_TAKEN_MESSAGE = 'Tên danh mục đã tồn tại.';
export const CATEGORY_STILL_ACTIVE_MESSAGE = 'Chỉ có thể xóa danh mục đã ngừng sử dụng.';
export const CATEGORY_IN_USE_MESSAGE = 'Không thể xóa danh mục vẫn còn báo cáo tham chiếu.';

const adminDepartmentSelect = {
  id: true,
  name: true,
  description: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { techStaff: true, assignments: true, defaultBuildings: true } },
} satisfies Prisma.DepartmentSelect;

type AdminDepartmentRow = Prisma.DepartmentGetPayload<{ select: typeof adminDepartmentSelect }>;
type DepartmentStats = { staff: Map<number | null, number>; ongoing: Map<number, number> };

const ONGOING_INCIDENT_STATUSES = [IncidentStatus.ASSIGNED, IncidentStatus.IN_PROGRESS];

const presentAdminDepartment = ({ _count, ...department }: AdminDepartmentRow, stats: DepartmentStats) => ({
  ...department,
  staffCount: stats.staff.get(department.id) ?? 0,
  memberCount: _count.techStaff,
  assignmentCount: _count.assignments,
  activeAssignmentCount: stats.ongoing.get(department.id) ?? 0,
  buildingCount: _count.defaultBuildings,
});

export const DEPARTMENT_NOT_FOUND_MESSAGE = 'Không tìm thấy phòng ban.';
export const DEPARTMENT_NAME_TAKEN_MESSAGE = 'Tên phòng ban đã tồn tại.';
export const DEPARTMENT_STILL_ACTIVE_MESSAGE = 'Chỉ có thể xóa phòng ban đã ngừng hoạt động.';
export const DEPARTMENT_IN_USE_MESSAGE = 'Không thể xóa phòng ban vẫn còn tài khoản, lịch sử phân công hoặc tòa nhà tham chiếu.';

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

  async listCategoriesForAdmin() {
    const categories = await this.prisma.category.findMany({
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }, { id: 'asc' }],
      select: adminCategorySelect,
    });
    return categories.map(presentAdminCategory);
  }

  async getCategoryForAdmin(id: number) {
    const category = await this.prisma.category.findUnique({ where: { id }, select: adminCategorySelect });
    if (!category) throw new NotFoundException(CATEGORY_NOT_FOUND_MESSAGE);
    return presentAdminCategory(category);
  }

  createCategory(dto: CreateCategoryDto) {
    return this.prisma.$transaction(async (tx) => {
      await this.assertCategoryNameAvailable(tx, dto.name);
      const category = await tx.category.create({
        data: { name: dto.name, description: dto.description || null },
        select: adminCategorySelect,
      });
      return presentAdminCategory(category);
    });
  }

  updateCategory(id: number, dto: UpdateCategoryDto) {
    return this.prisma.$transaction(async (tx) => {
      if (!await tx.category.findUnique({ where: { id }, select: { id: true } })) {
        throw new NotFoundException(CATEGORY_NOT_FOUND_MESSAGE);
      }
      if (dto.name !== undefined) await this.assertCategoryNameAvailable(tx, dto.name, id);
      const category = await tx.category.update({
        where: { id },
        data: {
          name: dto.name,
          description: dto.description === undefined ? undefined : dto.description || null,
          isActive: dto.isActive,
        },
        select: adminCategorySelect,
      });
      return presentAdminCategory(category);
    });
  }

  async deleteCategory(id: number) {
    let deleted: number;
    try {
      ({ count: deleted } = await this.prisma.category.deleteMany({
        where: { id, isActive: false, incidentReports: { none: {} } },
      }));
    } catch (error) {
      // A report inserted concurrently still trips the Restrict foreign key.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictException(CATEGORY_IN_USE_MESSAGE);
      }
      throw error;
    }
    if (deleted === 1) return { id };

    const category = await this.prisma.category.findUnique({ where: { id }, select: { isActive: true } });
    if (!category) throw new NotFoundException(CATEGORY_NOT_FOUND_MESSAGE);
    if (category.isActive) throw new ConflictException(CATEGORY_STILL_ACTIVE_MESSAGE);
    throw new ConflictException(CATEGORY_IN_USE_MESSAGE);
  }

  private async assertCategoryNameAvailable(tx: Prisma.TransactionClient, name: string, exceptId?: number) {
    // The schema has no unique index on name, so concurrent writers are serialized by a transaction-scoped lock.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('uit-fixed:category-name'))`;
    const duplicate = await tx.category.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        ...(exceptId === undefined ? {} : { id: { not: exceptId } }),
      },
      select: { id: true },
    });
    if (duplicate) throw new ConflictException(CATEGORY_NAME_TAKEN_MESSAGE);
  }

  async listDepartmentsForAdmin() {
    const [departments, stats] = await Promise.all([
      this.prisma.department.findMany({
        orderBy: [{ isActive: 'desc' }, { name: 'asc' }, { id: 'asc' }],
        select: adminDepartmentSelect,
      }),
      this.loadDepartmentStats(this.prisma),
    ]);
    return departments.map((department) => presentAdminDepartment(department, stats));
  }

  async getDepartmentForAdmin(id: number) {
    const [department, stats, staff] = await Promise.all([
      this.prisma.department.findUnique({ where: { id }, select: adminDepartmentSelect }),
      this.loadDepartmentStats(this.prisma, id),
      this.prisma.user.findMany({
        where: { departmentId: id },
        orderBy: [{ isActive: 'desc' }, { fullName: 'asc' }, { id: 'asc' }],
        select: { id: true, fullName: true, email: true, role: true, isActive: true },
      }),
    ]);
    if (!department) throw new NotFoundException(DEPARTMENT_NOT_FOUND_MESSAGE);
    return { ...presentAdminDepartment(department, stats), staff };
  }

  createDepartment(dto: CreateDepartmentDto) {
    return this.prisma.$transaction(async (tx) => {
      await this.assertDepartmentNameAvailable(tx, dto.name);
      const department = await tx.department.create({
        data: { name: dto.name, description: dto.description || null },
        select: adminDepartmentSelect,
      });
      return presentAdminDepartment(department, await this.loadDepartmentStats(tx, department.id));
    });
  }

  updateDepartment(id: number, dto: UpdateDepartmentDto) {
    return this.prisma.$transaction(async (tx) => {
      if (!await tx.department.findUnique({ where: { id }, select: { id: true } })) {
        throw new NotFoundException(DEPARTMENT_NOT_FOUND_MESSAGE);
      }
      if (dto.name !== undefined) await this.assertDepartmentNameAvailable(tx, dto.name, id);
      // Only the department row changes: staff membership and past assignments keep pointing at it as-is.
      const department = await tx.department.update({
        where: { id },
        data: {
          name: dto.name,
          description: dto.description === undefined ? undefined : dto.description || null,
          isActive: dto.isActive,
        },
        select: adminDepartmentSelect,
      });
      return presentAdminDepartment(department, await this.loadDepartmentStats(tx, id));
    });
  }

  async deleteDepartment(id: number) {
    let deleted: number;
    try {
      ({ count: deleted } = await this.prisma.department.deleteMany({
        where: { id, isActive: false, techStaff: { none: {} }, assignments: { none: {} }, defaultBuildings: { none: {} } },
      }));
    } catch (error) {
      // A reference inserted concurrently still trips the Restrict foreign key.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictException(DEPARTMENT_IN_USE_MESSAGE);
      }
      throw error;
    }
    if (deleted === 1) return { id };

    const department = await this.prisma.department.findUnique({ where: { id }, select: { isActive: true } });
    if (!department) throw new NotFoundException(DEPARTMENT_NOT_FOUND_MESSAGE);
    if (department.isActive) throw new ConflictException(DEPARTMENT_STILL_ACTIVE_MESSAGE);
    throw new ConflictException(DEPARTMENT_IN_USE_MESSAGE);
  }

  private async loadDepartmentStats(db: Prisma.TransactionClient, departmentId?: number): Promise<DepartmentStats> {
    const [staff, ongoing] = await Promise.all([
      db.user.groupBy({
        by: ['departmentId'],
        where: { role: Role.TECH_STAFF, isActive: true, departmentId: departmentId ?? { not: null } },
        _count: { _all: true },
      }),
      db.incidentAssignment.groupBy({
        by: ['departmentId'],
        where: {
          ...(departmentId === undefined ? {} : { departmentId }),
          isCurrent: true,
          incident: { status: { in: ONGOING_INCIDENT_STATUSES } },
        },
        _count: { _all: true },
      }),
    ]);
    return {
      staff: new Map(staff.map((row) => [row.departmentId, row._count._all])),
      ongoing: new Map(ongoing.map((row) => [row.departmentId, row._count._all])),
    };
  }

  private async assertDepartmentNameAvailable(tx: Prisma.TransactionClient, name: string, exceptId?: number) {
    // The schema has no unique index on name, so concurrent writers are serialized by a transaction-scoped lock.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('uit-fixed:department-name'))`;
    const duplicate = await tx.department.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        ...(exceptId === undefined ? {} : { id: { not: exceptId } }),
      },
      select: { id: true },
    });
    if (duplicate) throw new ConflictException(DEPARTMENT_NAME_TAKEN_MESSAGE);
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
