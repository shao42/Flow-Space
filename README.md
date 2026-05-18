# Flow Space

Immersive Cyber Zen writing shell (WIP per `docs/superpowers/plans/2026-03-23-flow-space.md`).

## Setup

```bash
cd projects/flow-space
npm install
npm run dev
```

Open `http://localhost:5173`.

## Scripts

- `npm run dev` — Vite dev server  
- `npm run build` — production build  
- `npm run test` — Vitest  
- `npm run mailbox:dev` — local Mailbox API (Wrangler on port 8787; run `npm run mailbox:db:local` once first)  

## Deploy (GitHub Pages)

This app is static after `npm run build` (`dist/`). A workflow is included at `.github/workflows/deploy-github-pages.yml`.

1. **Create a GitHub repository** whose **root folder is this project** (the folder that contains `package.json` and `vite.config.ts`), not a parent monorepo folder—unless you edit the workflow paths yourself.
2. Push the `main` branch to GitHub.
3. In the repo on GitHub: **Settings → Pages → Build and deployment**, set **Source** to **GitHub Actions** (not “Deploy from a branch”).
4. The workflow runs on every push to `main`. When it finishes, open the site at  
   `https://<your-username>.github.io/<repo-name>/`  
   (trailing path matches your repository name).

**Base URL:** Production builds set `VITE_BASE_URL` so assets load under `/<repo-name>/`. If your repository is named `<username>.github.io` (the special **user site** repo), the workflow sets the base to `/` so the site works at `https://<username>.github.io/`.

**Preview locally with the same base as GitHub:**

```bash
VITE_BASE_URL=/<your-repo-name>/ npm run build && npm run preview
```

(On Windows PowerShell: `$env:VITE_BASE_URL="/myrepo/"; npm run build; npm run preview`.)

## Spec & plan

- Design: `docs/superpowers/specs/2026-03-23-flow-space-design.md`  
- Plan: `docs/superpowers/plans/2026-03-23-flow-space.md`  
- **Mailbox (WIP):** [requirements](./docs/mailbox/requirements-decisions.md) · [spec](./docs/mailbox/2026-05-17-mailbox-spec.md) · [architecture](./docs/mailbox/architecture-spike.md)  

## Atmosphere

Only **Rain** and **Snow** (with three optional snow background images). There is no separate “still” mode.

## Shortcuts

| Keys | Action |
|------|--------|
| **Alt+M** | Toggle Rain ↔ Snow (works while typing in the editor) |
| **Alt+F** | Cycle font (sans / serif / mono) |
| **Alt+V** | Toggle Vibe Mixer panel |
| **Alt+L** | Toggle Mailbox panel |

## Mailbox (dev)

1. `cd workers/mailbox && npm install` (once)  
2. `npm run mailbox:db:local` from repo root (once)  
3. `npm run mailbox:dev` in one terminal; `npm run dev` in another  
4. Open MAIL → register / login → compose to another `@username`

**Production deploy** (workflow *Deploy Mailbox Worker*):

1. GitHub **Secrets**: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`; optional `SESSION_JWT_SECRET`  
2. GitHub **Variables**: `MAILBOX_CORS_ORIGINS` (e.g. `https://shao42.github.io,http://localhost:5173`), `MAILBOX_API_URL` (Worker URL for Pages build)  
3. Push to `main` or re-run the workflow  

See [`workers/mailbox/README.md`](workers/mailbox/README.md).

## Manual tests (Task 19)

- Reload: draft, mode, mixer, and timer **settings** (not running countdown) restore from LocalStorage.  
- **RELEASE** clears the editor and draft after in-app confirm.  
- **Export** downloads `flow-space-YYYY-MM-DD-HHmm.txt` (24h local time).  
- **Alt+M** switches between Rain and Snow; editor text unchanged.  
- Disable WebGL in DevTools or use a reduced-motion OS setting → static fallback + message.  
- After refresh, timer is **idle** (not mid-countdown).  
- Storage full / private mode → red banner; editing still works in memory until export.

## Assets

- `public/fallback-bg.svg` — static fallback when WebGL or motion is unavailable (replace with licensed media before shipping).  
- `public/audio/` — optional background music (see `src/lib/audioEngine.ts` for the bundled filename).  
- `public/snow-bg-*.jpg` — snow scene backdrops (`mountain_forest`, `night_sky`, `winter_house`).
