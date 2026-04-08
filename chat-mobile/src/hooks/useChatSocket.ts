import { useEffect, useRef } from 'react'
import { io, type Socket } from 'socket.io-client'
import type { ChatMessage } from '../types'
import { API_BASE_URL } from '../config'
import { useAuth } from '../context/AuthContext'
import { useChat } from '../context/ChatContext'

let chatsRefreshTimer: ReturnType<typeof setTimeout> | null = null

export function useChatSocket(): void {
  const { token } = useAuth()
  const chat = useChat()
  const chatRef = useRef(chat)
  chatRef.current = chat
  const lastMessageNewAtByChatId = useRef(new Map<number, number>())

  useEffect(() => {
    if (!token) return

    const socket: Socket = io(`${API_BASE_URL}/chats`, {
      auth: { token },
    })

    const scheduleChatsRefresh = () => {
      if (chatsRefreshTimer !== null) return
      chatsRefreshTimer = setTimeout(() => {
        chatsRefreshTimer = null
        void chatRef.current.fetchChats()
      }, 150)
    }

    socket.on('chat:updated', (payload: { chatId: number }) => {
      const t = lastMessageNewAtByChatId.current.get(payload.chatId)
      if (t !== undefined && Date.now() - t < 600) return
      scheduleChatsRefresh()
    })

    socket.on('message:new', (payload: ChatMessage) => {
      lastMessageNewAtByChatId.current.set(payload.chatId, Date.now())
      const c = chatRef.current
      c.applyMessageNew(payload)
      if (
        c.selectedChatId === payload.chatId &&
        c.currentUserId !== null &&
        payload.senderId !== c.currentUserId
      ) {
        void c.markChatRead(payload.chatId, payload.id)
      }
    })

    socket.on(
      'message:updated',
      (payload: { id: number; chatId: number; content: string; updatedAt: string }) => {
        chatRef.current.applyMessageUpdated(payload)
      },
    )

    socket.on('message:deleted', (payload: { id: number; chatId: number }) => {
      chatRef.current.applyMessageDeleted(payload)
    })

    socket.on('chat:deleted', (payload: { chatId: number }) => {
      chatRef.current.applyChatDeleted(payload)
    })

    socket.on(
      'message:reactions-updated',
      (payload: {
        chatId: number
        messageId: number
        reactions: Array<{ value: string; count: number; reactedByMe: boolean }>
      }) => {
        chatRef.current.applyMessageReactionsUpdated(payload)
      },
    )

    socket.on(
      'chat:read-updated',
      (payload: {
        chatId: number
        readerUserId: number
        lastReadMessageId: number
      }) => {
        chatRef.current.applyChatReadUpdated(payload)
      },
    )

    return () => {
      socket.disconnect()
      if (chatsRefreshTimer !== null) {
        clearTimeout(chatsRefreshTimer)
        chatsRefreshTimer = null
      }
    }
  }, [token])
}
