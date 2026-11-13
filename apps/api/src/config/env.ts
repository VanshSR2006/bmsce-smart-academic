import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

// Strict validation of JWT secret in production mode
const rawJwtSecret = process.env.JWT_SECRET;
const defaultSecret = 'demo-secret-bmsce-smart-academic-2026-key';

if (isProduction) {
  if (!rawJwtSecret || rawJwtSecret === defaultSecret || rawJwtSecret === 'bmsce-academic-secret-key-2026') {
    throw new Error(
      'FATAL SECURITY ERROR: In production mode, JWT_SECRET must be explicitly set to a cryptographically secure string (minimum 32 characters).'
    );
  }
  if (rawJwtSecret.length < 32) {
    throw new Error(
      'FATAL SECURITY ERROR: In production mode, JWT_SECRET must be at least 32 characters long.'
    );
  }
}

function parseCorsOrigin(raw: string | undefined, isProd: boolean): string | string[] {
  if (!raw) {
    return isProd ? 'https://academic.bmsce.ac.in' : 'http://localhost:5173';
  }
  if (raw.includes(',')) {
    return raw.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return raw.trim();
}

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv,
  isProduction,
  jwtSecret: rawJwtSecret || defaultSecret,
  corsOrigin: parseCorsOrigin(process.env.CORS_ORIGIN, isProduction),
  databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',
  // Demo mode is strictly forbidden in production
  isDemo: !isProduction && process.env.IS_DEMO_ENV === 'true',
};
