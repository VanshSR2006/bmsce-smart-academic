# BMSCE Smart Academic — Cloud Deployment Checklist

> Step-by-step interactive manual guide for deploying the application to **Render** and **Vercel**.  
> **STOP RULE**: Do NOT execute provisioning steps until explicit human approval is granted.

---

## Phase 1: Pre-Flight Local Verification (Completed by Agent)

- [x] All 49 database models baselined in `prisma/migrations/20261113160723_init/migration.sql`.
- [x] Disposable test database verified with `prisma migrate dev` with zero migration errors.
- [x] Local PostgreSQL database `bmsce_academic` marked `--applied` without data loss.
- [x] Full automated test suite (19/19 tests) passed against PostgreSQL + Redis.
- [x] Frontend TypeScript type check clean (`npx tsc --noEmit -p apps/web/tsconfig.json`).
- [x] Frontend production bundle built successfully (`apps/web/dist`).
- [x] Docker images verified: `bmsce-api` (561MB), `bmsce-web` (74MB), `bmsce-optimizer` (1.15GB).
- [x] Redis strict TLS validation enforced in `apps/api/src/config/redis.ts` (insecure flags removed).
- [x] Pre-deploy migration hook configured in `render.yaml` (`preDeployCommand: npx prisma migrate deploy`).
- [x] Tested migration deployment against fresh disposable database `bmsce_test_predeploy` (51 tables created).
- [x] Verified zero localhost URLs in production frontend bundle `apps/web/dist`.
- [x] Centralized API client `getApiUrl()` tested with absolute cloud domains and relative paths.
- [x] Live controlled benchmark of Optimizer recorded: 3.3s solve time, ~144 MB peak working set.
- [x] Render Blueprint updated with `type: keyvalue` and verified resource references.

---

## Phase 2: Render Infrastructure Provisioning (Human Operator Step)

1. **Sign in to Render**:
   - Navigate to [dashboard.render.com](https://dashboard.render.com).
2. **Create New Blueprint Instance**:
   - Click **New +** → **Blueprint**.
   - Connect the Git repository (`bmsce-smart-academic`).
   - Render automatically detects `render.yaml` in the root.
3. **Review Resources to be Created**:
   - `bmsce-academic-db` (PostgreSQL 16, Singapore)
   - `bmsce-academic-redis` (Key Value, Singapore)
   - `bmsce-academic-optimizer` (Private Service, Docker)
   - `bmsce-academic-api` (Public Web Service, Docker)
4. **Approve and Apply Blueprint**:
   - Click **Apply**.
   - Render will provision the database and Redis first.
   - The API web service runs `apps/api/docker-entrypoint.sh` which executes `prisma migrate deploy` to create all 49 tables in the fresh database.
5. **Note the Public Web Service URL**:
   - Wait for the API build to finish and display `Live`.
   - Copy the generated URL: `https://bmsce-academic-api.onrender.com` (or your assigned subdomain).

---

## Phase 3: Vercel Frontend Deployment (Human Operator Step)

1. **Sign in to Vercel**:
   - Navigate to [vercel.com](https://vercel.com).
2. **Import Repository**:
   - Click **Add New...** → **Project**.
   - Import `bmsce-smart-academic`.
3. **Configure Project Settings**:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `.` (or `apps/web`)
   - **Build Command**: `npm run build --workspace=apps/web`
   - **Output Directory**: `apps/web/dist`
   - **Install Command**: `npm install`
4. **Configure Environment Variables**:
   - Add `VITE_SOCKET_URL`: `https://bmsce-academic-api.onrender.com` (your Render API URL from Phase 2).
   - Add `VITE_API_BASE_URL`: `https://bmsce-academic-api.onrender.com/api/v1`.
5. **Deploy**:
   - Click **Deploy**.
   - Vercel builds the bundle and assigns a domain (e.g. `https://bmsce-academic.vercel.app`).

---

## Phase 4: CORS Synchronization & Final Wire-Up

1. **Update Render CORS Configuration**:
   - If your Vercel assigned domain differs from `https://bmsce-academic.vercel.app`, go to the Render Dashboard.
   - Open `bmsce-academic-api` → **Environment**.
   - Update `CORS_ORIGIN` with your exact Vercel URL:
     ```
     https://your-project-name.vercel.app
     ```
   - Render will perform a zero-downtime rolling restart.

---

## Phase 5: Verification & Acceptance Tests

Perform these checks in a live browser:

1. **API Health Check**:
   - Open `https://bmsce-academic-api.onrender.com/api/v1/health` in browser.
   - Expect: `{"status":"HEALTHY","service":"BMSCE Smart Academic API","version":"1.0.0","mode":"PRODUCTION"}`
2. **Frontend Navigation**:
   - Open your Vercel URL.
   - Test navigating across `/workload`, `/rooms`, `/nep-scheme`, `/examinations`, `/conflicts`, `/solver`.
   - Refresh on any sub-path (e.g. `/rooms`) to confirm React SPA routing fallback works without 404s.
3. **Live Socket.IO Verification**:
   - Open `/communication` in two separate browser windows.
   - Post a message from one window and verify real-time reception in the second window.
4. **PDF Generation**:
   - Click **Export PDF / Print** on the Timetable, Examination, or Workload pages.
   - Confirm valid binary PDF is received and rendered by the browser PDF viewer.
5. **Optimization Engine Test**:
   - In Solver Studio (`/solver`), trigger a timetable run.
   - Verify that the Express API communicates with the internal private optimizer, records the job status in Redis, and persists candidate results in PostgreSQL.

