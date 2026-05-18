export type MailboxAtmosphereMode = 'rain' | 'snow' | 'kk11';

export interface MailboxUser {
  id: string;
  username: string;
  displayName: string;
  createdAt: string;
}

export interface LetterListItem {
  id: string;
  subject?: string;
  preview: string;
  peerUsername: string;
  peerDisplayName: string;
  createdAt: string;
  readAt?: string;
  unread: boolean;
  withdrawn: boolean;
}

export interface Letter {
  id: string;
  fromUserId: string;
  toUserId: string;
  fromUsername: string;
  fromDisplayName: string;
  toUsername: string;
  toDisplayName: string;
  subject?: string;
  body: string;
  withdrawn: boolean;
  atmosphereMode?: MailboxAtmosphereMode;
  readAt?: string;
  createdAt: string;
}

export interface UserSearchHit {
  username: string;
  displayName: string;
}

export type MailboxApiErrorCode =
  | 'NOT_CONFIGURED'
  | 'NETWORK'
  | 'UNAUTHORIZED'
  | 'INVALID_CREDENTIALS'
  | 'USERNAME_TAKEN'
  | 'USER_NOT_FOUND'
  | 'RATE_LIMIT'
  | 'FORBIDDEN'
  | 'BAD_REQUEST'
  | 'NOT_FOUND'
  | 'UNKNOWN';

export class MailboxApiError extends Error {
  constructor(
    public readonly code: MailboxApiErrorCode,
    message: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = 'MailboxApiError';
  }
}
