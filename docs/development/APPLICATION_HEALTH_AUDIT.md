# CampusFlow — Application Health Audit (Phase 0)

**Date:** 2026-11-25
**Scope:** Read-only audit of `C:\bmsce-smart-academic` (no source code modified)
**Git Branch / HEAD:** `main` @ `fdc2496` (`feat: complete CampusFlow mobile responsiveness`)

---

## 1. Executive Summary & Overall Project Status

CampusFlow has a solid monorepo skeleton (`apps/web`, `apps/api`, `apps/optimizer`, `packages/contracts`, `prisma`), a 50-model PostgreSQL schema deployed to Supabase, working TypeScript/Vite builds, and a functional standalone OR-Tools CP-SAT + Greedy optimizer for small synthetic inputs.

However, **most of the application is currently a prototype backed by hardcoded JSON or synthetic seed data**:
- **2 pages crash at runtime (`TypeError`) when their API returns `200 OK`** due to frontend/backend JSON schema mismatches (`TimetableRepairCenter.tsx` and `ConflictInspector.tsx`).
- **6 pages have infinite-spinner states** if their API call fails or returns empty `data` (`if (loading || !data)`).
- **Only 4 backend modules query Prisma for real records** (`auth`, `timetables`, `academics` partial, `solver/run` partial, `reports/pdf.service.ts`). Even those mix in hardcoded demo metadata.
- **Disruption repair, conflict detection, candidate comparison, examinations, communication, and NEP scheme** return hardcoded/static JSON from Express routers.
- **CP-SAT HC-6 (Lab contiguity)** is a `pass` no-op; **HC-4/HC-5/SC-1..SC-4** are partially implemented; **Simulated Annealing (`sa.py`)** does not exist.

---

## 2. Repository & Git Inspection (Task 0.1)

- **Branch:** `main`
- **Latest commits:**
  - `fdc2496` — `feat: complete CampusFlow mobile responsiveness`
  - `87da262` — `feat: improve CampusFlow mobile responsiveness`
  - `8f51538` — `feat: complete Supabase integration and cloud deployment preparation`
  - `c56d522` — `feat: initial CampusFlow release`
- **Working tree:** Clean prior to Phase 0 documentation creation. Mobile responsiveness changes (`AppShell.tsx`, `Drawer.tsx`, and responsive table wrappers) are committed in `fdc2496`.

---

## 3. Routed Frontend Pages & Health Status (Task 0.2)

All routes are defined in `apps/web/src/App.tsx`. There is **no login route or login form**; `AuthContext.tsx` provides a demo persona switcher backed by `localStorage` and `/api/v1/auth/demo-*`.

| # | Route | Component | API Endpoint(s) | Data Source | Loading / Error / Empty | Status |
|---|---|---|---|---|---|---|
| 1 | `/` (HOD / Admin) | `HODDashboard` | `GET /api/v1/hod/dashboard-overview` | Backend queries `room` & `disruption` but **returns hardcoded JSON** | Spinner; **infinite spinner on API error** (`loading \|\| !data`) | `MOCK / HARDCODED` |
| 2 | `/` (Student / Faculty / CR) | `StudentDashboard` | `GET /api/v1/students/me/dashboard` | **DB (`section`, `timetableVersion.sessions`)** for `todayTimeline` + hardcoded cards/announcements | Spinner; **infinite spinner on API error** | `PARTIALLY IMPLEMENTED` |
| 3 | `/timetable` | `StudentTimetableGrid` | `GET /api/v1/sections/demo/timetable`, `GET /api/v1/reports/timetable-pdf` | **DB (`section`, `timetableVersion.sessions`, `bellSchedule`)** + hardcoded directory/governance | Spinner; **infinite spinner on API error** | `PARTIALLY IMPLEMENTED` |
| 4 | `/solver-studio` | `SolverStudio` | `POST /api/v1/solver/run` (`studio-config` not even fetched; constraints hardcoded in component) | Calls Python optimizer (or falls back to synthetic); persists `OptimizationRun` & `OptimizationCandidate` | `isSolving` spinner + 1500ms `setTimeout`; swallows errors | `PARTIALLY IMPLEMENTED` |
| 5 | `/candidate-comparison` | `CandidateComparison` | `GET /api/v1/solver/candidates/compare` | Backend returns **hardcoded disruption repair candidates** (not from `OptimizationCandidate` table) | Spinner; **infinite spinner on API error** | `MOCK / HARDCODED` |
| 6 | `/conflict-inspector` | `ConflictInspector` | `GET /api/v1/conflicts/summary` + `MOCK_DATA` fallback | Backend returns hardcoded JSON with **incompatible schema** | **CRASHES ON 200 OK** (`TypeError` on `d.recommendations` / `incident.affectedEntities`) | `PARTIALLY IMPLEMENTED` (Broken) |
| 7 | `/disruption-repair` | `TimetableRepairCenter` | `GET /api/v1/repairs/active` + `MOCK_DATA` fallback | Backend returns hardcoded JSON with **incompatible schema**; `Authorize & Apply` button has no `onClick` handler | **CRASHES ON 200 OK** (`TypeError` on `d.incident.type.replace`, `selectedStrategy.diff.map`, etc.) | `PARTIALLY IMPLEMENTED` (Broken) |
| 8 | `/communication` | `ClassCommunicationCenter` | `GET /api/v1/class-sessions/active`, `POST /api/v1/class-sessions/messages`, Socket.IO | Backend returns **hardcoded JSON**; `POST /messages` does **not** persist to Prisma `ChatMessage` | Silent `.catch(() => {})`; Socket.IO broadcasts in-memory only | `MOCK / HARDCODED` |
| 9 | `/examinations` | `ExaminationManagement` | `GET /api/v1/examinations/overview`, `GET /api/v1/reports/examination-pdf` | Backend returns **hardcoded JSON** (Prisma imported but unused); `Run Collision Audit` uses `alert()` | Falls back to `MOCK_DATA` on error | `MOCK / HARDCODED` |
| 10 | `/workload` | `FacultyWorkload` | `GET /api/v1/workload/overview`, `GET /api/v1/reports/workload-pdf` | **DB (`faculty`, `workloadRules`, `assignments`, `sessions`)** | Spinner; **infinite spinner on API error** | `CONFIRMED IMPLEMENTED` (Demo data) |
| 11 | `/rooms` | `RoomManagement` | `GET /api/v1/rooms/overview` | **DB (`room`, `roomFeatures`, `sessions`)** + hardcoded `currentStatus` overrides for 5 rooms | Spinner; **infinite spinner on API error** | `PARTIALLY IMPLEMENTED` |
| 12 | `/nep-scheme` | `NepScheme` | `GET /api/v1/nep-scheme/overview` | Backend queries `prisma.subject` (unused!) and returns **hardcoded JSON** | Spinner; **infinite spinner on API error** | `MOCK / HARDCODED` |

### Critical Runtime Crash Causes Identified

1. **`TimetableRepairCenter.tsx` (Lines 153–166, 208–352):**
   - `GET /api/v1/repairs/active` returns `{ incident: { category, primaryInstructor, cohortScope, ... }, strategies: [{ id: 'strat-a', optionLabel, ... }], differentialSchedule, constraintVerifications, comparativeImpactDeltas }`.
   - Frontend expects `{ incident: { type, affectedFaculty, affectedSections, affectedSlots, severity }, strategies: [{ id: 'OPT-A', label, feasibility, disruption, constraints, diff, impactDelta }] }`.
   - When the API returns `200 OK`, `setData(r.data)` overwrites `null`, and rendering `d.incident.type.replace(...)` throws `TypeError: Cannot read properties of undefined (reading 'replace')`.
   - Furthermore, the "Authorize & Apply" `<button>` (line 396) has **no `onClick` handler** and never calls `POST /api/v1/repairs/authorize`.

2. **`ConflictInspector.tsx` (Lines 145–158, 245+):**
   - `GET /api/v1/conflicts/summary` returns `{ gatekeeperStatus, stats, incidents: [{ id, resourceEntity, natureOfConflict, assignedSlot, ... }], conflictMatrix, constraintHealth }`.
   - Frontend expects `{ totalHardConflicts, totalSoftConflicts, facultyClashes, venueCollisions, windowViolations, incidents: [{ type, description, affectedEntities, slot, constraintRef }], recommendations }`.
   - When the API returns `200 OK`, `d.recommendations.map(...)` and `incident.affectedEntities` throw `TypeError`.

---

## 4. Backend Audit (`apps/api`) (Task 0.3)

Mounted in `apps/api/src/server.ts`:

| Router File | Base Path | DB Access | Hardcoded / Mock | Auth / Validation | Status |
|---|---|---|---|---|---|
| `auth.router.ts` | `/api/v1/auth` | `user`, `role`, `userRole` | `DEFAULT_DEMO_PASSWORD_HASH` fallback | Zod schemas; `requireAuth` on `/me`; `config.isDemo` gate on `/demo-*` | `CONFIRMED IMPLEMENTED` |
| `timetables.router.ts` | `/api/v1` | `section`, `timetableVersion`, `bellSchedule` | Hardcoded student/cards/announcements/governance | None (`requireAuth` not applied) | `PARTIALLY IMPLEMENTED` |
| `dashboard.router.ts` | `/api/v1` | Queries `room`, `disruption` (unused in response!) | Entire response body is hardcoded | None | `MOCK / HARDCODED` |
| `solver.router.ts` | `/api/v1/solver` | Reads `section`, `subject`, `faculty`, `room`; writes `optimizationRun`, `optimizationCandidate` | `/studio-config` & `/candidates/compare` hardcoded; `/run` falls back to synthetic if optimizer unreachable | Zod + role check on `/run` (only if `req.user` present) | `PARTIALLY IMPLEMENTED` |
| `conflicts.router.ts` | `/api/v1/conflicts` | None | Entire `/summary` response hardcoded | None | `MOCK / HARDCODED` |
| `repairs.router.ts` | `/api/v1/repairs` | Reads `disruption.findFirst` (only for `id`); writes `auditLog` on `/authorize` | `/active` strategies/schedules hardcoded; `/authorize` does not mutate timetable | Zod + role check on `/authorize` (only if `req.user` present) | `MOCK / HARDCODED` |
| `communication.router.ts` | `/api/v1/class-sessions` | None (`prisma` imported, unused) | `/active` hardcoded; `/messages` returns synthetic object without DB write | Role check in body (`senderRole`) | `MOCK / HARDCODED` |
| `examinations.router.ts` | `/api/v1/examinations` | None (`prisma` imported, unused) | `/overview` hardcoded | None | `MOCK / HARDCODED` |
| `academics.router.ts` | `/api/v1` | `/workload/overview` & `/rooms/overview` query Prisma | `/rooms/overview` hardcodes `currentStatus` for 5 rooms; `/nep-scheme/overview` hardcoded | None | `PARTIALLY IMPLEMENTED` |
| `reports.router.ts` + `pdf.service.ts` | `/api/v1/reports` | Generates PDFs via `pdfkit` | Uses DB + demo fallbacks | None | `CONFIRMED IMPLEMENTED` |

**Middleware & Config Observations:**
- `authMiddleware` (`apps/api/src/middleware/auth.ts`): Populates `req.user` from `x-demo-role` (non-prod demo only) or `Bearer <jwt>`, but calls `next()` when unauthenticated. Most routers **do not** use `requireAuth` or `requireRole`, leaving endpoints open unless checked inline (and inline `if (req.user && ...)` skips checks when `req.user` is undefined!).
- `redis.ts`: Clean `ioredis` integration with `memoryFallbackStore` (`Map`) when `REDIS_URL` is unset or offline.

---

## 5. Database & Prisma Audit (Task 0.4)

- **Schema:** `prisma/schema.prisma` defines **50 models** covering Auth/RBAC, Academic Structure, Constraints, Timetables/Exceptions, Optimization Runs/Candidates, Validation Reports, Disruptions/Repairs, Communication Chambers, Examinations, Notifications, and Audit Logs.
- **Migrations:** `prisma/migrations/20261113160723_init` (baseline PostgreSQL migration).
- **Seed Provenance:** `prisma/seed.ts` (706 lines) and `scripts/seed_supabase.ts` populate **100% synthetic demo data** (`DEMO-CSE`, `isDemo: true`, `CSE-5B`, 64 students). No real BMSCE/VTU institutional imports exist.
- **Safety:** `seed.ts` wipes all demo tables (`deleteMany`) before seeding, guarded by `ALLOW_SUPABASE_SEED=true` for Supabase targets.

---

## 6. Optimizer Audit (`apps/optimizer`) (Task 0.5)

- **FastAPI (`main.py`):**
  - `GET /health` → returns `HEALTHY`, `OR-Tools CP-SAT 9.11`, `SYNTHETIC_DEMO`.
  - `POST /optimize` → runs Greedy (`candidate[0]`), CP-SAT (`candidate[1]`, 25s limit), and CP-SAT Relaxed (`candidate[2]`, 15s limit, only if `len(candidates) < 2`).
  - **Data source:** Receives JSON `OptimizeRequest` from Express `solver.router.ts` (never connects to PostgreSQL directly).
  - **Simulated Annealing (`sa.py`):** **NOT IMPLEMENTED** (file does not exist, though `SIMULATED_ANNEALING` is in `solver.router.ts` Zod enum).

### Constraint Implementation Table (`apps/optimizer/solver/cpsat.py` & `greedy.py`)

| Constraint | Code / Name | CP-SAT (`cpsat.py`) | Greedy (`greedy.py`) | Status |
|---|---|---|---|---|
| **HC-1** | Faculty non-overlap | `model.AddAtMostOne(get_vars(fac=..., day=..., period=...))` (L112–118) | `faculty_busy` set check (L117) | `CONFIRMED IMPLEMENTED` |
| **HC-2** | Room non-overlap | `model.AddAtMostOne(get_vars(room=..., day=..., period=...))` (L120–126) | `room_busy` set check (L145) | `CONFIRMED IMPLEMENTED` |
| **HC-3** | Section non-overlap | `model.AddAtMostOne(get_vars(sec=..., day=..., period=...))` (L104–110) | `section_busy` set check (L99) | `CONFIRMED IMPLEMENTED` |
| **HC-4** | Subject weekly hours coverage | `model.Add(sum(all_vars) == subj.weekly_hours)` (L128–136) | Loops `blocks_needed` (L59–91) | `CONFIRMED IMPLEMENTED` |
| **HC-5** | Faculty weekly load cap | `model.Add(sum(all_vars) <= fac.max_weekly_hours)` (L138–142) | Checked (falls back to soft overload L126–137) | `CONFIRMED IMPLEMENTED` |
| **HC-6** | Lab contiguity | **No-op `pass`** at line 164 (L144–165) | Contiguous `block_slots` loop (L96) | `NOT IMPLEMENTED` (CP-SAT) / `CONFIRMED IMPLEMENTED` (Greedy) |
| **HC-7** | Faculty unavailability | **Missing** in `cpsat.py` (`unavailable_slots` ignored) | `fac_unavailable` check (L112–118) | `NOT IMPLEMENTED` (CP-SAT) |
| **HC-8** | Room capacity & lab type | Filtered during variable creation (L75–80) | Filtered during `eligible_rooms` (L74–81) | `CONFIRMED IMPLEMENTED` |
| **SC-1** | Avoid labs in period 0 | Implemented (L170–181, weight 5) | Checked for `start_period == 1` (L153) | `CONFIRMED IMPLEMENTED` |
| **SC-2** | Faculty daily max hours | Implemented (L183–191, weight 8) | Not checked | `PARTIALLY IMPLEMENTED` |
| **SC-3 / SC-4** | Consecutive same subject / load variance | Listed in docstring, **not implemented** in objective | Load variance computed in metrics only | `NOT IMPLEMENTED` |

---

## 7. Deployment & Infrastructure Audit (Task 0.6)

- **Frontend (`vercel.json`, `apps/web/vercel.json`):** Vite static build (`apps/web/dist`), SPA rewrite + `/api/v1/:path*` proxy to Render. Note: `vercel.json` points to `campusflow-api.onrender.com` (check actual Render service URL `campusflow-api-yanf.onrender.com`).
- **Backend (`render.yaml`):** Render Free Node service, Singapore region, `prisma migrate deploy` + `node apps/api/dist/server.js`, health check `/api/v1/health`, Redis & Python optimizer omitted on Render Free (in-memory fallback + synthetic solver fallback).
- **Database:** Supabase PostgreSQL 17.11 (Mumbai, Session Pooler).
- **Local Infra (`infra/compose.yaml`, `infra/compose.production.yaml`):** Docker Compose definitions for Postgres 16, Redis 7, Optimizer, API, and Nginx Web.
- **Env Variables (names only):** `NODE_ENV`, `PORT`, `DATABASE_URL`, `REDIS_URL`, `OPTIMIZER_URL`, `JWT_SECRET`, `CORS_ORIGIN`, `IS_DEMO_ENV`, `ALLOW_DEMO_AUTH`, `INITIAL_DATA_MODE`, `DEMO_PASSWORD_HASH`, `VITE_API_BASE_URL`, `VITE_SOCKET_URL`.

---

## 8. Existing Tests & Build Verification (Task 0.7)

| Check | Command | Result | Notes |
|---|---|---|---|
| Web & API Typecheck | `npx tsc --noEmit -p apps/web/tsconfig.json; npx tsc --noEmit -p apps/api/tsconfig.json` | **PASS (Exit 0)** | Zero TypeScript errors |
| Web Production Build | `npm run build --workspace=apps/web` | **PASS (Exit 0)** | `tsc && vite build`, 1634 modules, built in 28.63s |
| API Production Build | `npm run build --workspace=apps/api` | **PASS (Exit 0)** | `tsc` compiled cleanly |
| Optimizer Greedy Test | `.\.venv\Scripts\python.exe test_optimizer.py` | **PASS (Exit 0)** | FEASIBLE, 0 hard / 0 soft violations, 40 slots (2 sections) |
| Optimizer CP-SAT Test | `.\.venv\Scripts\python.exe test_cpsat.py` | **PASS (Exit 0)** | OPTIMAL, 0 hard / 0 soft violations, 40 slots (2 sections) |
| Endpoint Integration Suite | `scripts/test_all_endpoints.ts` | **NOT VERIFIED** | Requires live API server running; not executed in read-only Phase 0 |
