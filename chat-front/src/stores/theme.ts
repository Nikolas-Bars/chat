import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

export type ThemeMode = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'theme-mode'

function getSystemPrefersDark(): boolean {
  return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false
}

function applyThemeToDom(mode: ThemeMode) {
  const resolved = mode === 'system' ? (getSystemPrefersDark() ? 'dark' : 'light') : mode
  document.documentElement.classList.toggle('dark', resolved === 'dark')
}

export const useThemeStore = defineStore('theme', () => {
  const mode = ref<ThemeMode>('system')

  const resolved = computed<'light' | 'dark'>(() => {
    if (mode.value === 'system') return getSystemPrefersDark() ? 'dark' : 'light'
    return mode.value
  })

  function init() {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === 'light' || raw === 'dark' || raw === 'system') {
      mode.value = raw
    }
    applyThemeToDom(mode.value)

    // следим за системной темой только в режиме system
    const mql = window.matchMedia?.('(prefers-color-scheme: dark)')
    const handler = () => {
      if (mode.value === 'system') applyThemeToDom('system')
    }
    mql?.addEventListener?.('change', handler)
  }

  function set(next: ThemeMode) {
    mode.value = next
    localStorage.setItem(STORAGE_KEY, next)
    applyThemeToDom(next)
  }

  function toggle() {
    set(resolved.value === 'dark' ? 'light' : 'dark')
  }

  return { mode, resolved, init, set, toggle }
})

