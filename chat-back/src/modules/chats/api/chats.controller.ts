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
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/infrastructure/guards/roles.guard';
import { UserRole } from '../../users/domain/user-role.enum';
import { ChatsService } from '../application/chats.service';
import { CreateDirectChatInputDto } from './input-dto/create-direct-chat.input.dto';
import { SendMessageInputDto } from './input-dto/send-message.input.dto';
import { UpdateMessageInputDto } from './input-dto/update-message.input.dto';
import { SetMessageReactionInputDto } from './input-dto/set-message-reaction.input.dto';
import { AddReactionCatalogInputDto } from './input-dto/add-reaction-catalog.input.dto';
import { MarkChatReadInputDto } from './input-dto/mark-chat-read.input.dto';

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

  @Patch(':chatId/read')
  async markRead(
    @Param('chatId', ParseIntPipe) chatId: number,
    @Body() body: MarkChatReadInputDto,
    @ExtractUserFromRequest() user: UserContextDto,
  ) {
    return this.chatsService.markChatRead(Number(user.userId), chatId, body.messageId);
  }

  @Delete(':chatId')
  async deleteChat(
    @Param('chatId', ParseIntPipe) chatId: number,
    @ExtractUserFromRequest() user: UserContextDto,
  ): Promise<void> {
    await this.chatsService.deleteChat(Number(user.userId), chatId);
  }

  @Get('reactions/catalog')
  async listReactionCatalog() {
    return this.chatsService.getReactionCatalog();
  }

  @Post('reactions/catalog')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ROOT)
  async addReactionCatalog(
    @Body() body: AddReactionCatalogInputDto,
    @ExtractUserFromRequest() user: UserContextDto,
  ): Promise<void> {
    await this.chatsService.addReactionToCatalog(
      Number(user.userId),
      user.role,
      body.value,
    );
  }

  @Post(':chatId/messages/:messageId/reaction')
  async setReaction(
    @Param('chatId', ParseIntPipe) chatId: number,
    @Param('messageId', ParseIntPipe) messageId: number,
    @Body() body: SetMessageReactionInputDto,
    @ExtractUserFromRequest() user: UserContextDto,
  ) {
    return this.chatsService.setMessageReaction(
      Number(user.userId),
      chatId,
      messageId,
      body.value,
    );
  }

  @Delete(':chatId/messages/:messageId/reaction')
  async deleteReaction(
    @Param('chatId', ParseIntPipe) chatId: number,
    @Param('messageId', ParseIntPipe) messageId: number,
    @ExtractUserFromRequest() user: UserContextDto,
  ) {
    return this.chatsService.removeMessageReaction(
      Number(user.userId),
      chatId,
      messageId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ROOT)
  @Get('admin/users/:userId/chats')
  async listChatsForUserAsRoot(
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.chatsService.listChatsForUserAsRoot(userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ROOT)
  @Post('admin/chats/:chatId/restore')
  async restoreChatAsRoot(
    @Param('chatId', ParseIntPipe) chatId: number,
  ): Promise<void> {
    await this.chatsService.restoreChatAsRoot(chatId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ROOT)
  @Post('admin/chats/:chatId/delete')
  async deleteChatAsRoot(
    @Param('chatId', ParseIntPipe) chatId: number,
  ): Promise<void> {
    await this.chatsService.deleteChatAsRoot(chatId);
  }
}

