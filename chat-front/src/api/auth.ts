import { apiUrl } from './config'

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('accessToken')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function fetchMeApi(): Promise<{
  userId: number
  login?: string
  role: 'root' | 'admin' | 'user'
}> {
  const res = await fetch(apiUrl('/auth/me'), {
    headers: authHeaders(),
    credentials: 'include',
  })
  if (!res.ok) throw new Error('Сессия недействительна')
  return (await res.json()) as {
    userId: number
    login?: string
    role: 'root' | 'admin' | 'user'
  }
}

export async function logoutApi(): Promise<void> {
  const res = await fetch(apiUrl('/auth/logout'), {
    method: 'POST',
    credentials: 'include',
  })
  if (!res.ok) throw new Error(`Не удалось выйти (код ${res.status})`)
}

export function getAuthHeaders(): HeadersInit {
  return authHeaders()
}

