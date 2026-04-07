import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UsersExternalService } from '../../users/application/users-external.service';
import { ChatsRepository } from '../infrastructure/chats.repository';
import { Chat } from '../domain/chat.entity';

function sortPair(a: number, b: number): [number, number] {
  return a < b ? [a, b] : [b, a];
}

@Injectable()
export class ChatsService {
  constructor(
    private readonly chatsRepository: ChatsRepository,
    private readonly usersExternalService: UsersExternalService,
  ) {}

  private ensureParticipant(chat: Chat, userId: number): void {
    if (chat.firstUserId !== userId && chat.secondUserId !== userId) {
      throw new ForbiddenException('You are not a participant of this chat');
    }
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
    const existed = await this.chatsRepository.findDirectByPair(firstUserId, secondUserId);
    if (existed) {
      return this.mapChat(existed, currentUserId, null, target.id, target.name, target.lastName, target.email);
    }
    const created = await this.chatsRepository.createDirect(firstUserId, secondUserId);
    return this.mapChat(created, currentUserId, null, target.id, target.name, target.lastName, target.email);
  }

  async listChats(currentUserId: number) {
    const chats = await this.chatsRepository.findByUserId(currentUserId);
    const chatIds = chats.map((c) => c.id);
    const lastMessages = await this.chatsRepository.findLastMessagesByChatIds(chatIds);

    const peerIds = new Set<number>();
    for (const chat of chats) {
      peerIds.add(chat.firstUserId === currentUserId ? chat.secondUserId : chat.firstUserId);
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
      const peerId = chat.firstUserId === currentUserId ? chat.secondUserId : chat.firstUserId;
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
    return messages.map((m) => ({
      id: m.id,
      chatId: m.chatId,
      senderId: m.senderId,
      content: m.content,
      createdAt: m.createdAt,
    }));
  }

  async sendMessage(currentUserId: number, chatId: number, content: string) {
    const chat = await this.chatsRepository.findById(chatId);
    if (!chat) {
      throw new NotFoundException('Chat not found');
    }
    this.ensureParticipant(chat, currentUserId);
    const message = await this.chatsRepository.createMessage(chatId, currentUserId, content.trim());
    // Обновляем updatedAt чата как маркер последней активности.
    await this.chatsRepository.touch(chat);
    return {
      id: message.id,
      chatId: message.chatId,
      senderId: message.senderId,
      content: message.content,
      createdAt: message.createdAt,
    };
  }

  private mapChat(
    chat: Chat,
    currentUserId: number,
    lastMessage: { id: number; senderId: number; content: string; createdAt: Date } | null,
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

