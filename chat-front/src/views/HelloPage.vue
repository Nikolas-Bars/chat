<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { apiUrl } from '../api/config'

const router = useRouter()
const isLoggingOut = ref(false)
const errorMessage = ref('')

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
  <div class="grid place-items-center py-10">
    <div
      class="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <h1 class="text-2xl font-semibold">Привет</h1>
      <button
        type="button"
        :disabled="isLoggingOut"
        class="mt-6 w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        @click="logout"
      >
        {{ isLoggingOut ? 'Выходим…' : 'Выйти' }}
      </button>
      <p
        v-if="errorMessage"
        class="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
      >
        {{ errorMessage }}
      </p>
    </div>
  </div>
</template>
