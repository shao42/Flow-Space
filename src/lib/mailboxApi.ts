import { resolveMailboxApiBase } from './mailboxApiBase';
import { clearMailboxSession, loadMailboxToken, saveMailboxSession } from './mailboxSession';
import {
  MailboxApiError,
  type Letter,
  type LetterListItem,
  type MailboxAtmosphereMode,
  type MailboxUser,
  type UserSearchHit,
} from './mailboxTypes';

function apiBase(): string {
  return resolveMailboxApiBase();
}

/** True when API calls can be attempted (dev proxy, Netlify /api proxy, or explicit Worker URL). */
export function isMailboxApiConfigured(): boolean {
  if (import.meta.env.DEV) return true;
  return true;
}

function mapErrorCode(error: string | undefined, status: number): import('./mailboxTypes').MailboxApiErrorCode {
  switch (error) {
    case 'UNAUTHORIZED':
      return 'UNAUTHORIZED';
    case 'INVALID_CREDENTIALS':
      return 'INVALID_CREDENTIALS';
    case 'USERNAME_TAKEN':
      return 'USERNAME_TAKEN';
    case 'USER_NOT_FOUND':
      return 'USER_NOT_FOUND';
    case 'RATE_LIMIT':
      return 'RATE_LIMIT';
    case 'FORBIDDEN':
      return 'FORBIDDEN';
    case 'BAD_REQUEST':
      return 'BAD_REQUEST';
    case 'NOT_FOUND':
      return 'NOT_FOUND';
    case 'LIMIT_REACHED':
      return 'LIMIT_REACHED';
    default:
      return status >= 500 ? 'NETWORK' : 'UNKNOWN';
  }
}

export async function mailboxRequest<T>(
  path: string,
  init?: RequestInit & { json?: unknown; auth?: boolean }
): Promise<T> {
  const base = apiBase();
  const url = base ? `${base}${path}` : path;
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(init?.headers as Record<string, string> | undefined),
  };

  const useAuth = init?.auth !== false;
  if (useAuth) {
    const token = loadMailboxToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let body: string | undefined;
  if (init?.json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(init.json);
  }

  let res: Response;
  try {
    res = await fetch(url, { ...init, headers, body });
  } catch {
    throw new MailboxApiError('NETWORK', '网络错误，请稍后重试');
  }

  let data: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    const err = data as { error?: string; message?: string } | null;
    const code = mapErrorCode(err?.error, res.status);
    throw new MailboxApiError(code, err?.message ?? err?.error ?? `请求失败 (${res.status})`, res.status);
  }

  return data as T;
}

export async function register(
  username: string,
  password: string,
  displayName?: string
): Promise<{ token: string; user: MailboxUser }> {
  const data = await mailboxRequest<{ token: string; user: MailboxUser }>('/api/auth/register', {
    method: 'POST',
    json: { username, password, displayName },
    auth: false,
  });
  saveMailboxSession(data.token, data.user);
  return data;
}

export async function login(username: string, password: string): Promise<{ token: string; user: MailboxUser }> {
  const data = await mailboxRequest<{ token: string; user: MailboxUser }>('/api/auth/login', {
    method: 'POST',
    json: { username, password },
    auth: false,
  });
  saveMailboxSession(data.token, data.user);
  return data;
}

export function logoutLocal(): void {
  clearMailboxSession();
}

export async function fetchMe(): Promise<MailboxUser> {
  const data = await mailboxRequest<{ user: MailboxUser }>('/api/auth/me');
  saveMailboxSession(loadMailboxToken() ?? '', data.user);
  return data.user;
}

export async function patchDisplayName(displayName: string): Promise<MailboxUser> {
  const data = await mailboxRequest<{ user: MailboxUser }>('/api/users/me', {
    method: 'PATCH',
    json: { displayName },
  });
  const token = loadMailboxToken();
  if (token) saveMailboxSession(token, data.user);
  return data.user;
}

export async function searchUsers(q: string): Promise<UserSearchHit[]> {
  const params = new URLSearchParams({ q });
  const data = await mailboxRequest<{ users: UserSearchHit[] }>(`/api/users/search?${params}`);
  return data.users;
}

export async function fetchInbox(): Promise<LetterListItem[]> {
  const data = await mailboxRequest<{ letters: LetterListItem[] }>('/api/mail/inbox');
  return data.letters;
}

export async function fetchSent(): Promise<LetterListItem[]> {
  const data = await mailboxRequest<{ letters: LetterListItem[] }>('/api/mail/sent');
  return data.letters;
}

export async function fetchLetter(id: string): Promise<Letter> {
  const data = await mailboxRequest<{ letter: Letter }>(`/api/mail/${id}`);
  return data.letter;
}

export async function sendLetter(payload: {
  toUsername: string;
  subject?: string;
  body: string;
  atmosphereMode?: MailboxAtmosphereMode;
}): Promise<Letter> {
  const data = await mailboxRequest<{ letter: Letter }>('/api/mail', {
    method: 'POST',
    json: payload,
  });
  return data.letter;
}

export async function deleteLetter(id: string): Promise<void> {
  await mailboxRequest(`/api/mail/${id}`, { method: 'DELETE' });
}
