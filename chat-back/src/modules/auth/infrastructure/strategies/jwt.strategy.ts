import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserContextDto } from '../../application/user-context.dto';
import type { Response, Request } from 'express';
import { UsersExternalService } from '../../../users/application/users-external.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly usersExternalService: UsersExternalService) {
    super({
      // Извлекать токен из куки ИЛИ из Authorization header
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          // Сначала пробуем из куки
          return request?.cookies?.accessToken;
        },
        // Если в куке нет — из заголовка "Authorization: Bearer ..."
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false, // проверять срок действия
      secretOrKey: process.env.JWT_ACCESS_SECRET || 'secret',
    });
  }

  // Passport автоматически декодирует токен и передаёт payload
  async validate(payload: any): Promise<UserContextDto> {
    if (!payload.sub) {
      throw new UnauthorizedException('Invalid token payload');
    }
    const userId = Number(payload.sub);
    const user = await this.usersExternalService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    // Этот объект попадёт в req.user
    return {
      userId: String(user.id),
      login: user.name,
      email: user.email,
      role: user.role,
    };
  }
}
