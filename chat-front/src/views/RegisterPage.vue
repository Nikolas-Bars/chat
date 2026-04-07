<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { apiUrl } from '../api/config'

const router = useRouter()

const name = ref('')
const lastName = ref('')
/** v-model.number при пустом поле может дать пустую строку */
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
        'Аккаунт создан. Проверьте почту и подтвердите email по ссылке из письма, затем войдите.'
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
</script>

<template>
  <div class="grid place-items-center py-10">
    <form
      class="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
      @submit.prevent="submitRegister"
    >
      <h1 class="text-2xl font-semibold">Регистрация</h1>

      <div class="mt-4 grid gap-4 sm:grid-cols-2">
        <label class="block text-sm font-medium text-slate-700 dark:text-slate-200">
          Имя
          <input
            v-model="name"
            class="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none ring-slate-300 focus:ring-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:ring-slate-700"
            type="text"
            required
            maxlength="255"
          />
        </label>

        <label class="block text-sm font-medium text-slate-700 dark:text-slate-200">
          Фамилия
          <input
            v-model="lastName"
            class="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none ring-slate-300 focus:ring-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:ring-slate-700"
            type="text"
            required
            maxlength="255"
          />
        </label>
      </div>

      <div class="mt-4 grid gap-4 sm:grid-cols-2">
        <label class="block text-sm font-medium text-slate-700 dark:text-slate-200">
          Возраст
          <input
            v-model.number="age"
            class="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none ring-slate-300 focus:ring-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:ring-slate-700"
            type="number"
            min="0"
            step="1"
            required
          />
        </label>

        <label class="block text-sm font-medium text-slate-700 dark:text-slate-200">
          Email
          <input
            v-model="email"
            class="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none ring-slate-300 focus:ring-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:ring-slate-700"
            type="email"
            required
            maxlength="255"
          />
        </label>
      </div>

      <label class="mt-4 block text-sm font-medium text-slate-700 dark:text-slate-200">
        Телефон
        <input
          v-model="phone"
          class="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none ring-slate-300 focus:ring-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:ring-slate-700"
          type="text"
          required
          maxlength="255"
        />
      </label>

      <div class="mt-4 grid gap-4 sm:grid-cols-2">
        <label class="block text-sm font-medium text-slate-700 dark:text-slate-200">
          Пароль (6–20 символов)
          <input
            v-model="password"
            class="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none ring-slate-300 focus:ring-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:ring-slate-700"
            type="password"
            required
            minlength="6"
            maxlength="20"
            autocomplete="new-password"
          />
        </label>

        <label class="block text-sm font-medium text-slate-700 dark:text-slate-200">
          Пароль ещё раз
          <input
            v-model="passwordConfirm"
            class="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none ring-slate-300 focus:ring-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:ring-slate-700"
            type="password"
            required
            minlength="6"
            maxlength="20"
            autocomplete="new-password"
          />
        </label>
      </div>

      <div class="mt-4 grid gap-4 sm:grid-cols-2">
        <label class="block text-sm font-medium text-slate-700 dark:text-slate-200">
          Должность (необязательно)
          <input
            v-model="jobTitle"
            class="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none ring-slate-300 focus:ring-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:ring-slate-700"
            type="text"
            maxlength="255"
          />
        </label>

        <label class="block text-sm font-medium text-slate-700 dark:text-slate-200">
          Компания (необязательно)
          <input
            v-model="company"
            class="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none ring-slate-300 focus:ring-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:ring-slate-700"
            type="text"
            maxlength="255"
          />
        </label>
      </div>

      <button
        :disabled="isLoading"
        class="mt-6 w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        type="submit"
      >
        {{ isLoading ? 'Отправка…' : 'Зарегистрироваться' }}
      </button>

      <button
        class="mt-3 w-full rounded-xl border border-slate-200 bg-transparent px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
        type="button"
        @click="backToLogin"
      >
        Уже есть аккаунт — войти
      </button>

      <p
        v-if="successMessage"
        class="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200"
      >
        {{ successMessage }}
      </p>
      <p
        v-if="errorMessage"
        class="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
      >
        {{ errorMessage }}
      </p>
    </form>
  </div>
</template>
