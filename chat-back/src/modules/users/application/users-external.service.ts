import { Injectable } from '@nestjs/common';
import { CreateUserDto } from '../dto/create-user.dto';
import { UserViewDto } from '../dto/user-view.dto';
import { UsersService } from './users.service';
import { User } from '../domain/user.entity';
import { CreateUnconfirmedUserDto } from '../dto/create-unconfirmed-user.dto';

/** Точка входа для других модулей / внешних сценариев. */
@Injectable()
export class UsersExternalService {
  constructor(private readonly usersService: UsersService) {}

  async createUser(dto: CreateUserDto): Promise<UserViewDto> {
    return this.usersService.create(dto);
  }

  async listUsers(): Promise<UserViewDto[]> {
    return this.usersService.findAll();
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersService.findByEmail(email);
  }

  async findById(id: number): Promise<User | null> {
    return this.usersService.findById(id);
  }

  async findByEmailOrPhone(value: string): Promise<User | null> {
    return this.usersService.findByEmailOrPhone(value);
  }

  async findByConfirmationCode(code: string): Promise<User | null> {
    return this.usersService.findByConfirmationCode(code);
  }

  async searchByTerm(term: string, excludeUserId: number): Promise<User[]> {
    return this.usersService.searchByTerm(term, excludeUserId);
  }

  async save(user: User): Promise<User> {
    return this.usersService.save(user);
  }

  async createUnconfirmedUser(dto: CreateUnconfirmedUserDto): Promise<User> {
    return this.usersService.createUnconfirmed(dto);
  }
}
