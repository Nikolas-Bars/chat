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

  emitMessageNew(
    userIds: number[],
    payload: { id: number; chatId: number; senderId: number; content: string; createdAt: Date },
  ): void {
    for (const userId of userIds) {
      this.server.to(`user:${userId}`).emit('message:new', payload);
    }
  }
}

