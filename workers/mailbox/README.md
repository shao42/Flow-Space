# Flow Space Mailbox API

Cloudflare Worker + D1 backend for the in-app mailbox (username/password auth).

## Setup

```bash
npm install
npm run db:migrate:local
npm run dev
```

API listens on `http://127.0.0.1:8787`. The Vite dev server proxies `/api` to this port.

If you migrated from the old room/secret schema, reset local D1 or run migrations on a fresh database.

## Deploy

### GitHub Actions (recommended)

Workflow: [`.github/workflows/deploy-mailbox-worker.yml`](../../.github/workflows/deploy-mailbox-worker.yml)

**One-time setup**

1. `wrangler d1 create flow-space-mailbox` → copy `database_id` into `wrangler.toml`.
2. `wrangler secret put SESSION_JWT_SECRET` in `workers/mailbox` (production JWT signing key).
3. GitHub **Secrets**: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.
4. GitHub **Variables**:
   - `MAILBOX_CORS_ORIGINS` — e.g. `https://<user>.github.io,http://localhost:5173`
   - `MAILBOX_API_URL` — Worker URL after first deploy

The workflow runs remote D1 migrations (`schema.sql`) then `wrangler deploy`.

### Manual

1. Create D1 database and set `database_id` in `wrangler.toml`.
2. `npm run db:migrate:remote`
3. `wrangler secret put SESSION_JWT_SECRET`
4. Set `CORS_ORIGINS` to your GitHub Pages origin(s).
5. `npm run deploy`

Set repository variable `MAILBOX_API_URL` to the deployed Worker URL for frontend builds.

## API (summary)

| Method | Path | Auth |
|--------|------|------|
| POST | `/api/auth/register` | no |
| POST | `/api/auth/login` | no |
| GET | `/api/auth/me` | Bearer |
| GET | `/api/mail/inbox` | Bearer |
| POST | `/api/mail` | Bearer |
