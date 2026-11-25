/**
 * CampusFlow — Deterministic, Idempotent Multi-Section Synthetic CSE Seed
 * Safe for disposable local testing. Refuses Supabase targets and performs NO deleteMany.
 * Usage: npx tsx scripts/seed_synthetic_cse.ts
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const databaseUrl = process.env.DATABASE_URL || '';
if (/pooler\.supabase\.com|supabase\.co/i.test(databaseUrl)) {
  console.error('❌ Refusing to run synthetic seed against Supabase.');
  process.exit(1);
}

export async function runSyntheticCseSeed(prisma: PrismaClient) {
  // 1. Roles
  const roles = [
    { code: 'PLATFORM_ADMIN', name: 'Platform Administrator' },
    { code: 'DEPT_HEAD', name: 'Head of Department (HOD)' },
    { code: 'CLUSTER_HEAD', name: 'Cluster Head' },
    { code: 'FACULTY', name: 'Faculty' },
    { code: 'CR', name: 'Class Representative' },
    { code: 'STUDENT', name: 'Student' },
  ];
  const roleMap: Record<string, string> = {};
  for (const r of roles) {
    const role = await prisma.role.upsert({
      where: { code: r.code },
      update: { name: r.name },
      create: r,
    });
    roleMap[r.code] = role.id;
  }

  // 2. Department, Cluster, Program, AcademicTerm
  const dept = await prisma.department.upsert({
    where: { code: 'SYNTH-CSE' },
    update: { name: 'Department of Computer Science & Engineering (Synthetic)' },
    create: {
      code: 'SYNTH-CSE',
      name: 'Department of Computer Science & Engineering (Synthetic)',
      isDemo: true,
    },
  });

  const cluster = await prisma.cluster.upsert({
    where: { departmentId_code: { departmentId: dept.id, code: 'SYNTH-CLUSTER-A' } },
    update: {},
    create: {
      departmentId: dept.id,
      code: 'SYNTH-CLUSTER-A',
      name: 'Synthetic Academic Cluster A',
    },
  });

  let program = await prisma.program.findFirst({
    where: { departmentId: dept.id, code: 'BTECH-CSE-SYNTH' },
  });
  if (!program) {
    program = await prisma.program.create({
      data: {
        departmentId: dept.id,
        code: 'BTECH-CSE-SYNTH',
        name: 'B.Tech in Computer Science & Engineering',
        degreeLevel: 'UNDERGRADUATE',
      },
    });
  }

  let term = await prisma.academicTerm.findFirst({
    where: { academicYearLabel: 'AY 2025-26 (Synthetic)', termLabel: 'Odd Semester' },
  });
  if (!term) {
    term = await prisma.academicTerm.create({
      data: {
        academicYearLabel: 'AY 2025-26 (Synthetic)',
        termLabel: 'Odd Semester',
        startDate: new Date('2025-08-01T00:00:00Z'),
        endDate: new Date('2025-12-20T00:00:00Z'),
        status: 'ACTIVE',
        isDemo: true,
      },
    });
  }

  // 3. Bell Schedule & Calendar Events
  const existingBell = await prisma.bellSchedule.findFirst({
    where: { academicTermId: term.id, name: 'Synthetic 7-Period Schedule' },
  });
  if (!existingBell) {
    await prisma.bellSchedule.create({
      data: {
        academicTermId: term.id,
        name: 'Synthetic 7-Period Schedule',
        effectiveFrom: new Date('2025-08-01T00:00:00Z'),
        periods: {
          create: [
            { periodNumber: 1, label: 'Period 1', startTime: '08:30', endTime: '09:30', periodType: 'CLASS' },
            { periodNumber: 2, label: 'Period 2', startTime: '09:30', endTime: '10:30', periodType: 'CLASS' },
            { periodNumber: 3, label: 'Tea Break', startTime: '10:30', endTime: '10:45', periodType: 'BREAK' },
            { periodNumber: 4, label: 'Period 3', startTime: '10:45', endTime: '11:45', periodType: 'CLASS' },
            { periodNumber: 5, label: 'Period 4', startTime: '11:45', endTime: '12:45', periodType: 'CLASS' },
            { periodNumber: 6, label: 'Lunch Break', startTime: '12:45', endTime: '13:45', periodType: 'LUNCH' },
            { periodNumber: 7, label: 'Period 5', startTime: '13:45', endTime: '14:45', periodType: 'CLASS' },
            { periodNumber: 8, label: 'Period 6', startTime: '14:45', endTime: '15:45', periodType: 'CLASS' },
            { periodNumber: 9, label: 'Period 7', startTime: '15:45', endTime: '16:45', periodType: 'CLASS' },
          ],
        },
      },
    });
  }

  const calEvents = [
    { eventDate: new Date('2025-08-01T00:00:00Z'), eventType: 'WORKING_DAY', title: 'Odd Semester Commencement', isInstructional: true },
    { eventDate: new Date('2025-08-15T00:00:00Z'), eventType: 'HOLIDAY', title: 'Independence Day Holiday', isInstructional: false },
    { eventDate: new Date('2025-10-02T00:00:00Z'), eventType: 'HOLIDAY', title: 'Gandhi Jayanti Holiday', isInstructional: false },
  ];
  for (const ev of calEvents) {
    const exists = await prisma.academicCalendarEvent.findFirst({
      where: { academicTermId: term.id, title: ev.title },
    });
    if (!exists) {
      await prisma.academicCalendarEvent.create({ data: { academicTermId: term.id, ...ev } });
    }
  }

  // 4. Sections (CSE-A, CSE-B, CSE-C, CSE-D) + Lab Batches (B1, B2, B3)
  const sectionCodes = ['CSE-A', 'CSE-B', 'CSE-C', 'CSE-D'];
  const sectionRecords: { id: string; sectionCode: string; studentCount: number }[] = [];
  for (const code of sectionCodes) {
    const sec = await prisma.section.upsert({
      where: {
        academicTermId_programId_semesterNumber_sectionCode: {
          academicTermId: term.id,
          programId: program.id,
          semesterNumber: 5,
          sectionCode: code,
        },
      },
      update: {},
      create: {
        departmentId: dept.id,
        clusterId: cluster.id,
        programId: program.id,
        academicTermId: term.id,
        semesterNumber: 5,
        sectionCode: code,
        displayName: `5th Sem ${code}`,
        studentCount: 60,
        status: 'ACTIVE',
      },
    });
    sectionRecords.push(sec);

    for (const bCode of ['B1', 'B2', 'B3']) {
      await prisma.batch.upsert({
        where: { sectionId_batchCode: { sectionId: sec.id, batchCode: bCode } },
        update: {},
        create: {
          sectionId: sec.id,
          batchCode: bCode,
          displayName: `${code} Batch ${bCode}`,
          studentCount: 20,
        },
      });
    }
  }

  // 5. Faculty (8 synthetic faculty with availability & workload rules)
  const facultySpecs = [
    { email: 'synth.fac1@campusflow.example', name: 'Synth Faculty 01 (DAA)', code: 'SYNTH-F01', maxWeek: 16, maxDay: 4, unavail: { day: 1, start: '08:30', end: '09:30' } },
    { email: 'synth.fac2@campusflow.example', name: 'Synth Faculty 02 (DAA/SE)', code: 'SYNTH-F02', maxWeek: 18, maxDay: 4, unavail: null },
    { email: 'synth.fac3@campusflow.example', name: 'Synth Faculty 03 (DBMS)', code: 'SYNTH-F03', maxWeek: 18, maxDay: 4, unavail: { day: 5, start: '15:45', end: '16:45' } },
    { email: 'synth.fac4@campusflow.example', name: 'Synth Faculty 04 (DBMS/OS)', code: 'SYNTH-F04', maxWeek: 18, maxDay: 4, unavail: null },
    { email: 'synth.fac5@campusflow.example', name: 'Synth Faculty 05 (CN)', code: 'SYNTH-F05', maxWeek: 18, maxDay: 4, unavail: null },
    { email: 'synth.fac6@campusflow.example', name: 'Synth Faculty 06 (OS)', code: 'SYNTH-F06', maxWeek: 18, maxDay: 4, unavail: null },
    { email: 'synth.fac7@campusflow.example', name: 'Synth Faculty 07 (TOC)', code: 'SYNTH-F07', maxWeek: 18, maxDay: 4, unavail: null },
    { email: 'synth.fac8@campusflow.example', name: 'Synth Faculty 08 (Labs)', code: 'SYNTH-F08', maxWeek: 18, maxDay: 4, unavail: null },
  ];

  const facultyByCode: Record<string, string> = {};
  let creatorUserId = '';
  for (const f of facultySpecs) {
    const user = await prisma.user.upsert({
      where: { institutionalEmail: f.email },
      update: { displayName: f.name },
      create: {
        institutionalEmail: f.email,
        displayName: f.name,
        isDemo: true,
        userRoles: { create: { roleId: roleMap['FACULTY'], departmentId: dept.id } },
        facultyProfile: {
          create: {
            departmentId: dept.id,
            employeeCode: f.code,
            designation: 'Assistant Professor',
            isDemo: true,
          },
        },
      },
      include: { facultyProfile: true },
    });
    if (!creatorUserId) creatorUserId = user.id;
    const facId = user.facultyProfile!.id;
    facultyByCode[f.code] = facId;

    const existingRule = await prisma.facultyWorkloadRule.findFirst({
      where: { facultyId: facId, academicTermId: term.id },
    });
    if (!existingRule) {
      await prisma.facultyWorkloadRule.create({
        data: {
          facultyId: facId,
          academicTermId: term.id,
          maxPeriodsPerDay: f.maxDay,
          maxPeriodsPerWeek: f.maxWeek,
          maxConsecutivePeriods: 2,
          isDemoAssumption: true,
        },
      });
    }

    if (f.unavail) {
      const existingAvail = await prisma.facultyAvailability.findFirst({
        where: { facultyId: facId, academicTermId: term.id, dayOfWeek: f.unavail.day },
      });
      if (!existingAvail) {
        await prisma.facultyAvailability.create({
          data: {
            facultyId: facId,
            academicTermId: term.id,
            availabilityType: 'UNAVAILABLE',
            dayOfWeek: f.unavail.day,
            startTime: f.unavail.start,
            endTime: f.unavail.end,
            reason: 'Synthetic unavailability constraint',
            createdById: creatorUserId,
          },
        });
      }
    }
  }

  // 6. Rooms (5 Classrooms + 3 Labs)
  const roomSpecs = [
    { roomCode: 'SYNTH-CR-301', name: 'Classroom 301', roomType: 'CLASSROOM', capacity: 70 },
    { roomCode: 'SYNTH-CR-302', name: 'Classroom 302', roomType: 'CLASSROOM', capacity: 70 },
    { roomCode: 'SYNTH-CR-303', name: 'Classroom 303', roomType: 'CLASSROOM', capacity: 70 },
    { roomCode: 'SYNTH-CR-304', name: 'Classroom 304', roomType: 'CLASSROOM', capacity: 70 },
    { roomCode: 'SYNTH-CR-305', name: 'Classroom 305', roomType: 'CLASSROOM', capacity: 70 },
    { roomCode: 'SYNTH-LAB-1', name: 'Computing Lab 1', roomType: 'LAB', capacity: 65 },
    { roomCode: 'SYNTH-LAB-2', name: 'Computing Lab 2', roomType: 'LAB', capacity: 65 },
    { roomCode: 'SYNTH-LAB-3', name: 'Computing Lab 3', roomType: 'LAB', capacity: 35 },
  ];
  for (const r of roomSpecs) {
    await prisma.room.upsert({
      where: { roomCode: r.roomCode },
      update: {},
      create: {
        departmentId: dept.id,
        roomCode: r.roomCode,
        name: r.name,
        roomType: r.roomType,
        capacity: r.capacity,
        isDemo: true,
      },
    });
  }

  // 7. Subjects, Offerings, and FacultyAssignments
  const subjectSpecs = [
    { code: 'SYNTH-DAA', name: 'Design & Analysis of Algorithms', type: 'THEORY', hrs: 4, dur: 1, lab: false, facCodes: ['SYNTH-F01', 'SYNTH-F02'] },
    { code: 'SYNTH-DBMS', name: 'Database Management Systems', type: 'THEORY', hrs: 4, dur: 1, lab: false, facCodes: ['SYNTH-F03', 'SYNTH-F04'] },
    { code: 'SYNTH-CN', name: 'Computer Networks', type: 'THEORY', hrs: 3, dur: 1, lab: false, facCodes: ['SYNTH-F05'] },
    { code: 'SYNTH-OS', name: 'Operating Systems', type: 'THEORY', hrs: 3, dur: 1, lab: false, facCodes: ['SYNTH-F04', 'SYNTH-F06'] },
    { code: 'SYNTH-TOC', name: 'Theory of Computation', type: 'THEORY', hrs: 3, dur: 1, lab: false, facCodes: ['SYNTH-F07'] },
    { code: 'SYNTH-DAAL', name: 'DAA Lab Practicum', type: 'LAB', hrs: 2, dur: 2, lab: true, facCodes: ['SYNTH-F01', 'SYNTH-F08'] },
    { code: 'SYNTH-DBMSL', name: 'DBMS Lab Practicum', type: 'LAB', hrs: 2, dur: 2, lab: true, facCodes: ['SYNTH-F03', 'SYNTH-F08'] },
  ];

  for (const s of subjectSpecs) {
    const subj = await prisma.subject.upsert({
      where: { departmentId_subjectCode: { departmentId: dept.id, subjectCode: s.code } },
      update: {},
      create: {
        departmentId: dept.id,
        subjectCode: s.code,
        name: s.name,
        subjectType: s.type,
        defaultDurationPeriods: s.dur,
      },
    });

    for (let idx = 0; idx < sectionRecords.length; idx++) {
      const sec = sectionRecords[idx];
      let offering = await prisma.subjectOffering.findFirst({
        where: { subjectId: subj.id, academicTermId: term.id, sectionId: sec.id },
      });
      if (!offering) {
        offering = await prisma.subjectOffering.create({
          data: {
            subjectId: subj.id,
            academicTermId: term.id,
            sectionId: sec.id,
            requiredPeriodsPerWeek: s.hrs,
            sessionDurationPeriods: s.dur,
            expectedStudentCount: sec.studentCount,
            requiresLab: s.lab,
            requiresContiguousSlots: s.lab,
          },
        });
      }

      const chosenFacCode = s.facCodes[idx % s.facCodes.length];
      const facId = facultyByCode[chosenFacCode];
      const existingAssign = await prisma.facultyAssignment.findFirst({
        where: { subjectOfferingId: offering.id, facultyId: facId },
      });
      if (!existingAssign) {
        await prisma.facultyAssignment.create({
          data: {
            subjectOfferingId: offering.id,
            facultyId: facId,
            assignmentType: 'PRIMARY',
          },
        });
      }
    }
  }

  return {
    departmentCode: dept.code,
    sections: sectionRecords.length,
    subjects: subjectSpecs.length,
    faculty: facultySpecs.length,
    rooms: roomSpecs.length,
  };
}

if (require.main === module) {
  const prisma = new PrismaClient();
  runSyntheticCseSeed(prisma)
    .then((summary) => {
      console.log('✅ Synthetic CSE seed complete:', summary);
    })
    .catch((err) => {
      console.error('❌ Synthetic seed failed:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
