/**
 * Seed the Mumbai Supabase project only.
 * Requires SUPABASE_SESSION_POOLER_URI and ALLOW_SUPABASE_SEED=true.
 * Refuses localhost. Does not modify .env.
 */

import { spawn } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import { reportPrismaConnectError, resolveSupabaseSessionPoolerUri } from './lib/supabase_target';

async function main() {
  if (process.env.ALLOW_SUPABASE_SEED !== 'true') {
    console.error('❌ Refusing to seed: set ALLOW_SUPABASE_SEED=true after confirming the database is empty/demo-only.');
    process.exit(1);
  }

  const finalUri = resolveSupabaseSessionPoolerUri();
  const originalDatabaseUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = finalUri;

  const prisma = new PrismaClient({
    datasourceUrl: finalUri,
    log: ['error'],
  });

  try {
    const userCount = await prisma.user.count();
    const auditCount = await prisma.auditLog.count();
    console.log(`📊 Pre-seed counts — users: ${userCount}, audit_logs: ${auditCount}`);

    if (userCount > 0 && process.env.FORCE_SUPABASE_SEED !== 'true') {
      console.error('❌ Database already has user rows. Re-run with FORCE_SUPABASE_SEED=true only if this is disposable demo data.');
      process.exit(1);
    }
  } catch (err: any) {
    reportPrismaConnectError(err);
  } finally {
    await prisma.$disconnect();
  }

  console.log('🌱 Running prisma/seed.ts against the verified Session Pooler URI...');

  const child = spawn(process.execPath, ['./node_modules/tsx/dist/cli.mjs', 'prisma/seed.ts'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: finalUri,
      ALLOW_SUPABASE_SEED: 'true',
    },
  });

  const code: number = await new Promise((resolve) => {
    child.on('close', (exitCode) => resolve(exitCode ?? 1));
  });

  if (originalDatabaseUrl !== undefined) {
    process.env.DATABASE_URL = originalDatabaseUrl;
  } else {
    delete process.env.DATABASE_URL;
  }

  if (code !== 0) {
    process.exit(code);
  }

  process.env.DATABASE_URL = finalUri;
  const verify = new PrismaClient({ datasourceUrl: finalUri, log: ['error'] });
  try {
    const users = await verify.user.findMany({
      select: {
        displayName: true,
        institutionalEmail: true,
        isDemo: true,
        userRoles: { include: { role: true } },
      },
    });
    console.log(`✅ Post-seed users: ${users.length}`);
    for (const u of users) {
      const roles = u.userRoles.map((r) => r.role.code).join(',');
      console.log(`   - ${u.displayName} <${u.institutionalEmail}> roles=${roles} demo=${u.isDemo}`);
    }
  } finally {
    if (originalDatabaseUrl !== undefined) {
      process.env.DATABASE_URL = originalDatabaseUrl;
    } else {
      delete process.env.DATABASE_URL;
    }
    await verify.$disconnect();
  }
}

main().catch(() => {
  console.error('❌ Unexpected Supabase seed failure.');
  process.exit(1);
});
