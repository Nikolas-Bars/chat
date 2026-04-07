<script setup lang="ts">
import { useThemeStore } from './stores/theme'

const theme = useThemeStore()
</script>

<template>
  <div
    class="min-h-dvh bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100"
  >
    <header class="mx-auto flex max-w-5xl items-center justify-end p-4">
      <button
        type="button"
        class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
        @click="theme.toggle()"
      >
        Тема: {{ theme.resolved === 'dark' ? 'тёмная' : 'светлая' }}
      </button>
    </header>

    <main class="mx-auto w-full max-w-5xl px-4 pb-10">
      <router-view />
    </main>
  </div>
</template>
