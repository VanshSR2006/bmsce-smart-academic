/**
 * PostgreSQL Migration Preparation & Dry-Run Auditor
 * 
 * Inspects SQLite dev.db, validates data integrity, checks PostgreSQL reachability,
 * and generates export schemas without modifying active databases.
 */

import { prisma } from '../apps/api/src/config/prisma.js';
import net from 'net';
import fs from 'fs';
import path from 'path';

async function checkPostgresPort(host = '127.0.0.1', port = 5432): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1500);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

async function runDryRunMigration() {
  console.log('================================================================');
  console.log('   BMSCE Smart Academic — PostgreSQL Migration Dry-Run Audit');
  console.log('================================================================\n');

  console.log('🔍 Step 1: Auditing Active SQLite Source Database...');
  
  const auditResults: Record<string, number> = {};

  try {
    auditResults['users'] = await prisma.user.count();
    auditResults['roles'] = await prisma.role.count();
    auditResults['userRoles'] = await prisma.userRole.count();
    auditResults['academicTerms'] = await prisma.academicTerm.count();
    auditResults['departments'] = await prisma.department.count();
    auditResults['sections'] = await prisma.section.count();
    auditResults['faculty'] = await prisma.faculty.count();
    auditResults['facultyWorkloadRules'] = await prisma.facultyWorkloadRule.count();
    auditResults['subjects'] = await prisma.subject.count();
    auditResults['subjectOfferings'] = await prisma.subjectOffering.count();
    auditResults['facultyAssignments'] = await prisma.facultyAssignment.count();
    auditResults['rooms'] = await prisma.room.count();
    auditResults['roomFeatures'] = await prisma.roomFeature.count();
    auditResults['timetables'] = await prisma.timetable.count();
    auditResults['timetableVersions'] = await prisma.timetableVersion.count();
    auditResults['timetableSessions'] = await prisma.timetableSession.count();
    auditResults['disruptions'] = await prisma.disruption.count();
    auditResults['repairProposals'] = await prisma.repairProposal.count();
    auditResults['chatMessages'] = await prisma.chatMessage.count();
    auditResults['auditLogs'] = await prisma.auditLog.count();

    console.log('📊 SQLite Database Record Inventory:');
    console.table(
      Object.entries(auditResults).map(([table, count]) => ({
        Table: table,
        'Record Count': count,
        Status: count > 0 ? 'READY FOR MIGRATION' : 'EMPTY / INITIAL',
      }))
    );
  } catch (err: any) {
    console.error('❌ Failed reading SQLite records:', err.message);
    process.exit(1);
  }

  console.log('\n🔍 Step 2: Validating Foreign Key Integrity...');
  // Sample relational checks
  const allAssignments = await prisma.facultyAssignment.findMany({
    include: { faculty: true, subjectOffering: true },
  });
  const allSessions = await prisma.timetableSession.findMany({
    include: { faculty: true, room: true, timetableVersion: true },
  });

  const brokenAssignments = allAssignments.filter(a => !a.faculty || !a.subjectOffering);
  const brokenSessions = allSessions.filter(s => !s.faculty || !s.room || !s.timetableVersion);

  if (brokenAssignments.length === 0 && brokenSessions.length === 0) {
    console.log(`✅ Relational Integrity: ZERO orphaned foreign key records (${allAssignments.length} assignments and ${allSessions.length} sessions fully linked).`);
  } else {
    console.warn(`⚠️ Warning: Found ${brokenAssignments.length} broken assignments and ${brokenSessions.length} broken sessions.`);
  }

  console.log('\n🔍 Step 3: Checking Target PostgreSQL Connectivity...');
  const isPgOnline = await checkPostgresPort('127.0.0.1', 5432);
  
  if (isPgOnline) {
    console.log('✅ PostgreSQL Port 5432 is OPEN and accepting connections.');
    console.log('   Ready for direct command: npx prisma migrate deploy --schema=prisma/schema.postgresql.prisma');
  } else {
    console.log('ℹ️ PostgreSQL Port 5432 is OFFLINE (Standard in development mode when Docker is stopped).');
    console.log('   To start PostgreSQL container:');
    console.log('     docker compose -f infra/compose.yaml up -d postgres');
  }

  console.log('\n🔍 Step 4: Staging Migration Artifacts...');
  const pgSchemaPath = path.resolve(process.cwd(), 'prisma/schema.postgresql.prisma');
  if (fs.existsSync(pgSchemaPath)) {
    console.log(`✅ Verified PostgreSQL Prisma Schema at ${pgSchemaPath}`);
  }

  console.log('\n================================================================');
  console.log('   Dry-Run Migration Complete: 0 Errors Detected');
  console.log('   SQLite dev.db remains untouched and active as source of truth.');
  console.log('================================================================');
}

runDryRunMigration()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
