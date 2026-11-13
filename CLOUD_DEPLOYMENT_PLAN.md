# BMSCE Smart Academic — Cloud Deployment Plan

> Target Platform: **Vercel (Frontend)** + **Render (Backend, Optimizer, PostgreSQL, Key Value)**  
> Region: **Singapore (`singapore` / Southeast Asia)**  
> Domain Status: Temporary platform subdomains (`*.vercel.app`, `*.onrender.com`)  
> Prepared: November 2026

---

## 1. System Architecture & Topology

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       CLIENT BROWSERS                                       │
└───────────────────────────────┬───────────────────────────────────┬─────────────────────────┘
                                │ HTTPS (SPA Assets & Navigation)   │ WSS / Direct REST
                                ▼                                   │
                 ┌──────────────────────────────┐                   │
                 │     VERCEL EDGE NETWORK      │                   │
                 │   bmsce-academic.vercel.app  │                   │
                 │                              │                   │
                 │  - React 18 + Vite SPA       │                   │
                 │  - Client Routing Fallback   │                   │
                 │  - /api/v1/* Edge Rewrites   │                   │
                 └──────────────┬───────────────┘                   │
                                │                                   │
                                │ Proxied API calls                 │
                                ▼                                   ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                            RENDER CLOUD PLATFORM (SINGAPORE)                                │
│                                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────────────────────┐  │
│  │ PUBLIC WEB SERVICE: bmsce-academic-api                                                │  │
│  │ URL: https://bmsce-academic-api.onrender.com                                          │  │
│  │ Runtime: Docker (Node.js 22 Alpine, non-root user)                                    │  │
│  │ Stack: Express 4, Socket.IO 4, Prisma Client 5, ioredis, PDFKit                       │  │
│  │ Ports: Internal 3001 -> Public HTTPS/WSS 443                                          │  │
│  │ Auto-Migration: RUN_MIGRATIONS=true via docker-entrypoint.sh                          │  │
│  └───────────────────┬───────────────────────────┬───────────────────────┬───────────────┘  │
│                      │                           │                       │                  │
│                      │ Private HTTP              │ Private TCP           │ Private TCP      │
│                      ▼                           ▼                       ▼                  │
│  ┌───────────────────────────────┐ ┌───────────────────────────┐ ┌───────────────────────┐  │
│  │ PRIVATE SERVICE               │ │ MANAGED POSTGRESQL 16     │ │ RENDER KEY VALUE      │  │
│  │ bmsce-academic-optimizer      │ │ bmsce-academic-db         │ │ bmsce-academic-redis  │  │
│  │                               │ │                           │ │                       │  │
│  │ - Python 3.12 Slim            │ │ - Host: pg.render.internal│ │ - Host: redis.internal│  │
│  │ - FastAPI + Uvicorn (2 workers│ │ - Port: 5432              │ │ - Port: 6379          │  │
│  │ - Google OR-Tools 9.11 CP-SAT │ │ - Schema: 49 tables       │ │ - In-memory LRU cache │  │
│  │ - Port: 8000 (no public IP)   │ │ - IP Allowlist: [] (none) │ │ - Job queue fallback  │  │
│  └───────────────────────────────┘ └───────────────────────────┘ └───────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Component Specifications

### 2.1 Frontend — Vercel
- **Framework**: Vite + React 18 + Tailwind CSS
- **Repository Root**: `c:\bmsce-smart-academic`
- **Root Directory in Vercel**: `.` (or `apps/web`)
- **Build Command**: `npm run build --workspace=apps/web`
- **Output Directory**: `apps/web/dist`
- **Configuration**: `vercel.json` (root and `apps/web/vercel.json`)
- **Dual API Communication Support**:
  1. *Edge Rewrite Mode*: Requests to `/api/v1/*` are proxied by Vercel edge to `https://bmsce-academic-api.onrender.com/api/v1/*`.
  2. *Direct CORS Mode*: If `VITE_API_BASE_URL` is configured, requests resolve directly via `getApiUrl()`.
- **WebSocket / Socket.IO**: Connects directly from client browsers to `https://bmsce-academic-api.onrender.com` (Vercel edge functions do not support long-lived WebSocket tunnels).

### 2.2 Backend API — Render Public Web Service
- **Service Name**: `bmsce-academic-api`
- **Type**: `web`
- **Environment**: `docker` (`apps/api/Dockerfile`)
- **Region**: `singapore`
- **Plan**: `starter` (512 MB RAM, 0.5 CPU)
- **Healthcheck**: `GET /api/v1/health`
- **Pre-Deploy Migration Hook**: `preDeployCommand: npx prisma migrate deploy --schema=./prisma/schema.prisma` runs migrations in an isolated ephemeral container before live traffic routing. If migrations fail, the deployment is aborted safely and the previous release remains online with zero downtime.
- **Entrypoint**: `apps/api/docker-entrypoint.sh` starts the Node.js server directly.

### 2.3 Optimizer Engine — Render Private Service
- **Service Name**: `bmsce-academic-optimizer`
- **Type**: `pserv`
- **Environment**: `docker` (`apps/optimizer/Dockerfile`)
- **Region**: `singapore`
- **Plan**: `starter` (512 MB RAM, 0.5 CPU) for single/dual section cohorts; upgrade to `standard` (2 GB RAM, 1 CPU) for multi-branch production concurrency.
- **Measured Resource Profile**:
  - Baseline Memory: ~131 MB working set.
  - Active Optimization: ~144 MB working set.
  - OR-Tools CP-SAT Search: 4 parallel search threads, 12,600 variables in 0.2s, 3.3s average solve time.
- **Discovery**: Internal DNS `http://bmsce-academic-optimizer:8000` (accessible only from services in the same Render environment; zero internet exposure).

### 2.4 Database — Render Managed PostgreSQL
- **Instance Name**: `bmsce-academic-db`
- **Version**: PostgreSQL 16
- **Region**: `singapore`
- **Plan**: `starter` (1 GB RAM, 10 GB SSD, automated daily backups)
- **Security**: Private network connection string injected automatically via `fromDatabase: { name: bmsce-academic-db, property: connectionString }`. No external IP allowed (`ipAllowList: []`).

### 2.5 Cache & Queue — Render Key Value (Redis)
- **Instance Name**: `bmsce-academic-redis`
- **Type**: `keyvalue`
- **Engine**: Redis 7 compatible
- **Region**: `singapore`
- **Plan**: `starter` (256 MB RAM)
- **Security & TLS**: Uses private network protocol `redis://red-xxxx:6379`. If an external `rediss://` endpoint is configured, strict CA certificate verification is enforced.
- **Resilience**: API includes in-memory fallback cache if Redis restarts or is temporarily unreachable.

---

## 3. Database Migration Strategy & Data Safety

### 3.1 Migration Baseline Created
During Phase H, an initial baseline migration was generated and validated against a disposable test database:
- **Migration Path**: `prisma/migrations/20261113160723_init/migration.sql`
- **Models Included**: All 49 application models, relations, indices, and constraints.
- **Local Baselining**: The populated local database `bmsce_academic` was marked `--applied` using `npx prisma migrate resolve --applied 20261113160723_init`.

### 3.2 Cloud Provisioning Behavior
1. **Fresh Cloud Database**:
   - When Render provisions the fresh PostgreSQL database, running `npx prisma migrate deploy` executes `20261113160723_init/migration.sql` and builds the complete schema.
   - This happens automatically on the first API container deployment via `docker-entrypoint.sh`.
2. **Pre-Existing / Populated Cloud Database**:
   - If importing an existing database dump into Render PostgreSQL, run:
     ```bash
     npx prisma migrate resolve --applied 20261113160723_init
     ```
   - This prevents Prisma from attempting to recreate existing tables.

### 3.3 Rollback Procedures
- **Local Rollback**: SQLite database remains untouched at `prisma/dev.db` with backup copies in `prisma/backups/`.
- **PostgreSQL Cloud Rollback**: PostgreSQL dumps can be generated with `scripts/backup_postgres.sh` and restored via `psql`.

---

## 4. Resource & Cost Estimates (Official Provider Pricing)

| Service | Provider | Tier / Plan | Specs | Monthly Cost |
|---|---|---|---|---|
| Frontend SPA | Vercel | Hobby | Unlimited builds, 100 GB bandwidth, Edge CDN | $0.00 |
| API Web Service | Render | Starter | 512 MB RAM, 0.5 CPU, 100 GB egress | $7.00 |
| Optimizer Private Service | Render | Starter *(or Standard)* | 512 MB RAM, 0.5 CPU *(or 2 GB RAM, 1 CPU)* | $7.00 *($25.00)* |
| Managed PostgreSQL 16 | Render | Starter | 1 GB RAM, 10 GB SSD, Daily Backups | $7.00 |
| Key Value (Redis) | Render | Starter | 256 MB RAM, LRU eviction | $7.00 |
| **Total Base Production** | | | **All 4 Render Services + Vercel** | **$28.00 / month** |
| **Total Upgraded Production** | | | **With 2GB Optimizer for Heavy Loads** | **$46.00 / month** |

### 4.1 Bandwidth & Usage Assumptions
- **Bandwidth**: 100 GB/month included per service on Render. Overages are $0.10 / GB. For typical academic traffic (JSON APIs and small PDF downloads), 100 GB easily covers >100,000 monthly requests.
- **Storage**: 10 GB SSD included on PostgreSQL. Additional storage is $0.30 / GB / month. The current BMSCE schema with full faculty, room, and session records uses <50 MB.
- **Vercel Limits**: Hobby tier provides 100 GB edge bandwidth and 100 deployments/day, which is well above institutional requirements.

---

## 5. Alternative VPS Deployment Option Preserved
The Docker Compose configuration created in Phase G (`infra/compose.production.yaml`) remains 100% functional and preserved in the repository for operators who prefer deploying to a single Linux VPS (Ubuntu/Debian on AWS EC2, DigitalOcean, Hetzner, etc.) rather than managed cloud services.

