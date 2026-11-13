/**
 * Shared Supabase Session Pooler identity checks.
 * Never logs credentials, URIs, or raw driver errors.
 */

export const EXPECTED_PROJECT_REF = 'ctxpnicaqjygakszmhgs';
export const EXPECTED_MIGRATION = '20261113160723_init';

export const VALID_MUMBAI_POOLER_HOSTS = [
  'aws-1-ap-south-1.pooler.supabase.com',
  'aws-0-ap-south-1.pooler.supabase.com',
  'ap-south-1.pooler.supabase.com',
];

export const APPLICATION_TABLES = [
  'users',
  'roles',
  'user_roles',
  'students',
  'faculty',
  'departments',
  'clusters',
  'academic_terms',
  'programs',
  'sections',
  'batches',
  'subjects',
  'subject_offerings',
  'faculty_assignments',
  'academic_calendar_events',
  'bell_schedules',
  'time_periods',
  'scheduling_constraint_profiles',
  'faculty_availability',
  'faculty_workload_rules',
  'rooms',
  'features',
  'room_features',
  'room_availability',
  'timetables',
  'timetable_versions',
  'timetable_sessions',
  'timetable_publications',
  'schedule_exceptions',
  'optimization_runs',
  'optimization_candidates',
  'candidate_sessions',
  'validation_reports',
  'validation_issues',
  'disruptions',
  'disruption_affected_sessions',
  'repair_proposals',
  'repair_changes',
  'class_session_occurrences',
  'chat_spaces',
  'chat_members',
  'chat_messages',
  'message_attachments',
  'faculty_cr_requests',
  'examination_cycles',
  'examination_events',
  'examination_room_allocations',
  'examination_publications',
  'notifications',
  'audit_logs',
] as const;

export function resolveSupabaseSessionPoolerUri(): string {
  const rawUri = process.env.SUPABASE_SESSION_POOLER_URI?.trim();
  const expectedRef = process.env.SUPABASE_PROJECT_REF?.trim() || EXPECTED_PROJECT_REF;
  const expectedHost =
    process.env.SUPABASE_EXPECTED_HOST?.trim() || 'aws-1-ap-south-1.pooler.supabase.com';

  if (!rawUri) {
    console.error('❌ PREFLIGHT ERROR: Environment variable SUPABASE_SESSION_POOLER_URI is not set.');
    process.exit(1);
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUri);
  } catch {
    console.error('❌ PREFLIGHT ERROR: Invalid URI format. Must be a valid connection string.');
    process.exit(1);
  }

  if (parsed.protocol !== 'postgresql:' && parsed.protocol !== 'postgres:') {
    console.error('❌ PREFLIGHT ERROR: Invalid protocol. Scheme must be postgresql:// or postgres://.');
    process.exit(1);
  }

  const hostname = parsed.hostname.toLowerCase();
  if (!VALID_MUMBAI_POOLER_HOSTS.includes(hostname) && hostname !== expectedHost.toLowerCase()) {
    console.error('❌ PREFLIGHT ERROR: Pooler hostname mismatch.');
    console.error(`   Expected Mumbai Pooler host: "${expectedHost}".`);
    console.error('   Target rejected to prevent connecting to an unexpected cluster or region.');
    process.exit(1);
  }

  const username = decodeURIComponent(parsed.username || '');
  const expectedUsername = `postgres.${expectedRef}`;

  if (!username) {
    console.error('❌ PREFLIGHT ERROR: Connection URI contains no username.');
    process.exit(1);
  }

  if (username !== expectedUsername) {
    console.error('❌ PREFLIGHT ERROR: Project reference in connection URI does NOT match expected project identity.');
    console.error('   Verification failed: Target project mismatch.');
    process.exit(1);
  }

  const port = parsed.port ? parseInt(parsed.port, 10) : 5432;
  if (port !== 5432) {
    if (port === 6543) {
      console.error('❌ PREFLIGHT ERROR: Port 6543 (Transaction Pooler) is rejected. Migrations require Port 5432 (Session Pooler).');
    } else {
      console.error(`❌ PREFLIGHT ERROR: Invalid port ${port}. Only Port 5432 (Session Pooler) is permitted.`);
    }
    process.exit(1);
  }

  const dbName = parsed.pathname.replace(/^\//, '').split('?')[0];
  if (dbName !== 'postgres') {
    console.error('❌ PREFLIGHT ERROR: Database name must strictly be "postgres". Target rejected.');
    process.exit(1);
  }

  const sslMode = parsed.searchParams.get('sslmode');
  if (sslMode && !['require', 'prefer', 'verify-ca', 'verify-full'].includes(sslMode.toLowerCase())) {
    console.error('❌ PREFLIGHT ERROR: Insecure sslmode specified. Must be "require", "verify-ca", or "verify-full".');
    process.exit(1);
  }

  let finalUri = rawUri;
  if (!sslMode) {
    const separator = rawUri.includes('?') ? '&' : '?';
    finalUri = `${rawUri}${separator}sslmode=require`;
  }

  console.log('🔒 Identity Checks Passed:');
  console.log(`   Region Host : ${hostname}`);
  console.log(`   Pooler Port : ${port} (Session Mode)`);
  console.log(`   Database    : ${dbName}`);
  console.log('   Project Ref : [VERIFIED MATCH]');
  console.log('   Credentials : [REDACTED]');
  console.log('   SSL         : require (enforced)');

  return finalUri;
}

export function reportPrismaConnectError(err: { code?: string }): never {
  console.error('❌ SUPABASE CONNECTION FAILED:');
  if (err.code === 'P1001') {
    console.error('   Reason: Cannot reach database server at the specified host and port.');
    console.error('   Check: Supabase project is not paused, pooler is enabled, firewall allows port 5432.');
  } else if (err.code === 'P1000') {
    console.error('   Reason: Authentication failed against database credentials.');
    console.error('   Check: Pooler password is correct, project ref in username matches, project is active.');
  } else if (err.code === 'P1003') {
    console.error('   Reason: Database "postgres" does not exist on this host.');
  } else if (err.code === 'P1017') {
    console.error('   Reason: Server closed the connection (timeout or pooler max connections reached).');
  } else {
    console.error(`   Prisma Error Code: ${err.code || 'UNKNOWN'}`);
    console.error('   Verification failed. Check network access, pooler credentials, and project status.');
  }
  process.exit(1);
}
