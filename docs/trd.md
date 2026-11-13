# Technical Requirements Document (TRD)
## BMSCE Smart Academic Management & Timetable System

**Version:** 1.0  
**Status:** Proposed technical baseline  
**Architecture:** Modular monolith API + separate Python optimization service  
**Initial mode:** Synthetic data and demo authentication

## 1. Technical overview

The system contains:
1. React web frontend for students, faculty, CRs, and academic administrators.
2. Node.js API for identity, authorization, academic data, timetable governance, communication, examinations, and audit.
3. PostgreSQL as the canonical source of truth.
4. Python optimization service for timetable generation and repair.
5. Redis/BullMQ for long-running jobs and optional caching.
6. Socket.IO for chat and live notifications.

The optimizer never publishes timetables or bypasses backend authorization. It receives validated input and returns candidates/diagnostics. The backend persists drafts after independent validation.

## 2. Recommended stack

| Layer | Technology | Responsibility |
|---|---|---|
| Frontend | React + TypeScript + Vite | Web application |
| UI | Tailwind CSS + Shadcn UI | Design system |
| Routing | React Router | Navigation |
| Server state | TanStack Query | API state/cache |
| Forms | React Hook Form + Zod | Forms and validation |
| Tables | TanStack Table | Admin tables |
| Charts | Recharts or equivalent | Metrics |
| Backend | Node.js + TypeScript + Express | REST API |
| ORM | Prisma | Data access/migrations |
| Database | PostgreSQL | Canonical data |
| Optimizer | Python + OR-Tools CP-SAT | Constraint optimization |
| Queue | Redis + BullMQ | Background jobs |
| Realtime | Socket.IO | Chat/status updates |
| Testing | Vitest/Jest, Supertest, Playwright, pytest | Unit/API/E2E/solver tests |
| Deployment | Docker + CI/CD | Reproducible delivery |

Use a modular monolith for the API initially. Keep the optimizer as a separate process because of its runtime and computational needs. Avoid premature microservices.

## 3. Monorepo structure

```text
bmsce-smart-academic/
├── apps/
│   ├── web/                  # React frontend
│   │   └── src/
│   │       ├── app/
│   │       ├── components/
│   │       ├── features/
│   │       │   ├── auth/
│   │       │   ├── dashboard/
│   │       │   ├── timetable/
│   │       │   ├── solver/
│   │       │   ├── candidates/
│   │       │   ├── conflicts/
│   │       │   ├── repairs/
│   │       │   ├── communication/
│   │       │   └── examinations/
│   │       ├── hooks/
│   │       ├── lib/
│   │       ├── routes/
│   │       └── styles/
│   ├── api/                  # Express backend
│   │   └── src/
│   │       ├── config/
│   │       ├── middleware/
│   │       ├── modules/
│   │       │   ├── auth/
│   │       │   ├── users/
│   │       │   ├── academics/
│   │       │   ├── resources/
│   │       │   ├── timetables/
│   │       │   ├── optimization/
│   │       │   ├── conflicts/
│   │       │   ├── disruptions/
│   │       │   ├── communication/
│   │       │   ├── examinations/
│   │       │   ├── notifications/
│   │       │   └── audit/
│   │       ├── jobs/
│   │       ├── realtime/
│   │       └── server.ts
│   └── optimizer/            # Python service
│       ├── app/
│       │   ├── api/
│       │   ├── domain/
│       │   ├── models/
│       │   ├── solvers/
│       │   │   ├── greedy.py
│       │   │   ├── cpsat.py
│       │   │   └── repair.py
│       │   ├── validation/
│       │   ├── metrics/
│       │   └── main.py
│       ├── tests/
│       └── requirements.txt
├── packages/
│   ├── contracts/
│   └── config/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── docs/
├── design/
├── scripts/
├── infra/
│   └── compose.yaml
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

Choose one workspace manager (npm workspaces or pnpm) and use it consistently.

## 4. Architecture and data flow

```text
Browser -> React App -> Express API -> PostgreSQL
                         |
                         +-> Redis/BullMQ -> Python Optimizer
                         |                     |
                         |                     v
                         |              Candidate + diagnostics
                         |                     |
                         <--- persist draft + independent validation
                         |
                         +-> approval/publication transaction
                         |
                         +-> Socket.IO notifications
```

**Frontend:** renders approved Stitch designs, collects input, displays API results. It is not an authorization boundary and does not calculate authoritative solver metrics.

**Backend:** owns authorization, business rules, transactions, persistence, approval, publication, notifications, and audit.

**Optimizer:** accepts a versioned validated payload; returns candidate sessions, solver status, objective metrics, and diagnostics. It has no production DB credentials and cannot publish.

**Database:** canonical source for academic structure, resources, schedules, versions, exceptions, communication, and exams.

## 5. Backend module responsibilities

- **Auth/users:** demo sign-in, future OIDC, sessions, role and scope assignments.
- **Academics:** terms, departments, clusters, programs, sections, batches, subjects, offerings, faculty assignments, calendar.
- **Resources:** faculty availability/workload, rooms/labs/features/availability.
- **Timetables:** drafts, candidate import, versions, approval, publication, timetable queries, exceptions.
- **Optimization:** preflight validation, job dispatch/status, candidate persistence, metrics.
- **Conflicts:** independent validation, explanations, filters, reports.
- **Disruptions:** unavailability, affected sessions, repair proposals, impact, approval, dated exceptions.
- **Communication:** class occurrence chat, announcements, memberships, lifecycle, faculty–CR requests.
- **Examinations:** CIE/SEE events, room allocation, validation, approval, publication.
- **Notifications/audit:** in-app/realtime notifications and append-only privileged action records.

## 6. API conventions

Base path: `/api/v1`. Use JSON, schema validation, pagination, consistent error responses, and authorization on every protected endpoint.

Suggested endpoint groups:

**Auth**
- `POST /auth/demo-login`
- `POST /auth/logout`
- `GET /auth/me`
- Future OIDC routes.

**Academic configuration**
- `GET/POST /academic-terms`
- `GET/POST /departments`
- `GET/POST /sections`
- `GET/POST /batches`
- `GET/POST /subjects`
- `GET/POST /faculty-assignments`
- `GET/POST /academic-calendar`

**Resources**
- `GET/POST /faculty`
- `GET/POST /faculty-availability`
- `GET/POST /rooms`
- `GET/POST /room-availability`

**Timetables**
- `POST /timetables/drafts`
- `GET /timetables`
- `GET /timetables/:id`
- `GET /timetables/:id/sessions`
- `POST /timetables/:id/validate`
- `POST /timetables/:id/submit`
- `POST /timetables/:id/approve`
- `POST /timetables/:id/publish`
- `GET /sections/:sectionId/timetable`
- `GET /faculty/:facultyId/timetable`

**Optimization**
- `POST /optimization-runs`
- `GET /optimization-runs/:runId`
- `GET /optimization-runs/:runId/candidates`
- `GET /candidates/:candidateId`
- `POST /candidates/:candidateId/validate`
- `POST /candidates/:candidateId/submit`

**Conflicts/repairs**
- `GET /conflicts`
- `GET /conflicts/:conflictId`
- `POST /disruptions`
- `GET /disruptions/:id`
- `POST /disruptions/:id/repair-runs`
- `GET /repair-proposals/:id`
- `POST /repair-proposals/:id/approve`
- `POST /repair-proposals/:id/reject`

**Communication**
- `GET /class-sessions/:sessionId/chat`
- `POST /class-sessions/:sessionId/messages`
- `POST /class-sessions/:sessionId/announcements`
- `POST /faculty-cr-requests`
- `GET /notifications`

**Examinations**
- `GET/POST /examination-cycles`
- `GET/POST /examinations`
- `POST /examination-cycles/:id/validate`
- `POST /examination-cycles/:id/publish`
- `GET /sections/:sectionId/examinations`

Example error:

```json
{
  "error": {
    "code": "TIMETABLE_VALIDATION_FAILED",
    "message": "Candidate contains hard constraint violations.",
    "details": [
      {
        "code": "FACULTY_OVERLAP",
        "entityId": "demo-session-101",
        "message": "Faculty member has overlapping sessions."
      }
    ],
    "requestId": "req_demo_123"
  }
}
```

Never expose stack traces or sensitive data.

## 7. Optimization engine

### Input contract
Versioned JSON containing:
- Term/date range, working days, holidays.
- Bell schedule and breaks.
- Sections/batches.
- Subject offerings and required periods.
- Faculty assignments and availability.
- Rooms/labs, capacities, features, availability.
- Lab duration/continuity rules.
- Hard constraints and soft weights.
- Algorithm, parameters, timeout, random seed.

### Greedy baseline
1. Expand weekly requirements into scheduling units.
2. Order most-constrained units first (labs, scarce rooms, restricted faculty, large cohorts).
3. Enumerate feasible slots/resources.
4. Select a feasible assignment using a documented heuristic score.
5. Track unscheduled demand and reasons.
6. Run independent validation.

Greedy may fail even when a feasible solution exists; report that accurately.

### CP-SAT
Use Boolean assignment variables for feasible combinations of session, time slot, room, and eligible faculty where relevant.

Hard constraints:
- Faculty, room, and cohort non-overlap.
- Capacity and room feature requirements.
- Faculty and room availability.
- Required sessions or explicit unscheduled slack.
- Lab continuity/duration.
- Calendar and break restrictions.

Soft objective:
- Consecutive teaching penalty.
- Workload imbalance.
- Student idle gaps.
- Unpreferred periods.
- Excessive room changes.
- Subject distribution.

Use documented integer-scaled weights where needed.

### Solver status
Distinguish:
- `OPTIMAL`: optimal for encoded model/objective.
- `FEASIBLE`: feasible solution found, optimality not proven.
- `INFEASIBLE`: proven infeasible.
- `UNKNOWN`: no definitive result.
- `MODEL_INVALID`: model construction/validation issue.

A timeout is not proof of infeasibility.

### Independent validator
Independently check faculty/room/section overlaps, capacity, features, availability, calendar/break rules, lab constraints, required session counts, and all configured hard constraints.

Only candidates with zero hard violations can become approvable.

### Repair
Optimize for minimum disruption while restoring feasibility:
- Minimize changed sessions and affected cohorts.
- Minimize room changes.
- Minimize workload imbalance.
- Preserve unaffected assignments.
- Enforce all hard constraints.

A repair is a proposal, never an automatic publication.

### Experiment fairness
Use identical inputs, recorded seeds, hardware/software versions, solver settings, time limits, and repeated runs for stochastic algorithms. Report runtime distributions and feasibility separately from quality.

## 8. Background jobs and realtime

Job states:
`QUEUED`, `VALIDATING_INPUT`, `RUNNING`, `PERSISTING_RESULTS`, `COMPLETED`, `FAILED`, `CANCELLED`, `TIMED_OUT`.

Persist status, timestamps, progress, and failure reason. Use unique job IDs, idempotent handlers where possible, bounded retries, and resource/time limits. Do not retry deterministic infeasibility or invalid input.

Socket.IO can deliver chat messages, announcements, optimization progress, repair updates, and publication notifications. Authorize every socket subscription and event. Persist state through APIs/database; realtime events are not the source of truth.

## 9. Database and integrity

- PostgreSQL is the system of record.
- Prisma migrations are version-controlled.
- Use foreign keys, unique constraints, and transactions.
- Published timetable versions are immutable.
- Use optimistic concurrency/version checks for draft edits.
- Store timestamps in UTC; use `Asia/Kolkata` for BMSCE display.
- Model recurring weekly slots separately from dated occurrences/exceptions.
- Index common timetable/resource/communication queries.
- Store snapshots/metrics as JSONB only when appropriate.

See `database-schema.md`.

## 10. Security and privacy

- Use approved institutional OIDC for production if available.
- Keep demo auth separate from production auth.
- Enforce RBAC and resource scope on the server.
- Secure cookies/session handling; CSRF protection for cookie auth.
- Protect against injection, XSS, CSRF, IDOR, and mass assignment.
- Rate-limit sensitive endpoints.
- Restrict uploads by type, size, scanning policy, and access control.
- Keep secrets out of Git and client bundles.
- Redact tokens and sensitive content from logs.
- Audit role changes, configuration, approvals, publications, and imports.
- Define chat/attachment retention.
- Use synthetic data in development and mentor demos.

## 11. Testing strategy

**Frontend:** component states, role navigation, permissions, responsive timetable, E2E student/head/repair/exam workflows.

**Backend:** domain rules, API integration, authorization, transaction/concurrency, publication immutability, audit.

**Optimizer:** each hard constraint, deterministic fixtures, infeasibility, lab continuity, capacity, availability, regression and benchmark tests.

**End-to-end scenarios:**
1. Generate feasible synthetic timetable.
2. Inject faculty and room clashes; validator detects them.
3. Attempt to publish invalid candidate; request is rejected.
4. Publish valid candidate; immutable version is created.
5. Submit faculty unavailability; repair proposals are generated.
6. Approve valid repair; dated exception/history is created.
7. Student view reflects approved exception.
8. Authorized faculty posts announcement; unauthorized user is denied.
9. Examination schedule is validated and published.

## 12. Observability and deployment

- Structured logs with request/job IDs.
- Error monitoring and health/readiness endpoints.
- Database backup/restore procedures.
- Queue depth, job duration, optimizer CPU/memory monitoring.
- Audit retention and migration/rollback procedures.

**Development:** Docker Compose for PostgreSQL/Redis; local frontend/API/optimizer; synthetic seed scripts.

**Staging/demo:** isolated database/secrets, seeded demo dataset, demo accounts, visible demo banner; no real institutional data without authorization.

**Production:** approved hosting/security review, TLS, managed database/backups, restricted network access, secret manager, monitoring, recovery/release documentation.

## 13. Guardrails for Antigravity/AI coding tools

1. Read PRD, TRD, schema, and approved Stitch references before coding.
2. Do not invent institutional policies or real people/data.
3. Do not replace approved designs with generic dashboards.
4. Implement one module at a time.
5. Keep TypeScript strict; avoid unjustified `any`.
6. Do not fake successful API responses in production paths.
7. Isolate mock/demo data behind a clear adapter.
8. Frontend state is never an authorization boundary.
9. Optimizer output cannot publish without independent validation and approval.
10. Run tests, type checks, lint, and build after meaningful changes.
11. Schema changes require migrations.
12. Record important decisions in `architecture-decisions.md`.

---
**End of TRD**
