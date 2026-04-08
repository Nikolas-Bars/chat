export type ChatMessage = {
  id: number
  chatId: number
  senderId: number
  content: string
  createdAt: string
  updatedAt?: string
  readByPeer?: boolean
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
  unreadCount: number
}

export type UserSearchItem = {
  id: number
  name: string
  lastName: string
  email: string
  role?: 'root' | 'admin' | 'user'
}
