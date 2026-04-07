import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { ChatsController } from './api/chats.controller';
import { ChatsGateway } from './api/chats.gateway';
import { ChatsService } from './application/chats.service';
import { Chat } from './domain/chat.entity';
import { Message } from './domain/message.entity';
import { ChatsRepository } from './infrastructure/chats.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Chat, Message]), UsersModule],
  controllers: [ChatsController],
  providers: [ChatsService, ChatsRepository, ChatsGateway],
})
export class ChatsModule {}

