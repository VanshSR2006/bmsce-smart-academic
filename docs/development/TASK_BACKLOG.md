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
| `TASK-201` | Expand `prisma/seed.ts` with multi-section CSE dataset (sections, labs, faculty availability, disruptions, exam cycles, chat spaces) | `prisma/seed.ts` | Phase 1 | **P1** | `PENDING` | Deterministic seed populates realistic multi-section + lab dataset in local DB |

## Phase 3 — Academic Structure Management

| ID | Description | Relevant Files | Dependencies | Priority | Status | Acceptance Criteria |
|---|---|---|---|---|---|---|
| `TASK-301` | Connect `NepScheme` (`/api/v1/nep-scheme/overview`) to live `Subject` & `SubjectOffering` Prisma records | `academics.router.ts`, `NepScheme.tsx` | `TASK-201` | **P1** | `PENDING` | NEP verticals and course credits derive from PostgreSQL records |
| `TASK-302` | Remove hardcoded `currentStatus` overrides in `/api/v1/rooms/overview` and compute from `TimetableSession` / `RoomAvailability` | `academics.router.ts` | `TASK-201` | **P1** | `PENDING` | Room status reflects actual DB state |

## Phase 4 — CP-SAT Optimization Engine Completion

| ID | Description | Relevant Files | Dependencies | Priority | Status | Acceptance Criteria |
|---|---|---|---|---|---|---|
| `TASK-401` | Implement **HC-6** (Lab contiguity) in `cpsat.py` replacing `pass` no-op | `apps/optimizer/solver/cpsat.py` | Phase 2 | **P0** | `PENDING` | Lab subjects with `lab_duration_hours >= 2` are strictly scheduled in contiguous periods on the same day |
| `TASK-402` | Implement **HC-7** (Faculty `unavailable_slots`) in `cpsat.py` | `apps/optimizer/solver/cpsat.py` | `TASK-401` | **P0** | `PENDING` | CP-SAT never assigns faculty to slots in `unavailable_slots` |
| `TASK-403` | Implement **SC-3** (consecutive same subject) and **SC-4** (faculty load balance) in `cpsat.py` objective | `apps/optimizer/solver/cpsat.py` | `TASK-401` | **P2** | `PENDING` | Objective penalizes consecutive identical theory subjects and load imbalance |
| `TASK-404` | Implement Simulated Annealing (`sa.py`) and wire into `main.py` | `apps/optimizer/solver/sa.py`, `apps/optimizer/main.py` | `TASK-401` | **P2** | `PENDING` | `POST /optimize` returns Greedy, CP-SAT, and SA candidates for comparison |

## Phase 5 — Initial & Dynamic Timetable Generation

| ID | Description | Relevant Files | Dependencies | Priority | Status | Acceptance Criteria |
|---|---|---|---|---|---|---|
| `TASK-501` | Fix `solver.router.ts` `/run` payload builder to use `SubjectOffering`, `FacultyAssignment`, `FacultyAvailability`, and `BellSchedule` from DB | `apps/api/src/modules/solver/solver.router.ts` | `TASK-401`, `TASK-402` | **P0** | `PENDING` | Optimizer receives accurate section-subject-faculty mappings and constraints |
| `TASK-502` | Persist `CandidateSession` rows and wire `GET /api/v1/solver/candidates/compare` + `POST /publish` to real `OptimizationRun` / `OptimizationCandidate` | `solver.router.ts`, `CandidateComparison.tsx` | `TASK-501` | **P1** | `PENDING` | CandidateComparison displays real solver candidates and can publish one to `TimetableVersion` |

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
