import { Router, Request, Response } from 'express';
import { prisma } from '../../config/prisma.js';
import { requireAuth } from '../../middleware/auth.js';

export const communicationRouter = Router();

// Get active chamber data and list of scheduled sessions
communicationRouter.get('/active', async (req: Request, res: Response) => {
  const sessions = [
    {
      id: 'sess-001',
      sectionLabel: 'CSE-B',
      subjectCode: '22CSSPCDAA',
      subjectName: 'Design & Analysis of Algorithms',
      facultyName: 'Dr. A. Ramanathan',
      status: 'TODAY',
      scheduledAt: '08:30–10:30 AM',
      durationMinutes: 60,
      participantCount: 62,
    },
    {
      id: 'sess-002',
      sectionLabel: 'CSE-B',
      subjectCode: '22CSPC204',
      subjectName: 'Database Management Systems',
      facultyName: 'Prof. Sneha K.',
      status: 'TODAY',
      scheduledAt: '10:45–11:45 AM',
      durationMinutes: 60,
      participantCount: 62,
    },
    {
      id: 'sess-003',
      sectionLabel: 'CSE-B',
      subjectCode: '22CSPC205',
      subjectName: 'Computer Networks',
      facultyName: 'Dr. Rajeshwari V.',
      status: 'UPCOMING',
      scheduledAt: 'Tomorrow 10:00–11:00 AM',
      durationMinutes: 60,
      participantCount: 62,
    },
    {
      id: 'sess-004',
      sectionLabel: 'CSE-B',
      subjectCode: '22CSPC206',
      subjectName: 'Operating Systems',
      facultyName: 'Prof. Vikram Sen',
      status: 'CLOSED',
      scheduledAt: 'Yesterday 08:30–09:30 AM',
      durationMinutes: 60,
      participantCount: 59,
    },
  ];

  return res.json({
    data: {
      title: 'Class Communication Centre',
      subtitle: 'Temporary timetable-bound communication chambers for scheduled class occurrences with role-based faculty & CR dispatch.',
      cohortInfo: 'Cohort: 5th Sem CSE-B (64 Students) • 2 Open Live • 3 Directives',
      sessions,
      scheduledSessions: {
        today: [
          {
            id: 'sess-1',
            code: '22CSSPCDAA',
            type: 'Core Theory',
            title: 'Design & Analysis of Algorithms',
            time: '08:30–10:30 AM',
            room: 'PJ-301',
            faculty: 'Dr. A. Ramanathan',
            crName: 'Aryan Rao (DEMO-USN-2024-042)',
            status: 'OPEN',
            closeInMinutes: 45,
            isLive: true,
          },
          {
            id: 'sess-2',
            code: '22CSSPCDBMS',
            type: 'Core Theory',
            title: 'Database Management Systems',
            time: '10:45–11:45 AM',
            room: 'PJ-302',
            faculty: 'Prof. Sneha K.',
            crName: 'Aryan Rao',
            status: 'UPCOMING',
            opensAt: '10:30 AM',
          },
          {
            id: 'sess-3',
            code: '22CSSPL01',
            type: 'Lab Practical',
            title: 'DAA Practical Lab (Batch B1/B2)',
            time: '01:45–04:45 PM',
            room: 'CS-Lab 1',
            faculty: 'Prof. S. Malathi (Proxy)',
            crName: 'Aryan Rao',
            status: 'UPCOMING',
            opensAt: '01:30 PM',
          },
          {
            id: 'sess-4',
            code: '22CSSPCOPS',
            type: 'Archived',
            title: 'Operating Systems',
            time: '08:30–09:30 AM',
            room: 'PJ-304',
            faculty: 'Prof. Vikram Sen',
            status: 'CLOSED',
          },
        ],
      },
      activeChamber: {
        sessionCode: '22CSSPCDAA',
        sessionTitle: 'Design & Analysis of Algorithms',
        cohort: 'SEC-B',
        dateLabel: 'Monday, 14 Oct',
        timeWindow: '08:30–10:30 AM',
        room: 'PJ-301',
        status: 'OPEN (Live Period)',
        closesInText: 'Closes in 45m',
        actionRole: 'Aryan Rao (CR CSE-B)',
        institutionalRule: 'Institutional Rule: Only Primary Faculty & Section CR can post messages. 64 enrolled students receive broadcast stream.',
        pinnedDirective: {
          title: 'PINNED FACULTY DIRECTIVE • SESSION 14-OCT',
          timestamp: 'Pinned 09:28 AM',
          body: 'Bring personal laptops with Python 3.10+ & Jupyter Notebook for dynamic programming benchmark. Benchmark datasets uploaded to BMSCE LMS (Module 4).',
        },
        messages: [
          {
            id: 'msg-1',
            type: 'SYS_EVENT',
            body: 'Chamber initialized at 08:20 AM (10m scheduled start). Dr. A. Ramanathan & Aryan Rao authorized. 61 students connected.',
          },
          {
            id: 'msg-2',
            type: 'CHAT',
            authorName: 'Dr. A. Ramanathan',
            authorRole: 'FACULTY • Professor',
            avatar: 'AR',
            time: '08:32 AM',
            body: 'Good morning Section B. We will be covering Floyd-Warshall and Bellman-Ford algorithm complexities today in Room PJ-302. Please ensure your lab teams have verified problem sets 4 and 5 before we begin matrix proofs.',
          },
          {
            id: 'msg-3',
            type: 'CHAT',
            authorName: 'Aryan Rao',
            authorRole: 'CLASS REP (SEC-B)',
            avatar: 'CR',
            time: '08:36 AM',
            body: 'Good morning Sir. The projector in PJ-302 has been recalibrated by the AV tech team. Also, 4 students from Batch B2 who attended the Smart India Hackathon (SIH) zonal round requested clarification on whether their lab logbooks can be submitted tomorrow morning.',
          },
          {
            id: 'msg-4',
            type: 'DIRECTIVE',
            authorName: 'Dr. A. Ramanathan',
            authorRole: 'OFFICIAL DIRECTIVE',
            avatar: 'AR',
            time: '08:38 AM',
            body: 'Noted Aryan. The SIH participants are granted an official DAAB attendance exception slip. They may submit their lab records tomorrow during remedial tutorial hour (Period 4). All other students must submit today without exception.',
          },
        ],
        governance: {
          status: 'Active',
          chamberState: 'OPEN (Live Period)',
          openTrigger: 'Auto (08:20 AM)',
          readOnlyFreeze: 'End + 60m (11:30 AM)',
          daabArchive: '90-Day Signed Vault',
          dispatchMode: 'Faculty <-> CR Broadcast',
        },
        activeDirectives: [
          { tag: 'URGENT DEADLINE', time: '11:59 PM', text: 'Assignment 3: Greedy vs Dynamic Matrix. Submit through college LMS with test benchmark report.' },
          { tag: 'LAB REQUIREMENT', time: 'CS Lab 1', text: 'Laptop Prep for DAA Practical: Bring personal laptops with Python 3.10 & Jupyter.' },
          { tag: 'VENUE CHANGE', time: 'Thursday P3', text: 'CN Class relocated to Seminar Hall 2 for guest lecture by CISCO.' },
        ],
        stakeholders: [
          { name: 'Dr. A. Ramanathan', role: 'Primary • PJ-301', status: 'Available' },
          { name: 'Prof. S. Malathi', role: 'Co-Instructor / Proxy', status: 'Standby' },
          { name: 'Aryan Rao (CR)', role: 'DEMO-USN-2024-042', status: 'Online' },
          { name: 'Sneha Hegde (Vice-CR)', role: 'DEMO-USN-2024-048', status: 'Standby' },
        ],
      },
    },
  });
});

// Post message to chamber with role verification
communicationRouter.post('/messages', async (req: Request, res: Response) => {
  const messageText = req.body.body || req.body.content;
  const { isImportant = false, senderRole = 'CR', senderName = 'Aryan Rao' } = req.body;

  if (!messageText || String(messageText).trim().length === 0) {
    return res.status(400).json({ error: { code: 'EMPTY_MESSAGE', message: 'Message cannot be empty' } });
  }

  // Institutional rule: Only Faculty and CR can post
  const allowed = ['FACULTY', 'CR', 'DEPT_HEAD', 'CLUSTER_HEAD'];
  if (!allowed.includes(String(senderRole).toUpperCase())) {
    return res.status(403).json({
      error: { code: 'PERMISSION_DENIED', message: 'Only Primary Faculty and Section CR are permitted to broadcast into this chamber.' },
    });
  }

  const newMessage = {
    id: `msg-${Date.now()}`,
    type: isImportant ? 'DIRECTIVE' : 'CHAT',
    authorName: senderName,
    authorRole: senderRole === 'CR' ? 'CLASS REP (SEC-B)' : 'FACULTY • Professor',
    avatar: senderRole === 'CR' ? 'CR' : 'AR',
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    body: String(messageText).trim(),
    content: String(messageText).trim(),
    isImportant,
  };

  return res.json({ data: { ...newMessage, success: true }, success: true });
});

