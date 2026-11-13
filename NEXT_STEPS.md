# BMSCE Smart Academic — Next Steps

> Status: Phase H & Phase H.1 (Cloud Deployment Preparation & Audit) **COMPLETE**  
> Target Platforms: **Vercel** (Frontend) + **Render** (Backend, Optimizer, PostgreSQL, Redis)  
> All configurations, migrations, Dockerfiles, and Blueprints audited & verified.  
> ⛔ **STOPPED PRIOR TO CLOUD PROVISIONING — AWAITING OPERATOR APPROVAL.**

---

## 1. Cloud Deployment Execution Steps (When Approved)

Follow the detailed guide in [CLOUD_DEPLOYMENT_CHECKLIST.md](file:///c:/bmsce-smart-academic/CLOUD_DEPLOYMENT_CHECKLIST.md):

1. **Deploy Render Infrastructure**:
   - Go to [dashboard.render.com](https://dashboard.render.com) → **New +** → **Blueprint**.
   - Connect repository `bmsce-smart-academic`. Render will parse `render.yaml`.
   - Click **Apply** to provision `bmsce-academic-db`, `bmsce-academic-redis`, `bmsce-academic-optimizer`, and `bmsce-academic-api`.
   - Note the API URL (e.g. `https://bmsce-academic-api.onrender.com`).

2. **Deploy Vercel Frontend**:
   - Go to [vercel.com](https://vercel.com) → **Add New...** → **Project**.
   - Import `bmsce-smart-academic`.
   - Add environment variables:
     - `VITE_SOCKET_URL`: `https://bmsce-academic-api.onrender.com`
     - `VITE_API_BASE_URL`: `https://bmsce-academic-api.onrender.com/api/v1`
   - Click **Deploy**.

3. **Synchronize CORS**:
   - In Render dashboard, ensure `bmsce-academic-api` has your Vercel URL in `CORS_ORIGIN`.

---

## 2. Local Verification Commands

To verify the current local application state:

```powershell
# 1. API Automated Tests (19 tests on PostgreSQL + Redis)
npx tsx scripts/test_all_endpoints.ts

# 2. Frontend Type Check & Build
npx tsc --noEmit -p apps/web/tsconfig.json
npm run build --workspace=apps/web

# 3. Prisma Migration Status
npx prisma migrate status

# 4. Docker Images Check
docker images bmsce-* --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
```

---

## 3. Alternative VPS Deployment (Self-Hosted Docker Compose)

If deploying to a single Linux server instead of Render + Vercel:

```powershell
# Build and run all 5 services with production Docker Compose:
docker compose -f infra/compose.production.yaml --env-file .env.production up -d
```
*(Preserved from Phase G in `infra/compose.production.yaml`).*

---

## 4. Emergency SQLite Rollback

Original SQLite data remains untouched in `prisma/dev.db` and `prisma/backups/`:

```powershell
# 1. Set DATABASE_URL="file:./dev.db" in .env
# 2. Copy schema:
Copy-Item prisma/schema.sqlite.prisma prisma/schema.prisma -Force
npx prisma generate
# 3. Restart API server
```
