import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

/** Read env in Node (dev/CI) without relying on `@types/node` for `process`. */
function envViteBaseUrl(): string | undefined {
  const p = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  return p?.env?.VITE_BASE_URL;
}

/** GitHub Pages project sites use `/<repo-name>/`. CI sets `VITE_BASE_URL` (see `.github/workflows`). */
function appBase(): string {
  const raw = envViteBaseUrl();
  if (raw == null || raw === '' || raw === '/') return '/';
  return raw.endsWith('/') ? raw : `${raw}/`;
}

export default defineConfig({
  base: appBase(),
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
});
