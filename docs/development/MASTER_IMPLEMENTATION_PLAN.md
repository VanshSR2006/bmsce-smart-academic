# CampusFlow — Master Implementation Plan

**Target Completion Date:** 10 December 2026
**Stack:** React 18 + Vite + TS + Tailwind | Node.js + Express + Socket.IO | PostgreSQL + Prisma (50 models) | Python + FastAPI + OR-Tools CP-SAT | Redis (with in-memory fallback)
**Budget:** ₹0 (Free-tier Supabase, Render, Vercel)

---

## Phase Roadmap & Dependencies

| Phase | Name | Goal | Depends On |
|---|---|---|---|
| **Phase 0** | Application Health Audit & Handoff System | Read-only audit of all layers; establish `docs/development/` tracking | — |
| **Phase 1** | Stabilization & Crash Fixes | Fix runtime `TypeError` crashes in `TimetableRepairCenter` & `ConflictInspector`; replace infinite spinners with error/retry states; align API contracts | Phase 0 |
| **Phase 2** | Data Foundation & Synthetic Dataset | Expand `prisma/seed.ts` with multi-section, lab-inclusive, realistic BMSCE CSE synthetic dataset (sections, batches, labs, faculty availability, disruptions, exam cycles) | Phase 1 |
| **Phase 3** | Academic Structure Management | Connect `NepScheme`, `RoomManagement`, `FacultyWorkload`, and academic CRUD APIs to live Prisma tables (remove hardcoded room/NEP/dashboard overrides) | Phase 2 |
| **Phase 4** | CP-SAT Optimization Engine Completion | Implement HC-6 (lab contiguity), HC-7 (faculty unavailability), SC-2/SC-3/SC-4 (consecutive subject, load balance), and optional `sa.py` (Simulated Annealing) | Phase 2 |
| **Phase 5** | Initial & Dynamic Timetable Generation | Wire `SolverStudio` to real DB inputs, persist `CandidateSession` rows, wire `CandidateComparison` to `OptimizationRun`/`OptimizationCandidate`, and support publishing a candidate to `TimetableVersion` | Phase 3, Phase 4 |
| **Phase 6** | Disruption Repair & Conflict Detection | Implement real DB-backed conflict detection (`conflicts.router.ts`) and CP-SAT/heuristic minimal-perturbation repair proposals (`repairs.router.ts`) + `ScheduleException` / version increment on authorization | Phase 5 |
| **Phase 7** | Integration of All Application Modules | Wire `HODDashboard`, `StudentDashboard`, `ClassCommunicationCenter` (DB-persisted `ChatMessage` + Socket.IO), and `ExaminationManagement` (`ExaminationCycle`/`Event`/`RoomAllocation`) to PostgreSQL | Phase 3, Phase 6 |
| **Phase 8** | Authentication, Authorization & Backend Reliability | Build login UI, enforce `requireAuth` / `requireRole` across protected routes, fix inline `if (req.user && ...)` auth bypasses, add input validation & rate-limiting | Phase 7 |
| **Phase 9** | Testing, Benchmarking & Evidence | Run `benchmark_optimizer.py`, `controlled_benchmark.py`, and `test_all_endpoints.ts`; record reproducible solver metrics (CP-SAT vs Greedy vs SA), memory, and HTTP latencies | Phase 4, Phase 8 |
| **Phase 10** | UI Polish, Deployment & Final Delivery | Verify `vercel.json` / `render.yaml` / CORS alignment, mobile responsiveness on all new/updated views, production smoke tests, and final documentation | Phase 9 |
