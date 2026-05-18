import type { MailboxUser } from './mailboxTypes';

const TOKEN_KEY = 'flowspace:mailbox:session:token';
const USER_KEY = 'flowspace:mailbox:session:user';

export function loadMailboxToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function loadMailboxUser(): MailboxUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as MailboxUser;
  } catch {
    return null;
  }
}

export function saveMailboxSession(token: string, user: MailboxUser): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearMailboxSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
