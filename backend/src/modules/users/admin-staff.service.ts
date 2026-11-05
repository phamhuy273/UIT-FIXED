import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { IncidentStatus, Prisma, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../../core/database/prisma.service.js';
import {
  BCRYPT_ROUNDS,
  EMAIL_ALREADY_USED_MESSAGE,
  INVALID_EMAIL_MESSAGE,
  PASSWORD_POLICY_MESSAGE,
} from '../auth/constants/auth.constants.js';
import { isAcceptablePassword } from '../auth/utils/password-policy.js';
import {
  hasSingleAtEmailShape,
  isUitStudentEmail,
  normalizeEmail,
} from '../auth/utils/uit-student-email.js';
import { CreateStaffDto, STAFF_EMAIL_MESSAGE } from './dto/create-staff.dto.js';
import { UpdateStaffDto } from './dto/update-staff.dto.js';

const FULL_NAME_MESSAGE = 'Họ và tên cần từ 2 đến 100 ký tự.';
const DEPARTMENT_ID_MESSAGE = 'Chọn phòng ban.';

export const STAFF_NOT_FOUND_MESSAGE = 'Không tìm thấy kỹ thuật viên.';
export const STAFF_STILL_ACTIVE_MESSAGE = 'Chỉ có thể xóa tài khoản kỹ thuật viên đã bị khóa.';
export const STAFF_IN_USE_MESSAGE =
  'Không thể xóa tài khoản kỹ thuật viên vẫn còn báo cáo hoặc lịch sử nghiệp vụ.';
export const STAFF_DEPARTMENT_NOT_FOUND_MESSAGE = 'Không tìm thấy phòng ban.';
export const STAFF_DEPARTMENT_INACTIVE_MESSAGE =
  'Không thể gán kỹ thuật viên vào phòng ban đã ngừng hoạt động.';
export const STAFF_DEPARTMENT_BUSY_MESSAGE =
  'Không thể đổi phòng ban khi kỹ thuật viên còn sự cố chưa được phân công lại.';

const referenceCountSelect = {
  submittedReports: true,
  reportHistories: true,
  assignmentsMade: true,
  assignmentsReceived: true,
  progressNotes: true,
  resolutions: true,
  incidentHistories: true,
  uploadedMedia: true,
} satisfies Prisma.UserCountOutputTypeSelect;

const openAssignmentArgs = {
  where: {
    isCurrent: true,
    incident: { status: { in: [IncidentStatus.ASSIGNED, IncidentStatus.IN_PROGRESS] } },
  },
  select: { id: true },
} satisfies Prisma.User$assignmentsReceivedArgs;

const departmentSelect = { id: true, name: true, isActive: true } satisfies Prisma.DepartmentSelect;

const adminStaffSelect = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  avatarUrl: true,
  departmentId: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  department: { select: departmentSelect },
  assignmentsReceived: openAssignmentArgs,
  _count: { select: referenceCountSelect },
} satisfies Prisma.UserSelect;

type AdminStaffRow = Prisma.UserGetPayload<{ select: typeof adminStaffSelect }>;

const presentAdminStaff = ({ _count, assignmentsReceived, ...staff }: AdminStaffRow) => ({
  ...staff,
  referenceCount: Object.values(_count).reduce((total, count) => total + count, 0),
  openAssignmentCount: assignmentsReceived.length,
});

const unusedStaffWhere = {
  role: Role.TECH_STAFF,
  isActive: false,
  submittedReports: { none: {} },
  reportHistories: { none: {} },
  assignmentsMade: { none: {} },
  assignmentsReceived: { none: {} },
  progressNotes: { none: {} },
  resolutions: { none: {} },
  incidentHistories: { none: {} },
  uploadedMedia: { none: {} },
} satisfies Prisma.UserWhereInput;

type DepartmentReader = PrismaService | Prisma.TransactionClient;

@Injectable()
export class AdminStaffService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const staff = await this.prisma.user.findMany({
      where: { role: Role.TECH_STAFF },
      orderBy: [{ isActive: 'desc' }, { fullName: { sort: 'asc', nulls: 'last' } }, { id: 'asc' }],
      select: adminStaffSelect,
    });
    return staff.map(presentAdminStaff);
  }

  async getById(id: number) {
    const staff = await this.prisma.user.findFirst({
      where: { id, role: Role.TECH_STAFF },
      select: adminStaffSelect,
    });
    if (!staff) {
      throw new NotFoundException(STAFF_NOT_FOUND_MESSAGE);
    }
    return presentAdminStaff(staff);
  }

  async create(dto: CreateStaffDto) {
    const email = normalizeEmail(dto.email);
    const fullName = this.readFullName(dto.fullName);
    this.assertEmail(email);
    this.assertPassword(dto.password);
    this.assertDepartmentId(dto.departmentId);
    await this.readActiveDepartment(this.prisma, dto.departmentId);

    const existing = await this.prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      throw new ConflictException(EMAIL_ALREADY_USED_MESSAGE);
    }

    const password = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    try {
      const staff = await this.prisma.user.create({
        data: {
          email,
          password,
          fullName,
          role: Role.TECH_STAFF,
          departmentId: dto.departmentId,
          isActive: true,
        },
        select: adminStaffSelect,
      });
      return presentAdminStaff(staff);
    } catch (error) {
      if (this.isUniqueConflict(error)) {
        throw new ConflictException(EMAIL_ALREADY_USED_MESSAGE);
      }
      if (this.isForeignKeyConflict(error)) {
        throw new NotFoundException(STAFF_DEPARTMENT_NOT_FOUND_MESSAGE);
      }
      throw error;
    }
  }

  async update(id: number, dto: UpdateStaffDto) {
    const fullName = dto.fullName === undefined ? undefined : this.readFullName(dto.fullName);
    const email = dto.email === undefined ? undefined : normalizeEmail(dto.email);
    if (email !== undefined) {
      this.assertEmail(email);
    }
    if (dto.password !== undefined) {
      this.assertPassword(dto.password);
    }
    if (dto.departmentId !== undefined) {
      this.assertDepartmentId(dto.departmentId);
    }
    const password = dto.password === undefined ? undefined : await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({
        where: { id },
        select: { role: true, email: true, departmentId: true },
      });
      if (!existing || existing.role !== Role.TECH_STAFF) {
        throw new NotFoundException(STAFF_NOT_FOUND_MESSAGE);
      }
      if (email !== undefined && email !== existing.email) {
        const taken = await tx.user.findUnique({ where: { email }, select: { id: true } });
        if (taken) {
          throw new ConflictException(EMAIL_ALREADY_USED_MESSAGE);
        }
      }

      let departmentId: number | undefined;
      if (dto.departmentId !== undefined && dto.departmentId !== existing.departmentId) {
        await this.readActiveDepartment(tx, dto.departmentId);
        const openAssignments = await tx.incidentAssignment.count({
          where: { assigneeId: id, ...openAssignmentArgs.where },
        });
        if (openAssignments > 0) {
          throw new ConflictException(STAFF_DEPARTMENT_BUSY_MESSAGE);
        }
        departmentId = dto.departmentId;
      }

      try {
        const staff = await tx.user.update({
          where: { id },
          data: {
            fullName,
            email,
            isActive: dto.isActive,
            ...(departmentId === undefined ? {} : { departmentId }),
            ...(password === undefined ? {} : { password }),
          },
          select: adminStaffSelect,
        });
        return presentAdminStaff(staff);
      } catch (error) {
        if (this.isUniqueConflict(error)) {
          throw new ConflictException(EMAIL_ALREADY_USED_MESSAGE);
        }
        if (this.isForeignKeyConflict(error)) {
          throw new NotFoundException(STAFF_DEPARTMENT_NOT_FOUND_MESSAGE);
        }
        throw error;
      }
    });
  }

  async remove(id: number) {
    let deleted: number;
    try {
      ({ count: deleted } = await this.prisma.user.deleteMany({
        where: { id, ...unusedStaffWhere },
      }));
    } catch (error) {
      if (this.isForeignKeyConflict(error)) {
        throw new ConflictException(STAFF_IN_USE_MESSAGE);
      }
      throw error;
    }
    if (deleted === 1) {
      return { id };
    }

    const staff = await this.prisma.user.findUnique({
      where: { id },
      select: { role: true, isActive: true },
    });
    if (!staff || staff.role !== Role.TECH_STAFF) {
      throw new NotFoundException(STAFF_NOT_FOUND_MESSAGE);
    }
    if (staff.isActive) {
      throw new ConflictException(STAFF_STILL_ACTIVE_MESSAGE);
    }
    throw new ConflictException(STAFF_IN_USE_MESSAGE);
  }

  private readFullName(value: string) {
    const fullName = value.trim();
    if (fullName.length < 2 || fullName.length > 100) {
      throw new BadRequestException(FULL_NAME_MESSAGE);
    }
    return fullName;
  }

  private assertDepartmentId(value: number) {
    if (!Number.isInteger(value) || value < 1) {
      throw new BadRequestException(DEPARTMENT_ID_MESSAGE);
    }
  }

  private async readActiveDepartment(db: DepartmentReader, departmentId: number) {
    const department = await db.department.findUnique({
      where: { id: departmentId },
      select: { id: true, isActive: true },
    });
    if (!department) {
      throw new NotFoundException(STAFF_DEPARTMENT_NOT_FOUND_MESSAGE);
    }
    if (!department.isActive) {
      throw new BadRequestException(STAFF_DEPARTMENT_INACTIVE_MESSAGE);
    }
    return department;
  }

  private assertEmail(email: string) {
    if (isUitStudentEmail(email)) {
      return;
    }
    throw new BadRequestException(
      hasSingleAtEmailShape(email) ? STAFF_EMAIL_MESSAGE : INVALID_EMAIL_MESSAGE,
    );
  }

  private assertPassword(password: string) {
    if (!isAcceptablePassword(password)) {
      throw new BadRequestException(PASSWORD_POLICY_MESSAGE);
    }
  }

  private isUniqueConflict(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }

  private isForeignKeyConflict(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003';
  }
}
