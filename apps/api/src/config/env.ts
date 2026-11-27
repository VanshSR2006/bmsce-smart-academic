import dotenv from 'dotenv';
import path from 'path';
import { buildCorsAllowlist } from './cors.js';

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

const corsAllowlist = buildCorsAllowlist(process.env);

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv,
  isProduction,
  jwtSecret: rawJwtSecret || defaultSecret,
  corsAllowlist,
  corsOrigins: Array.from(corsAllowlist.explicitOrigins),
  databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',
  // Header bypass stays non-production only. Public demo login may be enabled on free-tier cloud.
  allowDemoAuth: process.env.ALLOW_DEMO_AUTH === 'true',
  isDemo: process.env.ALLOW_DEMO_AUTH === 'true' || (!isProduction && process.env.IS_DEMO_ENV === 'true'),
};
