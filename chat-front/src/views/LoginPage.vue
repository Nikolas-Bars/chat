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
  <main class="login-page">
    <form class="login-form" @submit.prevent="submitLogin">
      <h1>Логин</h1>

      <label>
        Логин или email
        <input v-model="loginOrEmail" type="text" required />
      </label>

      <label>
        Пароль
        <input v-model="password" type="password" required />
      </label>

      <button :disabled="isLoading" type="submit">
        {{ isLoading ? 'Входим...' : 'Войти' }}
      </button>

      <button class="secondary" type="button" @click="goToRegistration">
        Регистрация
      </button>

      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
    </form>
  </main>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  font-family: Arial, sans-serif;
}

.login-form {
  width: 320px;
  display: grid;
  gap: 12px;
}

label {
  display: grid;
  gap: 6px;
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
}
</style>
