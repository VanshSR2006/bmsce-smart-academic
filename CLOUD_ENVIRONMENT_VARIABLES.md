# BMSCE Smart Academic — Cloud Environment Variables Guide

> Reference guide for configuring environment variables on **Vercel** and **Render**.  
> **NEVER commit actual production secrets to Git.**

---

## 1. Vercel (Frontend Project Settings)

Configure these in the Vercel Dashboard under **Project Settings → Environment Variables**:

| Variable Name | Required? | Example Production Value | Purpose & Notes |
|---|---|---|---|
| `VITE_API_BASE_URL` | Optional | `https://bmsce-academic-api.onrender.com/api/v1` | Explicit public URL for the Render API. If omitted, frontend falls back to relative `/api/v1` which is proxied by `vercel.json` rewrites. |
| `VITE_SOCKET_URL` | **Required** | `https://bmsce-academic-api.onrender.com` | Public URL for Socket.IO WebSocket connections. Must point directly to the Render Web Service (Vercel cannot proxy persistent WebSockets). |

> **Note on Build Time**: In Vite, `VITE_*` variables are baked into JavaScript bundles at build time. If you update either variable in Vercel, you must trigger a **Redeploy** for the change to take effect.

---

## 2. Render Public Web Service (`bmsce-academic-api`)

These variables are defined in `render.yaml` and injected automatically by Render:

| Variable Name | Source in `render.yaml` | Manual Override Example | Purpose & Security Notes |
|---|---|---|---|
| `NODE_ENV` | `value: production` | `production` | Enables production security checks, disables stack trace leaking, and activates strict JWT validation. |
| `PORT` | `value: 3001` | `3001` | Internal container port on which Express listens. |
| `DATABASE_URL` | `fromDatabase: { name: bmsce-academic-db, property: connectionString }` | `postgresql://bmsce_user:pass@pg.render.internal:5432/bmsce_academic` | Private PostgreSQL connection string. Managed automatically by Render Blueprint. |
| `REDIS_URL` | `fromService: { type: redis, name: bmsce-academic-redis, property: connectionString }` | `redis://red-xxxx:6379` | Private Redis connection string. Managed automatically by Render Blueprint. |
| `OPTIMIZER_URL` | `value: http://bmsce-academic-optimizer:8000` | `http://bmsce-academic-optimizer:8000` | Private internal DNS resolution for the optimizer service. |
| `JWT_SECRET` | `generateValue: true` | *(Auto-generated 64-char string)* | Cryptographic secret for signing and verifying JWT tokens. Render generates a unique random string. |
| `CORS_ORIGIN` | `value: https://bmsce-academic.vercel.app,https://academic.bmsce.ac.in` | `https://your-vercel-domain.vercel.app` | Comma-separated list of allowed frontend origins. Supports multiple domains. |
| `IS_DEMO_ENV` | `value: "false"` | `false` | Must strictly be `false` in production. Completely disables unauthenticated role bypass. |
| `INITIAL_DATA_MODE` | `value: PRODUCTION` | `PRODUCTION` | Disables demo mocks. |
| `RUN_MIGRATIONS` | `value: "true"` | `true` | When `true`, container startup script runs `npx prisma migrate deploy` automatically before starting server. |

---

## 3. Render Private Service (`bmsce-academic-optimizer`)

| Variable Name | Source in `render.yaml` | Value | Purpose |
|---|---|---|---|
| `CORS_ORIGIN` | `value: http://bmsce-academic-api:3001,https://bmsce-academic.vercel.app` | Same | Allowed callers for FastAPI endpoints. |

---

## 4. Render Managed PostgreSQL (`bmsce-academic-db`)

| Setting | Value in `render.yaml` | Notes |
|---|---|---|
| Database Name | `bmsce_academic` | Default application database. |
| Database User | `bmsce_user` | Generated non-root database owner. |
| Version | `16` | PostgreSQL 16. |
| Access Control | `ipAllowList: []` | Disallows public internet connections. Only reachable via Render's private network. |

---

## 5. Render Key Value (`bmsce-academic-redis`)

| Setting | Value in `render.yaml` | Notes |
|---|---|---|
| Engine | Redis 7 Compatible | In-memory cache and background job tracking. |
| Access Control | `ipAllowList: []` | Disallows public internet connections. |

---

## 6. How to Generate Production Secrets Manually

If not using Render's `generateValue: true`, generate cryptographically random secrets from your local terminal:

```bash
# Generate 64-character hex secret for JWT_SECRET:
openssl rand -hex 32

# Generate 32-character random database password:
openssl rand -base64 24
```

