/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Полный URL бэкенда, например https://xxx.onrender.com (без слэша в конце) */
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}
