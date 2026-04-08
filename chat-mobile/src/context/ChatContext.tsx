import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  addReactionCatalogApi,
  createDirectChatApi,
  deleteChatApi,
  fetchChatsApi,
  fetchMessagesApi,
  fetchReactionCatalogApi,
  markChatReadApi,
  removeMessageReactionApi,
  sendMessageApi,
  setMessageReactionApi,
} from '../api/chats'
import { searchUsersApi } from '../api/users'
import { fetchMeApi } from '../api/auth'
import type { ChatItem, ChatMessage, UserSearchItem } from '../types'

type ChatContextValue = {
  currentUserId: number | null
  myLogin: string
  myRole: 'root' | 'admin' | 'user'
  chats: ChatItem[]
  selectedChatId: number | null
  selectedChat: ChatItem | null
  totalUnreadCount: number
  reactionCatalog: string[]
  messages: ChatMessage[]
  isMessagesLoading: boolean
  isSending: boolean
  search: string
  setSearch: (s: string) => void
  searchResults: UserSearchItem[]
  isSearching: boolean
  fetchMe: () => Promise<void>
  fetchChats: () => Promise<void>
  selectChat: (chatId: number) => Promise<void>
  leaveConversation: () => void
  createChatWith: (userId: number) => Promise<ChatItem>
  runSearch: (queryOverride?: string) => Promise<void>
  fetchReactionCatalog: () => Promise<void>
  addReactionToCatalog: (value: string) => Promise<void>
  sendMessage: (content: string) => Promise<void>
  setReaction: (messageId: number, value: string) => Promise<void>
  removeMyReaction: (messageId: number) => Promise<void>
  deleteChat: () => Promise<void>
  markChatRead: (chatId: number, messageId: number) => Promise<void>
  markCurrentChatRead: () => Promise<void>
  applyMessageNew: (payload: ChatMessage) => void
  applyMessageUpdated: (p: { id: number; chatId: number; content: string; updatedAt: string }) => void
  applyMessageDeleted: (p: { id: number; chatId: number }) => void
  applyChatDeleted: (p: { chatId: number }) => void
  applyChatReadUpdated: (p: {
    chatId: number
    readerUserId: number
    lastReadMessageId: number
  }) => void
  applyMessageReactionsUpdated: (p: {
    chatId: number
    messageId: number
    reactions: Array<{ value: string; count: number; reactedByMe: boolean }>
  }) => void
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined)

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)
  const [myLogin, setMyLogin] = useState('')
  const [myRole, setMyRole] = useState<'root' | 'admin' | 'user'>('user')
  const [chats, setChats] = useState<ChatItem[]>([])
  const [selectedChatId, setSelectedChatId] = useState<number | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [reactionCatalog, setReactionCatalog] = useState<string[]>([])
  const [isMessagesLoading, setIsMessagesLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<UserSearchItem[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [lastMarkedReadByChat, setLastMarkedReadByChat] = useState<Record<number, number>>({})
  const chatIdsWithRecentIncomingUnreadBump = useRef(new Set<number>())

  const selectedChat = useMemo(
    () => chats.find((c) => c.id === selectedChatId) ?? null,
    [chats, selectedChatId],
  )

  const totalUnreadCount = useMemo(
    () => chats.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0),
    [chats],
  )

  const patchChatUnread = useCallback((chatId: number, unreadCount: number) => {
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, unreadCount } : c)),
    )
  }, [])

  const moveChatToTop = useCallback((chatId: number) => {
    setChats((prev) => {
      const idx = prev.findIndex((c) => c.id === chatId)
      if (idx <= 0) return prev
      const next = [...prev]
      const [row] = next.splice(idx, 1)
      if (row) next.unshift(row)
      return next
    })
  }, [])

  const updateChatLastMessage = useCallback(
    (chatId: number, message: Pick<ChatMessage, 'id' | 'senderId' | 'content' | 'createdAt'>) => {
      setChats((prev) => {
        const idx = prev.findIndex((c) => c.id === chatId)
        if (idx < 0) return prev
        const current = prev[idx]
        if (!current) return prev
        const next = [...prev]
        next[idx] = {
          ...current,
          lastMessage: {
            id: message.id,
            senderId: message.senderId,
            content: message.content,
            createdAt: message.createdAt,
          },
        }
        const [moved] = next.splice(idx, 1)
        if (moved) next.unshift(moved)
        return next
      })
    },
    [],
  )

  const patchChatLastMessage = useCallback(
    (
      chatId: number,
      updater: (last: ChatItem['lastMessage']) => ChatItem['lastMessage'],
    ) => {
      setChats((prev) =>
        prev.map((c) => {
          if (c.id !== chatId) return c
          return { ...c, lastMessage: updater(c.lastMessage) }
        }),
      )
    },
    [],
  )

  const fetchMe = useCallback(async () => {
    const me = await fetchMeApi()
    setCurrentUserId(me.userId)
    setMyLogin(me.login ?? '')
    setMyRole(me.role)
  }, [])

  const fetchChats = useCallback(async () => {
    const fetched = await fetchChatsApi()
    setChats((prev) => {
      const prevById = new Map(prev.map((c) => [c.id, c]))
      return fetched.map((f) => {
        const p = prevById.get(f.id)
        if (
          p !== undefined &&
          chatIdsWithRecentIncomingUnreadBump.current.has(f.id) &&
          p.unreadCount > f.unreadCount
        ) {
          return { ...f, unreadCount: p.unreadCount }
        }
        if (
          p !== undefined &&
          chatIdsWithRecentIncomingUnreadBump.current.has(f.id) &&
          f.unreadCount >= p.unreadCount
        ) {
          chatIdsWithRecentIncomingUnreadBump.current.delete(f.id)
        }
        return f
      })
    })
  }, [])

  const markChatRead = useCallback(
    async (chatId: number, messageId: number) => {
      chatIdsWithRecentIncomingUnreadBump.current.delete(chatId)
      const currentMarked = lastMarkedReadByChat[chatId] ?? 0
      if (currentMarked >= messageId) {
        patchChatUnread(chatId, 0)
        return
      }
      await markChatReadApi(chatId, messageId)
      setLastMarkedReadByChat((prev) => ({ ...prev, [chatId]: messageId }))
      patchChatUnread(chatId, 0)
    },
    [lastMarkedReadByChat, patchChatUnread],
  )

  const markCurrentChatRead = useCallback(async () => {
    if (!selectedChatId) return
    const last = messages[messages.length - 1]
    if (!last) return
    await markChatRead(selectedChatId, last.id)
  }, [selectedChatId, messages, markChatRead])

  const selectChat = useCallback(
    async (chatId: number) => {
      setSelectedChatId(chatId)
      setIsMessagesLoading(true)
      try {
        const list = await fetchMessagesApi(chatId)
        setMessages(list)
        const last = list[list.length - 1]
        if (last) void markChatRead(chatId, last.id)
      } finally {
        setIsMessagesLoading(false)
      }
    },
    [markChatRead],
  )

  const leaveConversation = useCallback(() => {
    setSelectedChatId(null)
    setMessages([])
  }, [])

  const createChatWith = useCallback(
    async (userId: number) => {
      const chat = await createDirectChatApi(userId)
      await fetchChats()
      setSearchResults([])
      setSearch('')
      return chat
    },
    [fetchChats],
  )

  const runSearch = useCallback(async (queryOverride?: string) => {
    const q = (queryOverride !== undefined ? queryOverride : search).trim()
    if (!q) {
      setSearchResults([])
      return
    }
    setIsSearching(true)
    try {
      setSearchResults(await searchUsersApi(q))
    } finally {
      setIsSearching(false)
    }
  }, [search])

  const fetchReactionCatalog = useCallback(async () => {
    setReactionCatalog(await fetchReactionCatalogApi())
  }, [])

  const applyMessageNew = useCallback(
    (payload: ChatMessage) => {
      setMessages((prev) => {
        const exists = prev.some((m) => m.id === payload.id)
        if (selectedChatId === payload.chatId && !exists) return [...prev, payload]
        return prev
      })
      updateChatLastMessage(payload.chatId, payload)
      if (
        currentUserId !== null &&
        payload.senderId !== currentUserId &&
        selectedChatId !== payload.chatId
      ) {
        chatIdsWithRecentIncomingUnreadBump.current.add(payload.chatId)
        setChats((prev) =>
          prev.map((c) =>
            c.id === payload.chatId
              ? { ...c, unreadCount: (c.unreadCount ?? 0) + 1 }
              : c,
          ),
        )
      }
    },
    [currentUserId, selectedChatId, updateChatLastMessage],
  )

  const sendMessage = useCallback(
    async (content: string) => {
      if (!selectedChatId) return
      const trimmed = content.trim()
      if (!trimmed) return
      setIsSending(true)
      try {
        const sent = await sendMessageApi(selectedChatId, trimmed)
        applyMessageNew(sent)
      } finally {
        setIsSending(false)
      }
    },
    [selectedChatId, applyMessageNew],
  )

  const addReactionToCatalog = useCallback(
    async (value: string) => {
      const trimmed = value.trim()
      if (!trimmed) return
      await addReactionCatalogApi(trimmed)
      await fetchReactionCatalog()
    },
    [fetchReactionCatalog],
  )

  const setReaction = useCallback(
    async (messageId: number, value: string) => {
      if (!selectedChatId) return
      const reactions = await setMessageReactionApi(selectedChatId, messageId, value)
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, reactions } : m)),
      )
    },
    [selectedChatId],
  )

  const removeMyReaction = useCallback(
    async (messageId: number) => {
      if (!selectedChatId) return
      const reactions = await removeMessageReactionApi(selectedChatId, messageId)
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, reactions } : m)),
      )
    },
    [selectedChatId],
  )

  const applyMessageUpdated = useCallback(
    (payload: { id: number; chatId: number; content: string; updatedAt: string }) => {
      if (selectedChatId !== payload.chatId) return
      setMessages((prev) =>
        prev.map((m) =>
          m.id === payload.id
            ? { ...m, content: payload.content, updatedAt: payload.updatedAt }
            : m,
        ),
      )
      patchChatLastMessage(payload.chatId, (last) =>
        last?.id === payload.id ? { ...last, content: payload.content } : last,
      )
    },
    [selectedChatId, patchChatLastMessage],
  )

  const applyMessageDeleted = useCallback(
    (payload: { id: number; chatId: number }) => {
      if (selectedChatId === payload.chatId) {
        setMessages((prev) => prev.filter((m) => m.id !== payload.id))
      }
      const deletedLast = chats.find((c) => c.id === payload.chatId)?.lastMessage?.id === payload.id
      if (deletedLast) void fetchChats()
    },
    [selectedChatId, chats, fetchChats],
  )

  const applyChatDeleted = useCallback((payload: { chatId: number }) => {
    chatIdsWithRecentIncomingUnreadBump.current.delete(payload.chatId)
    setChats((prev) => prev.filter((c) => c.id !== payload.chatId))
    setSelectedChatId((sid) => {
      if (sid === payload.chatId) {
        setMessages([])
        return null
      }
      return sid
    })
  }, [])

  const applyMessageReactionsUpdated = useCallback(
    (payload: {
      chatId: number
      messageId: number
      reactions: Array<{ value: string; count: number; reactedByMe: boolean }>
    }) => {
      if (selectedChatId !== payload.chatId) return
      setMessages((prev) =>
        prev.map((m) =>
          m.id === payload.messageId ? { ...m, reactions: payload.reactions } : m,
        ),
      )
    },
    [selectedChatId],
  )

  const applyChatReadUpdated = useCallback(
    (payload: { chatId: number; readerUserId: number; lastReadMessageId: number }) => {
      if (payload.readerUserId === currentUserId) {
        chatIdsWithRecentIncomingUnreadBump.current.delete(payload.chatId)
        setLastMarkedReadByChat((prev) => ({
          ...prev,
          [payload.chatId]: payload.lastReadMessageId,
        }))
        patchChatUnread(payload.chatId, 0)
        return
      }
      if (selectedChatId !== payload.chatId) return
      setMessages((prev) =>
        prev.map((m) =>
          m.senderId === currentUserId && m.id <= payload.lastReadMessageId
            ? { ...m, readByPeer: true }
            : m,
        ),
      )
    },
    [currentUserId, selectedChatId, patchChatUnread],
  )

  const deleteChat = useCallback(async () => {
    if (!selectedChatId) return
    const chatId = selectedChatId
    await deleteChatApi(chatId)
    setChats((prev) => prev.filter((c) => c.id !== chatId))
    setSelectedChatId(null)
    setMessages([])
  }, [selectedChatId])

  const value = useMemo(
    () => ({
      currentUserId,
      myLogin,
      myRole,
      chats,
      selectedChatId,
      selectedChat,
      totalUnreadCount,
      reactionCatalog,
      messages,
      isMessagesLoading,
      isSending,
      search,
      setSearch,
      searchResults,
      isSearching,
      fetchMe,
      fetchChats,
      selectChat,
      leaveConversation,
      createChatWith,
      runSearch,
      fetchReactionCatalog,
      addReactionToCatalog,
      sendMessage,
      setReaction,
      removeMyReaction,
      deleteChat,
      markChatRead,
      markCurrentChatRead,
      applyMessageNew,
      applyMessageUpdated,
      applyMessageDeleted,
      applyChatDeleted,
      applyChatReadUpdated,
      applyMessageReactionsUpdated,
    }),
    [
      currentUserId,
      myLogin,
      myRole,
      chats,
      selectedChatId,
      selectedChat,
      totalUnreadCount,
      reactionCatalog,
      messages,
      isMessagesLoading,
      isSending,
      search,
      searchResults,
      isSearching,
      fetchMe,
      fetchChats,
      selectChat,
      leaveConversation,
      createChatWith,
      runSearch,
      fetchReactionCatalog,
      addReactionToCatalog,
      sendMessage,
      setReaction,
      removeMyReaction,
      deleteChat,
      markChatRead,
      markCurrentChatRead,
      applyMessageNew,
      applyMessageUpdated,
      applyMessageDeleted,
      applyChatDeleted,
      applyChatReadUpdated,
      applyMessageReactionsUpdated,
    ],
  )

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

export function useChat(): ChatContextValue {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChat must be inside ChatProvider')
  return ctx
}
