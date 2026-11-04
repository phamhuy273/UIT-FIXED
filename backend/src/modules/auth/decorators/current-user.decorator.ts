import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { PublicUser } from '../utils/public-user.js';

export const CurrentUser = createParamDecorator(
  (data: keyof PublicUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user?: PublicUser }>();
    const user = request.user;
    if (!user || !data) {
      return user;
    }
    return user[data];
  },
);
