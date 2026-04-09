<script setup lang="ts">
import { useThemeStore } from './stores/theme'

const theme = useThemeStore()
</script>

<template>
  <div
    class="min-h-dvh bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 text-slate-900 transition-colors dark:from-slate-950 dark:via-slate-950 dark:to-indigo-950/20 dark:text-slate-100"
  >
    <header class="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
      <div class="flex items-center gap-2.5 select-none">
        <div
          class="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white shadow-md shadow-indigo-500/25"
        >
          Q
        </div>
        <span class="text-sm font-semibold tracking-tight text-slate-800 dark:text-slate-200">
          Chat&hairsp;Q
        </span>
      </div>
      <button
        type="button"
        class="group flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm backdrop-blur transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700/80 dark:bg-slate-800/80 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-slate-200"
        @click="theme.toggle()"
      >
        <span
          class="inline-block transition-transform group-hover:rotate-12"
          aria-hidden="true"
        >
          {{ theme.resolved === 'dark' ? '🌙' : '☀️' }}
        </span>
        {{ theme.resolved === 'dark' ? 'Тёмная' : 'Светлая' }}
      </button>
    </header>

    <main class="mx-auto w-full max-w-5xl px-4 pb-10">
      <router-view />
    </main>
  </div>
</template>
