# CampusFlow — Data Architecture Readiness & Real-Data Substitution Plan

**Task:** `TASK-201` (Phase 2)
**Date:** 2026-11-26
**Prisma Schema Status:** Valid (`npx prisma validate` PASS — 50 models, no schema modifications required)

---

## 1. Existing Data Model Audit (Phase A)

All core academic entities required for real BMSCE scheduling already exist in `prisma/schema.prisma`:

| Domain | Prisma Models | Key Relationships & Readiness |
|---|---|---|
| **Org & Terms** | `Department`, `Cluster`, `Program`, `AcademicTerm` | Supports multi-department, multi-program, multi-term isolation; `isDemo` flags present on `Department`, `AcademicTerm`, `User`, `Faculty`, `Room`. |
| **Cohorts** | `Section`, `Batch`, `Student` | `Section` unique per `(academicTermId, programId, semesterNumber, sectionCode)`. `Batch` models lab sub-groups (`B1`, `B2`, `B3`). |
| **Curriculum & Eligibility** | `Subject`, `SubjectOffering`, `FacultyAssignment` | `SubjectOffering` links `(subjectId, academicTermId, sectionId, batchId?)` with `requiredPeriodsPerWeek`, `sessionDurationPeriods`, `requiresLab`, `requiresContiguousSlots`. `FacultyAssignment` maps eligible/assigned faculty per offering. |
| **Faculty Constraints** | `Faculty`, `FacultyAvailability`, `FacultyWorkloadRule` | `FacultyAvailability` supports recurring (`dayOfWeek`, `startTime`, `endTime`) and dated (`specificDate`) `UNAVAILABLE`/`PREFERRED` windows. `FacultyWorkloadRule` captures daily/weekly/consecutive caps. |
| **Rooms & Capabilities** | `Room`, `Feature`, `RoomFeature`, `RoomAvailability` | `Room` has `roomCode`, `roomType`, `capacity`, `isDemo`; `RoomFeature` models equipment capabilities; `RoomAvailability` tracks maintenance/blocks. |
| **Timetables** | `Timetable`, `TimetableVersion`, `TimetableSession`, `ScheduleException` | Full versioned lifecycle (`DRAFT` -> `PUBLISHED`, `supersedesVersionId`) and dated exceptions without mutating baseline. |
| **Calendar & Bells** | `AcademicCalendarEvent`, `BellSchedule`, `TimePeriod` | Models `HOLIDAY`/`WORKING_DAY`/`EXAM` and `CLASS`/`BREAK`/`LUNCH` period slots. |

### Assessment: Can Real BMSCE Data Be Imported Without Changing the Schema?
**Yes.** All required academic, resource, constraint, and timetable entities exist with proper foreign keys and unique constraints. Import provenance can be recorded in `AuditLog` (`action = 'INSTITUTIONAL_DATA_IMPORT'`, `scope = JSON(...)`) without altering `prisma/schema.prisma`. (A dedicated `ImportBatch` table is optional for a later phase, not a blocker.)

---

## 2. Hardcoded Assumptions & Source-Coupling Gaps (Phase B)

| Layer | File | Hardcoded / Demo-Coupled Assumption |
|---|---|---|
| **Backend** | `apps/api/src/modules/timetables/timetables.router.ts` | Hardcodes `where: { sectionCode: 'CSE-5B' }` in `/students/me/dashboard` and ignores `:sectionId` in `/sections/:sectionId/timetable`; hardcodes `facultyDirectory`, `loadBreakdown`, `governance`. |
| **Backend** | `apps/api/src/modules/solver/solver.router.ts` | `POST /run` maps **every** `Subject` to **every** `Section` and **every** `Faculty`, ignoring `SubjectOffering`, `FacultyAssignment`, `FacultyAvailability`, `FacultyWorkloadRule`, and `BellSchedule`. |
| **Backend** | `apps/api/src/modules/academics/academics.router.ts` | `/rooms/overview` hardcodes `currentStatus` for `PJ-301`, `PJ-302`, `PJ-304`, `CS-L1`, `CS-L3`; `/nep-scheme/overview` hardcodes all NEP verticals; `/workload/overview` hardcodes `EMP-CSE-017` / `'Malathi'` for proxy eligibility. |
| **Backend** | `dashboard.router.ts`, `conflicts.router.ts`, `repairs.router.ts`, `communication.router.ts`, `examinations.router.ts` | Return hardcoded synthetic JSON payloads. |
| **Optimizer** | `apps/optimizer/solver/models.py` | **Source-independent** (`OptimizeRequest` uses generic IDs, `subject_ids`, `unavailable_slots`, `max_weekly_hours`, `capacity`, `is_lab`). |
| **Optimizer** | `apps/optimizer/solver/cpsat.py` | **HC-6** (lab contiguity) is a `pass` no-op (L164) and **HC-7** (`unavailable_slots`) is not enforced in CP-SAT. |

---

## 3. Safe Synthetic Dataset & Controlled Scenarios (Phase C)

### Deterministic Idempotent Seed (`scripts/seed_synthetic_cse.ts`)
- **Safety:** Refuses Supabase URLs, uses `upsert`/existence checks only (zero `deleteMany`), does not touch `prisma/dev.db` or `.env`.
- **Verified on Disposable SQLite DB (2 consecutive runs — identical counts):**
  - Department: `SYNTH-CSE` (`isDemo: true`), Term: `AY 2025-26 (Synthetic) / Odd Semester`
  - **4 Sections:** `CSE-A`, `CSE-B`, `CSE-C`, `CSE-D` (60 students each) + **12 Lab Batches** (`B1`, `B2`, `B3` per section)
  - **7 Subjects** (5 theory + 2 labs) -> **28 `SubjectOffering` rows**
  - **8 Faculty** -> **28 `FacultyAssignment` rows**, **8 `FacultyWorkloadRule` rows**, **2 `FacultyAvailability` (`UNAVAILABLE`) rows**
  - **8 Rooms** (5 classrooms @ 70 cap + 3 labs @ 35–65 cap)
  - **9 `TimePeriod` rows** (7 class periods + tea/lunch breaks) and **3 `AcademicCalendarEvent` rows**

### Optimizer Validation Results (`scripts/synthetic_scenarios.py`, Executed)

| # | Scenario | Greedy Result | CP-SAT Result | Finding |
|---|---|---|---|---|
| 1 | `1_feasible_4sec` (4 sections, 7 subj, 8 fac, 7 rooms) | `FEASIBLE` (hard=0, soft=5, slots=84, 0.00s) | `OPTIMAL` (hard=0, obj=0.0, slots=84, 13.27s) | Multi-section schedule solves cleanly |
| 2 | `2_faculty_clash` (1 faculty, 44h > 35 slots) | `PARTIAL` (hard=3, slots=35) | `INFEASIBLE` (hard=1, obj=9999.0, 1.18s) | Contention correctly detected |
| 3 | `3_room_clash` (1 room, 44h > 35 slots) | `PARTIAL` (hard=3, slots=35) | `INFEASIBLE` (hard=1, obj=9999.0, 0.73s) | Room contention correctly detected |
| 4 | `4_unavailable_faculty` (all 35 slots blocked) | `FEASIBLE` (soft=4, slots=4) | `OPTIMAL` (hard=0, slots=4, 0.01s) | **GAP:** CP-SAT ignores `unavailable_slots` (HC-7 missing); Greedy falls back to overload loop |
| 5 | `5_invalid_lab` (3h contiguous lab, `periods_per_day=2`) | `PARTIAL` (hard=1, slots=0) | `OPTIMAL` (hard=0, slots=3, 0.02s) | **GAP:** CP-SAT HC-6 is `pass`, so it split a 3h lab across 2-period days |
| 6 | `6_workload_violation` (cap=4h, required=12h) | `PARTIAL` (hard=2, slots=4) | `INFEASIBLE` (hard=1, obj=9999.0, 0.02s) | Workload cap enforced by CP-SAT |
| 7 | `7_incremental_4sec` (3 base + 1 added section) | `FEASIBLE` (hard=0, soft=5, slots=84) | `OPTIMAL` (hard=0, obj=0.0, slots=84, 12.49s) | Adding 4th section remains feasible |

---

## 4. Real-Data Substitution & Import Pipeline Design (Phase D)

Future real BMSCE data (CSV / Excel / JSON) will flow through the same pipeline as synthetic data:

1. **Upload & Parse:** Accept `.csv`, `.xlsx`, or `.json` per entity domain (`departments_terms`, `sections_batches`, `subjects_offerings`, `faculty_assignments`, `rooms`, `availability_rules`).
2. **Column Mapping:** Map institutional column headers (e.g., `Course Code` -> `subjectCode`, `Emp ID` -> `employeeCode`, `Section` -> `sectionCode`) using a declarative mapping object.
3. **Normalize & Validate (Zod):** Trim strings, normalize codes uppercase, validate numeric bounds (`capacity > 0`, `requiredPeriodsPerWeek > 0`, valid `HH:MM` times), and resolve natural-key foreign references (`departmentCode`, `academicTerm`, `sectionCode`, `subjectCode`, `employeeCode`).
4. **Dry-Run Preview & Error Report:** Detect duplicate natural keys and missing FK references; return `{ validRows, duplicateRows, invalidRows: [{ rowNumber, field, reason }] }` without writing to DB.
5. **Confirm & Transactional Persist:** Wrap `prisma.$transaction(...)` upserts with `isDemo: false` and record an `AuditLog` entry (`action: 'INSTITUTIONAL_DATA_IMPORT'`, row counts, actor, timestamp).

### Remaining Work Before Real Data Import
1. **`TASK-202`:** Decouple `timetables.router.ts` and `solver.router.ts` from `'CSE-5B'` and all-to-all subject/faculty assumptions (use `SubjectOffering`, `FacultyAssignment`, `FacultyAvailability`, `FacultyWorkloadRule`, `BellSchedule`).
2. **Phase 4 (`TASK-401`, `TASK-402`):** Implement `HC-6` (lab contiguity) and `HC-7` (`unavailable_slots`) in `apps/optimizer/solver/cpsat.py` (proven necessary by Scenarios 4 and 5 above).
3. **Import Service & UI (Future Phase):** Implement the Zod-validated dry-run + transactional upsert importer.
