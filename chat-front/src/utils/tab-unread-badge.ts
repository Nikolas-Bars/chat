let savedDefaultFaviconHref: string | null = null

function getIconLink(): HTMLLinkElement | null {
  return document.querySelector<HTMLLinkElement>("link[rel~='icon']")
}

function rememberDefaultFavicon(link: HTMLLinkElement): void {
  if (savedDefaultFaviconHref !== null) return
  const raw = link.getAttribute('href') || `${import.meta.env.BASE_URL}favicon.ico`
  try {
    savedDefaultFaviconHref = new URL(raw, window.location.origin).href
  } catch {
    savedDefaultFaviconHref = raw
  }
}

/** Красная иконка вкладки с числом (текст заголовка вкладки цветом не задаётся — только favicon). */
export function updateTabUnreadBadge(unreadCount: number): void {
  const link = getIconLink()
  if (!link) return
  rememberDefaultFavicon(link)

  if (unreadCount <= 0) {
    link.href = savedDefaultFaviconHref!
    return
  }

  const size = 32
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    link.href = savedDefaultFaviconHref!
    return
  }

  ctx.fillStyle = '#e11d48'
  ctx.beginPath()
  ctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const label = unreadCount > 99 ? '99+' : String(unreadCount)
  if (label.length > 2) {
    ctx.font = 'bold 8px system-ui, sans-serif'
  } else if (label.length === 2) {
    ctx.font = 'bold 11px system-ui, sans-serif'
  } else {
    ctx.font = 'bold 15px system-ui, sans-serif'
  }
  ctx.fillText(label, size / 2, size / 2 + 0.5)

  link.type = 'image/png'
  link.href = canvas.toDataURL('image/png')
}

export function resetTabUnreadBadge(): void {
  updateTabUnreadBadge(0)
}
