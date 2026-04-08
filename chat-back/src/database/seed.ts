import 'reflect-metadata';
import * as bcrypt from 'bcrypt';
import AppDataSource from './data-source';
import { User } from '../modules/users/domain/user.entity';
import { UserRole } from '../modules/users/domain/user-role.enum';

/** Локальные тестовые пользователи; пароль у всех одинаковый: password123 */
const SEED_USERS: Array<{
  email: string;
  name: string;
  lastName: string;
  age: number;
  phone: string;
  jobTitle: string | null;
  company: string | null;
  plainPassword: string;
  role: UserRole;
}> = [
  {
    email: 'alice@local.dev',
    name: 'Alice',
    lastName: 'Local',
    age: 25,
    phone: '+10000000001',
    jobTitle: 'Developer',
    company: 'Local',
    plainPassword: 'password123',
    role: UserRole.ROOT,
  },
  {
    email: 'bob@local.dev',
    name: 'Bob',
    lastName: 'Local',
    age: 30,
    phone: '+10000000002',
    jobTitle: null,
    company: null,
    plainPassword: 'password123',
    role: UserRole.ADMIN,
  },
];

async function run(): Promise<void> {
  await AppDataSource.initialize();
  try {
    const repo = AppDataSource.getRepository(User);
    for (const row of SEED_USERS) {
      const exists = await repo.findOne({ where: { email: row.email } });
      if (exists) {
        continue;
      }
      const password = await bcrypt.hash(row.plainPassword, 10);
      await repo.save(
        repo.create({
          name: row.name,
          lastName: row.lastName,
          age: row.age,
          password,
          email: row.email,
          phone: row.phone,
          jobTitle: row.jobTitle,
          company: row.company,
          emailConfirmationCode: null,
          emailConfirmationExpiresAt: null,
          isEmailConfirmed: true,
          role: row.role,
        }),
      );
      console.log(`[seed] created user ${row.email}`);
    }
  } finally {
    await AppDataSource.destroy();
  }
}

run().catch((err) => {
  console.error('[seed] failed', err);
  process.exit(1);
});
