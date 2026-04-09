<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { apiUrl } from '../api/config'

const route = useRoute()
const router = useRouter()

const codeInUrl =
  typeof route.query.code === 'string' ? route.query.code.trim() : ''

const status = ref<'idle' | 'loading' | 'success' | 'error'>(
  codeInUrl ? 'loading' : 'idle',
)
const message = ref('')
const manualCode = ref('')

async function confirmWithCode(code: string) {
  const trimmed = code.trim()
  if (!trimmed) {
    status.value = 'error'
    message.value = 'Укажите код подтверждения (UUID из письма).'
    return
  }

  status.value = 'loading'
  message.value = ''

  try {
    const res = await fetch(apiUrl('/auth/registration-confirmation'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ code: trimmed }),
    })

    if (res.status === 204) {
      status.value = 'success'
      message.value = 'Email подтверждён. Теперь можно войти.'
      return
    }

    const data = (await res.json().catch(() => ({}))) as {
      message?: string | string[]
    }
    const raw = Array.isArray(data.message)
      ? data.message.join(', ')
      : data.message
    status.value = 'error'
    if (raw?.includes('Invalid confirmation')) {
      message.value = 'Неверный или устаревший код подтверждения.'
    } else if (raw?.includes('already confirmed')) {
      message.value = 'Этот email уже подтверждён. Можно войти.'
    } else if (raw?.includes('expired')) {
      message.value = 'Срок действия кода истёк. Зарегистрируйтесь снова.'
    } else {
      message.value = typeof raw === 'string' ? raw : `Ошибка (${res.status})`
    }
  } catch {
    status.value = 'error'
    message.value =
      'Не удалось связаться с сервером. Проверьте, что бэкенд запущен (порт 3000).'
  }
}

onMounted(() => {
  if (codeInUrl) {
    void confirmWithCode(codeInUrl)
  }
})

watch(
  () => route.query.code,
  (code) => {
    if (typeof code === 'string' && code.trim() && status.value === 'idle') {
      void confirmWithCode(code)
    }
  },
)

async function submitManual() {
  await confirmWithCode(manualCode.value)
}

async function goLogin() {
  await router.push('/login')
}

async function goRegister() {
  await router.push('/register')
}
</script>

<template>
  <div class="grid min-h-[75dvh] place-items-center">
    <div class="w-full max-w-md">
      <div class="mb-8 text-center">
        <div
          class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-xl font-bold text-white shadow-lg shadow-indigo-500/30"
        >
          Q
        </div>
        <h1 class="text-2xl font-bold tracking-tight">Подтверждение email</h1>
      </div>

      <div
        class="rounded-2xl border border-slate-200/60 bg-white/80 p-6 shadow-xl shadow-slate-200/40 backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/80 dark:shadow-slate-950/50"
      >
        <template v-if="status === 'loading'">
          <div class="flex items-center justify-center gap-3 py-6">
            <span
              class="inline-block h-5 w-5 animate-spin rounded-full border-2 border-indigo-300 border-t-indigo-600 dark:border-indigo-700 dark:border-t-indigo-400"
              aria-hidden="true"
            />
            <span class="text-sm text-slate-500 dark:text-slate-400">Отправляем код на сервер…</span>
          </div>
        </template>

        <template v-else-if="status === 'success'">
          <div class="py-2">
            <p class="rounded-xl border border-emerald-200/80 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200">
              {{ message }}
            </p>
            <button
              type="button"
              class="mt-4 w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/25 transition hover:bg-indigo-700 active:scale-[0.98] dark:bg-indigo-500 dark:hover:bg-indigo-600"
              @click="goLogin"
            >
              Перейти ко входу
            </button>
          </div>
        </template>

        <template v-else-if="status === 'error'">
          <div class="py-2">
            <p class="rounded-xl border border-red-200/80 bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
              {{ message }}
            </p>
            <div class="mt-4 flex gap-3">
              <button
                type="button"
                class="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 active:scale-[0.98] dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                @click="goRegister"
              >
                Регистрация
              </button>
              <button
                type="button"
                class="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/25 transition hover:bg-indigo-700 active:scale-[0.98] dark:bg-indigo-500 dark:hover:bg-indigo-600"
                @click="goLogin"
              >
                Войти
              </button>
            </div>
          </div>
        </template>

        <template v-else>
          <p class="mb-4 text-sm text-slate-500 dark:text-slate-400">
            Перейдите по ссылке из письма — подтверждение произойдёт автоматически.
            Или вставьте UUID-код вручную:
          </p>
          <form @submit.prevent="submitManual">
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Код подтверждения
              <input
                v-model="manualCode"
                type="text"
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                autocomplete="off"
                class="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-indigo-500 dark:focus:bg-slate-900 dark:focus:ring-indigo-400/20"
              />
            </label>
            <button
              type="submit"
              class="mt-4 w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/25 transition hover:bg-indigo-700 active:scale-[0.98] dark:bg-indigo-500 dark:hover:bg-indigo-600"
            >
              Подтвердить
            </button>
          </form>
        </template>
      </div>
    </div>
  </div>
</template>
