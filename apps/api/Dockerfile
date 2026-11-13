# =============================================================================
# BMSCE Smart Academic — API Dockerfile
# Multi-stage build: compile TypeScript → production Node.js image
# =============================================================================

# ── Stage 1: Builder ──────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Copy workspace manifests first for layer-caching of npm install
COPY package.json package-lock.json ./
COPY packages/contracts/package.json ./packages/contracts/
COPY apps/api/package.json ./apps/api/

# Install ALL workspace dependencies (including devDependencies for tsc)
RUN npm ci

# Copy source
COPY packages/ packages/
COPY apps/api/ apps/api/
COPY prisma/ prisma/

# Generate Prisma client (required so TypeScript can resolve @prisma/client types)
RUN npx prisma generate

# Compile TypeScript
RUN npm run build --workspace=apps/api

# ── Stage 2: Production runtime ───────────────────────────────────────────────
FROM node:22-alpine AS runtime

WORKDIR /app

# Only install production dependencies in the runtime image
COPY package.json package-lock.json ./
COPY packages/contracts/package.json ./packages/contracts/
COPY apps/api/package.json ./apps/api/

RUN npm ci --omit=dev

# Copy compiled output from builder
COPY --from=builder /app/apps/api/dist ./apps/api/dist/

# Copy Prisma schema, migrations, and generated client (required at runtime)
COPY --from=builder /app/prisma ./prisma/
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma/
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma/

# Copy entrypoint script
COPY apps/api/docker-entrypoint.sh ./
RUN chmod +x ./docker-entrypoint.sh

# Non-root user for security
RUN addgroup -S bmsce && adduser -S bmsce -G bmsce
USER bmsce

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -q -O - http://localhost:3001/api/v1/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "apps/api/dist/server.js"]
