<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { apiUrl } from '../api/config'

const router = useRouter()

const name = ref('')
const lastName = ref('')
const age = ref<number | string | null>(null)
const email = ref('')
const phone = ref('')
const password = ref('')
const passwordConfirm = ref('')
const jobTitle = ref('')
const company = ref('')

const isLoading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const ageValid = computed(() => {
  const v = age.value
  if (v === null || v === undefined || v === '') return false
  const n = Number(v)
  return Number.isInteger(n) && n >= 0
})

function buildPayload(): Record<string, unknown> {
  const body: Record<string, unknown> = {
    name: name.value.trim(),
    lastName: lastName.value.trim(),
    age: Number(age.value),
    password: password.value,
    email: email.value.trim(),
    phone: phone.value.trim(),
  }
  const jt = jobTitle.value.trim()
  const co = company.value.trim()
  if (jt) body.jobTitle = jt
  if (co) body.company = co
  return body
}

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as {
      message?: string | string[]
    }
    if (Array.isArray(data.message)) {
      return data.message.join(', ')
    }
    if (typeof data.message === 'string') {
      return data.message
    }
  } catch {
    /* ignore */
  }
  return `Ошибка (код ${response.status})`
}

async function submitRegister() {
  errorMessage.value = ''
  successMessage.value = ''

  if (password.value.length < 6 || password.value.length > 20) {
    errorMessage.value = 'Пароль: от 6 до 20 символов'
    return
  }
  if (password.value !== passwordConfirm.value) {
    errorMessage.value = 'Пароли не совпадают'
    return
  }
  if (!ageValid.value) {
    errorMessage.value = 'Укажите возраст целым числом (не меньше 0)'
    return
  }

  isLoading.value = true
  try {
    const response = await fetch(apiUrl('/auth/registration'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(buildPayload()),
    })

    if (response.status === 204) {
      successMessage.value =
        'Аккаунт создан. Теперь можно войти.'
      return
    }

    if (!response.ok) {
      let msg = await parseErrorMessage(response)
      if (response.status === 400 && msg.includes('already exists')) {
        msg = 'Пользователь с таким email уже зарегистрирован'
      }
      throw new Error(msg)
    }
  } catch (error) {
    if (error instanceof TypeError) {
      errorMessage.value =
        'Сервер недоступен. Убедитесь, что бэкенд запущен (порт 3000).'
    } else if (error instanceof Error) {
      errorMessage.value = error.message
    } else {
      errorMessage.value = 'Не удалось зарегистрироваться'
    }
  } finally {
    isLoading.value = false
  }
}

async function backToLogin() {
  await router.push('/login')
}

const inputClass =
  'mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-indigo-500 dark:focus:bg-slate-900 dark:focus:ring-indigo-400/20'
</script>

<template>
  <div class="grid min-h-[75dvh] place-items-center py-4">
    <div class="w-full max-w-lg">
      <div class="mb-8 text-center">
        <div
          class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-xl font-bold text-white shadow-lg shadow-indigo-500/30"
        >
          Q
        </div>
        <h1 class="text-2xl font-bold tracking-tight">Создать аккаунт</h1>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Заполните форму для регистрации</p>
      </div>

      <form
        class="rounded-2xl border border-slate-200/60 bg-white/80 p-6 shadow-xl shadow-slate-200/40 backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/80 dark:shadow-slate-950/50"
        @submit.prevent="submitRegister"
      >
        <div class="grid gap-4 sm:grid-cols-2">
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Имя
            <input v-model="name" :class="inputClass" type="text" required maxlength="255" />
          </label>
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Фамилия
            <input v-model="lastName" :class="inputClass" type="text" required maxlength="255" />
          </label>
        </div>

        <div class="mt-4 grid gap-4 sm:grid-cols-2">
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Возраст
            <input v-model.number="age" :class="inputClass" type="number" min="0" step="1" required />
          </label>
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Email
            <input v-model="email" :class="inputClass" type="email" required maxlength="255" />
          </label>
        </div>

        <label class="mt-4 block text-sm font-medium text-slate-700 dark:text-slate-300">
          Телефон
          <input v-model="phone" :class="inputClass" type="text" required maxlength="255" />
        </label>

        <div class="mt-4 grid gap-4 sm:grid-cols-2">
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Пароль (6–20)
            <input v-model="password" :class="inputClass" type="password" required minlength="6" maxlength="20" autocomplete="new-password" />
          </label>
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Повторите
            <input v-model="passwordConfirm" :class="inputClass" type="password" required minlength="6" maxlength="20" autocomplete="new-password" />
          </label>
        </div>

        <div class="mt-4 grid gap-4 sm:grid-cols-2">
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Должность
            <input v-model="jobTitle" :class="inputClass" type="text" maxlength="255" placeholder="необязательно" />
          </label>
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Компания
            <input v-model="company" :class="inputClass" type="text" maxlength="255" placeholder="необязательно" />
          </label>
        </div>

        <button
          :disabled="isLoading"
          class="mt-6 w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/25 transition hover:bg-indigo-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-indigo-500 dark:hover:bg-indigo-600"
          type="submit"
        >
          {{ isLoading ? 'Отправка…' : 'Зарегистрироваться' }}
        </button>

        <div class="relative my-5">
          <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-slate-200 dark:border-slate-700/60" /></div>
          <div class="relative flex justify-center"><span class="bg-white px-3 text-xs text-slate-400 dark:bg-slate-900 dark:text-slate-500">или</span></div>
        </div>

        <button
          class="w-full rounded-xl border border-slate-200 bg-transparent px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 active:scale-[0.98] dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          type="button"
          @click="backToLogin"
        >
          Уже есть аккаунт — войти
        </button>

        <p
          v-if="successMessage"
          class="mt-5 rounded-xl border border-emerald-200/80 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200"
        >
          {{ successMessage }}
        </p>
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
