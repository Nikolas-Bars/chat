import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'chat_id', type: 'int' })
  chatId: number;

  @Column({ name: 'sender_id', type: 'int' })
  senderId: number;

  @Column({ type: 'text' })
  content: string;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'datetime', precision: 6, nullable: true })
  deletedAt: Date | null;
}

