import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UsersExternalService } from '../../users/application/users-external.service';
import { ChatsRepository } from '../infrastructure/chats.repository';
import { Chat } from '../domain/chat.entity';
import { ChatsGateway } from '../api/chats.gateway';
import { UserRole } from '../../users/domain/user-role.enum';

function sortPair(a: number, b: number): [number, number] {
  return a < b ? [a, b] : [b, a];
}

@Injectable()
export class ChatsService {
  constructor(
    private readonly chatsRepository: ChatsRepository,
    private readonly usersExternalService: UsersExternalService,
    private readonly chatsGateway: ChatsGateway,
  ) {}

  private ensureParticipant(chat: Chat, userId: number): void {
    if (chat.firstUserId !== userId && chat.secondUserId !== userId) {
      throw new ForbiddenException('You are not a participant of this chat');
    }
  }

  private buildReactionsSummary(
    reactions: Array<{ userId: number; reactionValue: string }>,
    currentUserId: number,
  ): Array<{ value: string; count: number; reactedByMe: boolean }> {
    const map = new Map<string, { value: string; count: number; reactedByMe: boolean }>();
    for (const reaction of reactions) {
      const existed = map.get(reaction.reactionValue);
      if (existed) {
        existed.count += 1;
        if (reaction.userId === currentUserId) existed.reactedByMe = true;
        continue;
      }
      map.set(reaction.reactionValue, {
        value: reaction.reactionValue,
        count: 1,
        reactedByMe: reaction.userId === currentUserId,
      });
    }
    return Array.from(map.values());
  }

  async createOrGetDirectChat(currentUserId: number, targetUserId: number) {
    if (currentUserId === targetUserId) {
      throw new BadRequestException('Cannot create chat with yourself');
    }
    const target = await this.usersExternalService.findById(targetUserId);
    if (!target) {
      throw new NotFoundException('User not found');
    }
    const [firstUserId, secondUserId] = sortPair(currentUserId, targetUserId);
    const existed = await this.chatsRepository.findDirectByPairWithDeleted(
      firstUserId,
      secondUserId,
    );
    if (existed) {
      if (existed.deletedAt) {
        await this.chatsRepository.restoreChat(existed.id);
      }
      const activeChat =
        (await this.chatsRepository.findById(existed.id)) ?? existed;
      this.chatsGateway.emitChatUpdated(
        [currentUserId, targetUserId],
        activeChat.id,
      );
      return this.mapChat(
        activeChat,
        currentUserId,
        null,
        target.id,
        target.name,
        target.lastName,
        target.email,
      );
    }
    const created = await this.chatsRepository.createDirect(
      firstUserId,
      secondUserId,
    );
    this.chatsGateway.emitChatUpdated(
      [currentUserId, targetUserId],
      created.id,
    );
    return this.mapChat(
      created,
      currentUserId,
      null,
      target.id,
      target.name,
      target.lastName,
      target.email,
    );
  }

  async listChats(currentUserId: number) {
    const chats = await this.chatsRepository.findByUserId(currentUserId);
    const chatIds = chats.map((c) => c.id);
    const lastMessages =
      await this.chatsRepository.findLastMessagesByChatIds(chatIds);

    const peerIds = new Set<number>();
    for (const chat of chats) {
      peerIds.add(
        chat.firstUserId === currentUserId
          ? chat.secondUserId
          : chat.firstUserId,
      );
    }
    const peersMap = new Map<
      number,
      { id: number; name: string; lastName: string; email: string }
    >();
    await Promise.all(
      Array.from(peerIds).map(async (id) => {
        const user = await this.usersExternalService.findById(id);
        if (user) {
          peersMap.set(id, {
            id: user.id,
            name: user.name,
            lastName: user.lastName,
            email: user.email,
          });
        }
      }),
    );

    return chats.map((chat) => {
      const peerId =
        chat.firstUserId === currentUserId
          ? chat.secondUserId
          : chat.firstUserId;
      const peer = peersMap.get(peerId);
      const last = lastMessages.get(chat.id) ?? null;
      return this.mapChat(
        chat,
        currentUserId,
        last,
        peer?.id ?? peerId,
        peer?.name ?? 'Unknown',
        peer?.lastName ?? '',
        peer?.email ?? '',
      );
    });
  }

  async getMessages(currentUserId: number, chatId: number) {
    const chat = await this.chatsRepository.findById(chatId);
    if (!chat) {
      throw new NotFoundException('Chat not found');
    }
    this.ensureParticipant(chat, currentUserId);
    const messages = await this.chatsRepository.findMessagesByChat(chatId);
    const reactions = await this.chatsRepository.findReactionsByMessageIds(
      messages.map((m) => m.id),
    );
    const reactionsByMessage = new Map<number, Array<{ userId: number; reactionValue: string }>>();
    for (const reaction of reactions) {
      const bucket = reactionsByMessage.get(reaction.messageId) ?? [];
      bucket.push({ userId: reaction.userId, reactionValue: reaction.reactionValue });
      reactionsByMessage.set(reaction.messageId, bucket);
    }
    return messages.map((m) => ({
      id: m.id,
      chatId: m.chatId,
      senderId: m.senderId,
      content: m.content,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
      reactions: this.buildReactionsSummary(
        reactionsByMessage.get(m.id) ?? [],
        currentUserId,
      ),
    }));
  }

  async sendMessage(currentUserId: number, chatId: number, content: string) {
    const chat = await this.chatsRepository.findById(chatId);
    if (!chat) {
      throw new NotFoundException('Chat not found');
    }
    this.ensureParticipant(chat, currentUserId);
    const message = await this.chatsRepository.createMessage(
      chatId,
      currentUserId,
      content.trim(),
    );
    // Обновляем updatedAt чата как маркер последней активности.
    await this.chatsRepository.touch(chat);
    const payload = {
      id: message.id,
      chatId: message.chatId,
      senderId: message.senderId,
      content: message.content,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
      reactions: [],
    };
    this.chatsGateway.emitMessageNew(
      [chat.firstUserId, chat.secondUserId],
      payload,
    );
    this.chatsGateway.emitChatUpdated(
      [chat.firstUserId, chat.secondUserId],
      chat.id,
    );
    return payload;
  }

  async updateMessage(
    currentUserId: number,
    chatId: number,
    messageId: number,
    content: string,
  ) {
    const chat = await this.chatsRepository.findById(chatId);
    if (!chat) throw new NotFoundException('Chat not found');
    this.ensureParticipant(chat, currentUserId);

    const message = await this.chatsRepository.findMessageById(
      chatId,
      messageId,
    );
    if (!message) throw new NotFoundException('Message not found');
    if (message.senderId !== currentUserId) {
      throw new ForbiddenException('You can edit only your messages');
    }

    message.content = content.trim();
    const saved = await this.chatsRepository.saveMessage(message);
    this.chatsGateway.emitMessageUpdated(
      [chat.firstUserId, chat.secondUserId],
      {
        id: saved.id,
        chatId: saved.chatId,
        content: saved.content,
        updatedAt: saved.updatedAt,
      },
    );
    await this.chatsRepository.touch(chat);
    this.chatsGateway.emitChatUpdated(
      [chat.firstUserId, chat.secondUserId],
      chat.id,
    );
    return {
      id: saved.id,
      chatId: saved.chatId,
      senderId: saved.senderId,
      content: saved.content,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
      reactions: this.buildReactionsSummary(
        (
          await this.chatsRepository.findReactionsByMessageIds([saved.id])
        ).map((r) => ({ userId: r.userId, reactionValue: r.reactionValue })),
        currentUserId,
      ),
    };
  }

  async deleteMessage(
    currentUserId: number,
    chatId: number,
    messageId: number,
  ): Promise<void> {
    const chat = await this.chatsRepository.findById(chatId);
    if (!chat) throw new NotFoundException('Chat not found');
    this.ensureParticipant(chat, currentUserId);

    const message = await this.chatsRepository.findMessageById(
      chatId,
      messageId,
    );
    if (!message) throw new NotFoundException('Message not found');
    if (message.senderId !== currentUserId) {
      throw new ForbiddenException('You can delete only your messages');
    }
    await this.chatsRepository.softDeleteMessage(message);
    this.chatsGateway.emitMessageDeleted(
      [chat.firstUserId, chat.secondUserId],
      { id: message.id, chatId },
    );
    await this.chatsRepository.touch(chat);
    this.chatsGateway.emitChatUpdated(
      [chat.firstUserId, chat.secondUserId],
      chat.id,
    );
  }

  async deleteChat(currentUserId: number, chatId: number): Promise<void> {
    const chat = await this.chatsRepository.findById(chatId);
    if (!chat) throw new NotFoundException('Chat not found');
    this.ensureParticipant(chat, currentUserId);
    await this.chatsRepository.softDeleteChat(chat);
    this.chatsGateway.emitChatDeleted(
      [chat.firstUserId, chat.secondUserId],
      chat.id,
    );
  }

  async getReactionCatalog(): Promise<string[]> {
    const items = await this.chatsRepository.findReactionCatalog();
    return items.map((i) => i.value);
  }

  async addReactionToCatalog(currentUserId: number, role: UserRole, value: string): Promise<void> {
    if (role !== UserRole.ROOT) {
      throw new ForbiddenException('Only root can add reactions to catalog');
    }
    const normalized = value.trim();
    if (!normalized) {
      throw new BadRequestException('Reaction cannot be empty');
    }
    const existed = await this.chatsRepository.findReactionCatalogItem(normalized);
    if (existed) return;
    await this.chatsRepository.addReactionCatalogItem(normalized, currentUserId);
  }

  async setMessageReaction(
    currentUserId: number,
    chatId: number,
    messageId: number,
    value: string,
  ): Promise<Array<{ value: string; count: number; reactedByMe: boolean }>> {
    const chat = await this.chatsRepository.findById(chatId);
    if (!chat) throw new NotFoundException('Chat not found');
    this.ensureParticipant(chat, currentUserId);
    const message = await this.chatsRepository.findMessageById(chatId, messageId);
    if (!message) throw new NotFoundException('Message not found');
    const normalized = value.trim();
    if (!normalized) throw new BadRequestException('Reaction cannot be empty');
    const allowed = await this.chatsRepository.findReactionCatalogItem(normalized);
    if (!allowed) throw new BadRequestException('Reaction is not allowed');
    await this.chatsRepository.saveMessageReaction(messageId, currentUserId, normalized);
    const allReactions = await this.chatsRepository.findReactionsByMessageIds([messageId]);
    const summary = this.buildReactionsSummary(
      allReactions.map((r) => ({ userId: r.userId, reactionValue: r.reactionValue })),
      currentUserId,
    );
    this.chatsGateway.emitMessageReactionsUpdated(
      [chat.firstUserId, chat.secondUserId],
      { chatId, messageId, reactions: summary },
    );
    return summary;
  }

  async removeMessageReaction(
    currentUserId: number,
    chatId: number,
    messageId: number,
  ): Promise<Array<{ value: string; count: number; reactedByMe: boolean }>> {
    const chat = await this.chatsRepository.findById(chatId);
    if (!chat) throw new NotFoundException('Chat not found');
    this.ensureParticipant(chat, currentUserId);
    const message = await this.chatsRepository.findMessageById(chatId, messageId);
    if (!message) throw new NotFoundException('Message not found');
    await this.chatsRepository.removeMessageReaction(messageId, currentUserId);
    const allReactions = await this.chatsRepository.findReactionsByMessageIds([messageId]);
    const summary = this.buildReactionsSummary(
      allReactions.map((r) => ({ userId: r.userId, reactionValue: r.reactionValue })),
      currentUserId,
    );
    this.chatsGateway.emitMessageReactionsUpdated(
      [chat.firstUserId, chat.secondUserId],
      { chatId, messageId, reactions: summary },
    );
    return summary;
  }

  async listChatsForUserAsRoot(targetUserId: number) {
    const target = await this.usersExternalService.findById(targetUserId);
    if (!target) {
      throw new NotFoundException('User not found');
    }
    const chats = await this.chatsRepository.findByUserIdWithDeleted(targetUserId);
    const peerIds = new Set<number>();
    for (const chat of chats) {
      peerIds.add(
        chat.firstUserId === targetUserId ? chat.secondUserId : chat.firstUserId,
      );
    }
    const peersMap = new Map<number, { id: number; name: string; lastName: string; email: string }>();
    await Promise.all(
      Array.from(peerIds).map(async (id) => {
        const user = await this.usersExternalService.findById(id);
        if (user) {
          peersMap.set(id, {
            id: user.id,
            name: user.name,
            lastName: user.lastName,
            email: user.email,
          });
        }
      }),
    );

    return chats.map((chat) => {
      const peerId =
        chat.firstUserId === targetUserId ? chat.secondUserId : chat.firstUserId;
      const peer = peersMap.get(peerId);
      return {
        id: chat.id,
        participantIds: [chat.firstUserId, chat.secondUserId],
        targetUserId,
        peer: {
          id: peer?.id ?? peerId,
          name: peer?.name ?? 'Unknown',
          lastName: peer?.lastName ?? '',
          email: peer?.email ?? '',
        },
        deletedAt: chat.deletedAt,
        updatedAt: chat.updatedAt,
        createdAt: chat.createdAt,
      };
    });
  }

  async restoreChatAsRoot(chatId: number): Promise<void> {
    const chat = await this.chatsRepository.findByIdWithDeleted(chatId);
    if (!chat) {
      throw new NotFoundException('Chat not found');
    }
    if (!chat.deletedAt) {
      return;
    }
    await this.chatsRepository.restoreChat(chat.id);
    this.chatsGateway.emitChatUpdated([chat.firstUserId, chat.secondUserId], chat.id);
  }

  async deleteChatAsRoot(chatId: number): Promise<void> {
    const chat = await this.chatsRepository.findByIdWithDeleted(chatId);
    if (!chat) {
      throw new NotFoundException('Chat not found');
    }
    if (!chat.deletedAt) {
      await this.chatsRepository.softDeleteChat(chat);
      this.chatsGateway.emitChatDeleted(
        [chat.firstUserId, chat.secondUserId],
        chat.id,
      );
    }
  }

  private mapChat(
    chat: Chat,
    currentUserId: number,
    lastMessage: {
      id: number;
      senderId: number;
      content: string;
      createdAt: Date;
    } | null,
    peerId: number,
    peerName: string,
    peerLastName: string,
    peerEmail: string,
  ) {
    return {
      id: chat.id,
      participantIds: [chat.firstUserId, chat.secondUserId],
      currentUserId,
      peer: {
        id: peerId,
        name: peerName,
        lastName: peerLastName,
        email: peerEmail,
      },
      lastMessage: lastMessage
        ? {
            id: lastMessage.id,
            senderId: lastMessage.senderId,
            content: lastMessage.content,
            createdAt: lastMessage.createdAt,
          }
        : null,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
    };
  }
}
