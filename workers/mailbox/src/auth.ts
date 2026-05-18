const PBKDF2_ITERATIONS = 100_000;
const JWT_TTL_SEC = 7 * 24 * 60 * 60;

export const USERNAME_RE = /^[a-z0-9_]{3,32}$/;

export function validateUsername(username: string): boolean {
  return USERNAME_RE.test(username);
}

export function validatePassword(password: string): boolean {
  return password.length >= 8 && password.length <= 128;
}

function b64UrlEncode(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function b64UrlEncodeStr(s: string): string {
  return b64UrlEncode(new TextEncoder().encode(s));
}

function b64UrlDecodeToBytes(s: string): Uint8Array {
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  const b64 = (s + pad).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    key,
    256
  );
  return `pbkdf2$${PBKDF2_ITERATIONS}$${b64UrlEncode(salt)}$${b64UrlEncode(new Uint8Array(bits))}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
  const iterations = Number(parts[1]);
  if (!Number.isFinite(iterations) || iterations < 1) return false;
  const salt = b64UrlDecodeToBytes(parts[2]);
  const expected = b64UrlDecodeToBytes(parts[3]);

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    key,
    256
  );
  const actual = new Uint8Array(bits);
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i];
  return diff === 0;
}

type JwtPayload = { sub: string; exp: number };

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function signJwt(userId: string, secret: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: JwtPayload = { sub: userId, exp: now + JWT_TTL_SEC };
  const header = b64UrlEncodeStr(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64UrlEncodeStr(JSON.stringify(payload));
  const data = `${header}.${body}`;
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return `${data}.${b64UrlEncode(new Uint8Array(sig))}`;
}

export async function verifyJwt(token: string, secret: string): Promise<string | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  const data = `${header}.${body}`;
  const key = await hmacKey(secret);
  try {
    const ok = await crypto.subtle.verify(
      'HMAC',
      key,
      b64UrlDecodeToBytes(sig),
      new TextEncoder().encode(data)
    );
    if (!ok) return null;
  } catch {
    return null;
  }
  try {
    const json = JSON.parse(new TextDecoder().decode(b64UrlDecodeToBytes(body))) as JwtPayload;
    if (!json.sub || typeof json.exp !== 'number') return null;
    if (json.exp < Math.floor(Date.now() / 1000)) return null;
    return json.sub;
  } catch {
    return null;
  }
}
