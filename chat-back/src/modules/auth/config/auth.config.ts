import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthConfig {
  skipPasswordCheck: boolean;
  jwtSecret: string;

  constructor(private configService: ConfigService<any, true>) {
    this.skipPasswordCheck =
      this.configService.get('SKIP_PASSWORD_CHECK') === 'true';

    this.jwtSecret =
      this.configService.get<string>('JWT_SECRET');
  }
}
