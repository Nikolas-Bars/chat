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
  <div class="grid place-items-center py-10">
    <form
      class="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
      @submit.prevent="submitLogin"
    >
      <h1 class="text-2xl font-semibold">Логин</h1>

      <label class="mt-4 block text-sm font-medium text-slate-700 dark:text-slate-200">
        Логин или email
        <input
          v-model="loginOrEmail"
          class="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none ring-slate-300 focus:ring-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:ring-slate-700"
          type="text"
          required
        />
      </label>

      <label class="mt-4 block text-sm font-medium text-slate-700 dark:text-slate-200">
        Пароль
        <input
          v-model="password"
          class="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none ring-slate-300 focus:ring-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:ring-slate-700"
          type="password"
          required
        />
      </label>

      <button
        :disabled="isLoading"
        class="mt-6 w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        type="submit"
      >
        {{ isLoading ? 'Входим...' : 'Войти' }}
      </button>

      <button
        class="mt-3 w-full rounded-xl border border-slate-200 bg-transparent px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
        type="button"
        @click="goToRegistration"
      >
        Регистрация
      </button>

      <p
        v-if="errorMessage"
        class="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
      >
        {{ errorMessage }}
      </p>
    </form>
  </div>
</template>
