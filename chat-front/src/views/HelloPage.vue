<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { io, type Socket } from 'socket.io-client'
import { apiUrl } from '../api/config'

const router = useRouter()
const isLoggingOut = ref(false)
const errorMessage = ref('')
const isBootLoading = ref(true)
const currentUserId = ref<number | null>(null)
const myLogin = ref('')
const isSidebarOpen = ref(false)

type ChatMessage = {
  id: number
  chatId: number
  senderId: number
  content: string
  createdAt: string
  updatedAt?: string
}

type ChatItem = {
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

type UserSearchItem = {
  id: number
  name: string
  lastName: string
  email: string
}

const chats = ref<ChatItem[]>([])
const selectedChatId = ref<number | null>(null)
const messages = ref<ChatMessage[]>([])
const messageText = ref('')
const isSending = ref(false)
const search = ref('')
const searchResults = ref<UserSearchItem[]>([])
const isSearching = ref(false)
const isMessagesLoading = ref(false)
const socket = ref<Socket | null>(null)
const editingMessageId = ref<number | null>(null)
const editingText = ref('')

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('accessToken')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const selectedChat = computed(() =>
  chats.value.find((c) => c.id === selectedChatId.value) ?? null,
)

async function fetchMe() {
  const res = await fetch(apiUrl('/auth/me'), {
    headers: authHeaders(),
    credentials: 'include',
  })
  if (!res.ok) throw new Error('Сессия недействительна')
  const me = (await res.json()) as { userId: number; login?: string }
  currentUserId.value = me.userId
  myLogin.value = me.login ?? ''
}

async function fetchChats() {
  const res = await fetch(apiUrl('/chats'), {
    headers: authHeaders(),
    credentials: 'include',
  })
  if (!res.ok) throw new Error(`Не удалось загрузить чаты (${res.status})`)
  chats.value = (await res.json()) as ChatItem[]
}

async function fetchMessages(chatId: number) {
  isMessagesLoading.value = true
  try {
    const res = await fetch(apiUrl(`/chats/${chatId}/messages`), {
      headers: authHeaders(),
      credentials: 'include',
    })
    if (!res.ok) throw new Error(`Не удалось загрузить сообщения (${res.status})`)
    messages.value = (await res.json()) as ChatMessage[]
  } finally {
    isMessagesLoading.value = false
  }
}

function getRealtimeBaseUrl(): string {
  const api = (import.meta.env.VITE_API_URL as string | undefined)?.trim()
  if (api) return api.replace(/\/$/, '')
  const protocol = window.location.protocol === 'https:' ? 'https' : 'http'
  return `${protocol}://${window.location.hostname}:3000`
}

function connectRealtime() {
  const base = getRealtimeBaseUrl()
  const token = localStorage.getItem('accessToken')
  const s = io(`${base}/chats`, {
    withCredentials: true,
    auth: token ? { token } : undefined,
  })
  s.on('connect_error', () => {
    // Не блокируем UI: realtime опционален, REST остаётся рабочим.
  })
  s.on('chat:updated', async () => {
    await fetchChats()
  })
  s.on('message:new', async (payload: ChatMessage) => {
    const exists = messages.value.some((m) => m.id === payload.id)
    if (selectedChatId.value === payload.chatId && !exists) {
      messages.value.push(payload)
    }
    await fetchChats()
  })
  s.on('message:updated', async (payload: { id: number; chatId: number; content: string; updatedAt: string }) => {
    if (selectedChatId.value === payload.chatId) {
      const idx = messages.value.findIndex((m) => m.id === payload.id)
      if (idx >= 0) {
        const current = messages.value[idx]
        if (current) {
          messages.value[idx] = { ...current, content: payload.content, updatedAt: payload.updatedAt }
        }
      }
    }
    await fetchChats()
  })
  s.on('message:deleted', async (payload: { id: number; chatId: number }) => {
    if (selectedChatId.value === payload.chatId) {
      messages.value = messages.value.filter((m) => m.id !== payload.id)
    }
    await fetchChats()
  })
  s.on('chat:deleted', async (payload: { chatId: number }) => {
    chats.value = chats.value.filter((c) => c.id !== payload.chatId)
    if (selectedChatId.value === payload.chatId) {
      selectedChatId.value = null
      messages.value = []
    }
  })
  socket.value = s
}

async function selectChat(chatId: number) {
  selectedChatId.value = chatId
  await fetchMessages(chatId)
  isSidebarOpen.value = false
}

async function createChatWith(userId: number) {
  const res = await fetch(apiUrl('/chats'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    credentials: 'include',
    body: JSON.stringify({ userId }),
  })
  if (!res.ok) throw new Error(`Не удалось создать чат (${res.status})`)
  const chat = (await res.json()) as ChatItem
  await fetchChats()
  searchResults.value = []
  search.value = ''
  await selectChat(chat.id)
}

function toggleSidebar() {
  isSidebarOpen.value = !isSidebarOpen.value
}

async function runSearch() {
  const q = search.value.trim()
  if (!q) {
    searchResults.value = []
    return
  }
  isSearching.value = true
  try {
    const res = await fetch(apiUrl(`/users/search?query=${encodeURIComponent(q)}`), {
      headers: authHeaders(),
      credentials: 'include',
    })
    if (!res.ok) throw new Error(`Поиск недоступен (${res.status})`)
    searchResults.value = (await res.json()) as UserSearchItem[]
  } finally {
    isSearching.value = false
  }
}

async function sendMessage() {
  if (!selectedChatId.value) return
  const content = messageText.value.trim()
  if (!content) return
  isSending.value = true
  try {
    const res = await fetch(apiUrl(`/chats/${selectedChatId.value}/messages`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      credentials: 'include',
      body: JSON.stringify({ content }),
    })
    if (!res.ok) throw new Error(`Не удалось отправить сообщение (${res.status})`)
    messageText.value = ''
    await fetchMessages(selectedChatId.value)
    await fetchChats()
  } finally {
    isSending.value = false
  }
}

function startEditMessage(message: ChatMessage) {
  editingMessageId.value = message.id
  editingText.value = message.content
}

function cancelEditMessage() {
  editingMessageId.value = null
  editingText.value = ''
}

async function saveEditMessage(messageId: number) {
  try {
    if (!selectedChatId.value) return
    const content = editingText.value.trim()
    if (!content) return
    const res = await fetch(apiUrl(`/chats/${selectedChatId.value}/messages/${messageId}`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      credentials: 'include',
      body: JSON.stringify({ content }),
    })
    if (!res.ok) throw new Error(`Не удалось изменить сообщение (${res.status})`)
    const updated = (await res.json()) as ChatMessage
    const idx = messages.value.findIndex((m) => m.id === updated.id)
    if (idx >= 0) messages.value[idx] = updated
    cancelEditMessage()
    await fetchChats()
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : 'Не удалось изменить сообщение'
  }
}

async function deleteMessage(messageId: number) {
  try {
    if (!selectedChatId.value) return
    const ok = window.confirm('Удалить это сообщение?')
    if (!ok) return
    const res = await fetch(apiUrl(`/chats/${selectedChatId.value}/messages/${messageId}`), {
      method: 'DELETE',
      headers: authHeaders(),
      credentials: 'include',
    })
    if (!res.ok) throw new Error(`Не удалось удалить сообщение (${res.status})`)
    messages.value = messages.value.filter((m) => m.id !== messageId)
    await fetchChats()
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : 'Не удалось удалить сообщение'
  }
}

async function deleteChat() {
  try {
    if (!selectedChatId.value) return
    const chatId = selectedChatId.value
    const ok = window.confirm('Удалить весь чат? Сообщения будут скрыты (soft delete).')
    if (!ok) return
    const res = await fetch(apiUrl(`/chats/${chatId}`), {
      method: 'DELETE',
      headers: authHeaders(),
      credentials: 'include',
    })
    if (!res.ok) throw new Error(`Не удалось удалить чат (${res.status})`)
    chats.value = chats.value.filter((c) => c.id !== chatId)
    selectedChatId.value = null
    messages.value = []
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : 'Не удалось удалить чат'
  }
}

onMounted(async () => {
  try {
    await fetchMe()
    await fetchChats()
    if (chats.value[0]) {
      await selectChat(chats.value[0].id)
    }
    connectRealtime()
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === 'Сессия недействительна') {
        await router.push('/login')
        return
      }
      errorMessage.value = e.message
    } else {
      errorMessage.value = 'Не удалось загрузить чат'
    }
  } finally {
    isBootLoading.value = false
  }
})

onUnmounted(() => {
  socket.value?.disconnect()
  socket.value = null
})

async function logout() {
  errorMessage.value = ''
  isLoggingOut.value = true
  try {
    const response = await fetch(apiUrl('/auth/logout'), {
      method: 'POST',
      credentials: 'include',
    })
    if (!response.ok) {
      throw new Error(`Не удалось выйти (код ${response.status})`)
    }
    localStorage.removeItem('accessToken')
    socket.value?.disconnect()
    await router.push('/login')
  } catch (e) {
    if (e instanceof Error) {
      errorMessage.value = e.message
    } else {
      errorMessage.value = 'Не удалось выйти'
    }
  } finally {
    isLoggingOut.value = false
  }
}
</script>

<template>
  <div class="relative">
    <div class="mb-4 flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div class="flex items-center gap-3">
        <button
          type="button"
          class="rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
          @click="toggleSidebar"
        >
          ☰
        </button>
        <div class="text-sm text-slate-500 dark:text-slate-400">Мой логин:</div>
        <div class="text-sm font-semibold">{{ myLogin || '—' }}</div>
      </div>
      <button
        type="button"
        :disabled="isLoggingOut"
        class="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:hover:bg-slate-800"
        @click="logout"
      >
        {{ isLoggingOut ? 'Выход…' : 'Выйти' }}
      </button>
    </div>

    <div
      v-if="isSidebarOpen"
      class="fixed inset-0 z-20 bg-black/40"
      @click="isSidebarOpen = false"
    />

    <aside
      class="fixed inset-y-0 left-0 z-30 w-[320px] overflow-y-auto border-r border-slate-200 bg-white p-4 shadow-xl transition-transform dark:border-slate-800 dark:bg-slate-900"
      :class="isSidebarOpen ? 'translate-x-0' : '-translate-x-full'"
    >
      <div class="mb-3 flex items-center justify-between">
        <h1 class="text-lg font-semibold">Чаты</h1>
        <button class="text-slate-500 hover:text-slate-900 dark:hover:text-slate-100" @click="isSidebarOpen = false">✕</button>
      </div>

      <div class="mb-3">
        <input
          v-model="search"
          class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2 dark:border-slate-700 dark:bg-slate-950 dark:ring-slate-700"
          placeholder="Поиск пользователей"
          @input="runSearch"
        />
      </div>

      <div v-if="isSearching" class="mb-3 text-xs text-slate-500">Ищем...</div>
      <div v-if="searchResults.length" class="mb-4 space-y-2">
        <button
          v-for="u in searchResults"
          :key="u.id"
          class="w-full rounded-xl border border-slate-200 p-2 text-left text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
          @click="createChatWith(u.id)"
        >
          <div class="font-medium">{{ u.name }} {{ u.lastName }}</div>
          <div class="text-xs text-slate-500">{{ u.email }}</div>
        </button>
      </div>

      <div class="space-y-2">
        <button
          v-for="chat in chats"
          :key="chat.id"
          class="w-full rounded-xl border p-3 text-left transition"
          :class="
            selectedChatId === chat.id
              ? 'border-slate-900 bg-slate-100 dark:border-slate-100 dark:bg-slate-800'
              : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'
          "
          @click="selectChat(chat.id)"
        >
          <div class="text-sm font-medium">
            {{ chat.peer.name }} {{ chat.peer.lastName }}
          </div>
          <div class="truncate text-xs text-slate-500">
            {{ chat.lastMessage?.content ?? 'Нет сообщений' }}
          </div>
        </button>
      </div>
    </aside>

    <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div v-if="isBootLoading" class="text-sm text-slate-500">Загружаем...</div>
      <div v-else-if="!selectedChat" class="text-sm text-slate-500">
        Выбери чат слева или найди пользователя, чтобы начать диалог.
      </div>
      <div v-else class="flex h-[70vh] flex-col">
        <div class="mb-3 border-b border-slate-200 pb-3 dark:border-slate-800">
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="font-medium">
                {{ selectedChat.peer.name }} {{ selectedChat.peer.lastName }}
              </div>
              <div class="text-xs text-slate-500">{{ selectedChat.peer.email }}</div>
            </div>
            <button
              type="button"
              class="rounded-lg border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50 dark:border-red-900/50 dark:text-red-300 dark:hover:bg-red-950/40"
              @click="deleteChat"
            >
              Удалить чат
            </button>
          </div>
        </div>

        <div class="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          <div v-if="isMessagesLoading" class="text-sm text-slate-500">Загрузка сообщений...</div>
          <div
            v-for="m in messages"
            :key="m.id"
            class="max-w-[75%] rounded-2xl px-3 py-2 text-sm"
            :class="
              m.senderId === currentUserId
                ? 'ml-auto bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100'
            "
          >
            <div v-if="editingMessageId === m.id">
              <textarea
                v-model="editingText"
                class="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                rows="3"
              />
              <div class="mt-2 flex gap-2">
                <button class="rounded-md bg-emerald-600 px-2 py-1 text-xs text-white" @click="saveEditMessage(m.id)">
                  Сохранить
                </button>
                <button class="rounded-md border px-2 py-1 text-xs" @click="cancelEditMessage">
                  Отмена
                </button>
              </div>
            </div>
            <div v-else>{{ m.content }}</div>
            <div class="mt-1 text-[10px] opacity-70">
              {{ new Date(m.createdAt).toLocaleString() }}
              <span v-if="m.updatedAt"> · изменено</span>
            </div>
            <div
              v-if="m.senderId === currentUserId && editingMessageId !== m.id"
              class="mt-1 flex gap-2 text-[11px]"
            >
              <button class="opacity-80 hover:opacity-100" @click="startEditMessage(m)">Ред.</button>
              <button class="opacity-80 hover:opacity-100" @click="deleteMessage(m.id)">Удалить</button>
            </div>
          </div>
        </div>

        <form class="mt-3 flex gap-2" @submit.prevent="sendMessage">
          <input
            v-model="messageText"
            class="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2 dark:border-slate-700 dark:bg-slate-950 dark:ring-slate-700"
            placeholder="Напиши сообщение..."
          />
          <button
            type="submit"
            :disabled="isSending || !messageText.trim()"
            class="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900"
          >
            {{ isSending ? '...' : 'Отправить' }}
          </button>
        </form>
      </div>
    </section>
  </div>

  <div
    v-if="errorMessage"
    class="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
  >
    {{ errorMessage }}
  </div>
</template>
