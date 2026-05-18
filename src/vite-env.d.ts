/// <reference types="vite/client" />
/// <reference types="vitest/globals" />

interface ImportMetaEnv {
  readonly VITE_BASE_URL?: string;
  readonly VITE_MAILBOX_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
