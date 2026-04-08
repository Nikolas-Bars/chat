import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserRole } from './user-role.enum';

@Entity('users')
@Index('IDX_users_phone', ['phone'])
@Index('IDX_users_email_confirmation_code', ['emailConfirmationCode'])
@Index('IDX_users_role', ['role'])
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ name: 'last_name', type: 'varchar', length: 255 })
  lastName: string;

  @Column({ type: 'int' })
  age: number;

  @Column({ type: 'varchar', length: 255 })
  password: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  phone: string;

  @Column({ name: 'job_title', type: 'varchar', length: 255, nullable: true })
  jobTitle: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  company: string | null;

  @Column({
    name: 'email_confirmation_code',
    type: 'varchar',
    length: 36,
    nullable: true,
  })
  emailConfirmationCode: string | null;

  @Column({
    name: 'email_confirmation_expires_at',
    type: 'datetime',
    precision: 6,
    nullable: true,
  })
  emailConfirmationExpiresAt: Date | null;

  @Column({ name: 'is_email_confirmed', type: 'boolean', default: false })
  isEmailConfirmed: boolean;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt: Date;
}
