/**
 * Comprehensive BMSCE Smart Academic Automated Test Suite
 * Tests all backend API routes, role-based personas, optimizer communication,
 * solver execution, and database persistence.
 */
import { prisma } from '../apps/api/src/config/prisma.js';

interface TestResult {
  name: string;
  category: string;
  status: 'PASS' | 'FAIL';
  details: string;
  durationMs: number;
}

const results: TestResult[] = [];
const BASE_URL = 'http://localhost:3001/api/v1';

async function runTest(name: string, category: string, fn: () => Promise<void>) {
  const start = Date.now();
  try {
    await fn();
    results.push({ name, category, status: 'PASS', details: 'OK', durationMs: Date.now() - start });
    console.log(`✅ [${category}] ${name} (${Date.now() - start}ms)`);
  } catch (err: any) {
    results.push({ name, category, status: 'FAIL', details: err.message, durationMs: Date.now() - start });
    console.error(`❌ [${category}] ${name}: ${err.message}`);
  }
}

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

async function main() {
  console.log('====================================================');
  console.log('   BMSCE Smart Academic Automated Verification Pass');
  console.log('====================================================\n');

  // 1. Health Checks
  await runTest('API Health Check', 'System', async () => {
    const res = await fetch(`${BASE_URL}/health`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert(data.status === 'HEALTHY', `API status not HEALTHY: ${data.status}`);
  });

  await runTest('Optimizer Health Check', 'System', async () => {
    const res = await fetch('http://127.0.0.1:8000/health');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert(data.status === 'HEALTHY', `Optimizer status not HEALTHY: ${data.status}`);
  });

  // 2. Auth & Personas
  let demoUsers: any[] = [];
  await runTest('Get Demo Personas', 'Auth', async () => {
    const res = await fetch(`${BASE_URL}/auth/demo-users`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const json = await res.json();
    demoUsers = json.data;
    assert(Array.isArray(demoUsers) && demoUsers.length >= 4, `Expected at least 4 demo personas, got ${demoUsers?.length}`);
  });

  const rolesToTest = ['DEPT_HEAD', 'FACULTY', 'CR', 'STUDENT'];
  for (const role of rolesToTest) {
    await runTest(`Demo Login as ${role}`, 'Auth', async () => {
      const res = await fetch(`${BASE_URL}/auth/demo-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      assert(res.status === 200, `Login for ${role} failed with ${res.status}`);
      const json = await res.json();
      assert(json.data?.token, `Missing auth token for ${role}`);
      assert(json.data?.user?.role === role, `Role mismatch: expected ${role}, got ${json.data?.user?.role}`);
    });
  }

  // 3. Student Dashboard & Timetable
  await runTest('Student Dashboard API', 'Student', async () => {
    const res = await fetch(`${BASE_URL}/students/me/dashboard`, {
      headers: { 'x-demo-role': 'STUDENT' },
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const json = await res.json();
    assert(json.data?.student?.usn, 'Missing student USN');
    assert(Array.isArray(json.data?.todaySchedule), 'Missing todaySchedule array');
  });

  await runTest('Weekly Timetable Grid API', 'Student', async () => {
    const section = await prisma.section.findFirst();
    assert(!!section, 'No section in database');
    const res = await fetch(`${BASE_URL}/sections/${section!.id}/timetable`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const json = await res.json();
    assert(json.data?.section?.sectionCode, 'Missing sectionCode');
    assert(Array.isArray(json.data?.sessions), 'Missing sessions array');
  });

  // 4. HOD Dashboard
  await runTest('HOD Dashboard Overview API', 'HOD', async () => {
    const res = await fetch(`${BASE_URL}/hod/dashboard-overview`, {
      headers: { 'x-demo-role': 'DEPT_HEAD' },
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const json = await res.json();
    assert(json.data?.metrics?.facultyTotal !== undefined, 'Missing facultyTotal metric');
    assert(json.data?.metrics?.roomsTotal !== undefined, 'Missing roomsTotal metric');
  });

  // 5. Conflict Inspector
  await runTest('Conflict Summary API', 'Conflicts', async () => {
    const res = await fetch(`${BASE_URL}/conflicts/summary`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const json = await res.json();
    assert(json.data?.stats?.totalHard !== undefined, 'Missing totalHard conflict stat');
    assert(Array.isArray(json.data?.incidents), 'Missing incidents array');
  });

  // 6. Timetable Repair
  await runTest('Active Repair Incident API', 'Repair', async () => {
    const res = await fetch(`${BASE_URL}/repairs/active`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const json = await res.json();
    assert(json.data?.incident?.id, 'Missing repair incident ID');
    assert(Array.isArray(json.data?.strategies) && json.data.strategies.length >= 3, 'Expected 3 repair strategies');
  });

  await runTest('Authorize Repair Strategy API', 'Repair', async () => {
    const res = await fetch(`${BASE_URL}/repairs/authorize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-demo-role': 'DEPT_HEAD' },
      body: JSON.stringify({
        incidentId: 'INC-TEST',
        strategyId: 'strat-a',
        authorizationType: 'DATED_EXCEPTION',
      }),
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const json = await res.json();
    assert(json.data?.authorized === true, 'Authorization failed');
  });

  // 7. Class Communication
  await runTest('Active Class Sessions API', 'Communication', async () => {
    const res = await fetch(`${BASE_URL}/class-sessions/active`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const json = await res.json();
    assert(Array.isArray(json.data?.sessions), 'Missing sessions array');
  });

  await runTest('Post Class Message API', 'Communication', async () => {
    const res = await fetch(`${BASE_URL}/class-sessions/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-demo-role': 'FACULTY' },
      body: JSON.stringify({
        sessionId: 'sess-001',
        content: 'Automated test verification message.',
      }),
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const json = await res.json();
    assert(json.data?.success === true, 'Message post not confirmed');
  });

  // 8. Examination Management
  await runTest('Examination Overview API', 'Examinations', async () => {
    const res = await fetch(`${BASE_URL}/examinations/overview`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const json = await res.json();
    assert(json.data?.stats?.totalSessions !== undefined, 'Missing totalSessions in exam stats');
    assert(Array.isArray(json.data?.cieEvents), 'Missing cieEvents');
    assert(Array.isArray(json.data?.hallUtilization), 'Missing hallUtilization');
  });

  // 9. Timetable Solver & Optimization
  await runTest('Solver Studio Config API', 'Solver', async () => {
    const res = await fetch(`${BASE_URL}/solver/studio-config`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const json = await res.json();
    assert(Array.isArray(json.data?.hardConstraints), 'Missing hardConstraints');
    assert(Array.isArray(json.data?.softTargets), 'Missing softTargets');
  });

  await runTest('Candidate Comparison API', 'Solver', async () => {
    const res = await fetch(`${BASE_URL}/solver/candidates/compare`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const json = await res.json();
    assert(Array.isArray(json.data?.candidates) && json.data.candidates.length >= 3, 'Expected at least 3 candidates');
  });

  // 10. Solver Execution & Database Persistence Test
  const runsBefore = await prisma.optimizationRun.count();
  const candidatesBefore = await prisma.optimizationCandidate.count();

  await runTest('Run Solver via API & Verify DB Persistence', 'Solver', async () => {
    const res = await fetch(`${BASE_URL}/solver/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-demo-role': 'DEPT_HEAD' },
      body: JSON.stringify({ engine: 'CONSTRAINT_CSP', semesters: [5], timeLimit: 15 }),
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const json = await res.json();
    assert(json.data?.runId, 'Missing runId');
    assert(json.data?.status === 'COMPLETED', `Run not completed: ${json.data?.status}`);
    assert(json.data?.candidatesGenerated >= 1, `Expected candidates generated, got ${json.data?.candidatesGenerated}`);

    // Verify Prisma persistence
    const runsAfter = await prisma.optimizationRun.count();
    assert(runsAfter === runsBefore + 1, `Expected runs count to increase from ${runsBefore} to ${runsBefore + 1}, got ${runsAfter}`);
    
    const candidatesAfter = await prisma.optimizationCandidate.count();
    assert(candidatesAfter > candidatesBefore, `Expected candidate count to increase from ${candidatesBefore}, got ${candidatesAfter}`);

    // Verify persisted run record
    const savedRun = await prisma.optimizationRun.findUnique({ where: { id: json.data.runId } });
    assert(!!savedRun, `OptimizationRun ${json.data.runId} not found in database`);
    assert(savedRun!.status === 'COMPLETED', `Saved run status expected COMPLETED, got ${savedRun!.status}`);
  });

  console.log('\n====================================================');
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  console.log(`Total Tests: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});

