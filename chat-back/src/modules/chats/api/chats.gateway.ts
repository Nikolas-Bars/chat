import {
  ConnectedSocket,
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import jwt from 'jsonwebtoken';

function originFromPublicAppUrl(): string[] {
  const raw = process.env.PUBLIC_APP_URL?.trim();
  if (!raw) return [];
  try {
    return [new URL(raw).origin];
  } catch {
    return [];
  }
}

function getCorsOrigins(): string[] {
  const defaults = ['http://localhost:5173', 'http://127.0.0.1:5173'];
  const extra =
    process.env.CORS_ORIGINS?.split(',')
      .map((s) => s.trim())
      .filter(Boolean) ?? [];
  return [...new Set([...defaults, ...extra, ...originFromPublicAppUrl()])];
}

function extractCookie(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(';').map((p) => p.trim());
  const prefix = `${name}=`;
  const found = parts.find((p) => p.startsWith(prefix));
  if (!found) return null;
  return decodeURIComponent(found.slice(prefix.length));
}

@WebSocketGateway({
  namespace: 'chats',
  cors: {
    origin: getCorsOrigins(),
    credentials: true,
  },
})
export class ChatsGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  handleConnection(@ConnectedSocket() client: Socket): void {
    const tokenFromAuth =
      typeof client.handshake.auth?.token === 'string'
        ? client.handshake.auth.token
        : null;
    const tokenFromCookie = extractCookie(
      client.handshake.headers.cookie,
      'accessToken',
    );
    const token = tokenFromAuth || tokenFromCookie;
    if (!token) {
      client.disconnect(true);
      return;
    }

    try {
      const payload = jwt.verify(
        token,
        process.env.JWT_ACCESS_SECRET || 'secret',
      ) as { sub?: string | number };
      if (!payload?.sub) {
        client.disconnect(true);
        return;
      }
      const userId = Number(payload.sub);
      client.data.userId = userId;
      client.join(`user:${userId}`);
    } catch {
      client.disconnect(true);
    }
  }

  emitChatUpdated(userIds: number[], chatId: number): void {
    for (const userId of userIds) {
      this.server.to(`user:${userId}`).emit('chat:updated', { chatId });
    }
  }

  emitChatDeleted(userIds: number[], chatId: number): void {
    for (const userId of userIds) {
      this.server.to(`user:${userId}`).emit('chat:deleted', { chatId });
    }
  }

  emitMessageNew(
    userIds: number[],
    payload: {
      id: number;
      chatId: number;
      senderId: number;
      content: string;
      createdAt: Date;
      updatedAt?: Date;
      readByPeer?: boolean;
    },
  ): void {
    for (const userId of userIds) {
      this.server.to(`user:${userId}`).emit('message:new', payload);
    }
  }

  emitMessageUpdated(
    userIds: number[],
    payload: { id: number; chatId: number; content: string; updatedAt: Date },
  ): void {
    for (const userId of userIds) {
      this.server.to(`user:${userId}`).emit('message:updated', payload);
    }
  }

  emitMessageDeleted(
    userIds: number[],
    payload: { id: number; chatId: number },
  ): void {
    for (const userId of userIds) {
      this.server.to(`user:${userId}`).emit('message:deleted', payload);
    }
  }

  emitMessageReactionsUpdated(
    userIds: number[],
    payload: {
      chatId: number;
      messageId: number;
      reactions: Array<{ value: string; count: number; reactedByMe: boolean }>;
    },
  ): void {
    for (const userId of userIds) {
      const normalized = {
        ...payload,
        reactions: payload.reactions.map((r) => ({
          value: r.value,
          count: r.count,
          reactedByMe: false,
        })),
      };
      this.server.to(`user:${userId}`).emit('message:reactions-updated', normalized);
    }
  }

  emitChatReadUpdated(
    userIds: number[],
    payload: { chatId: number; readerUserId: number; lastReadMessageId: number },
  ): void {
    for (const userId of userIds) {
      this.server.to(`user:${userId}`).emit('chat:read-updated', payload);
    }
  }
}

