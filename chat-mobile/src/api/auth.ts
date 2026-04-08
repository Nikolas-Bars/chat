import { apiUrl, authFetch } from './client'

export async function loginApi(loginOrEmail: string, password: string): Promise<{ accessToken?: string }> {
  const res = await fetch(apiUrl('/auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loginOrEmail, password }),
  })
  if (!res.ok) {
    if (res.status === 401) throw new Error('Неверный логин или пароль')
    throw new Error(`Не удалось войти (код ${res.status})`)
  }
  return (await res.json()) as { accessToken?: string }
}

export async function fetchMeApi(): Promise<{
  userId: number
  login?: string
  role: 'root' | 'admin' | 'user'
}> {
  const res = await authFetch(apiUrl('/auth/me'))
  if (!res.ok) throw new Error('Сессия недействительна')
  return (await res.json()) as {
    userId: number
    login?: string
    role: 'root' | 'admin' | 'user'
  }
}

export async function logoutApi(): Promise<void> {
  const res = await authFetch(apiUrl('/auth/logout'), { method: 'POST' })
  if (!res.ok) throw new Error(`Не удалось выйти (код ${res.status})`)
}
