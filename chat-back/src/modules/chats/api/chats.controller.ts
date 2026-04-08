import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ExtractUserFromRequest } from '../../auth/decorators/extract-user-from-request.decorator';
import { UserContextDto } from '../../auth/application/user-context.dto';
import { JwtAuthGuard } from '../../auth/infrastructure/guards/jwt-auth.guard';
import { ChatsService } from '../application/chats.service';
import { CreateDirectChatInputDto } from './input-dto/create-direct-chat.input.dto';
import { SendMessageInputDto } from './input-dto/send-message.input.dto';
import { UpdateMessageInputDto } from './input-dto/update-message.input.dto';

@UseGuards(JwtAuthGuard)
@Controller('chats')
export class ChatsController {
  constructor(private readonly chatsService: ChatsService) {}

  @Get()
  async list(@ExtractUserFromRequest() user: UserContextDto) {
    return this.chatsService.listChats(Number(user.userId));
  }

  @Post()
  async createDirect(
    @Body() body: CreateDirectChatInputDto,
    @ExtractUserFromRequest() user: UserContextDto,
  ) {
    return this.chatsService.createOrGetDirectChat(Number(user.userId), body.userId);
  }

  @Get(':chatId/messages')
  async messages(
    @Param('chatId', ParseIntPipe) chatId: number,
    @ExtractUserFromRequest() user: UserContextDto,
  ) {
    return this.chatsService.getMessages(Number(user.userId), chatId);
  }

  @Post(':chatId/messages')
  async sendMessage(
    @Param('chatId', ParseIntPipe) chatId: number,
    @Body() body: SendMessageInputDto,
    @ExtractUserFromRequest() user: UserContextDto,
  ) {
    return this.chatsService.sendMessage(Number(user.userId), chatId, body.content);
  }

  @Patch(':chatId/messages/:messageId')
  async updateMessage(
    @Param('chatId', ParseIntPipe) chatId: number,
    @Param('messageId', ParseIntPipe) messageId: number,
    @Body() body: UpdateMessageInputDto,
    @ExtractUserFromRequest() user: UserContextDto,
  ) {
    return this.chatsService.updateMessage(
      Number(user.userId),
      chatId,
      messageId,
      body.content,
    );
  }

  @Delete(':chatId/messages/:messageId')
  async deleteMessage(
    @Param('chatId', ParseIntPipe) chatId: number,
    @Param('messageId', ParseIntPipe) messageId: number,
    @ExtractUserFromRequest() user: UserContextDto,
  ): Promise<void> {
    await this.chatsService.deleteMessage(Number(user.userId), chatId, messageId);
  }

  @Delete(':chatId')
  async deleteChat(
    @Param('chatId', ParseIntPipe) chatId: number,
    @ExtractUserFromRequest() user: UserContextDto,
  ): Promise<void> {
    await this.chatsService.deleteChat(Number(user.userId), chatId);
  }
}

