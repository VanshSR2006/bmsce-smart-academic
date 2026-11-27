const CANONICAL_PRODUCTION_ORIGINS = [
  'https://campusflow-sepia-seven.vercel.app',
  'https://bmsce-smart-academic.vercel.app',
  'https://academic.bmsce.ac.in',
];

const VERCEL_TEAM_SUFFIX = 'vanshs-projects-7e09506e';

const PROJECT_VERCEL_PREVIEW_PATTERNS: RegExp[] = [
  new RegExp(
    `^https:\\/\\/campusflow(?:-[a-z0-9]+|-git-[a-z0-9-]+)?-${VERCEL_TEAM_SUFFIX}\\.vercel\\.app$`
  ),
  new RegExp(
    `^https:\\/\\/bmsce-smart-academic(?:-[a-z0-9]+|-git-[a-z0-9-]+)?-${VERCEL_TEAM_SUFFIX}\\.vercel\\.app$`
  ),
];

const LOCALHOST_ORIGIN_PATTERN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/+$/, '');
}

function splitEnvOrigins(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean);
}

export interface CorsAllowlistConfig {
  explicitOrigins: Set<string>;
  allowLocalhost: boolean;
}

export function buildCorsAllowlist(env: NodeJS.ProcessEnv = process.env): CorsAllowlistConfig {
  const configured = [
    ...splitEnvOrigins(env.CORS_ORIGIN),
    ...splitEnvOrigins(env.FRONTEND_URL),
    ...splitEnvOrigins(env.FRONTEND_URLS),
  ];

  const explicitOrigins = new Set<string>([
    ...CANONICAL_PRODUCTION_ORIGINS,
    ...configured,
  ]);

  return {
    explicitOrigins,
    allowLocalhost: env.NODE_ENV !== 'production',
  };
}

export function isOriginAllowed(
  origin: string | undefined,
  allowlist: CorsAllowlistConfig = buildCorsAllowlist()
): boolean {
  // Allow same-origin, server-to-server, and health-check requests without an Origin header
  if (!origin) {
    return true;
  }

  const normalized = normalizeOrigin(origin);

  if (allowlist.explicitOrigins.has(normalized)) {
    return true;
  }

  if (allowlist.allowLocalhost && LOCALHOST_ORIGIN_PATTERN.test(normalized)) {
    return true;
  }

  return PROJECT_VERCEL_PREVIEW_PATTERNS.some((pattern) => pattern.test(normalized));
}

export type CorsOriginCallback = (err: Error | null, allow?: boolean) => void;

export function createCorsOriginValidator(
  allowlist: CorsAllowlistConfig = buildCorsAllowlist()
): (origin: string | undefined, callback: CorsOriginCallback) => void {
  return (origin, callback) => {
    callback(null, isOriginAllowed(origin, allowlist));
  };
}
