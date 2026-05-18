import { afterEach, describe, expect, it } from 'vitest';
import {
  clearMailboxSession,
  loadMailboxToken,
  loadMailboxUser,
  saveMailboxSession,
} from './mailboxSession';
import type { MailboxUser } from './mailboxTypes';

const user: MailboxUser = {
  id: 'u1',
  username: 'writer',
  displayName: 'Writer',
  createdAt: '2026-05-17T00:00:00.000Z',
};

describe('mailboxSession', () => {
  afterEach(() => {
    clearMailboxSession();
  });

  it('saves and loads token and user', () => {
    saveMailboxSession('tok', user);
    expect(loadMailboxToken()).toBe('tok');
    expect(loadMailboxUser()).toEqual(user);
  });

  it('clears session', () => {
    saveMailboxSession('tok', user);
    clearMailboxSession();
    expect(loadMailboxToken()).toBeNull();
    expect(loadMailboxUser()).toBeNull();
  });
});
