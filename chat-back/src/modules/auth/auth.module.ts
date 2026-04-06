// src/modules/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './api/auth.controller';
import { AuthService } from './application/auth.service';
import { AuthExternalService } from './application/auth-external.service';
import { EmailModule } from '../email/email.module';
import { LocalStrategy } from './infrastructure/strategies/local.strategy';
import { JwtStrategy } from './infrastructure/strategies/jwt.strategy';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthConfig } from './config/auth.config';
import { UsersModule } from '../users/users.module';
import { RegistrationUserPipe } from './api/pipes/registration.user.pipe';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    EmailModule,
    UsersModule,
    ThrottlerModule.forRoot([{
      ttl: 10000,  // 10 секунд (время окна по умолчанию)
      limit: 5,    // 5 попыток (лимит по умолчанию, можно переопределить через @Throttle)
    }]),
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_ACCESS_SECRET || 'secret',
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthExternalService,
    JwtStrategy,
    LocalStrategy,
    AuthConfig,
    RegistrationUserPipe,
  ],
  exports: [AuthExternalService], // публичный фасад
})
export class AuthModule {}
