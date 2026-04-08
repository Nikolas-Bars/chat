import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Entity('message_reactions')
@Unique('UQ_message_reactions_message_user', ['messageId', 'userId'])
export class MessageReaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'message_id', type: 'int' })
  messageId: number;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @Column({ name: 'reaction_value', type: 'varchar', length: 32 })
  reactionValue: string;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt: Date;
}

