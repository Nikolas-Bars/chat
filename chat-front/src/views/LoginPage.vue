<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { apiUrl } from '../api/config'

const router = useRouter()
const loginOrEmail = ref('')
const password = ref('')
const isLoading = ref(false)
const errorMessage = ref('')

async function submitLogin() {
  errorMessage.value = ''
  isLoading.value = true

  try {
    const response = await fetch(apiUrl('/auth/login'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        loginOrEmail: loginOrEmail.value,
        password: password.value,
      }),
    })

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Неверный логин или пароль')
      }
      if (response.status >= 500) {
        throw new Error(
          'Ошибка сервера или прокси (часто бэкенд не запущен). В chat-back выполните: yarn start:dev (порт 3000), затем обновите страницу.',
        )
      }
      throw new Error(`Не удалось войти (код ${response.status})`)
    }

    const tokens = (await response.json()) as { accessToken?: string }
    if (tokens.accessToken) {
      localStorage.setItem('accessToken', tokens.accessToken)
    }
    await router.push('/hello')
  } catch (error) {
    if (error instanceof TypeError) {
      errorMessage.value =
        'Сервер недоступен. Запустите бэкенд: в папке chat-back выполните yarn start:dev (порт 3000).'
    } else if (error instanceof Error) {
      errorMessage.value = error.message
    } else {
      errorMessage.value = 'Не удалось выполнить вход'
    }
  } finally {
    isLoading.value = false
  }
}

async function goToRegistration() {
  await router.push('/register')
}
</script>

<template>
  <div class="grid min-h-[75dvh] place-items-center">
    <div class="w-full max-w-sm">
      <div class="mb-8 text-center">
        <div
          class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-xl font-bold text-white shadow-lg shadow-indigo-500/30"
        >
          Q
        </div>
        <h1 class="text-2xl font-bold tracking-tight">Добро пожаловать</h1>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Войдите, чтобы продолжить</p>
      </div>

      <form
        class="rounded-2xl border border-slate-200/60 bg-white/80 p-6 shadow-xl shadow-slate-200/40 backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/80 dark:shadow-slate-950/50"
        @submit.prevent="submitLogin"
      >
        <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Логин или email
          <input
            v-model="loginOrEmail"
            class="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-indigo-500 dark:focus:bg-slate-900 dark:focus:ring-indigo-400/20"
            type="text"
            required
          />
        </label>

        <label class="mt-4 block text-sm font-medium text-slate-700 dark:text-slate-300">
          Пароль
          <input
            v-model="password"
            class="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-indigo-500 dark:focus:bg-slate-900 dark:focus:ring-indigo-400/20"
            type="password"
            required
          />
        </label>

        <button
          :disabled="isLoading"
          class="mt-6 w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/25 transition hover:bg-indigo-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-indigo-500 dark:hover:bg-indigo-600"
          type="submit"
        >
          {{ isLoading ? 'Входим...' : 'Войти' }}
        </button>

        <div class="relative my-5">
          <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-slate-200 dark:border-slate-700/60" /></div>
          <div class="relative flex justify-center"><span class="bg-white px-3 text-xs text-slate-400 dark:bg-slate-900 dark:text-slate-500">или</span></div>
        </div>

        <button
          class="w-full rounded-xl border border-slate-200 bg-transparent px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 active:scale-[0.98] dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          type="button"
          @click="goToRegistration"
        >
          Создать аккаунт
        </button>

        <p
          v-if="errorMessage"
          class="mt-5 rounded-xl border border-red-200/80 bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
        >
          {{ errorMessage }}
        </p>
      </form>
    </div>
  </div>
</template>
