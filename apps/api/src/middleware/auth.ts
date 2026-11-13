import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { prisma } from '../config/prisma.js';

export interface AuthContext {
  userId: string;
  role: string;
  departmentId?: string;
  sectionId?: string;
  batchId?: string;
  facultyId?: string;
  displayName: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthContext;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // Demo mode header bypass ONLY in explicitly enabled non-production environments
  const demoRole = req.headers['x-demo-role'] as string;
  const demoUserId = req.headers['x-demo-user-id'] as string;

  if (config.isDemo && !config.isProduction && demoRole) {
    req.user = {
      userId: demoUserId || 'demo-user-id',
      role: demoRole.toUpperCase(),
      displayName: (req.headers['x-demo-name'] as string) || 'Demo User',
    };
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(); // Unauthenticated, may be handled by requireAuth
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as any;
    req.user = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({
      error: {
        code: 'INVALID_TOKEN',
        message: 'Authentication token is invalid or expired',
      },
    });
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Authentication required for this resource',
      },
    });
  }
  return next();
}

export function requireRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Authentication required',
        },
      });
    }

    const userRole = req.user.role;
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. Requires one of roles: ${allowedRoles.join(', ')}`,
        },
      });
    }

    return next();
  };
}

