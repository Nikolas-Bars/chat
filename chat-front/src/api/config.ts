/**
 * База URL API.
 * - Локально: `VITE_API_URL` не задан → относительные пути `/api/*` → Vite проксирует на localhost:3000.
 * - GitHub Pages: в CI задаётся `VITE_API_URL=https://…onrender.com` (секрет репозитория).
 */
export function apiUrl(path: string): string {
  const raw = (import.meta.env.VITE_API_URL as string | undefined)?.trim() ?? ''
  const base = raw.replace(/\/$/, '')
  const normalized = path.startsWith('/') ? path : `/${path}`
  const p = normalized.startsWith('/api/') ? normalized : `/api${normalized}`
  return `${base}${p}`
}
