// src/modules/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { EmailExternalService } from './application/email-external.service';

@Module({
  imports: [],
  controllers: [],
  providers: [EmailExternalService],
  exports: [EmailExternalService], // публичный фасад
})
export class EmailModule {}
