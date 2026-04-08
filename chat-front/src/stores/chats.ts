import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { fetchMeApi } from '../api/auth'
import {
  addReactionCatalogApi,
  createDirectChatApi,
  deleteChatApi,
  deleteMessageApi,
  fetchChatsApi,
  fetchReactionCatalogApi,
  fetchMessagesApi,
  markChatReadApi,
  removeMessageReactionApi,
  setMessageReactionApi,
  sendMessageApi,
  updateMessageApi,
  type ChatItem,
  type ChatMessage,
  fetchRootUserChatsApi,
  restoreChatAsRootApi,
  deleteChatAsRootApi,
  type RootManagedChatItem,
} from '../api/chats'
import {
  fetchUsersApi,
  searchUsersApi,
  type UserListItem,
  type UserSearchItem,
  updateUserRoleApi,
} from '../api/users'

export const useChatsStore = defineStore('chats', () => {
  const currentUserId = ref<number | null>(null)
  const myLogin = ref('')
  const myRole = ref<'root' | 'admin' | 'user'>('user')
  const chats = ref<ChatItem[]>([])
  const selectedChatId = ref<number | null>(null)
  const messages = ref<ChatMessage[]>([])
  const isMessagesLoading = ref(false)
  const isSending = ref(false)
  const search = ref('')
  const searchResults = ref<UserSearchItem[]>([])
  const isSearching = ref(false)
  const reactionCatalog = ref<string[]>([])
  const rootUsersForRoles = ref<UserListItem[]>([])
  const rootUsersForChats = ref<UserListItem[]>([])
  const rootUsersRolesSearch = ref('')
  const rootUsersChatsSearch = ref('')
  const selectedRootUserId = ref<number | null>(null)
  const rootUserChats = ref<RootManagedChatItem[]>([])
  const lastMarkedReadByChat = ref<Record<number, number>>({})
  const chatIdsWithRecentIncomingUnreadBump = new Set<number>()

  const selectedChat = computed(() =>
    chats.value.find((c) => c.id === selectedChatId.value) ?? null,
  )

  const totalUnreadCount = computed(() =>
    chats.value.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0),
  )

  function patchChatUnread(chatId: number, unreadCount: number) {
    const idx = chats.value.findIndex((c) => c.id === chatId)
    if (idx < 0) return
    const current = chats.value[idx]
    if (!current) return
    chats.value[idx] = { ...current, unreadCount }
  }

  function moveChatToTop(chatId: number) {
    const idx = chats.value.findIndex((c) => c.id === chatId)
    if (idx <= 0) return
    const [chat] = chats.value.splice(idx, 1)
    if (chat) chats.value.unshift(chat)
  }

  function updateChatLastMessage(chatId: number, message: Pick<ChatMessage, 'id' | 'senderId' | 'content' | 'createdAt'>) {
    const idx = chats.value.findIndex((c) => c.id === chatId)
    if (idx < 0) return
    const current = chats.value[idx]
    if (!current) return
    chats.value[idx] = {
      ...current,
      lastMessage: {
        id: message.id,
        senderId: message.senderId,
        content: message.content,
        createdAt: message.createdAt,
      },
    }
    moveChatToTop(chatId)
  }

  function patchChatLastMessage(chatId: number, updater: (last: ChatItem['lastMessage']) => ChatItem['lastMessage']) {
    const idx = chats.value.findIndex((c) => c.id === chatId)
    if (idx < 0) return
    const current = chats.value[idx]
    if (!current) return
    chats.value[idx] = {
      ...current,
      lastMessage: updater(current.lastMessage),
    }
  }

  async function fetchMe() {
    const me = await fetchMeApi()
    currentUserId.value = me.userId
    myLogin.value = me.login ?? ''
    myRole.value = me.role
  }

  async function fetchChats() {
    const fetched = await fetchChatsApi()
    const prevById = new Map(chats.value.map((c) => [c.id, c]))
    chats.value = fetched.map((f) => {
      const prev = prevById.get(f.id)
      if (
        prev !== undefined &&
        chatIdsWithRecentIncomingUnreadBump.has(f.id) &&
        prev.unreadCount > f.unreadCount
      ) {
        return { ...f, unreadCount: prev.unreadCount }
      }
      if (
        prev !== undefined &&
        chatIdsWithRecentIncomingUnreadBump.has(f.id) &&
        f.unreadCount >= prev.unreadCount
      ) {
        chatIdsWithRecentIncomingUnreadBump.delete(f.id)
      }
      return f
    })
  }

  async function fetchMessages(chatId: number) {
    isMessagesLoading.value = true
    try {
      messages.value = await fetchMessagesApi(chatId)
    } finally {
      isMessagesLoading.value = false
    }
  }

  async function selectChat(chatId: number) {
    selectedChatId.value = chatId
    await fetchMessages(chatId)
    await markCurrentChatRead()
  }

  async function createChatWith(userId: number) {
    const chat = await createDirectChatApi(userId)
    await fetchChats()
    searchResults.value = []
    search.value = ''
    await selectChat(chat.id)
  }

  async function runSearch() {
    const q = search.value.trim()
    if (!q) {
      searchResults.value = []
      return
    }
    isSearching.value = true
    try {
      searchResults.value = await searchUsersApi(q)
    } finally {
      isSearching.value = false
    }
  }

  async function sendMessage(content: string) {
    if (!selectedChatId.value) return
    const trimmed = content.trim()
    if (!trimmed) return
    isSending.value = true
    try {
      const sent = await sendMessageApi(selectedChatId.value, trimmed)
      applyMessageNew(sent)
      updateChatLastMessage(selectedChatId.value, sent)
    } finally {
      isSending.value = false
    }
  }

  async function fetchReactionCatalog() {
    reactionCatalog.value = await fetchReactionCatalogApi()
  }

  async function fetchUsersForRootRoles(query = '') {
    rootUsersForRoles.value = await fetchUsersApi(query, query.trim() ? 20 : 5)
    rootUsersRolesSearch.value = query
  }

  async function fetchUsersForRootChats(query = '') {
    rootUsersForChats.value = await fetchUsersApi(query, query.trim() ? 20 : 5)
    rootUsersChatsSearch.value = query
  }

  async function changeUserRole(
    userId: number,
    role: 'root' | 'admin' | 'user',
  ) {
    const updated = await updateUserRoleApi(userId, role)
    const idxRoles = rootUsersForRoles.value.findIndex((u) => u.id === userId)
    if (idxRoles >= 0) rootUsersForRoles.value[idxRoles] = updated
    const idxChats = rootUsersForChats.value.findIndex((u) => u.id === userId)
    if (idxChats >= 0) rootUsersForChats.value[idxChats] = updated
  }

  async function selectRootUser(userId: number) {
    selectedRootUserId.value = userId
    rootUserChats.value = await fetchRootUserChatsApi(userId)
  }

  async function restoreChatAsRoot(chatId: number) {
    await restoreChatAsRootApi(chatId)
    if (selectedRootUserId.value) {
      rootUserChats.value = await fetchRootUserChatsApi(selectedRootUserId.value)
    }
  }

  async function deleteChatAsRoot(chatId: number) {
    await deleteChatAsRootApi(chatId)
    if (selectedRootUserId.value) {
      rootUserChats.value = await fetchRootUserChatsApi(selectedRootUserId.value)
    }
  }

  async function addReactionToCatalog(value: string) {
    await addReactionCatalogApi(value)
    await fetchReactionCatalog()
  }

  async function setReaction(messageId: number, value: string) {
    if (!selectedChatId.value) return
    const reactions = await setMessageReactionApi(selectedChatId.value, messageId, value)
    const idx = messages.value.findIndex((m) => m.id === messageId)
    if (idx >= 0) {
      const current = messages.value[idx]
      if (current) {
        messages.value[idx] = { ...current, reactions }
      }
    }
  }

  async function removeMyReaction(messageId: number) {
    if (!selectedChatId.value) return
    const reactions = await removeMessageReactionApi(selectedChatId.value, messageId)
    const idx = messages.value.findIndex((m) => m.id === messageId)
    if (idx >= 0) {
      const current = messages.value[idx]
      if (current) {
        messages.value[idx] = { ...current, reactions }
      }
    }
  }

  async function saveEditMessage(messageId: number, content: string) {
    if (!selectedChatId.value) return
    const updated = await updateMessageApi(selectedChatId.value, messageId, content.trim())
    const idx = messages.value.findIndex((m) => m.id === updated.id)
    if (idx >= 0) messages.value[idx] = updated
    patchChatLastMessage(selectedChatId.value, (last) =>
      last?.id === updated.id ? { ...last, content: updated.content } : last,
    )
  }

  async function deleteMessage(messageId: number) {
    if (!selectedChatId.value) return
    const chatId = selectedChatId.value
    const shouldRefreshChats = chats.value.find((c) => c.id === chatId)?.lastMessage?.id === messageId
    await deleteMessageApi(chatId, messageId)
    messages.value = messages.value.filter((m) => m.id !== messageId)
    if (shouldRefreshChats) {
      await fetchChats()
    }
  }

  async function deleteChat() {
    if (!selectedChatId.value) return
    const chatId = selectedChatId.value
    await deleteChatApi(chatId)
    chats.value = chats.value.filter((c) => c.id !== chatId)
    selectedChatId.value = null
    messages.value = []
  }

  async function markChatRead(chatId: number, messageId: number) {
    chatIdsWithRecentIncomingUnreadBump.delete(chatId)
    const currentMarked = lastMarkedReadByChat.value[chatId] ?? 0
    if (currentMarked >= messageId) {
      patchChatUnread(chatId, 0)
      return
    }
    await markChatReadApi(chatId, messageId)
    lastMarkedReadByChat.value = {
      ...lastMarkedReadByChat.value,
      [chatId]: messageId,
    }
    patchChatUnread(chatId, 0)
  }

  async function markCurrentChatRead() {
    if (!selectedChatId.value) return
    const lastMessage = messages.value[messages.value.length - 1]
    if (!lastMessage) return
    await markChatRead(selectedChatId.value, lastMessage.id)
  }

  function applyMessageNew(payload: ChatMessage) {
    const exists = messages.value.some((m) => m.id === payload.id)
    if (selectedChatId.value === payload.chatId && !exists) {
      messages.value.push(payload)
    }
    updateChatLastMessage(payload.chatId, payload)
    if (
      currentUserId.value !== null &&
      payload.senderId !== currentUserId.value &&
      selectedChatId.value !== payload.chatId
    ) {
      chatIdsWithRecentIncomingUnreadBump.add(payload.chatId)
      const idx = chats.value.findIndex((c) => c.id === payload.chatId)
      if (idx >= 0) {
        const current = chats.value[idx]
        if (current) {
          chats.value[idx] = {
            ...current,
            unreadCount: (current.unreadCount ?? 0) + 1,
          }
        }
      }
    }
  }

  function applyMessageUpdated(payload: {
    id: number
    chatId: number
    content: string
    updatedAt: string
  }) {
    if (selectedChatId.value !== payload.chatId) return
    const idx = messages.value.findIndex((m) => m.id === payload.id)
    if (idx >= 0) {
      const current = messages.value[idx]
      if (current) {
        messages.value[idx] = {
          ...current,
          content: payload.content,
          updatedAt: payload.updatedAt,
        }
      }
    }
    patchChatLastMessage(payload.chatId, (last) =>
      last?.id === payload.id ? { ...last, content: payload.content } : last,
    )
  }

  function applyMessageDeleted(payload: { id: number; chatId: number }) {
    if (selectedChatId.value === payload.chatId) {
      messages.value = messages.value.filter((m) => m.id !== payload.id)
    }
    const deletedLastMessage = chats.value.find((c) => c.id === payload.chatId)?.lastMessage?.id === payload.id
    if (deletedLastMessage) {
      void fetchChats()
    }
  }

  function applyChatDeleted(payload: { chatId: number }) {
    chatIdsWithRecentIncomingUnreadBump.delete(payload.chatId)
    chats.value = chats.value.filter((c) => c.id !== payload.chatId)
    if (selectedChatId.value === payload.chatId) {
      selectedChatId.value = null
      messages.value = []
    }
  }

  function applyMessageReactionsUpdated(payload: {
    chatId: number
    messageId: number
    reactions: Array<{ value: string; count: number; reactedByMe: boolean }>
  }) {
    if (selectedChatId.value !== payload.chatId) return
    const idx = messages.value.findIndex((m) => m.id === payload.messageId)
    if (idx >= 0) {
      const current = messages.value[idx]
      if (current) {
        messages.value[idx] = { ...current, reactions: payload.reactions }
      }
    }
  }

  function applyChatReadUpdated(payload: {
    chatId: number
    readerUserId: number
    lastReadMessageId: number
  }) {
    if (payload.readerUserId === currentUserId.value) {
      chatIdsWithRecentIncomingUnreadBump.delete(payload.chatId)
      lastMarkedReadByChat.value = {
        ...lastMarkedReadByChat.value,
        [payload.chatId]: payload.lastReadMessageId,
      }
      patchChatUnread(payload.chatId, 0)
      return
    }
    if (selectedChatId.value !== payload.chatId) return
    messages.value = messages.value.map((m) =>
      m.senderId === currentUserId.value && m.id <= payload.lastReadMessageId
        ? { ...m, readByPeer: true }
        : m,
    )
  }

  return {
    currentUserId,
    myLogin,
    myRole,
    chats,
    selectedChatId,
    selectedChat,
    totalUnreadCount,
    messages,
    isMessagesLoading,
    isSending,
    search,
    searchResults,
    isSearching,
    reactionCatalog,
    rootUsersForRoles,
    rootUsersForChats,
    rootUsersRolesSearch,
    rootUsersChatsSearch,
    selectedRootUserId,
    rootUserChats,
    fetchMe,
    fetchChats,
    fetchMessages,
    selectChat,
    createChatWith,
    runSearch,
    sendMessage,
    fetchReactionCatalog,
    fetchUsersForRootRoles,
    fetchUsersForRootChats,
    changeUserRole,
    selectRootUser,
    restoreChatAsRoot,
    deleteChatAsRoot,
    addReactionToCatalog,
    setReaction,
    removeMyReaction,
    saveEditMessage,
    deleteMessage,
    deleteChat,
    markChatRead,
    markCurrentChatRead,
    applyMessageNew,
    applyMessageUpdated,
    applyMessageDeleted,
    applyChatDeleted,
    applyMessageReactionsUpdated,
    applyChatReadUpdated,
  }
})

