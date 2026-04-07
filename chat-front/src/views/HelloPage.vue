<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { apiUrl } from '../api/config'

const router = useRouter()
const isLoggingOut = ref(false)
const errorMessage = ref('')
const isBootLoading = ref(true)
const currentUserId = ref<number | null>(null)

type ChatMessage = {
  id: number
  chatId: number
  senderId: number
  content: string
  createdAt: string
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

const selectedChat = computed(() =>
  chats.value.find((c) => c.id === selectedChatId.value) ?? null,
)

async function fetchMe() {
  const res = await fetch(apiUrl('/auth/me'), {
    credentials: 'include',
  })
  if (!res.ok) throw new Error('Сессия недействительна')
  const me = (await res.json()) as { userId: number }
  currentUserId.value = me.userId
}

async function fetchChats() {
  const res = await fetch(apiUrl('/chats'), { credentials: 'include' })
  if (!res.ok) throw new Error(`Не удалось загрузить чаты (${res.status})`)
  chats.value = (await res.json()) as ChatItem[]
}

async function fetchMessages(chatId: number) {
  isMessagesLoading.value = true
  try {
    const res = await fetch(apiUrl(`/chats/${chatId}/messages`), {
      credentials: 'include',
    })
    if (!res.ok) throw new Error(`Не удалось загрузить сообщения (${res.status})`)
    messages.value = (await res.json()) as ChatMessage[]
  } finally {
    isMessagesLoading.value = false
  }
}

async function selectChat(chatId: number) {
  selectedChatId.value = chatId
  await fetchMessages(chatId)
}

async function createChatWith(userId: number) {
  const res = await fetch(apiUrl('/chats'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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

async function runSearch() {
  const q = search.value.trim()
  if (!q) {
    searchResults.value = []
    return
  }
  isSearching.value = true
  try {
    const res = await fetch(apiUrl(`/users/search?query=${encodeURIComponent(q)}`), {
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
      headers: { 'Content-Type': 'application/json' },
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

onMounted(async () => {
  try {
    await fetchMe()
    await fetchChats()
    if (chats.value[0]) {
      await selectChat(chats.value[0].id)
    }
  } catch (e) {
    if (e instanceof Error) {
      errorMessage.value = e.message
    } else {
      errorMessage.value = 'Не удалось загрузить чат'
    }
  } finally {
    isBootLoading.value = false
  }
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
  <div class="grid gap-4 lg:grid-cols-[320px,1fr]">
    <aside class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div class="mb-3 flex items-center justify-between">
        <h1 class="text-lg font-semibold">Чаты</h1>
        <button
          type="button"
          :disabled="isLoggingOut"
          class="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:hover:bg-slate-800"
          @click="logout"
        >
          {{ isLoggingOut ? 'Выход…' : 'Выйти' }}
        </button>
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
          <div class="font-medium">
            {{ selectedChat.peer.name }} {{ selectedChat.peer.lastName }}
          </div>
          <div class="text-xs text-slate-500">{{ selectedChat.peer.email }}</div>
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
            <div>{{ m.content }}</div>
            <div class="mt-1 text-[10px] opacity-70">
              {{ new Date(m.createdAt).toLocaleString() }}
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
