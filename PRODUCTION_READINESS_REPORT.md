# CampusFlow — Production Readiness Report

Generated: 2026-11-14 (free-tier cloud completion pass)

## 1. Target architecture (₹0)

```
Browser → Vercel Hobby (Vite SPA)
        → HTTPS/WSS → Render Free Node (Express + Prisma + Socket.IO)
                   → Supabase Free PostgreSQL 17 (Session Pooler :5432)
                   → In-memory cache (no Redis service)
                   → Optional local Python optimizer (not on Render Free)
```

Paid Render Postgres / Redis / private services from earlier drafts are **not** used.

## 2. Database

| Check | Status |
|---|---|
| Prisma 5.22.0, 50 mapped models | Yes |
| Baseline `20261113160723_init` | Applied on Supabase in prior session; re-verify with `verify:supabase:schema` |
| Local PostgreSQL / SQLite | Untouched; `.env` still localhost |
| `prisma db push` / `migrate reset` | Forbidden |
| Cloud migrate | `prisma migrate deploy` on Render start |

## 3. Security

| Check | Status |
|---|---|
| JWT_SECRET required in production (≥32 chars) | Pass |
| `x-demo-role` header bypass | Production blocked |
| Demo persona APIs | Only when `ALLOW_DEMO_AUTH=true` or non-prod `IS_DEMO_ENV=true` |
| Password login | bcrypt compare against `DEMO_PASSWORD_HASH` |
| CORS | Explicit origins in production |
| Service-role key | Not used by this app |
| `.env`, `.env.production`, `.env.supabase` | Gitignored |

## 4. Optimizer on Render Free

Measured OR-Tools working set is ~131–144 MB, which can fit 512 MB RAM, but:

- Render **Free** does not provide a suitable always-on private Python service at ₹0.
- Docker private services and extra web services add cost or duplicate sleep/spin-down issues.
- The API already calls `OPTIMIZER_URL` and falls back to synthetic candidates when the Python service is absent.

**Safe free-tier choice:** omit the optimizer on Render. Document `OPTIMIZER_URL` only if you later run the FastAPI process yourself. Do not buy Starter/Standard plans for this demo.

## 5. Redis

Omit `REDIS_URL` on Render. `apps/api/src/config/redis.ts` uses an in-memory Map. Fine for a single free instance; state resets on sleep.

## 6. Deployment status

This pass prepares GitHub `main` for operator deploy. Live Vercel/Render URLs are **not** claimed as deployed unless the operator completes the checklist.

## 7. Remaining operator steps

1. Supply `SUPABASE_SESSION_POOLER_URI` in a local shell and run verify + seed (credentials were not present in this agent environment).
2. Create Render Blueprint `campusflow-api` and Vercel project.
3. Align `CORS_ORIGIN` and `VITE_*` with the real hostnames.
4. Confirm health, login, Socket.IO, PDF, and solver fallback on the live URLs.
