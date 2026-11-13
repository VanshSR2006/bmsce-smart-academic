import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const requestId = (req.headers['x-request-id'] as string) || `req_${Date.now()}`;

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Invalid input parameters',
        details: err.errors,
        requestId,
      },
    });
  }

  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_SERVER_ERROR';
  const message = err.message || 'An unexpected error occurred';

  console.error(`[Error] [${requestId}] ${code}: ${message}`, err.stack);

  return res.status(statusCode).json({
    error: {
      code,
      message,
      details: err.details || null,
      requestId,
    },
  });
}

