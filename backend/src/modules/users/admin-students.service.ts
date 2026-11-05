import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../../core/database/prisma.service.js';
import {
  BCRYPT_ROUNDS,
  EMAIL_ALREADY_USED_MESSAGE,
  INVALID_EMAIL_MESSAGE,
  PASSWORD_POLICY_MESSAGE,
  UIT_STUDENT_EMAIL_MESSAGE,
} from '../auth/constants/auth.constants.js';
import { isAcceptablePassword } from '../auth/utils/password-policy.js';
import {
  hasSingleAtEmailShape,
  isUitStudentEmail,
  normalizeEmail,
} from '../auth/utils/uit-student-email.js';
import { CreateStudentDto } from './dto/create-student.dto.js';
import { UpdateStudentDto } from './dto/update-student.dto.js';

const FULL_NAME_MESSAGE = 'Họ và tên cần từ 2 đến 100 ký tự.';

export const STUDENT_NOT_FOUND_MESSAGE = 'Không tìm thấy sinh viên.';
export const STUDENT_STILL_ACTIVE_MESSAGE = 'Chỉ có thể xóa tài khoản sinh viên đã bị khóa.';
export const STUDENT_IN_USE_MESSAGE =
  'Không thể xóa tài khoản sinh viên vẫn còn báo cáo hoặc lịch sử nghiệp vụ.';

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

const adminStudentSelect = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  avatarUrl: true,
  departmentId: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: referenceCountSelect },
} satisfies Prisma.UserSelect;

type AdminStudentRow = Prisma.UserGetPayload<{ select: typeof adminStudentSelect }>;

const presentAdminStudent = ({ _count, ...student }: AdminStudentRow) => ({
  ...student,
  referenceCount: Object.values(_count).reduce((total, count) => total + count, 0),
});

const unusedStudentWhere = {
  role: Role.STUDENT,
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

@Injectable()
export class AdminStudentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const students = await this.prisma.user.findMany({
      where: { role: Role.STUDENT },
      orderBy: [{ isActive: 'desc' }, { fullName: { sort: 'asc', nulls: 'last' } }, { id: 'asc' }],
      select: adminStudentSelect,
    });
    return students.map(presentAdminStudent);
  }

  async getById(id: number) {
    const student = await this.prisma.user.findFirst({
      where: { id, role: Role.STUDENT },
      select: adminStudentSelect,
    });
    if (!student) {
      throw new NotFoundException(STUDENT_NOT_FOUND_MESSAGE);
    }
    return presentAdminStudent(student);
  }

  async create(dto: CreateStudentDto) {
    const email = normalizeEmail(dto.email);
    const fullName = this.readFullName(dto.fullName);
    this.assertEmail(email);
    this.assertPassword(dto.password);

    const existing = await this.prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      throw new ConflictException(EMAIL_ALREADY_USED_MESSAGE);
    }

    const password = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    try {
      const student = await this.prisma.user.create({
        data: {
          email,
          password,
          fullName,
          role: Role.STUDENT,
          departmentId: null,
          isActive: true,
        },
        select: adminStudentSelect,
      });
      return presentAdminStudent(student);
    } catch (error) {
      if (this.isUniqueConflict(error)) {
        throw new ConflictException(EMAIL_ALREADY_USED_MESSAGE);
      }
      throw error;
    }
  }

  async update(id: number, dto: UpdateStudentDto) {
    const fullName = dto.fullName === undefined ? undefined : this.readFullName(dto.fullName);
    const email = dto.email === undefined ? undefined : normalizeEmail(dto.email);
    if (email !== undefined) {
      this.assertEmail(email);
    }
    if (dto.password !== undefined) {
      this.assertPassword(dto.password);
    }
    const password = dto.password === undefined ? undefined : await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({
        where: { id },
        select: { role: true, email: true },
      });
      if (!existing || existing.role !== Role.STUDENT) {
        throw new NotFoundException(STUDENT_NOT_FOUND_MESSAGE);
      }
      if (email !== undefined && email !== existing.email) {
        const taken = await tx.user.findUnique({ where: { email }, select: { id: true } });
        if (taken) {
          throw new ConflictException(EMAIL_ALREADY_USED_MESSAGE);
        }
      }

      try {
        const student = await tx.user.update({
          where: { id },
          data: {
            fullName,
            email,
            isActive: dto.isActive,
            ...(password === undefined ? {} : { password }),
          },
          select: adminStudentSelect,
        });
        return presentAdminStudent(student);
      } catch (error) {
        if (this.isUniqueConflict(error)) {
          throw new ConflictException(EMAIL_ALREADY_USED_MESSAGE);
        }
        throw error;
      }
    });
  }

  async remove(id: number) {
    let deleted: number;
    try {
      ({ count: deleted } = await this.prisma.user.deleteMany({
        where: { id, ...unusedStudentWhere },
      }));
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictException(STUDENT_IN_USE_MESSAGE);
      }
      throw error;
    }
    if (deleted === 1) {
      return { id };
    }

    const student = await this.prisma.user.findUnique({
      where: { id },
      select: { role: true, isActive: true },
    });
    if (!student || student.role !== Role.STUDENT) {
      throw new NotFoundException(STUDENT_NOT_FOUND_MESSAGE);
    }
    if (student.isActive) {
      throw new ConflictException(STUDENT_STILL_ACTIVE_MESSAGE);
    }
    throw new ConflictException(STUDENT_IN_USE_MESSAGE);
  }

  private readFullName(value: string) {
    const fullName = value.trim();
    if (fullName.length < 2 || fullName.length > 100) {
      throw new BadRequestException(FULL_NAME_MESSAGE);
    }
    return fullName;
  }

  private assertEmail(email: string) {
    if (isUitStudentEmail(email)) {
      return;
    }
    throw new BadRequestException(
      hasSingleAtEmailShape(email) ? UIT_STUDENT_EMAIL_MESSAGE : INVALID_EMAIL_MESSAGE,
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
}
