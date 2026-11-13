import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../../config/prisma.js';
import { config } from '../../config/env.js';
import { requireAuth } from '../../middleware/auth.js';

/** bcrypt hash of the public demo password documented in CLOUD_ENVIRONMENT_VARIABLES.md */
const DEFAULT_DEMO_PASSWORD_HASH = '$2b$10$JO5uPzk3NGT4wY3GJhupleyqgda4AnPxZ.KsBWJpo6jPcm42blhSu';

const demoRoleAliases: Record<string, string> = {
  ADMIN: 'PLATFORM_ADMIN',
  DEAN: 'DEPT_HEAD',
  COORDINATOR: 'CLUSTER_HEAD',
  HOD: 'DEPT_HEAD',
};

export const authRouter = Router();

const demoLoginSchema = z.object({
  role: z.enum(['HOD', 'DEPT_HEAD', 'FACULTY', 'CR', 'STUDENT', 'ADMIN', 'DEAN', 'COORDINATOR']).optional(),
  email: z.string().email().optional(),
});

// List demo personas for easy switching in the UI (Only available in development/demo mode)
authRouter.get('/demo-users', async (req: Request, res: Response) => {
  if (!config.isDemo) {
    return res.status(403).json({
      error: {
        code: 'DEMO_MODE_DISABLED',
        message: 'Demo persona discovery is strictly disabled in production environments.',
      },
    });
  }

  const users = await prisma.user.findMany({
    include: {
      userRoles: {
        include: {
          role: true,
          department: true,
          section: true,
        },
      },
      facultyProfile: true,
      studentProfile: {
        include: {
          section: true,
          batch: true,
        },
      },
    },
  });

  const personas = users.map((u) => {
    const primaryRole = u.userRoles[0]?.role.code || 'STUDENT';
    return {
      id: u.id,
      displayName: u.displayName,
      institutionalEmail: u.institutionalEmail,
      role: primaryRole,
      department: u.userRoles[0]?.department?.name || 'CSE',
      designation: u.facultyProfile?.designation || (primaryRole === 'CR' ? 'Class Representative' : '5th Sem Student'),
      demoIdentifier: u.studentProfile?.demoIdentifier || u.facultyProfile?.employeeCode || null,
    };
  });

  return res.json({ data: personas });
});

// Demo login by role or email (Only available in development/demo mode)
authRouter.post('/demo-login', async (req: Request, res: Response) => {
  if (!config.isDemo) {
    return res.status(403).json({
      error: {
        code: 'DEMO_MODE_DISABLED',
        message: 'Demo authentication is strictly disabled in production. Please use institutional SSO.',
      },
    });
  }

  const parseResult = demoLoginSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid demo login parameters',
        details: parseResult.error.format(),
      },
    });
  }

  const { role = 'STUDENT', email } = parseResult.data;
  const lookupRole = demoRoleAliases[role] || role;

  let user;
  if (email) {
    user = await prisma.user.findUnique({
      where: { institutionalEmail: email },
      include: {
        userRoles: { include: { role: true, department: true, section: true } },
        facultyProfile: true,
        studentProfile: { include: { section: true, batch: true } },
      },
    });
  } else {
    // Find first user with this role
    const targetRole = await prisma.role.findUnique({ where: { code: lookupRole } });
    if (targetRole) {
      const userRole = await prisma.userRole.findFirst({
        where: { roleId: targetRole.id },
        include: {
          user: {
            include: {
              userRoles: { include: { role: true, department: true, section: true } },
              facultyProfile: true,
              studentProfile: { include: { section: true, batch: true } },
            },
          },
        },
      });
      user = userRole?.user;
    }
  }

  if (!user) {
    return res.status(404).json({
      error: { code: 'USER_NOT_FOUND', message: `No demo account found for role ${role}` },
    });
  }

  const primaryRole = user.userRoles[0]?.role.code || role;
  const tokenPayload = {
    userId: user.id,
    role: primaryRole,
    displayName: user.displayName,
    departmentId: user.userRoles[0]?.departmentId,
    sectionId: user.userRoles[0]?.sectionId || user.studentProfile?.sectionId,
    batchId: user.studentProfile?.batchId,
    facultyId: user.facultyProfile?.id,
  };

  const token = jwt.sign(tokenPayload, config.jwtSecret, { expiresIn: '7d' });

  return res.json({
    data: {
      token,
      user: {
        ...tokenPayload,
        institutionalEmail: user.institutionalEmail,
        designation: user.facultyProfile?.designation || (primaryRole === 'CR' ? 'Class Representative' : 'Student (B.Tech CSE)'),
        demoIdentifier: user.studentProfile?.demoIdentifier || user.facultyProfile?.employeeCode,
      },
    },
  });
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

authRouter.post('/login', async (req: Request, res: Response) => {
  const parseResult = loginSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid login parameters',
        details: parseResult.error.format(),
      },
    });
  }

  const { email, password } = parseResult.data;
  const user = await prisma.user.findUnique({
    where: { institutionalEmail: email },
    include: {
      userRoles: { include: { role: true, department: true, section: true } },
      facultyProfile: true,
      studentProfile: { include: { section: true, batch: true } },
    },
  });

  if (!user || user.status !== 'ACTIVE' || !user.isDemo) {
    return res.status(401).json({
      error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
    });
  }

  const passwordHash = process.env.DEMO_PASSWORD_HASH || DEFAULT_DEMO_PASSWORD_HASH;
  const passwordOk = await bcrypt.compare(password, passwordHash);
  if (!passwordOk) {
    return res.status(401).json({
      error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
    });
  }

  const primaryRole = user.userRoles[0]?.role.code || 'STUDENT';
  const tokenPayload = {
    userId: user.id,
    role: primaryRole,
    displayName: user.displayName,
    departmentId: user.userRoles[0]?.departmentId,
    sectionId: user.userRoles[0]?.sectionId || user.studentProfile?.sectionId,
    batchId: user.studentProfile?.batchId,
    facultyId: user.facultyProfile?.id,
  };

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const token = jwt.sign(tokenPayload, config.jwtSecret, { expiresIn: '7d' });
  return res.json({
    data: {
      token,
      user: {
        ...tokenPayload,
        institutionalEmail: user.institutionalEmail,
        designation: user.facultyProfile?.designation || (primaryRole === 'CR' ? 'Class Representative' : 'Student (B.Tech CSE)'),
        demoIdentifier: user.studentProfile?.demoIdentifier || user.facultyProfile?.employeeCode,
      },
    },
  });
});

authRouter.get('/me', requireAuth, async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    include: {
      userRoles: { include: { role: true, department: true, section: true } },
      facultyProfile: true,
      studentProfile: { include: { section: true, batch: true } },
    },
  });

  if (!user) {
    return res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
  }

  return res.json({
    data: {
      userId: user.id,
      displayName: user.displayName,
      institutionalEmail: user.institutionalEmail,
      role: req.user!.role,
      departmentId: user.userRoles[0]?.departmentId,
      sectionId: user.userRoles[0]?.sectionId || user.studentProfile?.sectionId,
      batchId: user.studentProfile?.batchId,
      facultyId: user.facultyProfile?.id,
      designation: user.facultyProfile?.designation || (req.user!.role === 'CR' ? 'Class Representative' : 'Student'),
      demoIdentifier: user.studentProfile?.demoIdentifier || user.facultyProfile?.employeeCode,
    },
  });
});

