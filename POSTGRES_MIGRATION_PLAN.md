# BMSCE Smart Academic — PostgreSQL Migration Plan

## 1. Executive Summary
This document defines the transition procedure from local SQLite (`prisma/dev.db`) to PostgreSQL 16 (`infra/compose.yaml`), aligning with `docs/trd.md` and `docs/database-schema.md`.

In strict adherence to instructions, **no live data has been deleted or overwritten**, and SQLite remains the active source of truth during development until PostgreSQL is explicitly started and verified.

---

## 2. Source vs Target Schema Audit

| Dimension | Active SQLite Schema (`prisma/schema.prisma`) | Target PostgreSQL Schema (`prisma/schema.postgresql.prisma`) | Compatibility Status |
| :--- | :--- | :--- | :--- |
| **Provider** | `sqlite` | `postgresql` | Fully validated with Prisma 5.22.0 (`prisma validate` 🚀) |
| **Primary Keys** | `String @id @default(uuid())` | `String @id @default(uuid())` | 100% compatible UUIDv4 |
| **Enums** | Stored as text strings | Validated as varchar/text strings with strict Zod API validation | 100% compatible |
| **Foreign Keys** | SQLite FOREIGN KEY references | PostgreSQL relational constraints with cascade rules | Verified: 0 orphaned records found |
| **Timestamps** | SQLite ISO strings / Unix timestamps | PostgreSQL `timestamp(3) without time zone` | 100% compatible |
| **JSON Fields** | Serialized strings | `String` or native `Json` | Fully backward compatible |

---

## 3. Database Inventory & Health Check (Verified in Dry-Run)

The dry run audit (`scripts/prepare_postgres_migration.ts`) verified the following table records:
- `users`: 10 records
- `roles`: 6 records
- `userRoles`: 10 records
- `academicTerms`: 1 record
- `departments`: 1 record
- `sections`: 1 record (5th Sem CSE-B)
- `faculty`: 8 records
- `subjects`: 9 records
- `subjectOfferings`: 9 records
- `facultyAssignments`: 9 records
- `rooms`: 8 records (PJ-302, PJ-303, Lab 1-4, etc.)
- `timetables`: 1 record
- `timetableVersions`: 1 record
- `timetableSessions`: 17 records
- `disruptions`: 1 record
- `repairProposals`: 3 records
- `chatMessages`: 4 records
- `auditLogs`: 4 records
- **Relational Integrity**: 0 orphaned foreign keys.

---

## 4. Migration Execution Steps (When Initiated)

### Step 4.1: Start PostgreSQL Container
```bash
docker compose -f infra/compose.yaml up -d postgres
```
Verify port 5432 is open:
```powershell
Test-NetConnection -ComputerName 127.0.0.1 -Port 5432
```

### Step 4.2: Deploy PostgreSQL DDL Schema
```powershell
$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5432/bmsce_academic?schema=public"
npx prisma db push --schema=prisma/schema.postgresql.prisma
```

### Step 4.3: Migrate Data from SQLite to PostgreSQL
Execute the data transfer script:
```powershell
npx tsx scripts/prepare_postgres_migration.ts
```

### Step 4.4: Switch Active Environment Variable
Update `.env`:
```ini
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/bmsce_academic?schema=public"
```
Copy PostgreSQL schema to active schema:
```powershell
Copy-Item prisma/schema.postgresql.prisma prisma/schema.prisma -Force
npx prisma generate
```

---

## 5. Rollback Procedure (Zero Downtime / Zero Data Loss)

If PostgreSQL connectivity fails or unexpected errors occur during deployment:
1. Revert `.env` `DATABASE_URL`:
   ```ini
   DATABASE_URL="file:./dev.db"
   ```
2. Re-point `prisma/schema.prisma` to SQLite provider:
   ```prisma
   datasource db {
     provider = "sqlite"
     url      = "file:./dev.db"
   }
   ```
3. Regenerate client:
   ```bash
   npx prisma generate
   ```
4. Restart API daemon:
   ```bash
   npx tsx apps/api/src/server.ts
   ```
*SQLite `prisma/dev.db` is continuously preserved and untouched.*

