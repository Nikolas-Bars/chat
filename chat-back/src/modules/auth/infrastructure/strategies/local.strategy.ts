// src/modules/auth/infrastructure/strategies/local.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../../application/auth.service';
import { UserContextDto } from '../../application/user-context.dto';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      usernameField: 'loginOrEmail', // указываем, какое поле использовать вместо username
      passwordField: 'password',
    });
  }

  // Passport автоматически вызовет этот метод
  async validate(loginOrEmail: string, password: string): Promise<UserContextDto> {
    const user = await this.authService.validateUser({ loginOrEmail, password });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Этот объект попадёт в req.user
    return user;
  }
}
