/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_SIGNALR_HUB_URL: string
  readonly VITE_SIGNALR_CONVERSTATION_URL: string
  readonly VITE_SIGNALR_GENERAL_URL: string
  // Add more environment variables here as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}