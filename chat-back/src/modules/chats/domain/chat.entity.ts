import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Entity('chats')
@Unique('UQ_chats_user_pair', ['firstUserId', 'secondUserId'])
export class Chat {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'first_user_id', type: 'int' })
  firstUserId: number;

  @Column({ name: 'second_user_id', type: 'int' })
  secondUserId: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'datetime', precision: 6, nullable: true })
  deletedAt: Date | null;
}

