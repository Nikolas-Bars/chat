import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { ChatsController } from './api/chats.controller';
import { ChatsGateway } from './api/chats.gateway';
import { ChatsService } from './application/chats.service';
import { Chat } from './domain/chat.entity';
import { ChatReadState } from './domain/chat-read-state.entity';
import { Message } from './domain/message.entity';
import { MessageReaction } from './domain/message-reaction.entity';
import { ReactionCatalog } from './domain/reaction-catalog.entity';
import { ChatsRepository } from './infrastructure/chats.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([Chat, ChatReadState, Message, MessageReaction, ReactionCatalog]),
    UsersModule,
  ],
  controllers: [ChatsController],
  providers: [ChatsService, ChatsRepository, ChatsGateway],
})
export class ChatsModule {}

