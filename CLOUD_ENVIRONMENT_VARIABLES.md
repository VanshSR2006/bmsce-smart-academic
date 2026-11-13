# CampusFlow — Cloud Environment Variables

Never commit actual values. Set these in the provider dashboards only.

## 1. Vercel (Hobby) — frontend build-time

| Name | Required | Where | Purpose |
|---|---|---|---|
| `VITE_API_BASE_URL` | Recommended | Vercel → Project → Environment Variables | Public API origin including `/api/v1`, e.g. `https://campusflow-api.onrender.com/api/v1`. If omitted, the SPA uses relative `/api/v1` (Vercel rewrite). |
| `VITE_SOCKET_URL` | Required | Vercel | Public API origin for Socket.IO, e.g. `https://campusflow-api.onrender.com`. Vercel cannot proxy WebSockets. |

Redeploy the frontend after changing any `VITE_*` variable.

Do **not** set `DATABASE_URL`, `JWT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, or any pooler password on Vercel.

## 2. Render (Free) — `campusflow-api`

| Name | Required | Source | Purpose |
|---|---|---|---|
| `NODE_ENV` | Yes | `render.yaml` = `production` | Production JWT and CORS rules. |
| `PORT` | Injected | Render | Do not hardcode. Express reads `process.env.PORT`. |
| `DATABASE_URL` | Yes | Render Dashboard (sync: false) | Supabase **Session Pooler** URI on port **5432**, `sslmode=require`, database `postgres`, user `postgres.ctxpnicaqjygakszmhgs`. |
| `JWT_SECRET` | Yes | `generateValue: true` | Min 32 characters. Used to sign JWTs. |
| `CORS_ORIGIN` | Yes | Dashboard after first Vercel URL is known | Exact frontend origin, comma-separated if needed. |
| `ALLOW_DEMO_AUTH` | Yes for demo | `render.yaml` = `true` | Enables `/auth/demo-users` and `/auth/demo-login` on the public demo. |
| `IS_DEMO_ENV` | Yes for demo | `render.yaml` = `true` | Marks synthetic demo mode. |
| `INITIAL_DATA_MODE` | Optional | `SYNTHETIC` | Documentation flag; seed is separate. |
| `DEMO_PASSWORD_HASH` | Recommended | Dashboard | bcrypt hash of the shared demo password for `POST /api/v1/auth/login`. |
| `REDIS_URL` | Omit | — | In-memory fallback is sufficient for the demo. |
| `OPTIMIZER_URL` | Omit | — | Python OR-Tools is not deployed on Render Free. Solver uses the existing API fallback. |

Production migrations: `npx prisma migrate deploy` in the Render start command. Never `prisma db push` or `prisma migrate reset`.

## 3. Supabase (Free) — PostgreSQL only

Use the Dashboard connection string. Do not put the service-role key in this app.

| Item | Value to use |
|---|---|
| Project ref | `ctxpnicaqjygakszmhgs` |
| Region | Mumbai (`ap-south-1`) |
| Pooler host | `aws-1-ap-south-1.pooler.supabase.com` |
| Port | `5432` (Session Pooler; not `6543`) |
| Database | `postgres` |
| User | `postgres.ctxpnicaqjygakszmhgs` |

One-shot local scripts (PowerShell, does not write `.env`):

```powershell
$env:SUPABASE_SESSION_POOLER_URI="postgresql://postgres.ctxpnicaqjygakszmhgs:YOUR_PASSWORD@aws-1-ap-south-1.pooler.supabase.com:5432/postgres"
$env:SUPABASE_PROJECT_REF="ctxpnicaqjygakszmhgs"
$env:SUPABASE_EXPECTED_HOST="aws-1-ap-south-1.pooler.supabase.com"
npx tsx scripts/verify_supabase_preflight.ts
npx tsx scripts/verify_supabase_schema.ts
$env:ALLOW_SUPABASE_SEED="true"
npx tsx scripts/seed_supabase.ts
```

## 4. Demo accounts (fictional)

Shared password (public demo): `CampusFlowDemo2026!`
Store only the bcrypt hash in `DEMO_PASSWORD_HASH`.

| Role | Email |
|---|---|
| PLATFORM_ADMIN | `admin.demo@campusflow.example` |
| DEPT_HEAD | `hod.demo@campusflow.example` |
| FACULTY | `daa.faculty.demo@campusflow.example` (and other `*.faculty.demo@campusflow.example`) |
| CR | `cr.demo@campusflow.example` |
| STUDENT | `student.demo@campusflow.example` |

Persona switcher: `POST /api/v1/auth/demo-login` with `{ "role": "DEPT_HEAD" }` when `ALLOW_DEMO_AUTH=true`.
Password login: `POST /api/v1/auth/login` with `{ "email", "password" }` (bcrypt compare).
