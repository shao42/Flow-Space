CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS letters (
  id TEXT PRIMARY KEY,
  from_user_id TEXT NOT NULL,
  to_user_id TEXT NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  atmosphere_mode TEXT,
  read_at TEXT,
  deleted_by_sender_at TEXT,
  deleted_by_recipient_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (from_user_id) REFERENCES users(id),
  FOREIGN KEY (to_user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_letters_inbox ON letters(to_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_letters_sent ON letters(from_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS rate_buckets (
  bucket_key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  window_start TEXT NOT NULL
);
