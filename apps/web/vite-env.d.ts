/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_APP_NAME: string
  readonly VITE_APP_VERSION: string
  readonly VITE_APP_ENV?: 'development' | 'production' | 'test'
  readonly VITE_SENTRY_DSN?: string
  readonly VITE_GOOGLE_ANALYTICS_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Global constants defined in vite.config.ts
declare const __APP_VERSION__: string
declare const __APP_NAME__: string
declare const __ENVIRONMENT__: string
declare const __BUILD_DATE__: string