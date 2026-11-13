# Product Requirements Document (PRD)
## BMSCE Smart Academic Management & Timetable System

**Version:** 1.0  
**Status:** Product baseline  
**Institutional context:** BMS College of Engineering (BMSCE), Bengaluru  
**Initial data mode:** Synthetic/demo data only

## 1. Product summary

BMSCE Smart Academic is a centralized academic operations platform for configuring, generating, publishing, maintaining, and communicating academic schedules.

Its core differentiator is an optimization-backed timetable workflow: authorized academic heads configure academic resources and constraints, generate candidate schedules, compare their quality, diagnose conflicts, and safely repair schedules when disruptions occur. Students, faculty, and class representatives receive role-appropriate timetable and communication experiences.

### Vision
Make academic scheduling more reliable, explainable, adaptable, and accessible through one platform.

### Primary outcomes
- Generate feasible timetables from configurable academic data.
- Reduce manual scheduling effort and prevent faculty, room, section, and lab clashes.
- Compare scheduling algorithms using reproducible metrics.
- Explain infeasibility and schedule trade-offs.
- Repair disruptions without silently overwriting published schedules.
- Centralize class information, announcements, and examination schedules.
- Demonstrate the complete product without access to actual BMSCE systems or records.

## 2. Goals and non-goals

### Goals
1. Provide a canonical academic data model for terms, departments, sections, batches, subjects, faculty, rooms, and calendars.
2. Support timetable generation using a Greedy baseline and an optimization approach such as OR-Tools CP-SAT.
3. Enforce hard constraints and optimize configurable soft preferences.
4. Independently validate every candidate before approval.
5. Support draft, review, approval, publication, version history, and dated exceptions.
6. Support faculty unavailability and conflict-aware timetable repair.
7. Provide student, faculty, CR, and department/cluster head experiences.
8. Support class-session communication and CIE/SEE examination schedules.
9. Measure algorithm quality, runtime, and repair performance.

### Non-goals for MVP
- Replacing BMSCE ERP, attendance, marks, fees, admissions, or student information systems.
- Calculating official attendance, GPA, grades, or academic eligibility.
- Integrating with actual institutional systems before authorization and technical access are granted.
- Automatically publishing optimizer output without human approval.
- Adding AI/ML where deterministic rules or optimization are more appropriate.
- Payroll, leave management, transport, hostel, or general-purpose LMS functionality.

## 3. Users and permissions

### Department/Cluster Head
- Configure academic terms, calendars, sections, batches, subjects, faculty assignments, rooms, and constraints within their scope.
- Generate timetables and inspect solver status.
- Compare candidates and validation reports.
- Edit drafts, submit for approval, and publish when authorized.
- Create, approve, reject, and publish repair proposals.
- Create and publish CIE/SEE schedules.
- View audit history and operational analytics.

### Faculty
- View their timetable, classes, rooms, and announcements.
- Submit unavailability or disruption requests.
- Review relevant substitute/repair proposals.
- Post announcements and important instructions for assigned classes.
- Communicate with assigned CRs.
- View workload calculated from application schedule data.

Faculty cannot directly edit a published timetable.

### Class Representative (CR)
- View the section timetable.
- Communicate with faculty for class coordination.
- Raise schedule issues and requests.
- Coordinate academic announcements.
- View relevant class communication and changes.

CRs cannot approve or publish timetable changes.

### Student
- View section and batch timetables.
- View subject, faculty, room, and lab details.
- View published CIE/SEE schedules and venues.
- View academic calendar items and announcements.
- View class-session messages and highlighted instructions.
- Receive relevant schedule-change notifications.

### Platform Administrator
May manage platform configuration and accounts. Platform administration must not automatically confer academic approval authority.

All access is role-based and scoped by department, cluster, section, or resource. Authorization must be enforced server-side.

## 4. Core modules and requirements

### 4.1 Authentication
- Target production login: approved institutional SSO/OIDC, subject to BMSCE authorization and availability.
- Initial development: local demo authentication with clearly identified synthetic accounts.
- Email-domain checks alone are not proof of identity.
- Server-side RBAC and resource-scope checks on every protected operation.
- Audit privileged actions.

### 4.2 Academic configuration
Support configuration of:
- Academic year, semester, date range, working days, holidays, exceptional working days.
- Departments, clusters, programs, sections, and batches.
- Subjects, subject types, credits, and required weekly periods.
- Faculty assignments, qualifications/eligibility, availability, and workload limits.
- Classrooms, laboratories, capacity, equipment/features, and availability.
- Bell schedules, periods, breaks, and lunch.
- Lab duration, continuity, and batch-division requirements.
- Hard constraints and soft preferences.

Unconfirmed BMSCE rules must remain configurable and be labeled as demo assumptions.

### 4.3 Timetable generation workflow
1. Select academic term and scope.
2. Select sections and batches.
3. Configure subjects and required sessions.
4. Configure faculty assignments and availability.
5. Configure rooms and labs.
6. Configure calendar, bell schedule, and constraints.
7. Run input consistency checks.
8. Submit an asynchronous solver job.
9. Generate one or more candidates.
10. Independently validate candidates.
11. Compare candidates and select one for review.
12. Submit for approval and publish only after authorization.

Persist solver inputs, algorithm/configuration version, run status, runtime, objective metrics, and validation results.

### 4.4 Scheduling constraints

**Hard constraints** (must not be violated by a candidate marked feasible):
- No overlapping sessions for a faculty member.
- No overlapping sessions for a room.
- No overlapping sessions for a section or batch.
- Room capacity and required features must satisfy the cohort/session.
- Faculty must be eligible/assigned for the session according to configured data.
- Labs must meet configured duration and continuity rules.
- Sessions must be within valid working periods and not overlap holidays/breaks.
- Required weekly sessions must be scheduled or explicitly reported as unscheduled.

**Soft constraints** (configurable objective penalties/preferences):
- Minimize excessive consecutive teaching.
- Balance faculty workload across days.
- Reduce undesirable student free periods.
- Distribute repeated subjects across the week.
- Prefer suitable rooms/labs.
- Reduce room changes for a section.
- Respect faculty preferred slots where feasible.
- Avoid undesirable first/last-period patterns.

Show hard feasibility separately from soft score. A high soft score never compensates for a hard violation.

### 4.5 Algorithms and candidate comparison
Support:
- Greedy baseline.
- Constraint Programming with OR-Tools CP-SAT.
- Optional LNS or Simulated Annealing experiments if justified.

Compare:
- Hard constraint violations.
- Soft penalty/score.
- Unscheduled sessions.
- Runtime.
- Faculty workload distribution.
- Room/lab utilization.
- Student free periods.
- Consecutive teaching periods.
- Number of changes required after simulated disruption.

Use the same input data and documented evaluation settings for fair comparison. Compute metrics from actual solver output; do not hardcode benchmark values in the UI.

### 4.6 Conflict Inspector
- Separate hard violations from soft warnings.
- Filter by faculty, room, section, batch, lab, date, and severity.
- Explain each conflict and identify affected sessions/resources.
- Show overlapping timetable entries.
- Link to relevant repair/draft workflows.
- Re-run validation after changes.
- Preserve reports for each timetable version.

### 4.7 Timetable modification and repair
Published timetables must never be silently overwritten.

Workflow:
1. Record disruption and affected session(s).
2. Identify eligible substitute faculty, alternate slots, and rooms.
3. Generate repair proposals.
4. Independently validate each proposal.
5. Show impact on faculty, students, rooms, and other sessions.
6. Submit for authorized approval.
7. On approval, create a dated schedule exception or new timetable version.
8. Notify affected users.
9. Preserve original schedule, decision, approver, and history.

Possible strategies: substitute faculty, alternate slot, alternate room, or permitted free period. A free period is allowed only if the relevant policy permits it.

### 4.8 Timetable views
- Weekly section and batch timetable.
- Faculty timetable.
- Daily schedule and next class.
- Subject, faculty, room, and lab details.
- Date-specific schedule exceptions.
- Academic calendar and holidays.
- Published examination schedules.

Views must distinguish the base published timetable from dated exceptions.

### 4.9 Class-session communication
- Each chat belongs to a specific scheduled class occurrence, not merely a subject.
- Faculty and assigned CR are primary participants.
- Student read/reply permissions are configurable.
- Faculty can post announcements, assignments, and important messages.
- Important messages remain discoverable after chat closure.
- Lifecycle: Upcoming, Open, Closed.
- Closed chats become read-only according to configured rules.
- Retention and attachment policies are configurable.
- Access is limited to authorized participants.

### 4.10 Faculty–CR communication
Support class-related requests, schedule issues, announcements, request status/history, and notifications within authorized scope.

### 4.11 Examination management
Support CIE/internal and SEE schedules with:
- Date, time, duration, subject, section/batch, venue, room, and instructions.
- Room capacity and overlap validation.
- Draft, review, approval, publication, and version history.
- Student/faculty read views.
- Notifications when published schedules change.

## 5. Key user journeys

**Generate and publish:** Head configures data → input validation → optimizer runs → independent candidate validation → comparison → approval → publication → notifications.

**Faculty unavailability:** Faculty submits request → head reviews → affected sessions identified → repair proposals generated → validation → approval/rejection → dated exception published → notifications.

**Student timetable:** Student signs in → authorized section/batch resolved → weekly timetable loaded → published base timetable combined with applicable date exceptions.

**Class announcement:** Faculty opens assigned class occurrence → posts announcement → server checks permissions → eligible participants see it and receive notifications.

**Examination publication:** Head creates events → room/section conflict checks → approval → versioned publication → notifications.

## 6. Functional requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-001 | Demo authentication and RBAC | Must |
| FR-002 | Manage academic structure and resources | Must |
| FR-003 | Configure calendar, periods, constraints, preferences | Must |
| FR-004 | Greedy baseline generation | Must |
| FR-005 | CP-SAT generation asynchronously | Must |
| FR-006 | Independent candidate validation | Must |
| FR-007 | Candidate comparison and timetable preview | Must |
| FR-008 | Draft/review/approve/publish/version timetables | Must |
| FR-009 | Conflict detection and explanation | Must |
| FR-010 | Disruption repair proposals and validation | Must |
| FR-011 | Immutable published versions and dated exceptions | Must |
| FR-012 | Student/faculty/CR/head timetable views | Must |
| FR-013 | Class announcements and communication | Should |
| FR-014 | CIE/SEE management | Should |
| FR-015 | Notifications and audit logs | Should |
| FR-016 | CSV/Excel import with validation | Should |
| FR-017 | Institutional SSO when authorized | Later |
| FR-018 | Reproducible algorithm evaluation | Should |

## 7. Non-functional requirements

**Security/privacy**
- Server-side RBAC and resource-level authorization.
- Least privilege; separate platform and academic privileges.
- Secrets outside source control.
- Secure sessions/tokens and password hashing if local passwords exist.
- Input validation, rate limits, upload restrictions, and audit logs.
- Do not use real personal data in demos without authorization.

**Reliability/integrity**
- Transactions for approval/publication.
- Optimistic locking for concurrent draft edits.
- Published versions immutable.
- Solver jobs have explicit states, retries, timeouts, and failure reasons.
- Publication requires successful independent validation.

**Performance targets (initial, to be load-tested)**
- Typical dashboard/timetable API reads: p95 under 500 ms, excluding network latency/cold starts.
- Long solver tasks run asynchronously and expose status.
- UI remains usable during solver execution.

**Usability**
- Responsive desktop/tablet/mobile.
- Keyboard access and visible focus.
- Status not communicated by color alone.
- Mobile timetable has a day/list view rather than a shrunken desktop grid.
- Clear loading, empty, error, and success states.

## 8. Synthetic-first data strategy

The first release must be demonstrable without real BMSCE data.

Create fictional terms, departments, sections, batches, subjects, faculty, rooms, calendars, availability, timetables, disruptions, chats, and examinations.

Data-source independence:
CSV/Excel, manual entry, or future authorized API → validation/normalization → canonical academic model → optimizer and application APIs.

Safeguards:
- Visible “Demo Data” labels.
- Never present synthetic records as official BMSCE data.
- Do not invent official faculty details, policies, dates, or statistics.
- Provide deterministic seed scripts and demo reset.
- Keep demo authentication separate from production authentication.

## 9. Success and research metrics

Product:
- Candidate hard-feasibility rate.
- Unscheduled sessions.
- Time to feasible timetable.
- Manual edits before publication.
- Repair time and repair validation rate.
- Notification delivery success.
- Usability/task completion feedback.

Research:
- Feasibility rate, objective penalty, runtime distribution, memory use.
- Faculty workload variance.
- Room utilization.
- Student free-period penalty.
- Consecutive-teaching penalty.
- Repair success and number of changed sessions.

Record dataset size, random seeds, hardware, software/solver versions, parameters, and time limits. Do not claim one algorithm is universally superior.

## 10. Delivery phases

1. **Discovery:** confirm academic concepts and policies; define synthetic data and constraints.
2. **Foundation:** repo, design system, API skeleton, schema/migrations, demo auth, seeds.
3. **Academic configuration:** terms, sections, batches, subjects, faculty, rooms, calendar, availability.
4. **Optimization:** Greedy, CP-SAT, independent validator, candidates, metrics.
5. **Governance:** Solver Studio, comparison, editor, Conflict Inspector, approval, publication, versioning.
6. **Repair:** unavailability, proposals, validation, approval, exceptions, notifications.
7. **Communication/exams:** class chat, faculty–CR requests, CIE/SEE.
8. **Hardening:** security, performance, accessibility, evaluation, deployment.

## 11. MVP acceptance criteria

- Demo head configures a synthetic term and resources.
- Greedy and CP-SAT generate candidates.
- Validator detects deliberately injected faculty, room, section, and lab conflicts.
- Invalid candidates cannot be approved/published.
- Feasible candidates can be compared using computed metrics.
- Valid candidate can be published as an immutable version.
- Simulated faculty absence generates repair alternatives.
- Repair is revalidated and requires authorized approval.
- Student view reflects published timetable and dated exceptions.
- Authorized faculty can post class announcements.
- Examination schedule can be validated and published.
- Entire demo works without external institutional integrations.

## 12. Open questions for BMSCE stakeholders

Do not assume answers:
- Official department/cluster/section hierarchy?
- Batch and lab-division conventions?
- Working days, period timings, break rules?
- Subject-hour and lab-duration conventions?
- Faculty workload and eligibility rules?
- Are faculty preferences considered?
- Room/lab inventory and required attributes?
- Who creates, reviews, approves, and publishes?
- Permitted faculty substitution process?
- Can a disrupted class become a free period?
- CIE/SEE scheduling and room rules?
- Approved SSO provider?
- Chat/attachment retention rules?
- Approved notification channels?
- Authoritative academic data source, or manual maintenance?

---
**End of PRD**
