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

  async findById(id: number): Promise<User | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByEmailOrPhone(value: string): Promise<User | null> {
    return this.repo.findOne({
      where: [{ email: value }, { phone: value }],
    });
  }

  async findByConfirmationCode(code: string): Promise<User | null> {
    return this.repo.findOne({ where: { emailConfirmationCode: code } });
  }

  async searchByTerm(
    term: string,
    excludeUserId: number,
    limit = 20,
  ): Promise<User[]> {
    const q = `%${term.toLowerCase()}%`;
    return this.repo
      .createQueryBuilder('u')
      .where('u.id != :excludeUserId', { excludeUserId })
      .andWhere(
        '(LOWER(u.email) LIKE :q OR LOWER(u.name) LIKE :q OR LOWER(u.last_name) LIKE :q)',
        { q },
      )
      .orderBy('u.id', 'ASC')
      .limit(limit)
      .getMany();
  }
}
