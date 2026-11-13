import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting BMSCE Smart Academic Deterministic Seed...');

  // Reset demo tables for clean idempotent seeding
  await prisma.auditLog.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.messageAttachment.deleteMany({});
  await prisma.chatMessage.deleteMany({});
  await prisma.chatMember.deleteMany({});
  await prisma.chatSpace.deleteMany({});
  await prisma.classSessionOccurrence.deleteMany({});
  await prisma.repairChange.deleteMany({});
  await prisma.repairProposal.deleteMany({});
  await prisma.disruptionAffectedSession.deleteMany({});
  await prisma.disruption.deleteMany({});
  await prisma.validationIssue.deleteMany({});
  await prisma.validationReport.deleteMany({});
  await prisma.candidateSession.deleteMany({});
  await prisma.optimizationCandidate.deleteMany({});
  await prisma.optimizationRun.deleteMany({});
  await prisma.scheduleException.deleteMany({});
  await prisma.timetablePublication.deleteMany({});
  await prisma.timetableSession.deleteMany({});
  await prisma.timetableVersion.deleteMany({});
  await prisma.timetable.deleteMany({});
  await prisma.timePeriod.deleteMany({});
  await prisma.bellSchedule.deleteMany({});
  await prisma.facultyAssignment.deleteMany({});
  await prisma.subjectOffering.deleteMany({});
  await prisma.subject.deleteMany({});
  await prisma.examinationRoomAllocation.deleteMany({});
  await prisma.examinationEvent.deleteMany({});
  await prisma.examinationPublication.deleteMany({});
  await prisma.examinationCycle.deleteMany({});
  await prisma.student.deleteMany({});
  await prisma.facultyWorkloadRule.deleteMany({});
  await prisma.facultyAvailability.deleteMany({});
  await prisma.faculty.deleteMany({});
  await prisma.batch.deleteMany({});
  await prisma.section.deleteMany({});
  await prisma.program.deleteMany({});
  await prisma.userRole.deleteMany({});
  await prisma.user.deleteMany({});


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
      update: {},
      create: { code: r.code, name: r.name },
    });
    roleMap[r.code] = role.id;
  }

  // 2. Department & Cluster
  const dept = await prisma.department.upsert({
    where: { code: 'DEMO-CSE' },
    update: {},
    create: {
      code: 'DEMO-CSE',
      name: 'Department of Computer Science & Engineering',
      isDemo: true,
    },
  });

  const cluster = await prisma.cluster.upsert({
    where: { departmentId_code: { departmentId: dept.id, code: 'CLUSTER-A' } },
    update: {},
    create: {
      departmentId: dept.id,
      code: 'CLUSTER-A',
      name: 'Cluster Alpha - Autonomous Academic Cluster',
    },
  });

  // 3. Academic Term
  const term = await prisma.academicTerm.create({
    data: {
      academicYearLabel: 'Academic Year 2024-25',
      termLabel: 'Odd Semester',
      startDate: new Date('2024-08-01T00:00:00Z'),
      endDate: new Date('2024-12-31T00:00:00Z'),
      status: 'ACTIVE',
      isDemo: true,
    },
  });

  // 4. Program & Section & Batches
  const program = await prisma.program.create({
    data: {
      departmentId: dept.id,
      code: 'BTECH-CSE',
      name: 'Bachelor of Technology in Computer Science & Engineering',
      degreeLevel: 'UNDERGRADUATE',
    },
  });

  const section = await prisma.section.create({
    data: {
      departmentId: dept.id,
      clusterId: cluster.id,
      programId: program.id,
      academicTermId: term.id,
      semesterNumber: 5,
      sectionCode: 'CSE-5B',
      displayName: 'Demo Section CSE-B',
      studentCount: 64,
      status: 'ACTIVE',
    },
  });

  const batch1 = await prisma.batch.create({
    data: {
      sectionId: section.id,
      batchCode: 'B1',
      displayName: 'Batch B1 (01-25)',
      studentCount: 25,
    },
  });

  const batch2 = await prisma.batch.create({
    data: {
      sectionId: section.id,
      batchCode: 'B2',
      displayName: 'Batch B2 (26-50)',
      studentCount: 25,
    },
  });

  const batch3 = await prisma.batch.create({
    data: {
      sectionId: section.id,
      batchCode: 'B3',
      displayName: 'Batch B3 (51+)',
      studentCount: 14,
    },
  });

  // 5. Users and Profiles
  // HOD
  const hodUser = await prisma.user.create({
    data: {
      institutionalEmail: 'hod.cse@bmsce.ac.in',
      displayName: 'Dr. K. R. Suresh',
      isDemo: true,
      userRoles: {
        create: {
          roleId: roleMap['DEPT_HEAD'],
          departmentId: dept.id,
        },
      },
      facultyProfile: {
        create: {
          departmentId: dept.id,
          employeeCode: 'EMP-CSE-001',
          designation: 'HOD CSE - Professor',
          cabinLocation: 'PJ-401 HOD Chamber',
        },
      },
    },
  });

  // Faculty Members
  const facultyData = [
    { name: 'Dr. A. Ramanathan', email: 'ramanathan.cse@bmsce.ac.in', code: 'EMP-CSE-011', desig: 'Professor & Course Coordinator DAA', cabin: 'PJ-310' },
    { name: 'Prof. Sneha K.', email: 'sneha.cse@bmsce.ac.in', code: 'EMP-CSE-012', desig: 'Assistant Professor DBMS', cabin: 'PJ-311' },
    { name: 'Dr. Rajeshwari V.', email: 'rajeshwari.cse@bmsce.ac.in', code: 'EMP-CSE-013', desig: 'Associate Professor CN', cabin: 'PJ-312' },
    { name: 'Prof. Vikram Sen', email: 'vikram.cse@bmsce.ac.in', code: 'EMP-CSE-014', desig: 'Assistant Professor OS', cabin: 'PJ-314' },
    { name: 'Dr. K. M. Rao', email: 'kmrao.math@bmsce.ac.in', code: 'EMP-MATH-005', desig: 'Professor Theory of Computation', cabin: 'PJ-201' },
    { name: 'Dr. M. Nandhini', email: 'nandhini.cse@bmsce.ac.in', code: 'EMP-CSE-016', desig: 'Associate Professor SE', cabin: 'PJ-315' },
    { name: 'Prof. S. Malathi', email: 'malathi.cse@bmsce.ac.in', code: 'EMP-CSE-017', desig: 'Associate Professor (Proxy Eligible)', cabin: 'PJ-316' },
  ];

  const facultyMap: Record<string, string> = {};
  for (const f of facultyData) {
    const user = await prisma.user.create({
      data: {
        institutionalEmail: f.email,
        displayName: f.name,
        isDemo: true,
        userRoles: {
          create: {
            roleId: roleMap['FACULTY'],
            departmentId: dept.id,
          },
        },
        facultyProfile: {
          create: {
            departmentId: dept.id,
            employeeCode: f.code,
            designation: f.desig,
            cabinLocation: f.cabin,
          },
        },
      },
      include: { facultyProfile: true },
    });
    facultyMap[f.name] = user.facultyProfile!.id;
  }

  // Student & CR
  const crUser = await prisma.user.create({
    data: {
      institutionalEmail: 'aryan.rao@student.bmsce.ac.in',
      displayName: 'Aryan Rao',
      isDemo: true,
      userRoles: {
        create: {
          roleId: roleMap['CR'],
          sectionId: section.id,
        },
      },
      studentProfile: {
        create: {
          sectionId: section.id,
          batchId: batch1.id,
          demoIdentifier: 'DEMO-USN-2024-042',
        },
      },
    },
  });

  const studentUser = await prisma.user.create({
    data: {
      institutionalEmail: 'arjun@student.bmsce.ac.in',
      displayName: 'Arjun',
      isDemo: true,
      userRoles: {
        create: {
          roleId: roleMap['STUDENT'],
          sectionId: section.id,
        },
      },
      studentProfile: {
        create: {
          sectionId: section.id,
          batchId: batch1.id,
          demoIdentifier: 'DEMO-USN-2024-015',
        },
      },
    },
  });

  // 6. Rooms
  const roomsData = [
    { code: 'PJ-301', name: 'Platinum Jubilee Lecture Hall 301', type: 'CLASSROOM', capacity: 75, loc: 'Platinum Jubilee Block (3rd Floor)' },
    { code: 'PJ-302', name: 'Sample Room PJ-302', type: 'CLASSROOM', capacity: 75, loc: 'Platinum Jubilee Block (3rd Floor)' },
    { code: 'PJ-303', name: 'Buffer Classroom PJ-303', type: 'CLASSROOM', capacity: 75, loc: 'Platinum Jubilee Block (3rd Floor)' },
    { code: 'PJ-304', name: 'Elective Room PJ-304', type: 'CLASSROOM', capacity: 75, loc: 'Platinum Jubilee Block (3rd Floor)' },
    { code: 'CS-L1', name: 'Systems Lab 1', type: 'LAB', capacity: 40, loc: 'Department Computing Complex' },
    { code: 'CS-L2', name: 'Software Lab 2', type: 'LAB', capacity: 40, loc: 'Department Computing Complex' },
    { code: 'CS-L3', name: 'HPC Cluster Lab 3', type: 'LAB', capacity: 40, loc: 'Academic Complex & PG Block' },
    { code: 'SEMINAR-HALL-2', name: 'Seminar Hall 2', type: 'SEMINAR_HALL', capacity: 150, loc: 'Main Administrative Block' },
  ];

  const roomMap: Record<string, string> = {};
  for (const r of roomsData) {
    const room = await prisma.room.upsert({
      where: { roomCode: r.code },
      update: {},
      create: {
        departmentId: dept.id,
        roomCode: r.code,
        name: r.name,
        roomType: r.type,
        capacity: r.capacity,
        locationLabel: r.loc,
      },
    });
    roomMap[r.code] = room.id;
  }

  // 7. Subjects & Offerings
  const subjectsData = [
    { code: '22CSSPCDAA', name: 'Design & Analysis of Algorithms', type: 'THEORY', dur: 1, lab: false, faculty: 'Dr. A. Ramanathan' },
    { code: '22CSSPL02', name: 'DAA Lab Practicum', type: 'LAB', dur: 3, lab: true, faculty: 'Dr. A. Ramanathan' },
    { code: '22CSSPCDBMS', name: 'Database Management Systems', type: 'THEORY', dur: 1, lab: false, faculty: 'Prof. Sneha K.' },
    { code: '22CSSPL01', name: 'DBMS Practicum', type: 'LAB', dur: 3, lab: true, faculty: 'Prof. Sneha K.' },
    { code: '22CSSPCCNT', name: 'Computer Networks', type: 'THEORY', dur: 1, lab: false, faculty: 'Dr. Rajeshwari V.' },
    { code: '22CSSPL03', name: 'Computer Networks Lab', type: 'LAB', dur: 3, lab: true, faculty: 'Dr. Rajeshwari V.' },
    { code: '22CSSPCOPS', name: 'Operating Systems', type: 'THEORY', dur: 1, lab: false, faculty: 'Prof. Vikram Sen' },
    { code: '22MASPCTFL', name: 'Theory of Computation', type: 'THEORY', dur: 1, lab: false, faculty: 'Dr. K. M. Rao' },
    { code: '22CSSPCSE', name: 'Software Engineering & Agile', type: 'THEORY', dur: 1, lab: false, faculty: 'Dr. M. Nandhini' },
  ];

  const offeringMap: Record<string, string> = {};
  for (const s of subjectsData) {
    const subj = await prisma.subject.create({
      data: {
        departmentId: dept.id,
        subjectCode: s.code,
        name: s.name,
        subjectType: s.type,
        defaultDurationPeriods: s.dur,
      },
    });

    const offering = await prisma.subjectOffering.create({
      data: {
        subjectId: subj.id,
        academicTermId: term.id,
        sectionId: section.id,
        requiredPeriodsPerWeek: s.type === 'LAB' ? 3 : 4,
        sessionDurationPeriods: s.dur,
        expectedStudentCount: section.studentCount,
        requiresLab: s.lab,
        requiresContiguousSlots: s.lab,
        facultyAssignments: {
          create: {
            facultyId: facultyMap[s.faculty],
            assignmentType: 'PRIMARY',
          },
        },
      },
    });
    offeringMap[s.code] = offering.id;
  }

  // 8. Bell Schedule & Periods
  const bellSchedule = await prisma.bellSchedule.create({
    data: {
      academicTermId: term.id,
      name: 'Standard Autonomous Bell Schedule',
      effectiveFrom: new Date('2024-08-01T00:00:00Z'),
      periods: {
        create: [
          { periodNumber: 1, label: 'Period 1', startTime: '08:30', endTime: '09:30', periodType: 'CLASS' },
          { periodNumber: 2, label: 'Period 2', startTime: '09:30', endTime: '10:30', periodType: 'CLASS' },
          { periodNumber: 3, label: 'Morning Recess', startTime: '10:30', endTime: '10:45', periodType: 'BREAK' },
          { periodNumber: 4, label: 'Period 3', startTime: '10:45', endTime: '11:45', periodType: 'CLASS' },
          { periodNumber: 5, label: 'Period 4', startTime: '11:45', endTime: '12:45', periodType: 'CLASS' },
          { periodNumber: 6, label: 'Lunch Recess', startTime: '12:45', endTime: '01:45', periodType: 'LUNCH' },
          { periodNumber: 7, label: 'Period 5 (Lab Block)', startTime: '01:45', endTime: '02:45', periodType: 'CLASS' },
          { periodNumber: 8, label: 'Period 6 (Lab Block)', startTime: '02:45', endTime: '03:45', periodType: 'CLASS' },
          { periodNumber: 9, label: 'Period 7 (Lab Block)', startTime: '03:45', endTime: '04:45', periodType: 'CLASS' },
        ],
      },
    },
  });

  // 9. Timetable & Master Version v4.2
  const timetable = await prisma.timetable.create({
    data: {
      academicTermId: term.id,
      departmentId: dept.id,
      clusterId: cluster.id,
      name: 'CSE Autonomous Master Timetable v4.2',
      scopeType: 'DEPARTMENT',
      status: 'ACTIVE',
      createdById: hodUser.id,
    },
  });

  const timetableVersion = await prisma.timetableVersion.create({
    data: {
      timetableId: timetable.id,
      versionNumber: 4,
      status: 'PUBLISHED',
      sourceType: 'OPTIMIZER',
      validationStatus: 'PASSED',
      hardViolationCount: 0,
      softPenalty: 14.2,
      createdById: hodUser.id,
      approvedById: hodUser.id,
      publishedById: hodUser.id,
      approvedAt: new Date('2024-10-12T00:00:00Z'),
      publishedAt: new Date('2024-10-13T00:00:00Z'),
      changeSummary: 'Finalized autonomous v4.2 schedule for Odd Sem 2024-25 with 0 hard conflicts.',
    },
  });

  // Create Timetable Sessions matching design/student-timetable.png:
  // Mon:
  // P1 (08:30-09:30): 22CSSPCDAA (Dr. A. Ramanathan, PJ-302)
  // P2 (09:30-10:30): 22CSSPCDBMS (Prof. Sneha K., PJ-302)
  // P3 (10:45-11:45): 22CSSPCCNT (Dr. Rajeshwari V., PJ-302)
  // P4 (11:45-12:45): 22MASPCTFL (Dr. K. M. Rao, PJ-302)
  // Tue:
  // P1: 22CSSPCOPS (Prof. Vikram Sen, PJ-304)
  // P2: 22CSSPCCNT (Dr. Rajeshwari V., PJ-302)
  // P3: 22CSSPCDAA (Dr. A. Ramanathan, PJ-302)
  // P4: 22CSSPCDBMS (Prof. Sneha K., PJ-302)
  // P5-P7 (01:45-04:45): 22CSSPL01 DBMS Practicum (Prof. Sneha K., CS-L2, 3-hr lab)
  // Wed:
  // P1: 22MASPCTFL (Dr. K. M. Rao, PJ-302)
  // P2: 22CSSPCSE (Dr. M. Nandhini, PJ-302)
  // P3: 22CSSPCDBMS (Prof. Sneha K., PJ-302)
  // P5-P7: 22CSSPL02 DAA Lab Practicum (Dr. A. Ramanathan, CS-L1, 3-hr lab)
  // Thu:
  // P1: 22CSSPCDAA (Dr. A. Ramanathan, PJ-302)
  // P2: 22CSSPCOPS (Prof. Vikram Sen, PJ-302)
  // P3: 22CSSPCSE (Dr. M. Nandhini, PJ-302)
  // Fri:
  // P5-P7: 22CSSPL03 Computer Networks Lab (Dr. Rajeshwari V., CS-L1, 3-hr lab)

  const sessions = [
    // Mon
    { day: 1, start: '08:30', end: '09:30', p: 1, dur: 1, subj: '22CSSPCDAA', fac: 'Dr. A. Ramanathan', rm: 'PJ-302' },
    { day: 1, start: '09:30', end: '10:30', p: 2, dur: 1, subj: '22CSSPCDBMS', fac: 'Prof. Sneha K.', rm: 'PJ-302' },
    { day: 1, start: '10:45', end: '11:45', p: 3, dur: 1, subj: '22CSSPCCNT', fac: 'Dr. Rajeshwari V.', rm: 'PJ-302' },
    { day: 1, start: '11:45', end: '12:45', p: 4, dur: 1, subj: '22MASPCTFL', fac: 'Dr. K. M. Rao', rm: 'PJ-302' },

    // Tue
    { day: 2, start: '08:30', end: '09:30', p: 1, dur: 1, subj: '22CSSPCOPS', fac: 'Prof. Vikram Sen', rm: 'PJ-304' },
    { day: 2, start: '09:30', end: '10:30', p: 2, dur: 1, subj: '22CSSPCCNT', fac: 'Dr. Rajeshwari V.', rm: 'PJ-302' },
    { day: 2, start: '10:45', end: '11:45', p: 3, dur: 1, subj: '22CSSPCDAA', fac: 'Dr. A. Ramanathan', rm: 'PJ-302' },
    { day: 2, start: '11:45', end: '12:45', p: 4, dur: 1, subj: '22CSSPCDBMS', fac: 'Prof. Sneha K.', rm: 'PJ-302' },
    { day: 2, start: '01:45', end: '04:45', p: 5, dur: 3, subj: '22CSSPL01', fac: 'Prof. Sneha K.', rm: 'CS-L2' },

    // Wed
    { day: 3, start: '08:30', end: '09:30', p: 1, dur: 1, subj: '22MASPCTFL', fac: 'Dr. K. M. Rao', rm: 'PJ-302' },
    { day: 3, start: '09:30', end: '10:30', p: 2, dur: 1, subj: '22CSSPCSE', fac: 'Dr. M. Nandhini', rm: 'PJ-302' },
    { day: 3, start: '10:45', end: '11:45', p: 3, dur: 1, subj: '22CSSPCDBMS', fac: 'Prof. Sneha K.', rm: 'PJ-302' },
    { day: 3, start: '01:45', end: '04:45', p: 5, dur: 3, subj: '22CSSPL02', fac: 'Dr. A. Ramanathan', rm: 'CS-L1' },

    // Thu
    { day: 4, start: '08:30', end: '09:30', p: 1, dur: 1, subj: '22CSSPCDAA', fac: 'Dr. A. Ramanathan', rm: 'PJ-302' },
    { day: 4, start: '09:30', end: '10:30', p: 2, dur: 1, subj: '22CSSPCOPS', fac: 'Prof. Vikram Sen', rm: 'PJ-302' },
    { day: 4, start: '10:45', end: '11:45', p: 3, dur: 1, subj: '22CSSPCSE', fac: 'Dr. M. Nandhini', rm: 'PJ-302' },

    // Fri
    { day: 5, start: '01:45', end: '04:45', p: 5, dur: 3, subj: '22CSSPL03', fac: 'Dr. Rajeshwari V.', rm: 'CS-L1' },
  ];

  let primaryDaaSessionId = '';
  for (const s of sessions) {
    const sessionRecord = await prisma.timetableSession.create({
      data: {
        timetableVersionId: timetableVersion.id,
        subjectOfferingId: offeringMap[s.subj],
        facultyId: facultyMap[s.fac],
        roomId: roomMap[s.rm],
        sectionId: section.id,
        dayOfWeek: s.day,
        startTime: s.start,
        endTime: s.end,
        startPeriodNumber: s.p,
        durationPeriods: s.dur,
        sessionKind: s.dur > 1 ? 'LAB' : 'LECTURE',
      },
    });

    if (s.day === 1 && s.p === 1) {
      primaryDaaSessionId = sessionRecord.id;
    }
  }

  // 10. Class Occurrence & Communication Chamber
  if (primaryDaaSessionId) {
    const occurrence = await prisma.classSessionOccurrence.create({
      data: {
        timetableSessionId: primaryDaaSessionId,
        sessionDate: new Date('2024-10-14T00:00:00Z'),
        effectiveFacultyId: facultyMap['Dr. A. Ramanathan'],
        effectiveRoomId: roomMap['PJ-302'],
        effectiveStartTime: '08:30',
        effectiveEndTime: '09:30',
        status: 'OPEN',
      },
    });

    const chatSpace = await prisma.chatSpace.create({
      data: {
        classSessionOccurrenceId: occurrence.id,
        opensAt: new Date('2024-10-14T08:20:00Z'),
        closesAt: new Date('2024-10-14T10:30:00Z'),
        status: 'OPEN',
        members: {
          create: [
            { userId: hodUser.id, membershipRole: 'FACULTY', canSendMessages: true },
            { userId: crUser.id, membershipRole: 'CR', canSendMessages: true },
            { userId: studentUser.id, membershipRole: 'STUDENT', canSendMessages: false },
          ],
        },
        messages: {
          create: [
            {
              senderUserId: hodUser.id,
              messageType: 'ANNOUNCEMENT',
              body: 'Bring personal laptops with Python 3.10+ & Jupyter Notebook for dynamic programming benchmark. Benchmark datasets uploaded to BMSCE LMS (Module 4).',
              isImportant: true,
            },
            {
              senderUserId: hodUser.id,
              messageType: 'TEXT',
              body: 'Good morning Section B. We will be covering Floyd-Warshall and Bellman-Ford algorithm complexities today in Room PJ-302. Please ensure your lab teams have verified problem sets 4 and 5 before we begin matrix proofs.',
              isImportant: false,
            },
            {
              senderUserId: crUser.id,
              messageType: 'TEXT',
              body: 'Good morning Sir. The projector in PJ-302 has been recalibrated by the AV tech team. Also, 4 students from Batch B2 who attended the Smart India Hackathon (SIH) zonal round requested clarification on whether their lab logbooks can be submitted tomorrow morning.',
              isImportant: false,
            },
            {
              senderUserId: hodUser.id,
              messageType: 'ANNOUNCEMENT',
              body: 'Noted Aryan. The SIH participants are granted an official DAAB attendance exception slip. They may submit their lab records tomorrow during remedial tutorial hour (Period 4). All other students must submit today without exception.',
              isImportant: true,
            },
          ],
        },
      },
    });
  }

  // 11. Disruption & Timetable Repair Candidate
  const disruption = await prisma.disruption.create({
    data: {
      academicTermId: term.id,
      reportedById: hodUser.id,
      disruptionType: 'FACULTY_UNAVAILABLE',
      affectedFacultyId: facultyMap['Dr. A. Ramanathan'],
      affectedDate: new Date('2024-10-14T00:00:00Z'),
      startTime: '08:30',
      endTime: '09:30',
      reason: 'Urgent medical unavailability for Monday morning contact sessions.',
      status: 'PROPOSALS_READY',
      proposals: {
        create: [
          {
            strategyCode: 'SUBSTITUTE_FACULTY',
            status: 'VALID',
            impactMetrics: JSON.stringify({
              disruptionImpactScore: 96.2,
              impactCategory: 'OPTIMAL_REPAIR',
              targetSlot: 'Mon 08:30 - 09:30 AM',
              venue: 'PJ-302 (Reserved)',
              replacement: 'Prof. S. Malathi (Assoc. Prof, DAA Co-Instructor)',
              facultyAvailable: 'Assigned 15h / 18h limit',
              cohortMovement: 'Zero relocation',
              curriculumSync: 'Module 3 Exam Trackers matched',
            }),
            createdById: hodUser.id,
          },
          {
            strategyCode: 'ALTERNATE_SLOT',
            status: 'VALID',
            impactMetrics: JSON.stringify({
              disruptionImpactScore: 84.6,
              impactCategory: 'CONTAINED_RESCHEDULED',
              targetSlot: 'Thu 03:45 - 04:45 PM',
              venue: 'PJ-302 (Slot Open)',
              replacement: 'Dr. A. Ramanathan (Post-recovery)',
              facultyAvailable: 'Slot available on Thursday',
              cohortMovement: 'Zero relocation',
              curriculumSync: 'Contained within week',
            }),
            createdById: hodUser.id,
          },
          {
            strategyCode: 'FREE_PERIOD',
            status: 'VALID',
            impactMetrics: JSON.stringify({
              disruptionImpactScore: 68.0,
              impactCategory: 'DEFICIT_INCURRED',
              targetSlot: 'Mon 08:30 - 09:30 AM',
              venue: 'Digital Library (LIB-3)',
              replacement: 'Asst. Librarian On-Duty',
              facultyAvailable: 'Zero faculty credit',
              cohortMovement: 'Relocation to library',
              curriculumSync: 'Requires 1h makeup class',
            }),
            createdById: hodUser.id,
          },
        ],
      },
    },
  });

  // 12. Examination Cycle & Events (CIE-2)
  const examCycle = await prisma.examinationCycle.create({
    data: {
      academicTermId: term.id,
      departmentId: dept.id,
      name: 'CIE-2 Timetable (Oct 28 - Nov 02, 2024)',
      examType: 'CIE',
      status: 'PUBLISHED',
      versionNumber: 2,
      createdById: hodUser.id,
      approvedById: hodUser.id,
      publishedAt: new Date('2024-10-10T00:00:00Z'),
      events: {
        create: [
          {
            subjectOfferingId: offeringMap['22CSSPCDAA'],
            examDate: new Date('2024-10-28T00:00:00Z'),
            startTime: '09:30',
            endTime: '11:00',
            durationMinutes: 90,
            instructions: 'VTU Data Handbook Allowed. No programmable calculators.',
            roomAllocations: {
              create: [
                { roomId: roomMap['PJ-301'], allocatedStudentCount: 64 },
                { roomId: roomMap['PJ-302'], allocatedStudentCount: 64 },
                { roomId: roomMap['PJ-304'], allocatedStudentCount: 64 },
              ],
            },
          },
          {
            subjectOfferingId: offeringMap['22CSSPCDBMS'],
            examDate: new Date('2024-10-29T00:00:00Z'),
            startTime: '09:30',
            endTime: '11:00',
            durationMinutes: 90,
            roomAllocations: {
              create: [
                { roomId: roomMap['PJ-301'], allocatedStudentCount: 64 },
                { roomId: roomMap['PJ-302'], allocatedStudentCount: 64 },
              ],
            },
          },
          {
            subjectOfferingId: offeringMap['22CSSPCCNT'],
            examDate: new Date('2024-10-30T00:00:00Z'),
            startTime: '09:30',
            endTime: '11:00',
            durationMinutes: 90,
            roomAllocations: {
              create: [
                { roomId: roomMap['PJ-301'], allocatedStudentCount: 64 },
                { roomId: roomMap['PJ-302'], allocatedStudentCount: 64 },
              ],
            },
          },
          {
            subjectOfferingId: offeringMap['22CSSPCOPS'],
            examDate: new Date('2024-11-02T00:00:00Z'),
            startTime: '02:00',
            endTime: '03:30',
            durationMinutes: 90,
            roomAllocations: {
              create: [
                { roomId: roomMap['PJ-301'], allocatedStudentCount: 64 },
                { roomId: roomMap['PJ-302'], allocatedStudentCount: 64 },
              ],
            },
          },
        ],
      },
    },
  });

  console.log('✅ Deterministic seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
