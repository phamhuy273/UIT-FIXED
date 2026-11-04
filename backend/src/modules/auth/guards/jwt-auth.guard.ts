import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { INVALID_SESSION_MESSAGE } from '../constants/auth.constants.js';
import { isPublicRoute } from '../decorators/public.decorator.js';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    if (isPublicRoute(this.reflector, context)) {
      return true;
    }
    return super.canActivate(context);
  }

  handleRequest<TUser>(err: unknown, user: TUser | false | null): TUser {
    if (err || !user) {
      throw new UnauthorizedException(INVALID_SESSION_MESSAGE);
    }
    return user;
  }
}
