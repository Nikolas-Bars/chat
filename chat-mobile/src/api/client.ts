import { API_BASE_URL } from '../config'
import { getAccessToken } from '../storage/token'

export function apiUrl(path: string): string {
  const base = API_BASE_URL.replace(/\/$/, '')
  const normalized = path.startsWith('/') ? path : `/${path}`
  const p = normalized.startsWith('/api/') ? normalized : `/api${normalized}`
  return `${base}${p}`
}

export async function authHeaders(): Promise<Record<string, string>> {
  const token = await getAccessToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function authFetch(input: string, init?: RequestInit): Promise<Response> {
  const h = await authHeaders()
  const headers = new Headers(init?.headers)
  Object.entries(h).forEach(([k, v]) => headers.set(k, v))
  return fetch(input, { ...init, headers })
}
