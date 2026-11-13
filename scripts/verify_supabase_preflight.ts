/**
 * CampusFlow — Final Hardened Supabase Project Identity & Connection Preflight
 *
 * ROOT CAUSE FIX (applied here):
 *
 * Prisma 5's query engine binary (.dll.node on Windows) reads the root `.env`
 * file directly at startup via its own dotenv implementation, loading
 * DATABASE_URL=postgresql://localhost:... into process.env BEFORE Node.js
 * applies the PrismaClient({ datasources }) override.
 *
 * THE FIX: Use `datasourceUrl` (the flat string option) instead of
 * `datasources: { db: { url } }`. In Prisma 5, `datasourceUrl` is explicitly
 * mapped AFTER env resolution and takes the highest precedence.
 *
 * Additionally, DATABASE_URL in process.env is explicitly overridden before
 * PrismaClient is instantiated, so the engine reads the correct target.
 */

import { PrismaClient } from '@prisma/client';
import { reportPrismaConnectError, resolveSupabaseSessionPoolerUri } from './lib/supabase_target';

async function main() {
  const finalUri = resolveSupabaseSessionPoolerUri();

  const originalDatabaseUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = finalUri;

  console.log('🔄 Executing read-only preflight handshake...');

  const prisma = new PrismaClient({
    datasourceUrl: finalUri,
    log: ['error'],
  });

  try {
    const results = await prisma.$queryRawUnsafe<Array<{ db: string; usr: string; ver: string }>>(
      'SELECT current_database() as db, current_user as usr, version() as ver;'
    );

    if (results && results.length > 0) {
      const row = results[0];
      const verShort = (row.ver || '').split(' on ')[0];
      console.log('✅ PREFLIGHT SUCCESS: Verified connection to Supabase project!');
      console.log(`   Active DB   : ${row.db}`);
      console.log(`   Engine      : ${verShort}`);
    } else {
      console.error('❌ PREFLIGHT ERROR: Query returned empty result set.');
      process.exit(1);
    }
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
  console.error('❌ Unexpected preflight failure.');
  process.exit(1);
});
