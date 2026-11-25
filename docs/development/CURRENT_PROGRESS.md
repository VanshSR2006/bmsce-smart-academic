# CampusFlow — Current Development Progress

Project target: 10 December 2026

Current phase: PHASE 2
Phase status: COMPLETE (Awaiting user approval for Phase 3)

Last completed task:
TASK-202B — Make Optimizer Input Relationship-Driven (`apps/api/src/modules/solver/solver.router.ts`).

Currently executing:
None — Phase 2 complete (`TASK-201`, `TASK-202A`, `TASK-202B`). Waiting for user approval before starting Phase 3.

Last verified result:
- `npx tsc --noEmit -p apps/api/tsconfig.json`: PASS (exit 0)
- `npm run build --workspace=apps/api`: PASS (exit 0)
- Disposable SQLite + Python optimizer integration test (`test_solver_202b.ts`): PASS (`ALL_202B_ASSERTIONS_PASSED`, Greedy `FEASIBLE` 84 slots / 0 hard violations, CP-SAT `OPTIMAL` 84 slots / 0 hard violations / obj `0.0`)

Files created or modified in TASK-202B:
- `apps/api/src/modules/solver/solver.router.ts` (modified — added `buildOptimizerPayloadFromDb` and `SolverPayloadError`, removed all-to-all subject/faculty mapping and hardcoded demo fallback, added `MISSING_FACULTY_ASSIGNMENTS` / `EMPTY_SCHEDULING_SCOPE` / `INSUFFICIENT_ROOMS` / `OPTIMIZER_UNAVAILABLE` handling)
- `docs/development/CURRENT_PROGRESS.md` (updated)
- `docs/development/PHASE_LOG.md` (updated)
- `docs/development/TASK_BACKLOG.md` (updated)

Tests executed:
- `npx tsc --noEmit -p apps/api/tsconfig.json; npm run build --workspace=apps/api` -> Exit 0
- Disposable SQLite `prisma db push` + `runSyntheticCseSeed` + `buildOptimizerPayloadFromDb` + Python `run_greedy`/`run_cpsat` (`test_solver_202b.ts`) -> Exit 0 (`ALL_202B_ASSERTIONS_PASSED`)

Known blockers / limitations:
- `buildOptimizerPayloadFromDb` now passes `is_lab`, `lab_duration_hours`, and `unavailable_slots` from DB relationships, **but `cpsat.py` still does not enforce `HC-6` (lab contiguity) or `HC-7` (`unavailable_slots`)** — scheduled for Phase 4 (`TASK-401`, `TASK-402`).
- `GET /api/v1/solver/studio-config` and `GET /api/v1/solver/candidates/compare` in `solver.router.ts` remain hardcoded demo endpoints (scheduled for Phase 5 `TASK-502`).
- `days` defaults to `['MON', 'TUE', 'WED', 'THU', 'FRI']` (working-day calendar derivation is a future enhancement).

Next exact action:
Await user approval to begin Phase 3 (`TASK-301`: Connect `NepScheme` to live `Subject` & `SubjectOffering` Prisma records).

Next phase allowed:
Yes (upon explicit user approval)

Important instructions for the next model:
- Read `docs/development/CURRENT_PROGRESS.md`, `DATA_ARCHITECTURE_READINESS.md`, `PHASE_LOG.md`, and `TASK_BACKLOG.md` first.
- Do not modify `.env` or Supabase.
- Start Phase 3 with `TASK-301` in `TASK_BACKLOG.md`.

Last updated:
2026-11-26 01:41 IST
