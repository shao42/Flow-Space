import {
  hashPassword,
  signJwt,
  validatePassword,
  validateUsername,
  verifyJwt,
  verifyPassword,
} from './auth';
import { parseSavedAt, previewSnapshotText } from './historyUtils';

export interface Env {
  DB: D1Database;
  SESSION_JWT_SECRET: string;
  CORS_ORIGINS?: string;
}

const MAX_BODY = 20000;
const MAX_SNAPSHOT_BODY = 20000;
const MAX_SNAPSHOTS_PER_USER = 50;
const MAX_HISTORY_UPLOAD_PER_MINUTE = 10;
const MAX_MAIL_PER_MINUTE = 30;
const MAX_LOGIN_PER_IP_PER_MINUTE = 10;
const MAX_REGISTER_PER_IP_PER_HOUR = 5;

type UserRow = {
  id: string;
  username: string;
  password_hash: string;
  display_name: string;
  created_at: string;
};

type LetterRow = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  subject: string | null;
  body: string;
  atmosphere_mode: string | null;
  read_at: string | null;
  deleted_by_sender_at: string | null;
  deleted_by_recipient_at: string | null;
  created_at: string;
};

type SnapshotRow = {
  id: string;
  user_id: string;
  text: string;
  saved_at: string;
  created_at: string;
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const cors = corsHeaders(request, env);
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    try {
      const url = new URL(request.url);
      const path = url.pathname.replace(/\/+$/, '') || '/';

      if (path === '/api/health') {
        return json({ ok: true }, 200, cors);
      }

      if (path === '/api/auth/register' && request.method === 'POST') {
        return withCors(await handleRegister(request, env), cors);
      }
      if (path === '/api/auth/login' && request.method === 'POST') {
        return withCors(await handleLogin(request, env), cors);
      }
      if (path === '/api/auth/me' && request.method === 'GET') {
        return withCors(await handleMe(request, env), cors);
      }

      const userId = await requireAuth(request, env);
      if (!userId) {
        return withCors(json({ error: 'UNAUTHORIZED', message: '请先登录' }, 401), cors);
      }

      if (path === '/api/users/me' && request.method === 'PATCH') {
        return withCors(await handlePatchMe(request, env, userId), cors);
      }
      if (path === '/api/users/search' && request.method === 'GET') {
        return withCors(await handleUserSearch(request, env, userId), cors);
      }
      if (path === '/api/mail/inbox' && request.method === 'GET') {
        return withCors(await handleInbox(env, userId), cors);
      }
      if (path === '/api/mail/sent' && request.method === 'GET') {
        return withCors(await handleSent(env, userId), cors);
      }
      if (path === '/api/mail' && request.method === 'POST') {
        return withCors(await handleSendMail(request, env, userId), cors);
      }

      if (path === '/api/history' && request.method === 'GET') {
        return withCors(await handleListHistory(env, userId), cors);
      }
      if (path === '/api/history' && request.method === 'POST') {
        return withCors(await handleCreateHistory(request, env, userId), cors);
      }

      const historyMatch = path.match(/^\/api\/history\/([^/]+)$/);
      if (historyMatch && request.method === 'GET') {
        return withCors(await handleGetHistory(env, userId, historyMatch[1]), cors);
      }

      const mailMatch = path.match(/^\/api\/mail\/([^/]+)$/);
      if (mailMatch) {
        const letterId = mailMatch[1];
        if (request.method === 'GET') {
          return withCors(await handleGetLetter(env, userId, letterId), cors);
        }
        if (request.method === 'DELETE') {
          return withCors(await handleDeleteLetter(env, userId, letterId), cors);
        }
      }

      return withCors(json({ error: 'NOT_FOUND' }, 404), cors);
    } catch (e) {
      console.error(e);
      return withCors(json({ error: 'INTERNAL' }, 500), cors);
    }
  },
};

function withCors(res: Response, cors: Record<string, string>): Response {
  const h = new Headers(res.headers);
  for (const [k, v] of Object.entries(cors)) h.set(k, v);
  h.set('Cache-Control', 'no-store');
  return new Response(res.body, { status: res.status, headers: h });
}

function corsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get('Origin') ?? '';
  const allowed = (env.CORS_ORIGINS ?? 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const allow =
    allowed.includes('*') || (origin && allowed.includes(origin)) ? origin || '*' : allowed[0] ?? '*';
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

function json(data: unknown, status: number, extraHeaders: Record<string, string> = {}): Response {
  const headers = new Headers({
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    ...extraHeaders,
  });
  return new Response(JSON.stringify(data), { status, headers });
}

function randomId(): string {
  return crypto.randomUUID();
}

function clientIp(request: Request): string {
  return request.headers.get('CF-Connecting-IP') ?? request.headers.get('X-Forwarded-For') ?? 'unknown';
}

function userPublic(row: UserRow) {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    createdAt: row.created_at,
  };
}

async function getUserById(env: Env, id: string): Promise<UserRow | null> {
  return env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<UserRow>();
}

async function getUserByUsername(env: Env, username: string): Promise<UserRow | null> {
  return env.DB.prepare('SELECT * FROM users WHERE username = ?').bind(username).first<UserRow>();
}

function bearerToken(request: Request): string | null {
  const h = request.headers.get('Authorization');
  if (!h?.startsWith('Bearer ')) return null;
  const t = h.slice(7).trim();
  return t.length > 0 ? t : null;
}

async function requireAuth(request: Request, env: Env): Promise<string | null> {
  const token = bearerToken(request);
  if (!token) return null;
  return verifyJwt(token, env.SESSION_JWT_SECRET);
}

async function authResponse(env: Env, user: UserRow): Promise<Response> {
  const token = await signJwt(user.id, env.SESSION_JWT_SECRET);
  return json({ token, user: userPublic(user) });
}

async function checkRateLimit(env: Env, bucketKey: string, maxPerWindow: number, windowMinutes = 1): Promise<boolean> {
  const now = new Date();
  const windowStart = new Date(now);
  windowStart.setSeconds(0, 0);
  windowStart.setMinutes(windowStart.getMinutes() - (windowStart.getMinutes() % windowMinutes));
  const windowIso = windowStart.toISOString();

  const row = await env.DB.prepare('SELECT count, window_start FROM rate_buckets WHERE bucket_key = ?')
    .bind(bucketKey)
    .first<{ count: number; window_start: string }>();

  if (!row || row.window_start !== windowIso) {
    await env.DB.prepare(
      `INSERT INTO rate_buckets (bucket_key, count, window_start) VALUES (?, 1, ?)
       ON CONFLICT(bucket_key) DO UPDATE SET count = 1, window_start = excluded.window_start`
    )
      .bind(bucketKey, windowIso)
      .run();
    return true;
  }

  if (row.count >= maxPerWindow) return false;

  await env.DB.prepare('UPDATE rate_buckets SET count = count + 1 WHERE bucket_key = ?')
    .bind(bucketKey)
    .run();
  return true;
}

async function readJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

async function handleRegister(request: Request, env: Env): Promise<Response> {
  const ip = clientIp(request);
  const ok = await checkRateLimit(env, `register:${ip}`, MAX_REGISTER_PER_IP_PER_HOUR, 60);
  if (!ok) return json({ error: 'RATE_LIMIT', message: '注册过于频繁，请稍后再试' }, 429);

  const body = await readJson<{ username?: string; password?: string; displayName?: string }>(request);
  if (!body) return json({ error: 'BAD_REQUEST' }, 400);

  const username = (body.username ?? '').trim().toLowerCase();
  const password = body.password ?? '';
  if (!validateUsername(username)) {
    return json({ error: 'BAD_REQUEST', message: '用户名须为 3–32 位小写字母、数字或下划线' }, 400);
  }
  if (!validatePassword(password)) {
    return json({ error: 'BAD_REQUEST', message: '密码须为 8–128 字符' }, 400);
  }

  const existing = await getUserByUsername(env, username);
  if (existing) return json({ error: 'USERNAME_TAKEN', message: '用户名已被占用' }, 409);

  const id = randomId();
  const passwordHash = await hashPassword(password);
  const displayName = (body.displayName ?? username).trim().slice(0, 32) || username;
  const now = new Date().toISOString();

  await env.DB.prepare(
    'INSERT INTO users (id, username, password_hash, display_name, created_at) VALUES (?, ?, ?, ?, ?)'
  )
    .bind(id, username, passwordHash, displayName, now)
    .run();

  const user = await getUserById(env, id);
  if (!user) return json({ error: 'INTERNAL' }, 500);
  return authResponse(env, user);
}

async function handleLogin(request: Request, env: Env): Promise<Response> {
  const ip = clientIp(request);
  const ok = await checkRateLimit(env, `login:${ip}`, MAX_LOGIN_PER_IP_PER_MINUTE);
  if (!ok) return json({ error: 'RATE_LIMIT', message: '登录尝试过于频繁' }, 429);

  const body = await readJson<{ username?: string; password?: string }>(request);
  if (!body) return json({ error: 'BAD_REQUEST' }, 400);

  const username = (body.username ?? '').trim().toLowerCase();
  const password = body.password ?? '';
  const user = await getUserByUsername(env, username);
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return json({ error: 'INVALID_CREDENTIALS', message: '用户名或密码错误' }, 401);
  }
  return authResponse(env, user);
}

async function handleMe(request: Request, env: Env): Promise<Response> {
  const userId = await requireAuth(request, env);
  if (!userId) return json({ error: 'UNAUTHORIZED', message: '请先登录' }, 401);
  const user = await getUserById(env, userId);
  if (!user) return json({ error: 'UNAUTHORIZED', message: '请先登录' }, 401);
  return json({ user: userPublic(user) });
}

async function handlePatchMe(request: Request, env: Env, userId: string): Promise<Response> {
  const body = await readJson<{ displayName?: string }>(request);
  if (!body) return json({ error: 'BAD_REQUEST' }, 400);
  const displayName = (body.displayName ?? '').trim().slice(0, 32);
  if (!displayName) return json({ error: 'BAD_REQUEST', message: '显示名不能为空' }, 400);

  await env.DB.prepare('UPDATE users SET display_name = ? WHERE id = ?').bind(displayName, userId).run();
  const user = await getUserById(env, userId);
  if (!user) return json({ error: 'NOT_FOUND' }, 404);
  return json({ user: userPublic(user) });
}

async function handleUserSearch(request: Request, env: Env, userId: string): Promise<Response> {
  const url = new URL(request.url);
  const q = (url.searchParams.get('q') ?? '').trim().toLowerCase();
  if (q.length < 1) return json({ users: [] });

  const result = await env.DB.prepare(
    `SELECT username, display_name FROM users
     WHERE username LIKE ? AND id != ?
     ORDER BY username ASC LIMIT 10`
  )
    .bind(`${q}%`, userId)
    .all<{ username: string; display_name: string }>();

  return json({
    users: (result.results ?? []).map((r) => ({
      username: r.username,
      displayName: r.display_name,
    })),
  });
}

type LetterListRow = LetterRow & {
  from_username?: string;
  from_display_name?: string;
  to_username?: string;
  to_display_name?: string;
};

function previewBody(body: string, withdrawn: boolean): string {
  if (withdrawn) return '已撤回';
  const line = body.split(/\r?\n/).find((l) => l.trim()) ?? body;
  return line.length > 56 ? `${line.slice(0, 56)}…` : line;
}

function rowToListItem(row: LetterListRow, perspective: 'inbox' | 'sent') {
  const withdrawn = !!row.deleted_by_sender_at;
  const peerUsername = perspective === 'inbox' ? row.from_username : row.to_username;
  const peerDisplayName = perspective === 'inbox' ? row.from_display_name : row.to_display_name;
  return {
    id: row.id,
    subject: row.subject ?? undefined,
    preview: previewBody(row.body, withdrawn),
    peerUsername: peerUsername ?? '',
    peerDisplayName: peerDisplayName ?? '',
    createdAt: row.created_at,
    readAt: row.read_at ?? undefined,
    unread: perspective === 'inbox' && !row.read_at && !withdrawn,
    withdrawn,
  };
}

function rowToLetter(row: LetterRow, fromUser: UserRow, toUser: UserRow) {
  const withdrawn = !!row.deleted_by_sender_at;
  return {
    id: row.id,
    fromUserId: row.from_user_id,
    toUserId: row.to_user_id,
    fromUsername: fromUser.username,
    fromDisplayName: fromUser.display_name,
    toUsername: toUser.username,
    toDisplayName: toUser.display_name,
    subject: row.subject ?? undefined,
    body: withdrawn ? '' : row.body,
    withdrawn,
    atmosphereMode: row.atmosphere_mode ?? undefined,
    readAt: row.read_at ?? undefined,
    createdAt: row.created_at,
  };
}

async function handleInbox(env: Env, userId: string): Promise<Response> {
  const result = await env.DB.prepare(
    `SELECT l.*, u.username as from_username, u.display_name as from_display_name
     FROM letters l
     JOIN users u ON u.id = l.from_user_id
     WHERE l.to_user_id = ? AND l.deleted_by_recipient_at IS NULL
     ORDER BY l.created_at DESC
     LIMIT 100`
  )
    .bind(userId)
    .all<LetterListRow>();

  return json({ letters: (result.results ?? []).map((r) => rowToListItem(r, 'inbox')) });
}

async function handleSent(env: Env, userId: string): Promise<Response> {
  const result = await env.DB.prepare(
    `SELECT l.*, u.username as to_username, u.display_name as to_display_name
     FROM letters l
     JOIN users u ON u.id = l.to_user_id
     WHERE l.from_user_id = ? AND l.deleted_by_sender_at IS NULL
     ORDER BY l.created_at DESC
     LIMIT 100`
  )
    .bind(userId)
    .all<LetterListRow>();

  return json({ letters: (result.results ?? []).map((r) => rowToListItem(r, 'sent')) });
}

async function handleSendMail(request: Request, env: Env, userId: string): Promise<Response> {
  const ok = await checkRateLimit(env, `mail:${userId}`, MAX_MAIL_PER_MINUTE);
  if (!ok) return json({ error: 'RATE_LIMIT', message: '发送过于频繁' }, 429);

  const body = await readJson<{
    toUsername?: string;
    subject?: string;
    body?: string;
    atmosphereMode?: string;
  }>(request);
  if (!body) return json({ error: 'BAD_REQUEST' }, 400);

  const toUsername = (body.toUsername ?? '').trim().toLowerCase();
  if (!validateUsername(toUsername)) {
    return json({ error: 'BAD_REQUEST', message: '收件人用户名无效' }, 400);
  }

  const recipient = await getUserByUsername(env, toUsername);
  if (!recipient) return json({ error: 'USER_NOT_FOUND', message: '找不到该用户' }, 404);
  if (recipient.id === userId) {
    return json({ error: 'BAD_REQUEST', message: '不能给自己寄信' }, 400);
  }

  const text = typeof body.body === 'string' ? body.body : '';
  if (text.length < 1 || text.length > MAX_BODY) {
    return json({ error: 'BAD_REQUEST', message: '正文长度须在 1–20000 字符' }, 400);
  }

  const subject = (body.subject ?? '').trim().slice(0, 120) || null;
  const atmosphereMode =
    body.atmosphereMode === 'rain' || body.atmosphereMode === 'snow' || body.atmosphereMode === 'kk11'
      ? body.atmosphereMode
      : null;

  const id = randomId();
  const now = new Date().toISOString();
  const sender = await getUserById(env, userId);
  if (!sender) return json({ error: 'UNAUTHORIZED' }, 401);

  await env.DB.prepare(
    `INSERT INTO letters (id, from_user_id, to_user_id, subject, body, atmosphere_mode, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(id, userId, recipient.id, subject, text, atmosphereMode, now)
    .run();

  const row = await env.DB.prepare('SELECT * FROM letters WHERE id = ?').bind(id).first<LetterRow>();
  if (!row) return json({ error: 'INTERNAL' }, 500);

  return json({ letter: rowToLetter(row, sender, recipient) });
}

async function handleGetLetter(env: Env, userId: string, letterId: string): Promise<Response> {
  const row = await env.DB.prepare('SELECT * FROM letters WHERE id = ?').bind(letterId).first<LetterRow>();
  if (!row) return json({ error: 'NOT_FOUND' }, 404);

  const isRecipient = row.to_user_id === userId;
  const isSender = row.from_user_id === userId;
  if (!isRecipient && !isSender) return json({ error: 'FORBIDDEN' }, 403);
  if (isRecipient && row.deleted_by_recipient_at) return json({ error: 'NOT_FOUND' }, 404);
  if (isSender && row.deleted_by_sender_at) return json({ error: 'NOT_FOUND' }, 404);

  if (isRecipient && !row.read_at && !row.deleted_by_sender_at) {
    const now = new Date().toISOString();
    await env.DB.prepare('UPDATE letters SET read_at = ? WHERE id = ?').bind(now, letterId).run();
    row.read_at = now;
  }

  const fromUser = await getUserById(env, row.from_user_id);
  const toUser = await getUserById(env, row.to_user_id);
  if (!fromUser || !toUser) return json({ error: 'NOT_FOUND' }, 404);

  return json({ letter: rowToLetter(row, fromUser, toUser) });
}

function snapshotListItem(row: SnapshotRow) {
  return {
    id: row.id,
    savedAt: row.saved_at,
    preview: previewSnapshotText(row.text),
  };
}

async function handleListHistory(env: Env, userId: string): Promise<Response> {
  const result = await env.DB.prepare(
    `SELECT id, user_id, text, saved_at, created_at FROM draft_snapshots
     WHERE user_id = ?
     ORDER BY saved_at DESC
     LIMIT 100`
  )
    .bind(userId)
    .all<SnapshotRow>();

  return json({ snapshots: (result.results ?? []).map(snapshotListItem) });
}

async function handleGetHistory(env: Env, userId: string, snapshotId: string): Promise<Response> {
  const row = await env.DB.prepare('SELECT * FROM draft_snapshots WHERE id = ? AND user_id = ?')
    .bind(snapshotId, userId)
    .first<SnapshotRow>();
  if (!row) return json({ error: 'NOT_FOUND' }, 404);
  return json({
    snapshot: {
      id: row.id,
      text: row.text,
      savedAt: row.saved_at,
    },
  });
}

async function handleCreateHistory(request: Request, env: Env, userId: string): Promise<Response> {
  const ok = await checkRateLimit(env, `history:upload:${userId}`, MAX_HISTORY_UPLOAD_PER_MINUTE);
  if (!ok) return json({ error: 'RATE_LIMIT', message: '同步过于频繁，请稍后再试' }, 429);

  const body = await readJson<{ text?: string; savedAt?: unknown }>(request);
  if (!body) return json({ error: 'BAD_REQUEST' }, 400);

  const text = typeof body.text === 'string' ? body.text : '';
  if (text.trim().length === 0) {
    return json({ error: 'BAD_REQUEST', message: '内容不能为空' }, 400);
  }
  if (text.length > MAX_SNAPSHOT_BODY) {
    return json({ error: 'BAD_REQUEST', message: '内容长度须在 1–20000 字符' }, 400);
  }

  const savedAt = parseSavedAt(body.savedAt) ?? new Date().toISOString();

  const existing = await env.DB.prepare(
    'SELECT * FROM draft_snapshots WHERE user_id = ? AND saved_at = ? AND text = ?'
  )
    .bind(userId, savedAt, text)
    .first<SnapshotRow>();
  if (existing) {
    return json({ snapshot: snapshotListItem(existing), deduped: true });
  }

  const countRow = await env.DB.prepare('SELECT COUNT(*) as c FROM draft_snapshots WHERE user_id = ?')
    .bind(userId)
    .first<{ c: number }>();
  if ((countRow?.c ?? 0) >= MAX_SNAPSHOTS_PER_USER) {
    return json(
      { error: 'LIMIT_REACHED', message: `云端历史已达上限（${MAX_SNAPSHOTS_PER_USER} 条）` },
      400
    );
  }

  const id = randomId();
  const now = new Date().toISOString();
  await env.DB.prepare(
    'INSERT INTO draft_snapshots (id, user_id, text, saved_at, created_at) VALUES (?, ?, ?, ?, ?)'
  )
    .bind(id, userId, text, savedAt, now)
    .run();

  const row = await env.DB.prepare('SELECT * FROM draft_snapshots WHERE id = ?')
    .bind(id)
    .first<SnapshotRow>();
  if (!row) return json({ error: 'INTERNAL' }, 500);
  return json({ snapshot: snapshotListItem(row) });
}

async function handleDeleteLetter(env: Env, userId: string, letterId: string): Promise<Response> {
  const row = await env.DB.prepare('SELECT * FROM letters WHERE id = ?').bind(letterId).first<LetterRow>();
  if (!row) return json({ error: 'NOT_FOUND' }, 404);

  const now = new Date().toISOString();
  if (row.from_user_id === userId) {
    if (row.deleted_by_sender_at) return json({ ok: true });
    await env.DB.prepare('UPDATE letters SET deleted_by_sender_at = ? WHERE id = ?').bind(now, letterId).run();
    return json({ ok: true });
  }
  if (row.to_user_id === userId) {
    if (row.deleted_by_recipient_at) return json({ ok: true });
    await env.DB.prepare('UPDATE letters SET deleted_by_recipient_at = ? WHERE id = ?').bind(now, letterId).run();
    return json({ ok: true });
  }
  return json({ error: 'FORBIDDEN', message: '无权操作此信件' }, 403);
}
