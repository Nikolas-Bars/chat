/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Полный URL бэкенда, например https://xxx.onrender.com (без слэша в конце) */
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
