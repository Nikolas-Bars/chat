import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './domain/user.entity';
import { UsersController } from './api/users.controller';
import { UsersService } from './application/users.service';
import { UsersExternalService } from './application/users-external.service';
import { UsersRepository } from './infrastructure/users.repository';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [UsersService, UsersExternalService, UsersRepository],
  exports: [UsersExternalService, UsersService],
})
export class UsersModule {}
