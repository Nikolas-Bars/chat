<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { io, type Socket } from 'socket.io-client'
import { storeToRefs } from 'pinia'
import { logoutApi } from '../api/auth'
import { type ChatMessage } from '../api/chats'
import { useChatsStore } from '../stores/chats'
import {
  ensureNotificationAudioUnlocked,
  playIncomingMessageSound,
} from '../utils/notification-sound'
import { resetTabUnreadBadge, updateTabUnreadBadge } from '../utils/tab-unread-badge'

const router = useRouter()
const chatsStore = useChatsStore()
const {
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
} = storeToRefs(chatsStore)

const isLoggingOut = ref(false)
const errorMessage = ref('')
const isBootLoading = ref(true)
const isSidebarOpen = ref(false)
const isRootPanelOpen = ref(false)
const messageText = ref('')
const socket = ref<Socket | null>(null)
const editingMessageId = ref<number | null>(null)
const editingText = ref('')
const reactionPickerMessageId = ref<number | null>(null)
const newReactionValue = ref('')
const isRootUserDropdownOpen = ref(false)
const isRootRoleDropdownOpen = ref(false)
const selectedRoleUserId = ref<number | null>(null)
const rootRoleDropdownRoot = ref<HTMLElement | null>(null)
const rootChatsDropdownRoot = ref<HTMLElement | null>(null)
let chatsRefreshTimer: number | null = null
const lastMessageNewAtByChatId = new Map<number, number>()
const messagesScrollRoot = ref<HTMLElement | null>(null)
const messagesEndAnchor = ref<HTMLElement | null>(null)

/** Пользователь «внизу», если до низа меньше порога — тогда новые сообщения подтягиваем. */
const MESSAGE_STICKY_THRESHOLD_PX = 96
const messagesStickToBottom = ref(true)

function onMessagesScroll() {
  const el = messagesScrollRoot.value
  if (!el) return
  const distance = el.scrollHeight - el.scrollTop - el.clientHeight
  messagesStickToBottom.value = distance <= MESSAGE_STICKY_THRESHOLD_PX
}

watch(
  totalUnreadCount,
  (n) => {
    updateTabUnreadBadge(n)
  },
  { immediate: true },
)

/** После nextTick scrollHeight ещё часто «старый» — якорь + второй кадр даёт актуальный layout. */
function scrollMessagesToBottom() {
  const root = messagesScrollRoot.value
  const anchor = messagesEndAnchor.value
  const apply = () => {
    if (anchor) {
      anchor.scrollIntoView({ block: 'end', inline: 'nearest', behavior: 'auto' })
    }
    if (root) {
      root.scrollTop = root.scrollHeight
    }
  }
  void nextTick(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        apply()
        requestAnimationFrame(apply)
      })
    })
  })
}

watch(selectedChatId, () => {
  messagesStickToBottom.value = true
})

watch(
  [selectedChatId, isMessagesLoading],
  ([chatId, loading]) => {
    if (!chatId || loading) return
    scrollMessagesToBottom()
  },
  { flush: 'post' },
)

watch(
  () => messages.value.map((m) => m.id).join(','),
  () => {
    if (!selectedChatId.value || isMessagesLoading.value) return
    if (!messagesStickToBottom.value) return
    scrollMessagesToBottom()
  },
  { flush: 'post' },
)

watch(
  reactionPickerMessageId,
  (id) => {
    if (id === null) return
    const last = messages.value[messages.value.length - 1]
    if (last?.id !== id || !messagesStickToBottom.value) return
    scrollMessagesToBottom()
  },
  { flush: 'post' },
)

function closeRootDropdownsOnOutsideClick(ev: MouseEvent) {
  const t = ev.target as Node | null
  if (!t) return
  if (!rootRoleDropdownRoot.value?.contains(t)) {
    isRootRoleDropdownOpen.value = false
  }
  if (!rootChatsDropdownRoot.value?.contains(t)) {
    isRootUserDropdownOpen.value = false
  }
}

function closeReactionPickerOnOutsideClick(ev: MouseEvent) {
  if (reactionPickerMessageId.value === null) return
  const t = ev.target as HTMLElement | null
  if (!t) return
  if (t.closest('[data-reaction-picker-scope]')) return
  reactionPickerMessageId.value = null
}

function onDocumentClickCapture(ev: MouseEvent) {
  closeRootDropdownsOnOutsideClick(ev)
  closeReactionPickerOnOutsideClick(ev)
}

/** TypeORM всегда заполняет updated_at; «изменено» только если время правки позже создания. */
function isMessageEdited(m: ChatMessage): boolean {
  if (!m.updatedAt || !m.createdAt) return false
  return new Date(m.updatedAt).getTime() > new Date(m.createdAt).getTime()
}

function getRealtimeBaseUrl(): string {
  const api = (import.meta.env.VITE_API_URL as string | undefined)?.trim()
  if (api) return api.replace(/\/$/, '')
  const protocol = window.location.protocol === 'https:' ? 'https' : 'http'
  return `${protocol}://${window.location.hostname}:3000`
}

function scheduleChatsRefresh() {
  if (chatsRefreshTimer !== null) return
  chatsRefreshTimer = window.setTimeout(async () => {
    chatsRefreshTimer = null
    await chatsStore.fetchChats()
  }, 150)
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
  s.on('chat:updated', (payload: { chatId: number }) => {
    const t = lastMessageNewAtByChatId.get(payload.chatId)
    if (t !== undefined && Date.now() - t < 600) {
      return
    }
    scheduleChatsRefresh()
  })
  s.on('message:new', async (payload: ChatMessage) => {
    lastMessageNewAtByChatId.set(payload.chatId, Date.now())
    if (currentUserId.value !== null && payload.senderId !== currentUserId.value) {
      playIncomingMessageSound()
    }
    chatsStore.applyMessageNew(payload)
    if (payload.chatId === selectedChatId.value && payload.senderId !== currentUserId.value) {
      void chatsStore.markCurrentChatRead()
    }
  })
  s.on('message:updated', async (payload: { id: number; chatId: number; content: string; updatedAt: string }) => {
    chatsStore.applyMessageUpdated(payload)
  })
  s.on('message:deleted', async (payload: { id: number; chatId: number }) => {
    chatsStore.applyMessageDeleted(payload)
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
  s.on('chat:read-updated', (payload: {
    chatId: number
    readerUserId: number
    lastReadMessageId: number
  }) => {
    chatsStore.applyChatReadUpdated(payload)
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

function toggleRootPanel() {
  isRootPanelOpen.value = !isRootPanelOpen.value
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
    messagesStickToBottom.value = true
    scrollMessagesToBottom()
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
    } else {
      await chatsStore.setReaction(messageId, value)
    }
    reactionPickerMessageId.value = null
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

async function pickRootUser(userId: number, label: string) {
  try {
    rootUsersChatsSearch.value = label
    isRootUserDropdownOpen.value = false
    await chatsStore.selectRootUser(userId)
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : 'Не удалось загрузить чаты пользователя'
  }
}

async function pickRoleUser(userId: number, label: string) {
  selectedRoleUserId.value = userId
  rootUsersRolesSearch.value = label
  isRootRoleDropdownOpen.value = false
}

async function onUserRoleChanged(userId: number, event: Event) {
  const target = event.target as HTMLSelectElement
  const role = target.value as 'root' | 'admin' | 'user'
  try {
    await chatsStore.changeUserRole(userId, role)
    if (currentUserId.value === userId) {
      myRole.value = role
    }
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : 'Не удалось обновить роль'
  }
}

async function restoreChatAsRoot(chatId: number) {
  try {
    await chatsStore.restoreChatAsRoot(chatId)
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : 'Не удалось восстановить чат'
  }
}

async function deleteChatAsRoot(chatId: number) {
  try {
    const ok = window.confirm('Удалить этот чат? (soft delete)')
    if (!ok) return
    await chatsStore.deleteChatAsRoot(chatId)
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : 'Не удалось удалить чат'
  }
}

async function runRootUsersSearch() {
  try {
    await chatsStore.fetchUsersForRootChats(rootUsersChatsSearch.value)
    isRootUserDropdownOpen.value = true
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : 'Не удалось выполнить поиск пользователей'
  }
}

async function runRootRolesSearch() {
  try {
    await chatsStore.fetchUsersForRootRoles(rootUsersRolesSearch.value)
    isRootRoleDropdownOpen.value = true
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : 'Не удалось выполнить поиск пользователей'
  }
}

onMounted(async () => {
  document.addEventListener('click', onDocumentClickCapture, true)
  document.addEventListener(
    'pointerdown',
    () => {
      void ensureNotificationAudioUnlocked()
    },
    { once: true, capture: true },
  )
  try {
    await chatsStore.fetchMe()
    await chatsStore.fetchReactionCatalog()
    await chatsStore.fetchChats()
    if (myRole.value === 'root') {
      await chatsStore.fetchUsersForRootRoles()
      await chatsStore.fetchUsersForRootChats()
    }
    connectRealtime()
    isSidebarOpen.value = true
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
  resetTabUnreadBadge()
  document.removeEventListener('click', onDocumentClickCapture, true)
  if (chatsRefreshTimer !== null) {
    window.clearTimeout(chatsRefreshTimer)
    chatsRefreshTimer = null
  }
  socket.value?.disconnect()
  socket.value = null
})

function peerInitials(name: string, lastName: string): string {
  return ((name?.[0] ?? '') + (lastName?.[0] ?? '')).toUpperCase() || '?'
}

const avatarColors = [
  'bg-indigo-500', 'bg-rose-500', 'bg-amber-500', 'bg-emerald-500',
  'bg-cyan-500', 'bg-purple-500', 'bg-pink-500', 'bg-teal-500',
]

function avatarColor(id: number): string {
  return avatarColors[id % avatarColors.length]!
}

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
    <!-- ─── top bar ─── -->
    <div class="mb-4 flex items-center justify-between rounded-2xl border border-slate-200/60 bg-white/80 px-4 py-2.5 shadow-lg shadow-slate-200/30 backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/80 dark:shadow-slate-950/40">
      <div class="flex items-center gap-3">
        <button
          type="button"
          class="relative flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          @click="toggleSidebar"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
          <span
            v-if="totalUnreadCount > 0"
            class="absolute -right-0.5 -top-0.5 flex min-h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white dark:ring-slate-900"
          >
            {{ totalUnreadCount > 99 ? '99+' : totalUnreadCount }}
          </span>
        </button>
        <div class="flex items-center gap-2">
          <div class="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400">
            {{ (myLogin?.[0] ?? '?').toUpperCase() }}
          </div>
          <div class="text-sm font-medium">{{ myLogin || '—' }}</div>
          <span class="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-400">{{ myRole }}</span>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button
          v-if="myRole === 'root'"
          type="button"
          class="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          @click="toggleRootPanel"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.646.87a6.47 6.47 0 0 1 .578.338c.307.21.682.272 1.04.163l1.22-.394c.523-.169 1.09.033 1.364.5l1.297 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.886a1.128 1.128 0 0 0-.377.9v.676c0 .332.134.65.377.9l1.003.886c.408.36.518.922.26 1.431l-1.297 2.247a1.125 1.125 0 0 1-1.364.5l-1.22-.394c-.358-.11-.733-.047-1.04.162a6.6 6.6 0 0 1-.578.338c-.333.185-.583.496-.646.87l-.213 1.282c-.09.542-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.212-1.282a1.13 1.13 0 0 0-.646-.87 6.5 6.5 0 0 1-.578-.337c-.307-.21-.682-.273-1.04-.163l-1.22.394a1.125 1.125 0 0 1-1.365-.5l-1.296-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.886c.242-.2.377-.518.377-.9v-.676c0-.38-.134-.699-.377-.9l-1.004-.886a1.125 1.125 0 0 1-.26-1.43l1.297-2.248a1.125 1.125 0 0 1 1.364-.499l1.22.393c.358.11.733.048 1.04-.163a6.5 6.5 0 0 1 .578-.337 1.13 1.13 0 0 0 .646-.87l.213-1.282Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
        </button>
        <button
          type="button"
          :disabled="isLoggingOut"
          class="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
          @click="logout"
        >
          {{ isLoggingOut ? 'Выход…' : 'Выйти' }}
        </button>
      </div>
    </div>

    <!-- ─── sidebar backdrop ─── -->
    <Transition name="fade">
      <div
        v-if="isSidebarOpen"
        class="fixed inset-0 z-20 bg-black/30 backdrop-blur-sm"
        @click="isSidebarOpen = false"
      />
    </Transition>

    <!-- ─── sidebar ─── -->
    <aside
      class="fixed inset-y-0 left-0 z-30 flex w-[320px] flex-col border-r border-slate-200/60 bg-white/95 shadow-2xl backdrop-blur transition-transform duration-300 ease-out dark:border-slate-700/60 dark:bg-slate-900/95"
      :class="isSidebarOpen ? 'translate-x-0' : '-translate-x-full'"
    >
      <div class="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
        <h1 class="text-base font-bold tracking-tight">Чаты</h1>
        <button
          class="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          @click="isSidebarOpen = false"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <div class="px-4 pt-4 pb-2">
        <div class="relative">
          <svg class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path stroke-linecap="round" d="m21 21-4.35-4.35" /></svg>
          <input
            v-model="search"
            class="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:focus:border-indigo-500 dark:focus:bg-slate-900 dark:focus:ring-indigo-400/20"
            placeholder="Поиск пользователей…"
            @input="runSearch"
          />
        </div>
      </div>

      <div
        v-if="search.trim() && isSearching"
        class="flex items-center gap-2 px-5 py-2 text-xs text-slate-500 dark:text-slate-400"
      >
        <span class="inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600 dark:border-indigo-700 dark:border-t-indigo-400" aria-hidden="true" />
        Ищем…
      </div>
      <div
        v-else-if="search.trim() && !searchResults.length"
        class="px-5 py-2 text-xs text-slate-400 dark:text-slate-500"
      >
        Ничего не найдено
      </div>
      <div v-else-if="searchResults.length" class="space-y-1 px-4 pb-2">
        <button
          v-for="u in searchResults"
          :key="u.id"
          class="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
          @click="createChatWith(u.id)"
        >
          <div
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
            :class="avatarColor(u.id)"
          >
            {{ peerInitials(u.name, u.lastName) }}
          </div>
          <div class="min-w-0">
            <div class="truncate text-sm font-medium">{{ u.name }} {{ u.lastName }}</div>
            <div class="truncate text-xs text-slate-500">{{ u.email }}</div>
          </div>
        </button>
      </div>

      <div class="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
        <button
          v-for="chat in chats"
          :key="chat.id"
          class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition"
          :class="
            selectedChatId === chat.id
              ? 'bg-indigo-50 dark:bg-indigo-950/30'
              : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
          "
          @click="selectChat(chat.id)"
        >
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm"
            :class="avatarColor(chat.peer.id)"
          >
            {{ peerInitials(chat.peer.name, chat.peer.lastName) }}
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center justify-between gap-2">
              <span class="truncate text-sm font-semibold" :class="selectedChatId === chat.id ? 'text-indigo-700 dark:text-indigo-300' : ''">
                {{ chat.peer.name }} {{ chat.peer.lastName }}
              </span>
              <span
                v-if="(chat.unreadCount ?? 0) > 0"
                class="flex min-h-[1.25rem] min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-indigo-600 px-1.5 text-[10px] font-bold leading-none text-white"
              >
                {{ (chat.unreadCount ?? 0) > 99 ? '99+' : chat.unreadCount }}
              </span>
            </div>
            <div class="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
              {{ chat.lastMessage?.content ?? 'Нет сообщений' }}
            </div>
          </div>
        </button>
      </div>
    </aside>

    <!-- ─── root panel backdrop ─── -->
    <Transition name="fade">
      <div
        v-if="isRootPanelOpen"
        class="fixed inset-0 z-20 bg-black/30 backdrop-blur-sm"
        @click="isRootPanelOpen = false"
      />
    </Transition>

    <!-- ─── root panel ─── -->
    <aside
      v-if="myRole === 'root'"
      class="fixed inset-y-0 right-0 z-30 w-[380px] overflow-y-auto border-l border-slate-200/60 bg-white/95 p-5 shadow-2xl backdrop-blur transition-transform duration-300 ease-out dark:border-slate-700/60 dark:bg-slate-900/95"
      :class="isRootPanelOpen ? 'translate-x-0' : 'translate-x-full'"
    >
      <div class="mb-5 flex items-center justify-between">
        <h1 class="text-base font-bold tracking-tight">Панель root</h1>
        <button
          class="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          @click="isRootPanelOpen = false"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <div class="mb-5 rounded-xl border border-slate-200/60 bg-slate-50/50 p-3 dark:border-slate-700/60 dark:bg-slate-800/40">
        <div class="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">Добавить реакцию в каталог</div>
        <div class="flex gap-2">
          <input
            v-model="newReactionValue"
            class="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:focus:border-indigo-500 dark:focus:ring-indigo-400/20"
            placeholder="🤖"
          />
          <button
            type="button"
            class="shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
            @click="addReactionToCatalog"
          >
            Добавить
          </button>
        </div>
      </div>

      <div class="mb-5 rounded-xl border border-slate-200/60 bg-slate-50/50 p-3 dark:border-slate-700/60 dark:bg-slate-800/40">
        <div class="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">Управление ролями</div>
        <div ref="rootRoleDropdownRoot" class="relative mb-2">
          <input
            v-model="rootUsersRolesSearch"
            class="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:focus:border-indigo-500 dark:focus:ring-indigo-400/20"
            placeholder="Поиск пользователя…"
            @focus="isRootRoleDropdownOpen = true"
            @input="runRootRolesSearch"
          />
          <div
            v-if="isRootRoleDropdownOpen"
            class="absolute z-10 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-slate-200/80 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900"
          >
            <button
              v-for="u in rootUsersForRoles"
              :key="`role-pick-${u.id}`"
              type="button"
              class="block w-full rounded-lg px-2.5 py-1.5 text-left text-xs transition hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
              @click="pickRoleUser(u.id, `${u.name} ${u.lastName} (${u.email})`)"
            >
              {{ u.name }} {{ u.lastName }} ({{ u.email }}) — <span class="font-semibold">{{ u.role }}</span>
            </button>
            <div v-if="!rootUsersForRoles.length" class="px-2.5 py-1.5 text-xs text-slate-400">Ничего не найдено</div>
          </div>
        </div>
        <div v-if="selectedRoleUserId" class="rounded-lg border border-slate-200/60 bg-white p-2.5 text-xs dark:border-slate-700 dark:bg-slate-800">
          <div class="mb-1 text-slate-500">Новая роль</div>
          <select
            :value="rootUsersForRoles.find((u) => u.id === selectedRoleUserId)?.role ?? 'user'"
            class="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900"
            @change="onUserRoleChanged(selectedRoleUserId, $event)"
          >
            <option value="user">user</option>
            <option value="admin">admin</option>
            <option value="root">root</option>
          </select>
        </div>
      </div>

      <div class="mb-5 rounded-xl border border-slate-200/60 bg-slate-50/50 p-3 dark:border-slate-700/60 dark:bg-slate-800/40">
        <div class="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">Восстановление чатов</div>
        <div ref="rootChatsDropdownRoot" class="relative mb-2">
          <input
            v-model="rootUsersChatsSearch"
            class="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:focus:border-indigo-500 dark:focus:ring-indigo-400/20"
            placeholder="Поиск пользователя…"
            @focus="isRootUserDropdownOpen = true"
            @input="runRootUsersSearch"
          />
          <div
            v-if="isRootUserDropdownOpen"
            class="absolute z-10 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-slate-200/80 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900"
          >
            <button
              v-for="u in rootUsersForChats"
              :key="`pick-${u.id}`"
              type="button"
              class="block w-full rounded-lg px-2.5 py-1.5 text-left text-xs transition hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
              @click="pickRootUser(u.id, `${u.name} ${u.lastName} (${u.email})`)"
            >
              {{ u.name }} {{ u.lastName }} ({{ u.email }})
            </button>
            <div v-if="!rootUsersForChats.length" class="px-2.5 py-1.5 text-xs text-slate-400">Ничего не найдено</div>
          </div>
        </div>
        <div v-if="selectedRootUserId" class="max-h-52 space-y-2 overflow-y-auto pr-1">
          <div
            v-for="chat in rootUserChats"
            :key="`root-chat-${chat.id}`"
            class="rounded-xl border border-slate-200/60 bg-white p-2.5 text-xs dark:border-slate-700 dark:bg-slate-800"
          >
            <div class="font-medium">{{ chat.peer.name }} {{ chat.peer.lastName }}</div>
            <div class="truncate text-slate-500">{{ chat.peer.email }}</div>
            <div class="mt-1 text-[11px]">
              Статус:
              <span :class="chat.deletedAt ? 'text-red-500' : 'text-emerald-500'" class="font-semibold">
                {{ chat.deletedAt ? 'удалён' : 'активен' }}
              </span>
            </div>
            <button
              v-if="chat.deletedAt"
              type="button"
              class="mt-2 rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 transition hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:hover:bg-emerald-900/40"
              @click="restoreChatAsRoot(chat.id)"
            >
              Восстановить
            </button>
            <button
              v-else
              type="button"
              class="mt-2 rounded-lg bg-red-50 px-2.5 py-1 text-[11px] font-medium text-red-700 transition hover:bg-red-100 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-900/40"
              @click="deleteChatAsRoot(chat.id)"
            >
              Удалить
            </button>
          </div>
        </div>
      </div>
    </aside>

    <!-- ─── main content ─── -->
    <section class="rounded-2xl border border-slate-200/60 bg-white/80 shadow-lg shadow-slate-200/30 backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/80 dark:shadow-slate-950/40">
      <!-- boot loading -->
      <div v-if="isBootLoading" class="flex items-center justify-center py-24">
        <span class="inline-block h-6 w-6 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600 dark:border-indigo-700 dark:border-t-indigo-400" aria-hidden="true" />
      </div>

      <!-- empty state -->
      <div
        v-else-if="!selectedChat"
        class="flex min-h-[60vh] flex-col items-center justify-center gap-5 px-4 py-12 text-center"
      >
        <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/30">
          <svg class="h-8 w-8 text-indigo-500" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" /></svg>
        </div>
        <div>
          <p class="text-base font-semibold text-slate-700 dark:text-slate-300">Выберите чат</p>
          <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Откройте список слева или найдите пользователя</p>
        </div>
        <div class="w-full max-w-sm text-left">
          <div class="relative">
            <svg class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path stroke-linecap="round" d="m21 21-4.35-4.35" /></svg>
            <input
              v-model="search"
              type="search"
              class="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:focus:border-indigo-500 dark:focus:bg-slate-900 dark:focus:ring-indigo-400/20"
              placeholder="Имя, фамилия или email"
              @input="runSearch"
            />
          </div>
          <div v-if="search.trim()" class="mt-3">
            <div
              v-if="isSearching"
              class="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400"
            >
              <span class="inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600 dark:border-indigo-700 dark:border-t-indigo-400" aria-hidden="true" />
              Ищем…
            </div>
            <div
              v-else-if="!searchResults.length"
              class="text-sm text-slate-400 dark:text-slate-500"
            >
              Ничего не найдено
            </div>
            <div v-else class="max-h-60 space-y-1 overflow-y-auto rounded-xl border border-slate-200/60 p-2 dark:border-slate-700/60">
              <button
                v-for="u in searchResults"
                :key="`home-search-${u.id}`"
                type="button"
                class="flex w-full items-center gap-3 rounded-lg p-2 text-left transition hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
                @click="createChatWith(u.id)"
              >
                <div
                  class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  :class="avatarColor(u.id)"
                >
                  {{ peerInitials(u.name, u.lastName) }}
                </div>
                <div class="min-w-0">
                  <div class="truncate text-sm font-medium">{{ u.name }} {{ u.lastName }}</div>
                  <div class="truncate text-xs text-slate-500">{{ u.email }}</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ─── active chat ─── -->
      <div v-else class="flex h-[75vh] flex-col">
        <!-- chat header -->
        <div class="flex items-center justify-between border-b border-slate-100 px-5 py-3 dark:border-slate-800">
          <div class="flex items-center gap-3">
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm"
              :class="avatarColor(selectedChat.peer.id)"
            >
              {{ peerInitials(selectedChat.peer.name, selectedChat.peer.lastName) }}
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="font-semibold">{{ selectedChat.peer.name }} {{ selectedChat.peer.lastName }}</span>
                <span
                  v-if="(selectedChat.unreadCount ?? 0) > 0"
                  class="flex min-h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-indigo-600 px-1.5 text-[10px] font-bold leading-none text-white"
                >
                  {{ (selectedChat.unreadCount ?? 0) > 99 ? '99+' : selectedChat.unreadCount }}
                </span>
              </div>
              <div class="text-xs text-slate-500 dark:text-slate-400">{{ selectedChat.peer.email }}</div>
            </div>
          </div>
          <button
            type="button"
            class="rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-500 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
            @click="deleteChat"
          >
            Удалить
          </button>
        </div>

        <!-- messages -->
        <div
          ref="messagesScrollRoot"
          class="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4"
          @scroll.passive="onMessagesScroll"
        >
          <div v-if="isMessagesLoading" class="flex justify-center py-8">
            <span class="inline-block h-5 w-5 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600 dark:border-indigo-700 dark:border-t-indigo-400" aria-hidden="true" />
          </div>
          <div
            v-for="m in messages"
            :key="m.id"
            class="flex"
            :class="m.senderId === currentUserId ? 'justify-end' : 'justify-start'"
          >
            <div
              class="max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm"
              :class="
                m.senderId === currentUserId
                  ? 'rounded-br-md bg-indigo-600 text-white dark:bg-indigo-500'
                  : 'rounded-bl-md bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100'
              "
            >
              <!-- editing -->
              <div v-if="editingMessageId === m.id">
                <textarea
                  v-model="editingText"
                  class="w-full rounded-lg border border-white/30 bg-white/20 px-2 py-1 text-sm text-inherit outline-none backdrop-blur focus:ring-2 focus:ring-white/30"
                  rows="3"
                />
                <div class="mt-2 flex gap-2">
                  <button class="rounded-md bg-white/20 px-2.5 py-1 text-xs font-medium backdrop-blur transition hover:bg-white/30" @click="saveEditMessage(m.id)">Сохранить</button>
                  <button class="rounded-md bg-white/10 px-2.5 py-1 text-xs transition hover:bg-white/20" @click="cancelEditMessage">Отмена</button>
                </div>
              </div>
              <div v-else class="whitespace-pre-wrap break-words">{{ m.content }}</div>

              <!-- meta -->
              <div
                class="mt-1.5 text-[10px]"
                :class="m.senderId === currentUserId ? 'text-white/60' : 'text-slate-400 dark:text-slate-500'"
              >
                {{ new Date(m.createdAt).toLocaleString() }}
                <span v-if="isMessageEdited(m)"> · изменено</span>
                <span
                  v-if="m.senderId === currentUserId && m.readByPeer"
                  class="text-emerald-300"
                >
                  · прочитано
                </span>
              </div>

              <!-- reactions -->
              <div data-reaction-picker-scope class="mt-1.5">
                <div class="flex flex-wrap items-center gap-1">
                  <button
                    v-for="r in m.reactions ?? []"
                    :key="`${m.id}-${r.value}`"
                    class="rounded-full border px-2 py-0.5 text-[11px] transition"
                    :class="
                      r.reactedByMe
                        ? 'border-emerald-400/60 bg-emerald-500/20'
                        : m.senderId === currentUserId
                          ? 'border-white/20 hover:border-white/40'
                          : 'border-slate-200 hover:border-slate-300 dark:border-slate-600 dark:hover:border-slate-500'
                    "
                    @click="toggleReaction(m.id, r.value, r.reactedByMe)"
                  >
                    {{ r.value }}<span v-if="r.count > 1"> {{ r.count }}</span>
                  </button>
                  <button
                    class="rounded-full border px-2 py-0.5 text-[11px] transition"
                    :class="
                      m.senderId === currentUserId
                        ? 'border-white/20 hover:border-white/40 hover:bg-white/10'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:hover:border-slate-500 dark:hover:bg-slate-700'
                    "
                    @click="toggleReactionPicker(m.id)"
                  >
                    +
                  </button>
                </div>
                <div
                  v-if="reactionPickerMessageId === m.id"
                  class="mt-1.5 flex flex-wrap gap-1 rounded-xl border p-2"
                  :class="
                    m.senderId === currentUserId
                      ? 'border-white/20 bg-white/10 backdrop-blur'
                      : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'
                  "
                >
                  <button
                    v-for="value in reactionCatalog"
                    :key="`${m.id}-catalog-${value}`"
                    class="rounded-lg px-2 py-0.5 text-xs transition hover:scale-110"
                    :class="
                      m.senderId === currentUserId
                        ? 'hover:bg-white/20'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                    "
                    @click="toggleReaction(m.id, value, false)"
                  >
                    {{ value }}
                  </button>
                </div>
              </div>

              <!-- actions -->
              <div
                v-if="m.senderId === currentUserId && editingMessageId !== m.id"
                class="mt-1 flex gap-3 text-[11px] text-white/50"
              >
                <button class="transition hover:text-white/80" @click="startEditMessage(m)">Ред.</button>
                <button class="transition hover:text-white/80" @click="deleteMessage(m.id)">Удалить</button>
              </div>
            </div>
          </div>
          <div
            ref="messagesEndAnchor"
            class="pointer-events-none h-px w-full shrink-0"
            aria-hidden="true"
          />
        </div>

        <!-- message input -->
        <div class="border-t border-slate-100 px-4 py-3 dark:border-slate-800">
          <form class="flex items-center gap-2" @submit.prevent="sendMessage">
            <input
              v-model="messageText"
              class="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:focus:border-indigo-500 dark:focus:bg-slate-900 dark:focus:ring-indigo-400/20"
              placeholder="Напишите сообщение…"
            />
            <button
              type="submit"
              :disabled="isSending || !messageText.trim()"
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-500/25 transition hover:bg-indigo-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-indigo-500 dark:hover:bg-indigo-600"
            >
              <svg v-if="!isSending" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0 1 21.485 12 59.77 59.77 0 0 1 3.27 20.876L5.999 12Zm0 0h7.5" /></svg>
              <span v-else class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            </button>
          </form>
        </div>
      </div>
    </section>
  </div>

  <!-- global error -->
  <div
    v-if="errorMessage"
    class="mt-4 rounded-xl border border-red-200/80 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
  >
    {{ errorMessage }}
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 200ms ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
