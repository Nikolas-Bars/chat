import { apiUrl } from './config'
import { getAuthHeaders } from './auth'

export type ChatMessage = {
  id: number
  chatId: number
  senderId: number
  content: string
  createdAt: string
  updatedAt?: string
  reactions?: Array<{
    value: string
    count: number
    reactedByMe: boolean
  }>
}

export type ChatItem = {
  id: number
  peer: {
    id: number
    name: string
    lastName: string
    email: string
  }
  lastMessage: null | {
    id: number
    senderId: number
    content: string
    createdAt: string
  }
}

export async function fetchChatsApi(): Promise<ChatItem[]> {
  const res = await fetch(apiUrl('/chats'), {
    headers: getAuthHeaders(),
    credentials: 'include',
  })
  if (!res.ok) throw new Error(`Не удалось загрузить чаты (${res.status})`)
  return (await res.json()) as ChatItem[]
}

export async function fetchMessagesApi(chatId: number): Promise<ChatMessage[]> {
  const res = await fetch(apiUrl(`/chats/${chatId}/messages`), {
    headers: getAuthHeaders(),
    credentials: 'include',
  })
  if (!res.ok) throw new Error(`Не удалось загрузить сообщения (${res.status})`)
  return (await res.json()) as ChatMessage[]
}

export async function createDirectChatApi(userId: number): Promise<ChatItem> {
  const res = await fetch(apiUrl('/chats'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    credentials: 'include',
    body: JSON.stringify({ userId }),
  })
  if (!res.ok) throw new Error(`Не удалось создать чат (${res.status})`)
  return (await res.json()) as ChatItem
}

export async function sendMessageApi(chatId: number, content: string): Promise<void> {
  const res = await fetch(apiUrl(`/chats/${chatId}/messages`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    credentials: 'include',
    body: JSON.stringify({ content }),
  })
  if (!res.ok) throw new Error(`Не удалось отправить сообщение (${res.status})`)
}

export async function fetchReactionCatalogApi(): Promise<string[]> {
  const res = await fetch(apiUrl('/chats/reactions/catalog'), {
    headers: getAuthHeaders(),
    credentials: 'include',
  })
  if (!res.ok) throw new Error(`Не удалось загрузить реакции (${res.status})`)
  return (await res.json()) as string[]
}

export async function addReactionCatalogApi(value: string): Promise<void> {
  const res = await fetch(apiUrl('/chats/reactions/catalog'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    credentials: 'include',
    body: JSON.stringify({ value }),
  })
  if (!res.ok) throw new Error(`Не удалось добавить реакцию (${res.status})`)
}

export async function setMessageReactionApi(
  chatId: number,
  messageId: number,
  value: string,
): Promise<Array<{ value: string; count: number; reactedByMe: boolean }>> {
  const res = await fetch(apiUrl(`/chats/${chatId}/messages/${messageId}/reaction`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    credentials: 'include',
    body: JSON.stringify({ value }),
  })
  if (!res.ok) throw new Error(`Не удалось поставить реакцию (${res.status})`)
  return (await res.json()) as Array<{ value: string; count: number; reactedByMe: boolean }>
}

export async function removeMessageReactionApi(
  chatId: number,
  messageId: number,
): Promise<Array<{ value: string; count: number; reactedByMe: boolean }>> {
  const res = await fetch(apiUrl(`/chats/${chatId}/messages/${messageId}/reaction`), {
    method: 'DELETE',
    headers: getAuthHeaders(),
    credentials: 'include',
  })
  if (!res.ok) throw new Error(`Не удалось удалить реакцию (${res.status})`)
  return (await res.json()) as Array<{ value: string; count: number; reactedByMe: boolean }>
}

export async function updateMessageApi(
  chatId: number,
  messageId: number,
  content: string,
): Promise<ChatMessage> {
  const res = await fetch(apiUrl(`/chats/${chatId}/messages/${messageId}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    credentials: 'include',
    body: JSON.stringify({ content }),
  })
  if (!res.ok) throw new Error(`Не удалось изменить сообщение (${res.status})`)
  return (await res.json()) as ChatMessage
}

export async function deleteMessageApi(chatId: number, messageId: number): Promise<void> {
  const res = await fetch(apiUrl(`/chats/${chatId}/messages/${messageId}`), {
    method: 'DELETE',
    headers: getAuthHeaders(),
    credentials: 'include',
  })
  if (!res.ok) throw new Error(`Не удалось удалить сообщение (${res.status})`)
}

export async function deleteChatApi(chatId: number): Promise<void> {
  const res = await fetch(apiUrl(`/chats/${chatId}`), {
    method: 'DELETE',
    headers: getAuthHeaders(),
    credentials: 'include',
  })
  if (!res.ok) throw new Error(`Не удалось удалить чат (${res.status})`)
}

