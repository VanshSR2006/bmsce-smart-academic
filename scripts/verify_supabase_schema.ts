/**
 * Read-only verification of the CampusFlow schema on the Mumbai Supabase project.
 * Does not modify data. Requires SUPABASE_SESSION_POOLER_URI.
 */

import { PrismaClient } from '@prisma/client';
import {
  APPLICATION_TABLES,
  EXPECTED_MIGRATION,
  reportPrismaConnectError,
  resolveSupabaseSessionPoolerUri,
} from './lib/supabase_target';

async function main() {
  const finalUri = resolveSupabaseSessionPoolerUri();
  const originalDatabaseUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = finalUri;

  const prisma = new PrismaClient({
    datasourceUrl: finalUri,
    log: ['error'],
  });

  try {
    const identity = await prisma.$queryRawUnsafe<Array<{ db: string; usr: string; ver: string }>>(
      'SELECT current_database() as db, current_user as usr, version() as ver;'
    );
    const verShort = (identity[0]?.ver || '').split(' on ')[0];
    console.log('✅ Connected.');
    console.log(`   Active DB   : ${identity[0]?.db}`);
    console.log(`   Engine      : ${verShort}`);

    const tables = await prisma.$queryRawUnsafe<Array<{ tablename: string }>>(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;`
    );
    const present = new Set(tables.map((t) => t.tablename));
    const missing = APPLICATION_TABLES.filter((t) => !present.has(t));
    const extra = [...present].filter(
      (t) => t !== '_prisma_migrations' && !APPLICATION_TABLES.includes(t as (typeof APPLICATION_TABLES)[number])
    );

    console.log(`📦 Public tables: ${present.size} (expected application tables: ${APPLICATION_TABLES.length})`);
    if (missing.length) {
      console.error(`❌ Missing application tables (${missing.length}): ${missing.join(', ')}`);
      process.exit(1);
    }
    if (extra.length) {
      console.log(`ℹ️  Additional public tables (non-fatal): ${extra.join(', ')}`);
    } else {
      console.log('✅ No unexpected application tables.');
    }
    console.log(`✅ All ${APPLICATION_TABLES.length} application tables exist.`);

    const migrations = await prisma.$queryRawUnsafe<
      Array<{ migration_name: string; finished_at: Date | null; rolled_back_at: Date | null; applied_steps_count: number }>
    >(
      `SELECT migration_name, finished_at, rolled_back_at, applied_steps_count FROM _prisma_migrations ORDER BY started_at;`
    );

    if (!migrations.length) {
      console.error('❌ _prisma_migrations is empty.');
      process.exit(1);
    }

    const baseline = migrations.find((m) => m.migration_name === EXPECTED_MIGRATION);
    if (!baseline || !baseline.finished_at || baseline.rolled_back_at) {
      console.error(`❌ Baseline migration ${EXPECTED_MIGRATION} is missing or incomplete.`);
      process.exit(1);
    }

    const unfinished = migrations.filter((m) => !m.finished_at || m.rolled_back_at);
    if (unfinished.length) {
      console.error(`❌ Unfinished or rolled-back migrations: ${unfinished.map((m) => m.migration_name).join(', ')}`);
      process.exit(1);
    }

    console.log(`✅ _prisma_migrations: ${migrations.length} completed (baseline ${EXPECTED_MIGRATION} present).`);

    const counts = await prisma.$queryRawUnsafe<Array<{ relname: string; n: bigint }>>(
      `SELECT c.relname, c.reltuples::bigint AS n
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND c.relkind = 'r'
         AND c.relname IN ('users','roles','departments','timetable_sessions','_prisma_migrations')
       ORDER BY c.relname;`
    );
    for (const row of counts) {
      console.log(`   ~ ${row.relname}: planner estimate ${row.n.toString()} rows`);
    }

    const userCount = await prisma.user.count();
    const roleCount = await prisma.role.count();
    const sessionCount = await prisma.timetableSession.count();
    console.log(`📊 Exact counts — users: ${userCount}, roles: ${roleCount}, timetable_sessions: ${sessionCount}`);
    if (userCount === 0) {
      console.log('ℹ️  Database has no user rows (fresh enough for demo seed).');
    } else {
      console.log('⚠️  User rows already exist. Demo seed deletes application data — confirm before seeding.');
    }

    console.log('✅ SCHEMA VERIFICATION SUCCESS');
  } catch (err: any) {
    reportPrismaConnectError(err);
  } finally {
    if (originalDatabaseUrl !== undefined) {
      process.env.DATABASE_URL = originalDatabaseUrl;
    } else {
      delete process.env.DATABASE_URL;
    }
    await prisma.$disconnect();
  }
}

main().catch(() => {
  console.error('❌ Unexpected schema verification failure.');
  process.exit(1);
});
