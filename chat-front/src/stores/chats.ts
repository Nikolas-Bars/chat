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
  removeMessageReactionApi,
  setMessageReactionApi,
  sendMessageApi,
  updateMessageApi,
  type ChatItem,
  type ChatMessage,
} from '../api/chats'
import { searchUsersApi, type UserSearchItem } from '../api/users'

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

  const selectedChat = computed(() =>
    chats.value.find((c) => c.id === selectedChatId.value) ?? null,
  )

  async function fetchMe() {
    const me = await fetchMeApi()
    currentUserId.value = me.userId
    myLogin.value = me.login ?? ''
    myRole.value = me.role
  }

  async function fetchChats() {
    chats.value = await fetchChatsApi()
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
      await sendMessageApi(selectedChatId.value, trimmed)
      await fetchMessages(selectedChatId.value)
      await fetchChats()
    } finally {
      isSending.value = false
    }
  }

  async function fetchReactionCatalog() {
    reactionCatalog.value = await fetchReactionCatalogApi()
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
    await fetchChats()
  }

  async function deleteMessage(messageId: number) {
    if (!selectedChatId.value) return
    await deleteMessageApi(selectedChatId.value, messageId)
    messages.value = messages.value.filter((m) => m.id !== messageId)
    await fetchChats()
  }

  async function deleteChat() {
    if (!selectedChatId.value) return
    const chatId = selectedChatId.value
    await deleteChatApi(chatId)
    chats.value = chats.value.filter((c) => c.id !== chatId)
    selectedChatId.value = null
    messages.value = []
  }

  function applyMessageNew(payload: ChatMessage) {
    const exists = messages.value.some((m) => m.id === payload.id)
    if (selectedChatId.value === payload.chatId && !exists) {
      messages.value.push(payload)
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
  }

  function applyMessageDeleted(payload: { id: number; chatId: number }) {
    if (selectedChatId.value === payload.chatId) {
      messages.value = messages.value.filter((m) => m.id !== payload.id)
    }
  }

  function applyChatDeleted(payload: { chatId: number }) {
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

  return {
    currentUserId,
    myLogin,
    myRole,
    chats,
    selectedChatId,
    selectedChat,
    messages,
    isMessagesLoading,
    isSending,
    search,
    searchResults,
    isSearching,
    reactionCatalog,
    fetchMe,
    fetchChats,
    fetchMessages,
    selectChat,
    createChatWith,
    runSearch,
    sendMessage,
    fetchReactionCatalog,
    addReactionToCatalog,
    setReaction,
    removeMyReaction,
    saveEditMessage,
    deleteMessage,
    deleteChat,
    applyMessageNew,
    applyMessageUpdated,
    applyMessageDeleted,
    applyChatDeleted,
    applyMessageReactionsUpdated,
  }
})

