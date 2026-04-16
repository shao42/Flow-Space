import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

/** GitHub Pages project sites use `/<repo-name>/`. CI sets `VITE_BASE_URL` (see `.github/workflows`). */
function appBase(): string {
  const raw = process.env.VITE_BASE_URL;
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
