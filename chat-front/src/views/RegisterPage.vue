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
  <main class="register-page">
    <form class="register-form" @submit.prevent="submitRegister">
      <h1>Регистрация</h1>

      <label>
        Имя
        <input v-model="name" type="text" required maxlength="255" />
      </label>

      <label>
        Фамилия
        <input v-model="lastName" type="text" required maxlength="255" />
      </label>

      <label>
        Возраст
        <input
          v-model.number="age"
          type="number"
          min="0"
          step="1"
          required
        />
      </label>

      <label>
        Email
        <input v-model="email" type="email" required maxlength="255" />
      </label>

      <label>
        Телефон
        <input v-model="phone" type="text" required maxlength="255" />
      </label>

      <label>
        Пароль (6–20 символов)
        <input
          v-model="password"
          type="password"
          required
          minlength="6"
          maxlength="20"
          autocomplete="new-password"
        />
      </label>

      <label>
        Пароль ещё раз
        <input
          v-model="passwordConfirm"
          type="password"
          required
          minlength="6"
          maxlength="20"
          autocomplete="new-password"
        />
      </label>

      <label class="optional">
        Должность
        <input v-model="jobTitle" type="text" maxlength="255" />
      </label>

      <label class="optional">
        Компания
        <input v-model="company" type="text" maxlength="255" />
      </label>

      <button :disabled="isLoading" type="submit">
        {{ isLoading ? 'Отправка…' : 'Зарегистрироваться' }}
      </button>

      <button class="secondary" type="button" @click="backToLogin">
        Уже есть аккаунт — войти
      </button>

      <p v-if="successMessage" class="success">{{ successMessage }}</p>
      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
    </form>
  </main>
</template>

<style scoped>
.register-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  font-family: Arial, sans-serif;
  padding: 24px 12px;
}

.register-form {
  width: min(100%, 400px);
  display: grid;
  gap: 12px;
}

h1 {
  margin: 0 0 4px;
  font-size: 1.5rem;
}

label {
  display: grid;
  gap: 6px;
  font-size: 0.9rem;
}

label.optional {
  opacity: 0.95;
}

input {
  padding: 8px;
}

button {
  padding: 10px;
  cursor: pointer;
}

.secondary {
  background: transparent;
  border: 1px solid #aaa;
}

.error {
  color: #c52222;
  margin: 0;
}

.success {
  color: #1b6e1b;
  margin: 0;
  line-height: 1.4;
}
</style>
