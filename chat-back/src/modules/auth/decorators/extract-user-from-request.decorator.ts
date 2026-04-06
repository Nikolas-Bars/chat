// src/modules/auth/decorators/extract-user-from-request.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserContextDto } from '../application/user-context.dto';
// JwtAuthGuard выполняется первым и проверяет JWT-токен из запроса.
// Если токен валиден, JwtStrategy декодирует его и добавляет данные пользователя в request.user.
export const ExtractUserFromRequest = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): UserContextDto => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new Error('There is no user in the request object!');
    }

    return user;
  },
);
