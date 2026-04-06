/** База API: в dev пусто → запросы идут на тот же origin (Vite проксирует на Nest). */
export function apiUrl(path: string): string {
  const base = (import.meta.env.VITE_API_URL as string | undefined) ?? ''
  const p = path.startsWith('/') ? path : `/${path}`
  return `${base}${p}`
}
