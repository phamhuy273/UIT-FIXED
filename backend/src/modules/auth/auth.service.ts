import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../../core/database/prisma.service.js';
import {
  BCRYPT_ROUNDS,
  EMAIL_ALREADY_USED_MESSAGE,
  INVALID_CREDENTIALS_MESSAGE,
  INVALID_EMAIL_MESSAGE,
  PASSWORD_POLICY_MESSAGE,
  REGISTER_SUCCESS_MESSAGE,
  UIT_STUDENT_EMAIL_MESSAGE,
} from './constants/auth.constants.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { isAcceptablePassword } from './utils/password-policy.js';
import { publicUserSelect, toPublicUser } from './utils/public-user.js';
import {
  hasSingleAtEmailShape,
  isUitStudentEmail,
  normalizeEmail,
} from './utils/uit-student-email.js';

export interface AccessTokenPayload {
  sub: number;
  role: Role;
}

@Injectable()
export class AuthService {
  private dummyPasswordHash: Promise<string> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const email = normalizeEmail(dto.email);
    const fullName = dto.fullName.trim();
    this.assertRegisterEmail(email);
    this.assertPassword(dto.password);

    const existing = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException(EMAIL_ALREADY_USED_MESSAGE);
    }

    const password = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    try {
      const user = await this.prisma.user.create({
        data: {
          email,
          password,
          fullName,
          role: Role.STUDENT,
          departmentId: null,
          isActive: true,
        },
        select: publicUserSelect,
      });

      return {
        message: REGISTER_SUCCESS_MESSAGE,
        user,
      };
    } catch (error) {
      if (this.isUniqueConflict(error)) {
        throw new ConflictException(EMAIL_ALREADY_USED_MESSAGE);
      }
      throw error;
    }
  }

  async login(dto: LoginDto) {
    const email = normalizeEmail(dto.email);
    const user = await this.prisma.user.findUnique({ where: { email } });
    const passwordMatches = await bcrypt.compare(
      dto.password,
      user?.password ?? (await this.getDummyPasswordHash()),
    );

    if (!user || !passwordMatches || !user.isActive) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      role: user.role,
    } satisfies AccessTokenPayload);

    return {
      accessToken,
      user: toPublicUser(user),
    };
  }

  private assertRegisterEmail(email: string) {
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

  private getDummyPasswordHash() {
    this.dummyPasswordHash ??= bcrypt.hash('uit-fixed-invalid-user', BCRYPT_ROUNDS);
    return this.dummyPasswordHash;
  }

  private isUniqueConflict(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }
}
