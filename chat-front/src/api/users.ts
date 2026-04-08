import { apiUrl } from './config'
import { getAuthHeaders } from './auth'

export type UserSearchItem = {
  id: number
  name: string
  lastName: string
  email: string
}

export async function searchUsersApi(query: string): Promise<UserSearchItem[]> {
  const res = await fetch(apiUrl(`/users/search?query=${encodeURIComponent(query)}`), {
    headers: getAuthHeaders(),
    credentials: 'include',
  })
  if (!res.ok) throw new Error(`Поиск недоступен (${res.status})`)
  return (await res.json()) as UserSearchItem[]
}

