import type { ChatItem, ChatMessage } from '../types'
import { apiUrl, authFetch } from './client'

export type MessageReaction = { value: string; count: number; reactedByMe: boolean }
export type RootManagedChatItem = {
  id: number
  participantIds: number[]
  targetUserId: number
  peer: { id: number; name: string; lastName: string; email: string }
  deletedAt: string | null
  updatedAt: string
  createdAt: string
}

export async function fetchChatsApi(): Promise<ChatItem[]> {
  const res = await authFetch(apiUrl('/chats'))
  if (!res.ok) throw new Error(`Не удалось загрузить чаты (${res.status})`)
  return (await res.json()) as ChatItem[]
}

export async function fetchMessagesApi(chatId: number): Promise<ChatMessage[]> {
  const res = await authFetch(apiUrl(`/chats/${chatId}/messages`))
  if (!res.ok) throw new Error(`Не удалось загрузить сообщения (${res.status})`)
  return (await res.json()) as ChatMessage[]
}

export async function createDirectChatApi(userId: number): Promise<ChatItem> {
  const res = await authFetch(apiUrl('/chats'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  })
  if (!res.ok) throw new Error(`Не удалось создать чат (${res.status})`)
  return (await res.json()) as ChatItem
}

export async function sendMessageApi(chatId: number, content: string): Promise<ChatMessage> {
  const res = await authFetch(apiUrl(`/chats/${chatId}/messages`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  })
  if (!res.ok) throw new Error(`Не удалось отправить сообщение (${res.status})`)
  return (await res.json()) as ChatMessage
}

export async function fetchReactionCatalogApi(): Promise<string[]> {
  const res = await authFetch(apiUrl('/chats/reactions/catalog'))
  if (!res.ok) throw new Error(`Не удалось загрузить реакции (${res.status})`)
  return (await res.json()) as string[]
}

export async function addReactionCatalogApi(value: string): Promise<void> {
  const res = await authFetch(apiUrl('/chats/reactions/catalog'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value }),
  })
  if (!res.ok) throw new Error(`Не удалось добавить реакцию (${res.status})`)
}

export async function setMessageReactionApi(
  chatId: number,
  messageId: number,
  value: string,
): Promise<MessageReaction[]> {
  const res = await authFetch(apiUrl(`/chats/${chatId}/messages/${messageId}/reaction`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value }),
  })
  if (!res.ok) throw new Error(`Не удалось поставить реакцию (${res.status})`)
  return (await res.json()) as MessageReaction[]
}

export async function removeMessageReactionApi(
  chatId: number,
  messageId: number,
): Promise<MessageReaction[]> {
  const res = await authFetch(apiUrl(`/chats/${chatId}/messages/${messageId}/reaction`), {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error(`Не удалось удалить реакцию (${res.status})`)
  return (await res.json()) as MessageReaction[]
}

export async function fetchRootUserChatsApi(userId: number): Promise<RootManagedChatItem[]> {
  const res = await authFetch(apiUrl(`/chats/admin/users/${userId}/chats`))
  if (!res.ok) throw new Error(`Не удалось загрузить чаты пользователя (${res.status})`)
  return (await res.json()) as RootManagedChatItem[]
}

export async function restoreChatAsRootApi(chatId: number): Promise<void> {
  const res = await authFetch(apiUrl(`/chats/admin/chats/${chatId}/restore`), {
    method: 'POST',
  })
  if (!res.ok) throw new Error(`Не удалось восстановить чат (${res.status})`)
}

export async function deleteChatAsRootApi(chatId: number): Promise<void> {
  const res = await authFetch(apiUrl(`/chats/admin/chats/${chatId}/delete`), {
    method: 'POST',
  })
  if (!res.ok) throw new Error(`Не удалось удалить чат (${res.status})`)
}

export async function deleteChatApi(chatId: number): Promise<void> {
  const res = await authFetch(apiUrl(`/chats/${chatId}`), { method: 'DELETE' })
  if (!res.ok) throw new Error(`Не удалось удалить чат (${res.status})`)
}

export async function markChatReadApi(
  chatId: number,
  messageId: number,
): Promise<{ chatId: number; readerUserId: number; lastReadMessageId: number }> {
  const res = await authFetch(apiUrl(`/chats/${chatId}/read`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messageId }),
  })
  if (!res.ok) throw new Error(`Не удалось отметить прочитанным (${res.status})`)
  return (await res.json()) as { chatId: number; readerUserId: number; lastReadMessageId: number }
}
