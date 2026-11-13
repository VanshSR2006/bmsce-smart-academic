# CampusFlow — Free-tier Cloud Deployment Checklist

Budget: ₹0. Providers: Vercel Hobby, Render Free, Supabase Free. No paid add-ons.

## Already done in the repository

- [x] Prisma baseline `20261113160723_init` (50 application models).
- [x] Session Pooler identity scripts (`scripts/verify_supabase_preflight.ts`, `scripts/verify_supabase_schema.ts`).
- [x] Demo seed with fictional personas and FK-safe deletes (`prisma/seed.ts`, `scripts/seed_supabase.ts`).
- [x] Render Free Node web service blueprint (`render.yaml`) — no Render Postgres, Redis, or optimizer.
- [x] Vercel Vite config (`vercel.json`) with API rewrites and SPA fallback.
- [x] Redis optional; in-memory fallback when `REDIS_URL` is unset.
- [x] Solver continues if Python OR-Tools is not deployed (`FALLBACK_SYNTHETIC`).
- [x] Local `.env` remains localhost; secrets stay gitignored.

## Operator: Supabase (before first Render start)

1. Confirm project `ctxpnicaqjygakszmhgs` is not paused.
2. Copy the **Session Pooler** URI (port 5432), not the transaction pooler (6543).
3. From a local shell (do not paste into `.env`):
   - `npx tsx scripts/verify_supabase_preflight.ts`
   - `npx tsx scripts/verify_supabase_schema.ts`
   - If users = 0: `$env:ALLOW_SUPABASE_SEED="true"; npx tsx scripts/seed_supabase.ts`
4. Paste the same Session Pooler URI into Render as `DATABASE_URL` with `sslmode=require`.

## Operator: Render Free API

1. [dashboard.render.com](https://dashboard.render.com) → New → Blueprint, repo `VanshSR2006/bmsce-smart-academic`.
2. Set `DATABASE_URL` and `DEMO_PASSWORD_HASH` when prompted (`sync: false`).
3. After first deploy, copy the service URL (often `https://campusflow-api.onrender.com`).
4. Free instances sleep after idle; the first request may take ~50s.

Do not add Render PostgreSQL, Render Key Value, or a private optimizer service (those are paid).

## Operator: Vercel Hobby frontend

1. [vercel.com](https://vercel.com) → Import `bmsce-smart-academic`.
2. Framework: Vite. Build: `npm run build --workspace=apps/web`. Output: `apps/web/dist`. Install: `npm install`.
3. Environment:
   - `VITE_API_BASE_URL` = `https://YOUR-RENDER-HOST/api/v1`
   - `VITE_SOCKET_URL` = `https://YOUR-RENDER-HOST`
4. Deploy. Copy the `*.vercel.app` URL.
5. On Render, set `CORS_ORIGIN` to that exact origin and redeploy the API.
6. If the Render hostname differs from `campusflow-api.onrender.com`, update `vercel.json` rewrites **or** rely on `VITE_API_BASE_URL` (preferred).

## Acceptance checks

1. `GET https://YOUR-RENDER-HOST/api/v1/health` → `HEALTHY`.
2. Vercel SPA loads; refresh on `/rooms` does not 404.
3. Demo login / persona switch issues a JWT.
4. Student timetable and PDF export respond.
5. Two browser tabs on `/communication` receive Socket.IO messages.
6. Solver run completes with `source: FALLBACK_SYNTHETIC` unless a local optimizer is pointed at `OPTIMIZER_URL`.
