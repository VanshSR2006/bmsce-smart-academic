# CampusFlow — BMSCE Academic Management Portal

> **Independent Academic Engineering Project**  
> **Synthetic Demo Application** — All data is fabricated for demonstration purposes. No real BMSCE student, faculty, or institutional records are used.

A modern, full-stack academic scheduling and operations management system designed around the autonomous academic regulations, NEP 2022 curriculum frameworks, and timetable constraints of B.M.S. College of Engineering, Bengaluru.

> **Disclaimer**: CampusFlow is an independent open-source engineering project and portfolio showcase. It is not an official BMSCE institutional portal and does not claim official endorsement, sponsorship, or affiliation with B.M.S. College of Engineering. All student names, faculty profiles, employee identifiers, and course schedules contained in seed fixtures are completely synthetic.

---

## 🚀 Quick Start (Development)

### Prerequisites
- Node.js ≥ 20 (LTS recommended)
- npm ≥ 9
- Python ≥ 3.12 (for the constraint solver service)
- Docker Desktop (for PostgreSQL 16 & Redis 7)

### 1. Clone & Install Dependencies
```powershell
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env` (never commit `.env` to Git):
```powershell
Copy-Item .env.example .env
```

### 3. Start Database & Infrastructure
```powershell
# Start local PostgreSQL 16 & Redis 7 containers
docker compose -f infra/compose.yaml up -d

# Apply baseline schema migration
npx prisma migrate deploy

# Seed with synthetic demonstration personas
npm run prisma:seed
```

### 4. Start Application Services

In separate terminal windows:

```powershell
# Terminal 1 — Python Timetable Optimizer (Port 8000)
Set-Location apps/optimizer
.venv\Scripts\uvicorn main:app --host 127.0.0.1 --port 8000

# Terminal 2 — Node.js Express & Socket.IO API (Port 3001)
npx tsx apps/api/src/server.ts

# Terminal 3 — Vite React Frontend (Port 5173)
npm run dev --workspace=apps/web
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🏗️ Architecture

```
bmsce-smart-academic/
├── apps/
│   ├── api/          # Node.js + Express 4 + Socket.IO + Prisma ORM (port 3001)
│   ├── web/          # React 18 + Vite + Tailwind CSS frontend (port 5173)
│   └── optimizer/    # Python 3.12 + FastAPI + Google OR-Tools CP-SAT (port 8000)
├── packages/
│   └── contracts/    # Shared TypeScript types + Zod validation schemas
├── prisma/
│   ├── schema.prisma # PostgreSQL canonical schema (49 data models)
│   ├── migrations/   # Reproducible migration history
│   └── seed.ts       # Deterministic synthetic data generator
└── infra/
    ├── compose.yaml            # Local dev Docker Compose (PostgreSQL 16 + Redis 7)
    └── compose.production.yaml # Production self-hosted Docker Compose stack
```

### Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React 18, Vite 6, TypeScript, Tailwind CSS, Lucide | Responsive academic dashboard & timetable matrix |
| **Backend** | Node.js 22, Express 4, Socket.IO 4, PDFKit | RESTful API, live class chambers, institutional PDF generator |
| **Database** | PostgreSQL 16 via Prisma ORM 5 | Relational academic persistence (49 tables) |
| **Cache & Queue** | Redis 7 via ioredis | Solver job caching & in-memory fallback |
| **Optimization** | Python 3.12, FastAPI, OR-Tools 9.11 CP-SAT | Greedy heuristic baseline + CP-SAT multi-threaded constraint solver |
| **Contracts** | TypeScript, Zod | Shared validation schemas between client and server |

---

## 📱 Features & Modules

| Route | Feature | Key Capabilities |
|-------|---------|------------------|
| `/` | Role-Based Dashboard | HOD institutional metrics, pending approvals, student class schedule |
| `/timetable` | Master Timetable Grid | Weekly matrix, period blocks, lab sessions, PDF timetable export |
| `/solver-studio` | Timetable Solver Studio | Google OR-Tools CP-SAT engine, constraint weights, solve trigger |
| `/candidate-comparison` | Candidate Comparison | Side-by-side timetable evaluation, soft violation metrics, publishing |
| `/conflict-inspector` | Conflict Audit Matrix | Hard & soft constraint breakdown (room double-bookings, faculty overlaps) |
| `/disruption-repair` | Disruption Repair Center | Faculty leave reassignment, emergency proxy allocation, audit trail |
| `/communication` | Class Communication Center | Real-time Socket.IO class session chamber & directives |
| `/examinations` | CIE & Exam Management | Mid-term slot allocation, hall capacity validation, PDF exam schedule |
| `/workload` | Faculty Workload Audit | AICTE regulatory compliance, weekly hours, overload/underload indicators |
| `/rooms` | Room & Lab Management | Inventory, equipment specs, utilization rates, conflict audit |
| `/nep-scheme` | NEP 2022 Scheme Analyzer | Curriculum structure (PCC/PEC/OEC), L:T:P ratios, mandatory 3h lab blocks |

---

## 👥 Demo Personas

Switch personas instantly using the **Switch Persona** dropdown in the top navigation bar:

| Role | Persona Name | Institutional Email | Key Permissions |
|------|--------------|---------------------|-----------------|
| **HOD** | Dr. K. R. Suresh | `hod.cse@bmsce.ac.in` | Full departmental authority, solver runs, repair approvals |
| **Faculty** | Dr. A. Ramanathan | `ramanathan.cse@bmsce.ac.in` | Timetable view, session messaging, workload audits |
| **CR** | Aryan Rao | `aryan.rao@student.bmsce.ac.in` | Class representative broadcasts, session notices |
| **Student** | Arjun Sharma | `arjun@student.bmsce.ac.in` | Read-only weekly schedule, CIE calendar, attendance |

---

## 🧪 Verification & Automated Testing

```powershell
# Run full automated test suite (19/19 tests against PostgreSQL + Redis)
npx tsx scripts/test_all_endpoints.ts

# Type-check frontend & backend
npx tsc --noEmit -p apps/web/tsconfig.json
npx tsc --noEmit -p apps/api/tsconfig.json

# Build frontend production bundle
npm run build --workspace=apps/web
```

---

## ⚙️ Environment Configuration

Refer to [`.env.example`](file:///.env.example) for placeholder definitions.

```env
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://DBUSER:DBPASSWORD@localhost:5432/bmsce_academic?schema=public
REDIS_URL=redis://localhost:6379
OPTIMIZER_URL=http://localhost:8000
JWT_SECRET=your-cryptographically-secure-random-secret
CORS_ORIGIN=http://localhost:5173
IS_DEMO_ENV=true
INITIAL_DATA_MODE=SYNTHETIC
```

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
