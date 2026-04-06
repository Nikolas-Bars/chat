import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../domain/user.entity';

@Injectable()
export class UsersRepository {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  createEntity(partial: Partial<User>): User {
    return this.repo.create(partial);
  }

  async save(user: User): Promise<User> {
    return this.repo.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.repo.find({ order: { id: 'ASC' } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email } });
  }

  async findByEmailOrPhone(value: string): Promise<User | null> {
    return this.repo.findOne({
      where: [{ email: value }, { phone: value }],
    });
  }

  async findByConfirmationCode(code: string): Promise<User | null> {
    return this.repo.findOne({ where: { emailConfirmationCode: code } });
  }
}
