import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service.js';
import { INVALID_SESSION_MESSAGE } from '../auth/constants/auth.constants.js';
import { publicUserSelect, PublicUser } from '../auth/utils/public-user.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getById(userId: number): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: publicUserSelect,
    });

    if (!user?.isActive) {
      throw new UnauthorizedException(INVALID_SESSION_MESSAGE);
    }

    return user;
  }
}
