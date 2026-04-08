import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Chat } from '../domain/chat.entity';
import { Message } from '../domain/message.entity';
import { MessageReaction } from '../domain/message-reaction.entity';
import { ReactionCatalog } from '../domain/reaction-catalog.entity';

@Injectable()
export class ChatsRepository {
  constructor(
    @InjectRepository(Chat)
    private readonly chatRepo: Repository<Chat>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    @InjectRepository(MessageReaction)
    private readonly messageReactionRepo: Repository<MessageReaction>,
    @InjectRepository(ReactionCatalog)
    private readonly reactionCatalogRepo: Repository<ReactionCatalog>,
  ) {}

  async findDirectByPair(firstUserId: number, secondUserId: number): Promise<Chat | null> {
    return this.chatRepo.findOne({
      where: { firstUserId, secondUserId },
    });
  }

  async findDirectByPairWithDeleted(
    firstUserId: number,
    secondUserId: number,
  ): Promise<Chat | null> {
    return this.chatRepo
      .createQueryBuilder('c')
      .withDeleted()
      .where('c.first_user_id = :firstUserId', { firstUserId })
      .andWhere('c.second_user_id = :secondUserId', { secondUserId })
      .getOne();
  }

  async createDirect(firstUserId: number, secondUserId: number): Promise<Chat> {
    const chat = this.chatRepo.create({ firstUserId, secondUserId });
    return this.chatRepo.save(chat);
  }

  async findByUserId(userId: number): Promise<Chat[]> {
    return this.chatRepo
      .createQueryBuilder('c')
      .where('c.first_user_id = :userId OR c.second_user_id = :userId', { userId })
      .andWhere('c.deleted_at IS NULL')
      .orderBy('c.updated_at', 'DESC')
      .getMany();
  }

  async findById(id: number): Promise<Chat | null> {
    return this.chatRepo.findOne({ where: { id } });
  }

  async touch(chat: Chat): Promise<Chat> {
    return this.chatRepo.save(chat);
  }

  async softDeleteChat(chat: Chat): Promise<void> {
    await this.chatRepo.softDelete(chat.id);
  }

  async restoreChat(chatId: number): Promise<void> {
    await this.chatRepo.restore(chatId);
  }

  async findByUserIdWithDeleted(userId: number): Promise<Chat[]> {
    return this.chatRepo
      .createQueryBuilder('c')
      .withDeleted()
      .where('c.first_user_id = :userId OR c.second_user_id = :userId', { userId })
      .orderBy('c.updated_at', 'DESC')
      .getMany();
  }

  async findByIdWithDeleted(id: number): Promise<Chat | null> {
    return this.chatRepo
      .createQueryBuilder('c')
      .withDeleted()
      .where('c.id = :id', { id })
      .getOne();
  }

  async createMessage(chatId: number, senderId: number, content: string): Promise<Message> {
    const message = this.messageRepo.create({ chatId, senderId, content });
    return this.messageRepo.save(message);
  }

  async findMessagesByChat(chatId: number, limit = 100): Promise<Message[]> {
    const items = await this.messageRepo.find({
      where: { chatId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
    return items.reverse();
  }

  async findMessageById(chatId: number, messageId: number): Promise<Message | null> {
    return this.messageRepo.findOne({ where: { id: messageId, chatId } });
  }

  async saveMessage(message: Message): Promise<Message> {
    return this.messageRepo.save(message);
  }

  async softDeleteMessage(message: Message): Promise<void> {
    await this.messageRepo.softDelete(message.id);
  }

  async findLastMessagesByChatIds(chatIds: number[]): Promise<Map<number, Message>> {
    if (chatIds.length === 0) {
      return new Map();
    }
    const all = await this.messageRepo.find({
      where: { chatId: In(chatIds) },
      order: { createdAt: 'DESC' },
    });
    const map = new Map<number, Message>();
    for (const m of all) {
      if (!map.has(m.chatId)) {
        map.set(m.chatId, m);
      }
    }
    return map;
  }

  async findReactionsByMessageIds(messageIds: number[]): Promise<MessageReaction[]> {
    if (messageIds.length === 0) return [];
    return this.messageReactionRepo.find({
      where: { messageId: In(messageIds) },
    });
  }

  async findReactionCatalog(): Promise<ReactionCatalog[]> {
    return this.reactionCatalogRepo.find({ order: { value: 'ASC' } });
  }

  async findReactionCatalogItem(value: string): Promise<ReactionCatalog | null> {
    return this.reactionCatalogRepo.findOne({ where: { value } });
  }

  async addReactionCatalogItem(
    value: string,
    createdByUserId: number,
  ): Promise<ReactionCatalog> {
    const item = this.reactionCatalogRepo.create({ value, createdByUserId });
    return this.reactionCatalogRepo.save(item);
  }

  async findMessageReaction(
    messageId: number,
    userId: number,
  ): Promise<MessageReaction | null> {
    return this.messageReactionRepo.findOne({ where: { messageId, userId } });
  }

  async saveMessageReaction(
    messageId: number,
    userId: number,
    reactionValue: string,
  ): Promise<MessageReaction> {
    const existed = await this.findMessageReaction(messageId, userId);
    if (existed) {
      existed.reactionValue = reactionValue;
      return this.messageReactionRepo.save(existed);
    }
    const created = this.messageReactionRepo.create({
      messageId,
      userId,
      reactionValue,
    });
    return this.messageReactionRepo.save(created);
  }

  async removeMessageReaction(messageId: number, userId: number): Promise<void> {
    await this.messageReactionRepo.delete({ messageId, userId });
  }
}

