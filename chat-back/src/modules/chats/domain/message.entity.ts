import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('messages')
@Index('IDX_messages_chat_id', ['chatId'])
@Index('IDX_messages_sender_id', ['senderId'])
@Index('IDX_messages_chat_deleted_created', ['chatId', 'deletedAt', 'createdAt'])
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

