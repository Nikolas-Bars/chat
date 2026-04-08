import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Entity('chat_read_states')
@Unique('UQ_chat_read_states_chat_user', ['chatId', 'userId'])
@Index('IDX_chat_read_states_user_id', ['userId'])
export class ChatReadState {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'chat_id', type: 'int' })
  chatId: number;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @Column({ name: 'last_read_message_id', type: 'int', nullable: true })
  lastReadMessageId: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt: Date;
}
