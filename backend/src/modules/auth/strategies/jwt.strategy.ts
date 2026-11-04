import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../core/database/prisma.service.js';
import { INVALID_SESSION_MESSAGE } from '../constants/auth.constants.js';
import { publicUserSelect, PublicUser } from '../utils/public-user.js';

interface JwtPayload {
  sub?: unknown;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const secret = config.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
      algorithms: ['HS256'],
    });
  }

  async validate(payload: JwtPayload): Promise<PublicUser> {
    const userId = readUserId(payload.sub);
    if (!userId) {
      throw new UnauthorizedException(INVALID_SESSION_MESSAGE);
    }

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

function readUserId(sub: unknown): number | null {
  if (typeof sub === 'number' && Number.isInteger(sub) && sub > 0) {
    return sub;
  }
  if (typeof sub === 'string' && /^[1-9]\d*$/.test(sub)) {
    return Number(sub);
  }
  return null;
}
