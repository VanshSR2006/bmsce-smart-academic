# =============================================================================
# BMSCE Smart Academic — Web (Frontend) Dockerfile
# Multi-stage: Vite build → nginx static server
# =============================================================================

# ── Stage 1: Builder ──────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Copy workspace manifests
COPY package.json package-lock.json ./
COPY packages/contracts/package.json ./packages/contracts/
COPY apps/web/package.json ./apps/web/

# Install all dependencies
RUN npm ci

# Copy source
COPY packages/ packages/
COPY apps/web/ apps/web/

# VITE_* vars must be baked in at build time
# Pass them via --build-arg in docker build or docker compose build
ARG VITE_API_BASE_URL=https://academic.bmsce.ac.in/api/v1
ARG VITE_SOCKET_URL=https://academic.bmsce.ac.in
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL

# Production build
RUN npm run build --workspace=apps/web

# ── Stage 2: nginx static server ─────────────────────────────────────────────
FROM nginx:1.27-alpine AS runtime

# Remove default nginx page
RUN rm -rf /usr/share/nginx/html/*

# Copy Vite build output
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Copy custom nginx config
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O - http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]

