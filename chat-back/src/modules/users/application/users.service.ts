import { Injectable } from '@nestjs/common';
import { CreateUserDto } from '../dto/create-user.dto';
import { UsersRepository } from '../infrastructure/users.repository';
import { UserViewDto } from '../dto/user-view.dto';
import { User } from '../domain/user.entity';
import { CreateUnconfirmedUserDto } from '../dto/create-unconfirmed-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async create(dto: CreateUserDto): Promise<UserViewDto> {
    const user = this.usersRepository.createEntity({
      name: dto.name,
      lastName: dto.lastName,
      age: dto.age,
      password: dto.password,
      email: dto.email,
      phone: dto.phone,
      jobTitle: dto.jobTitle ?? null,
      company: dto.company ?? null,
    });
    const saved = await this.usersRepository.save(user);
    return UserViewDto.fromEntity(saved);
  }

  async findAll(): Promise<UserViewDto[]> {
    const users = await this.usersRepository.findAll();
    return users.map((u) => UserViewDto.fromEntity(u));
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findByEmail(email);
  }

  async findByEmailOrPhone(value: string): Promise<User | null> {
    return this.usersRepository.findByEmailOrPhone(value);
  }

  async findByConfirmationCode(code: string): Promise<User | null> {
    return this.usersRepository.findByConfirmationCode(code);
  }

  async save(user: User): Promise<User> {
    return this.usersRepository.save(user);
  }

  async createUnconfirmed(dto: CreateUnconfirmedUserDto): Promise<User> {
    const user = this.usersRepository.createEntity({
      name: dto.name,
      lastName: dto.lastName,
      age: dto.age,
      password: dto.password,
      email: dto.email,
      phone: dto.phone,
      jobTitle: dto.jobTitle ?? null,
      company: dto.company ?? null,
      emailConfirmationCode: dto.emailConfirmationCode,
      emailConfirmationExpiresAt: dto.emailConfirmationExpiresAt,
      isEmailConfirmed: false,
    });
    return this.usersRepository.save(user);
  }
}
