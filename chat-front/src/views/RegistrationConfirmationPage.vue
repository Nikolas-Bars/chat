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
  <main class="confirm-page">
    <div class="card">
      <h1>Подтверждение email</h1>

      <template v-if="status === 'loading'">
        <p class="muted">Отправляем код на сервер…</p>
      </template>

      <template v-else-if="status === 'success'">
        <p class="success">{{ message }}</p>
        <button type="button" @click="goLogin">Перейти ко входу</button>
      </template>

      <template v-else-if="status === 'error'">
        <p class="error">{{ message }}</p>
        <button class="secondary" type="button" @click="goRegister">
          Зарегистрироваться снова
        </button>
        <button type="button" @click="goLogin">На страницу входа</button>
      </template>

      <template v-else>
        <p class="muted">
          Перейдите по ссылке из письма — подтверждение произойдёт автоматически.
          Если открыли страницу без кода, вставьте UUID из письма:
        </p>
        <form class="manual" @submit.prevent="submitManual">
          <label>
            Код подтверждения
            <input
              v-model="manualCode"
              type="text"
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              autocomplete="off"
            />
          </label>
          <button type="submit">Подтвердить</button>
        </form>
      </template>
    </div>
  </main>
</template>

<style scoped>
.confirm-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  font-family: Arial, sans-serif;
  padding: 24px 12px;
}

.card {
  width: min(100%, 420px);
  display: grid;
  gap: 16px;
}

h1 {
  margin: 0;
  font-size: 1.5rem;
}

.muted {
  color: #555;
  margin: 0;
  line-height: 1.5;
}

.manual {
  display: grid;
  gap: 12px;
}

label {
  display: grid;
  gap: 6px;
  font-size: 0.9rem;
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
}
</style>
