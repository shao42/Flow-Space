/** Default Worker URL (also in netlify.toml / public/_redirects). */
export const MAILBOX_WORKER_FALLBACK = 'https://flow-space-mailbox.923455218.workers.dev';

/** Build-time or runtime base URL for mailbox + history API calls. */
export function resolveMailboxApiBase(): string {
  const raw = import.meta.env.VITE_MAILBOX_API_URL;
  if (raw != null && String(raw).trim() !== '') {
    return String(raw).replace(/\/+$/, '');
  }
  if (import.meta.env.DEV) return '';
  if (typeof window !== 'undefined' && window.location.hostname.includes('github.io')) {
    return MAILBOX_WORKER_FALLBACK;
  }
  return '';
}
