<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { io, type Socket } from 'socket.io-client'
import { storeToRefs } from 'pinia'
import { logoutApi } from '../api/auth'
import { type ChatMessage } from '../api/chats'
import { useChatsStore } from '../stores/chats'

const router = useRouter()
const chatsStore = useChatsStore()
const {
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
} = storeToRefs(chatsStore)

const isLoggingOut = ref(false)
const errorMessage = ref('')
const isBootLoading = ref(true)
const isSidebarOpen = ref(false)
const messageText = ref('')
const socket = ref<Socket | null>(null)
const editingMessageId = ref<number | null>(null)
const editingText = ref('')
const reactionPickerMessageId = ref<number | null>(null)
const newReactionValue = ref('')

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
    await chatsStore.fetchChats()
  })
  s.on('message:new', async (payload: ChatMessage) => {
    chatsStore.applyMessageNew(payload)
    await chatsStore.fetchChats()
  })
  s.on('message:updated', async (payload: { id: number; chatId: number; content: string; updatedAt: string }) => {
    chatsStore.applyMessageUpdated(payload)
    await chatsStore.fetchChats()
  })
  s.on('message:deleted', async (payload: { id: number; chatId: number }) => {
    chatsStore.applyMessageDeleted(payload)
    await chatsStore.fetchChats()
  })
  s.on('chat:deleted', async (payload: { chatId: number }) => {
    chatsStore.applyChatDeleted(payload)
  })
  s.on('message:reactions-updated', (payload: {
    chatId: number
    messageId: number
    reactions: Array<{ value: string; count: number; reactedByMe: boolean }>
  }) => {
    chatsStore.applyMessageReactionsUpdated(payload)
  })
  socket.value = s
}

async function selectChat(chatId: number) {
  await chatsStore.selectChat(chatId)
  isSidebarOpen.value = false
}

async function createChatWith(userId: number) {
  await chatsStore.createChatWith(userId)
  isSidebarOpen.value = false
}

function toggleSidebar() {
  isSidebarOpen.value = !isSidebarOpen.value
}

async function runSearch() {
  try {
    await chatsStore.runSearch()
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : 'Поиск недоступен'
  }
}

async function sendMessage() {
  try {
    await chatsStore.sendMessage(messageText.value)
    messageText.value = ''
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : 'Не удалось отправить сообщение'
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
    await chatsStore.saveEditMessage(messageId, editingText.value)
    cancelEditMessage()
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : 'Не удалось изменить сообщение'
  }
}

async function deleteMessage(messageId: number) {
  try {
    const ok = window.confirm('Удалить это сообщение?')
    if (!ok) return
    await chatsStore.deleteMessage(messageId)
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : 'Не удалось удалить сообщение'
  }
}

async function deleteChat() {
  try {
    const ok = window.confirm('Удалить весь чат? Сообщения будут скрыты (soft delete).')
    if (!ok) return
    await chatsStore.deleteChat()
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : 'Не удалось удалить чат'
  }
}

function toggleReactionPicker(messageId: number) {
  reactionPickerMessageId.value =
    reactionPickerMessageId.value === messageId ? null : messageId
}

async function toggleReaction(messageId: number, value: string, reactedByMe: boolean) {
  try {
    if (reactedByMe) {
      await chatsStore.removeMyReaction(messageId)
      return
    }
    await chatsStore.setReaction(messageId, value)
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : 'Не удалось обновить реакцию'
  }
}

async function addReactionToCatalog() {
  try {
    const value = newReactionValue.value.trim()
    if (!value) return
    await chatsStore.addReactionToCatalog(value)
    newReactionValue.value = ''
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : 'Не удалось добавить реакцию'
  }
}

onMounted(async () => {
  try {
    await chatsStore.fetchMe()
    await chatsStore.fetchReactionCatalog()
    await chatsStore.fetchChats()
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
    await logoutApi()
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
        <div class="text-sm font-semibold">{{ myLogin || '—' }} ({{ myRole }})</div>
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

      <div v-if="myRole === 'root'" class="mb-4 rounded-xl border border-slate-200 p-2 dark:border-slate-700">
        <div class="mb-2 text-xs text-slate-500">Добавить реакцию в общий каталог</div>
        <div class="flex gap-2">
          <input
            v-model="newReactionValue"
            class="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm outline-none ring-slate-300 focus:ring-2 dark:border-slate-700 dark:bg-slate-950 dark:ring-slate-700"
            placeholder="Например: 🤖"
          />
          <button
            type="button"
            class="rounded-lg border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
            @click="addReactionToCatalog"
          >
            Добавить
          </button>
        </div>
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
            <div class="mt-1 flex flex-wrap items-center gap-1">
              <button
                v-for="r in m.reactions ?? []"
                :key="`${m.id}-${r.value}`"
                class="rounded-full border px-2 py-0.5 text-[11px]"
                :class="
                  r.reactedByMe
                    ? 'border-emerald-500 bg-emerald-500/20'
                    : 'border-slate-300 dark:border-slate-600'
                "
                @click="toggleReaction(m.id, r.value, r.reactedByMe)"
              >
                {{ r.value }} {{ r.count }}
              </button>
              <button
                class="rounded-full border border-slate-300 px-2 py-0.5 text-[11px] dark:border-slate-600"
                @click="toggleReactionPicker(m.id)"
              >
                +
              </button>
            </div>
            <div
              v-if="reactionPickerMessageId === m.id"
              class="mt-1 flex flex-wrap gap-1 rounded-xl border border-slate-200 p-2 dark:border-slate-700"
            >
              <button
                v-for="value in reactionCatalog"
                :key="`${m.id}-catalog-${value}`"
                class="rounded-md border border-slate-300 px-2 py-0.5 text-xs hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
                @click="toggleReaction(m.id, value, false)"
              >
                {{ value }}
              </button>
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
