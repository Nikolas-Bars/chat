import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserContextDto } from '../../application/user-context.dto';
import type { Response, Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
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
    // Этот объект попадёт в req.user
    return {
      userId: payload.sub,
      login: payload.login, // смотря что добавлял в payload при login()
      email: payload.email, // смотря что добавлял в payload при login()
    };
  }
}
