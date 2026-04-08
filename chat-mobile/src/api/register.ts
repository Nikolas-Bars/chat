import { apiUrl } from './client'

export async function registerApi(body: Record<string, unknown>): Promise<void> {
  const res = await fetch(apiUrl('/auth/registration'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (res.status === 204) return
  if (!res.ok) {
    let msg = `Ошибка (код ${res.status})`
    try {
      const data = (await res.json()) as { message?: string | string[] }
      if (Array.isArray(data.message)) msg = data.message.join(', ')
      else if (typeof data.message === 'string') msg = data.message
    } catch {
      /* ignore */
    }
    throw new Error(msg)
  }
}
