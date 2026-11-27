# CampusFlow — Prioritized Task Backlog

Priorities: **P0** (Critical crashes / data integrity / core solver) · **P1** (Required functionality) · **P2** (Important improvements) · **P3** (UI polish & optional enhancements)

---

## Phase 1 — Stabilization & Crash Fixes

| ID | Description | Relevant Files | Dependencies | Priority | Status | Acceptance Criteria |
|---|---|---|---|---|---|---|
| `TASK-101A` | Fix runtime `TypeError` schema mismatch in `TimetableRepairCenter` & `repairs.router.ts` | `apps/web/src/features/repairs/TimetableRepairCenter.tsx`, `apps/api/src/modules/repairs/repairs.router.ts`, `packages/contracts/src/repairs.ts` | Phase 0 | **P0** | `DONE` | Page validates `ActiveRepairData`, handles null incident / empty strategies / API errors cleanly without crashing |
| `TASK-101B` | Fix runtime `TypeError` schema mismatch in `ConflictInspector` & `conflicts.router.ts` | `apps/web/src/features/conflicts/ConflictInspector.tsx`, `apps/api/src/modules/conflicts/conflicts.router.ts`, `packages/contracts/src/conflicts.ts` | Phase 0 | **P0** | `DONE` | Page validates `ConflictInspectorSummary`, handles empty incidents/recommendations and API errors cleanly without crashing |
| `TASK-102` | Replace infinite loading spinners (`loading \|\| !data`) with proper error & retry UI states across 7 pages | `useApiQuery.ts`, `QueryStateCard.tsx`, `HODDashboard.tsx`, `StudentDashboard.tsx`, `StudentTimetableGrid.tsx`, `CandidateComparison.tsx`, `FacultyWorkload.tsx`, `RoomManagement.tsx`, `NepScheme.tsx` | Phase 0 | **P0** | `DONE` | Failed API requests display an error banner + retry button instead of spinning forever |
| `TASK-103` | Wire `TimetableRepairCenter` "Authorize & Apply" button to `POST /api/v1/repairs/authorize` | `TimetableRepairCenter.tsx`, `repairs.router.ts`, `packages/contracts/src/repairs.ts` | `TASK-101A` | **P1** | `DONE` | Clicking button sends request, disables while submitting, prevents duplicates, and shows demo audit confirmation/error |

## Phase 2 — Data Foundation & Synthetic Dataset

| ID | Description | Relevant Files | Dependencies | Priority | Status | Acceptance Criteria |
|---|---|---|---|---|---|---|
| `TASK-201` | Data Architecture Readiness, deterministic 4-section synthetic CSE seed, 7 controlled scenarios, and import pipeline design | `scripts/seed_synthetic_cse.ts`, `scripts/synthetic_scenarios.py`, `docs/development/DATA_ARCHITECTURE_READINESS.md` | Phase 1 | **P1** | `DONE` | Schema audited, idempotent synthetic seed verified on disposable DB, 7 optimizer scenarios executed, import strategy documented |
| `TASK-202A` | Remove hardcoded `'CSE-5B'` dependency from timetable retrieval (`timetables.router.ts`) | `apps/api/src/modules/timetables/timetables.router.ts` | `TASK-201` | **P1** | `DONE` | Resolves section by ID/code, returns 404 for unknown, empty state for no timetable, derives load/directory from DB |
| `TASK-202B` | Decouple `solver.router.ts` from all-to-all subject/faculty demo assumptions | `apps/api/src/modules/solver/solver.router.ts` | `TASK-202A` | **P1** | `DONE` | Solver payload uses `SubjectOffering`, `FacultyAssignment`, `FacultyAvailability`, `FacultyWorkloadRule`, `BellSchedule`, `TimePeriod`, `Room` |

## Phase 3 — Academic Structure Management

| ID | Description | Relevant Files | Dependencies | Priority | Status | Acceptance Criteria |
|---|---|---|---|---|---|---|
| `TASK-301` | Connect `NepScheme` (`/api/v1/nep-scheme/overview`) to live `Subject` & `SubjectOffering` Prisma records | `packages/contracts/src/academics.ts`, `academics.router.ts`, `NepScheme.tsx` | `TASK-201` | **P1** | `DONE` | NEP curriculum overview and deduplicated subjects derive from Prisma records with explicit schema limitations for missing credits/L:T:P/verticals |
| `TASK-302` | Connect `HODDashboard` (`/api/v1/hod/dashboard-overview`) to live Prisma aggregations across academic, faculty, timetable, room, and alert tables | `packages/contracts/src/dashboard.ts`, `dashboard.router.ts`, `HODDashboard.tsx` | `TASK-201` | **P1** | `DONE` | HOD dashboard metrics, room matrix, section coverage, and alerts derive from scoped Prisma queries with explicit null/empty states |
| `TASK-303` | Connect `FacultyWorkload` (`/api/v1/workload/overview`) and `RoomManagement` (`/api/v1/rooms/overview`) to live Prisma records | `packages/contracts/src/academics.ts`, `academics.router.ts`, `FacultyWorkload.tsx`, `RoomManagement.tsx` | `TASK-201` | **P1** | `DONE` | Workload limits/assignments/availability and room features/availability/utilization/collisions derive from Prisma without fabricated overrides |

## Phase 4 — CP-SAT Optimization Engine Completion

| ID | Description | Relevant Files | Dependencies | Priority | Status | Acceptance Criteria |
|---|---|---|---|---|---|---|
| `TASK-401` | Implement **HC-6** (Lab contiguity) in `cpsat.py` replacing `pass` no-op | `apps/optimizer/solver/cpsat.py`, `apps/optimizer/test_hc6_lab_contiguity.py` | Phase 2 | **P0** | `DONE` | Lab subjects with `lab_duration_hours >= 2` are strictly scheduled in contiguous periods on the same day |
| `TASK-402` | Implement **HC-7** (Faculty `unavailable_slots`) in `cpsat.py` | `apps/optimizer/solver/cpsat.py`, `apps/optimizer/test_hc7_faculty_availability.py` | `TASK-401` | **P0** | `DONE` | CP-SAT never assigns faculty to slots in `unavailable_slots` |
| `TASK-403` | Implement **SC-3** (consecutive same subject) and **SC-4** (faculty load balance) + independent metrics & benchmarking | `apps/optimizer/solver/cpsat.py`, `apps/optimizer/solver/metrics.py`, `apps/optimizer/test_sc3_sc4.py`, `scripts/benchmark_sc3_sc4.py` | `TASK-401` | **P2** | `DONE` | Objective penalizes consecutive identical theory subjects and load imbalance; benchmarked vs Greedy |
| `TASK-404` | Optimizer Reliability & Performance Hardening ($O(1)$ indexing, timeout/status handling, Greedy HC-7 fix) | `apps/optimizer/solver/cpsat.py`, `apps/optimizer/solver/greedy.py`, `apps/optimizer/test_hardening_404.py` | `TASK-403` | **P1** | `DONE` | 22.5x faster 4-sec model build, explicit `TIMEOUT`/`MODEL_INVALID`/`FEASIBLE` handling, Greedy HC-7 overload fixed |

## Phase 5 — Initial & Dynamic Timetable Generation

| ID | Description | Relevant Files | Dependencies | Priority | Status | Acceptance Criteria |
|---|---|---|---|---|---|---|
| `TASK-501` | Fix `solver.router.ts` `/run` payload builder to use `SubjectOffering`, `FacultyAssignment`, `FacultyAvailability`, and `BellSchedule` from DB and wire `SolverStudio` (`/studio-config` + `/run`) | `packages/contracts/src/optimization.ts`, `apps/api/src/modules/solver/solver.router.ts`, `apps/web/src/features/solver/SolverStudio.tsx` | `TASK-401`, `TASK-402` | **P0** | `DONE` | Payload builder (`TASK-202B`) preserved with `programId`/scope validation; `/studio-config` & `SolverStudio.tsx` DB-backed with loading/error/empty states |
| `TASK-502` | Persist `CandidateSession` rows and wire `GET /api/v1/solver/candidates/compare` + `POST /api/v1/solver/publish` to real `OptimizationRun` / `OptimizationCandidate` | `packages/contracts/src/optimization.ts`, `apps/api/src/modules/solver/solver.router.ts`, `apps/web/src/features/candidates/CandidateComparison.tsx` | `TASK-501` | **P1** | `DONE` | `CandidateSession` persisted atomically; `GET /candidates/compare` & `CandidateComparison.tsx` DB-backed; `POST /publish` creates non-destructive `TimetableVersion` + `TimetableSession` + `TimetablePublication` + `AuditLog` |

## Phase 6 — Disruption Repair & Conflict Detection

| ID | Description | Relevant Files | Dependencies | Priority | Status | Acceptance Criteria |
|---|---|---|---|---|---|---|
| `TASK-601` | Implement real DB-backed conflict detection in `GET /api/v1/conflicts/summary` (faculty clashes, room collisions, lab contiguity, load caps) | `conflicts.router.ts`, `ConflictInspector.tsx` | `TASK-502` | **P1** | `PENDING` | Inspector reports actual conflicts from active `TimetableVersion` |
| `TASK-602` | Implement real disruption repair proposal generation (calling optimizer or constraint-aware heuristic) and persist `ScheduleException` on authorize | `repairs.router.ts`, `TimetableRepairCenter.tsx` | `TASK-601` | **P1** | `PENDING` | Proposals reflect real DB schedule; authorizing creates `ScheduleException` + `AuditLog` |

## Phase 7 — Integration of All Application Modules

| ID | Description | Relevant Files | Dependencies | Priority | Status | Acceptance Criteria |
|---|---|---|---|---|---|---|
| `TASK-701` | Wire `HODDashboard` (`/api/v1/hod/dashboard-overview`) and `StudentDashboard` (`/api/v1/students/me/dashboard`) to live Prisma aggregations | `dashboard.router.ts`, `timetables.router.ts` | `TASK-602` | **P1** | `PENDING` | Metrics, room matrix, disruptions, and audit logs come from DB |
| `TASK-702` | Persist `ClassCommunicationCenter` messages to `ChatMessage` and load `ChatSpace` from DB | `communication.router.ts`, `ClassCommunicationCenter.tsx` | `TASK-201` | **P1** | `PENDING` | Messages survive page refresh and broadcast via Socket.IO |
| `TASK-703` | Wire `ExaminationManagement` (`/api/v1/examinations/overview`) to `ExaminationCycle`, `ExaminationEvent`, `ExaminationRoomAllocation` | `examinations.router.ts`, `ExaminationManagement.tsx` | `TASK-201` | **P1** | `PENDING` | Exam sessions and room utilization are queried from PostgreSQL |

## Phase 8 — Authentication, Authorization & Backend Reliability

| ID | Description | Relevant Files | Dependencies | Priority | Status | Acceptance Criteria |
|---|---|---|---|---|---|---|
| `TASK-801` | Build Login UI page/modal using `/api/v1/auth/login` and attach `Authorization: Bearer` header in `apiFetch` | `apps/web/src/lib/api.ts`, `AuthContext.tsx`, `App.tsx` | Phase 7 | **P1** | `PENDING` | Users can sign in with email/password; API receives JWT |
| `TASK-802` | Apply `requireAuth` / `requireRole` middleware to mutating/protected routes (fixing `if (req.user && ...)` bypass) | `apps/api/src/modules/**/*.ts` | `TASK-801` | **P0** | `PENDING` | Unauthenticated requests to protected routes return `401`; unauthorized roles return `403` |

## Phase 9 — Testing, Benchmarking & Evidence

| ID | Description | Relevant Files | Dependencies | Priority | Status | Acceptance Criteria |
|---|---|---|---|---|---|---|
| `TASK-901` | Execute `benchmark_optimizer.py`, `controlled_benchmark.py`, and `test_all_endpoints.ts` and archive results | `scripts/benchmark_optimizer.py`, `scripts/controlled_benchmark.py`, `scripts/test_all_endpoints.ts` | Phase 8 | **P1** | `PENDING` | Reproducible benchmark metrics (runtime, memory, objective, violations) recorded |

## Phase 10 — UI Polish, Deployment & Final Delivery

| ID | Description | Relevant Files | Dependencies | Priority | Status | Acceptance Criteria |
|---|---|---|---|---|---|---|
| `TASK-1001` | Align `vercel.json` / `render.yaml` URLs, verify CORS, mobile UX, and production smoke tests | `vercel.json`, `apps/web/vercel.json`, `render.yaml` | Phase 9 | **P2** | `PENDING` | Live Vercel + Render + Supabase deployment passes end-to-end smoke checks |
