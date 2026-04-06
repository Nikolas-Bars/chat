// src/modules/auth/infrastructure/guards/jwt-auth.guard.ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
// 'local' активирует JWTStrategy
export class JwtAuthGuard extends AuthGuard('jwt') {}
