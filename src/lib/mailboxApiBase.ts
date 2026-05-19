/** Default Worker URL (also in netlify.toml / public/_redirects). */
export const MAILBOX_WORKER_FALLBACK = 'https://flow-space-mailbox.923455218.workers.dev';

function buildTimeApiUrl(): string | null {
  const raw = import.meta.env.VITE_MAILBOX_API_URL;
  if (raw == null || String(raw).trim() === '') return null;
  return String(raw).replace(/\/+$/, '');
}

/** Ignore VITE_MAILBOX_API_URL when it points at the current site (breaks /api proxy). */
function effectiveBuildTimeApiUrl(): string | null {
  const url = buildTimeApiUrl();
  if (!url || typeof window === 'undefined') return url;
  try {
    if (new URL(url).origin === window.location.origin) return null;
  } catch {
    return url;
  }
  return url;
}

/** Build-time or runtime base URL for mailbox + history API calls. */
export function resolveMailboxApiBase(): string {
  const fromEnv = effectiveBuildTimeApiUrl();
  if (fromEnv) return fromEnv;
  if (import.meta.env.DEV) return '';
  if (typeof window !== 'undefined' && window.location.hostname.includes('github.io')) {
    return MAILBOX_WORKER_FALLBACK;
  }
  return '';
}
