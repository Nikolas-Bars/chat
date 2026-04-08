import { apiUrl } from './config'
import { getAuthHeaders } from './auth'

export type UserSearchItem = {
  id: number
  name: string
  lastName: string
  email: string
  role?: 'root' | 'admin' | 'user'
}

export async function searchUsersApi(query: string): Promise<UserSearchItem[]> {
  const res = await fetch(apiUrl(`/users/search?query=${encodeURIComponent(query)}`), {
    headers: getAuthHeaders(),
    credentials: 'include',
  })
  if (!res.ok) throw new Error(`Поиск недоступен (${res.status})`)
  return (await res.json()) as UserSearchItem[]
}

export type UserListItem = {
  id: number
  name: string
  lastName: string
  email: string
  role: 'root' | 'admin' | 'user'
}

export async function fetchUsersApi(
  query = '',
  limit = 5,
): Promise<UserListItem[]> {
  const params = new URLSearchParams()
  if (query.trim()) params.set('query', query.trim())
  params.set('limit', String(limit))
  const res = await fetch(apiUrl(`/users?${params.toString()}`), {
    headers: getAuthHeaders(),
    credentials: 'include',
  })
  if (!res.ok) throw new Error(`Не удалось загрузить пользователей (${res.status})`)
  return (await res.json()) as UserListItem[]
}

export async function updateUserRoleApi(
  userId: number,
  role: 'root' | 'admin' | 'user',
): Promise<UserListItem> {
  const res = await fetch(apiUrl(`/users/${userId}/role`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    credentials: 'include',
    body: JSON.stringify({ role }),
  })
  if (!res.ok) throw new Error(`Не удалось обновить роль (${res.status})`)
  return (await res.json()) as UserListItem
}

