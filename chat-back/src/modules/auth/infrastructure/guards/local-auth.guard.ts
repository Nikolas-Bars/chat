// src/modules/auth/infrastructure/guards/local-auth.guard.ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
// 'local' активирует LocalStrategy которая, поместит в реквест объект user после валидации
export class LocalAuthGuard extends AuthGuard('local') {}
