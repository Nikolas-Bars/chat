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
  <main class="hello-page">
    <div class="hello-card">
      <h1>Привет, Вася</h1>
      <button type="button" :disabled="isLoggingOut" @click="logout">
        {{ isLoggingOut ? 'Выходим…' : 'Выйти' }}
      </button>
      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
    </div>
  </main>
</template>

<style scoped>
.hello-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  font-family: Arial, sans-serif;
}

.hello-card {
  display: grid;
  gap: 16px;
  justify-items: center;
}

button {
  padding: 10px 20px;
  cursor: pointer;
}

.error {
  color: #c52222;
  margin: 0;
}
</style>
