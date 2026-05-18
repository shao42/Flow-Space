@echo off
REM Flow Space mailbox — Cloudflare one-time setup (Windows CMD, no PowerShell script policy issues)
setlocal
cd /d "%~dp0..\workers\mailbox"

echo === Installing dependencies ===
call npm.cmd install --include=optional
if errorlevel 1 exit /b 1

echo.
echo === Wrangler login (browser will open) ===
call npx.cmd wrangler login
if errorlevel 1 exit /b 1

echo.
echo === Create D1 database ===
call npx.cmd wrangler d1 create flow-space-mailbox
echo.
echo Copy the database_id above into workers\mailbox\wrangler.toml then press any key...
pause >nul

echo.
echo === Remote schema migrate ===
call npm.cmd run db:migrate:remote
if errorlevel 1 exit /b 1

echo.
echo === Set production secret ===
call npx.cmd wrangler secret put SESSION_JWT_SECRET

echo.
echo === Deploy (edit CORS URL below if needed) ===
call npx.cmd wrangler deploy --var "CORS_ORIGINS:https://shao42.github.io,http://localhost:5173"
echo.
echo Done. Set GitHub variable MAILBOX_API_URL to the workers.dev URL shown above.
pause
