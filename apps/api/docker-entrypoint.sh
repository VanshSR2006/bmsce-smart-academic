#!/bin/sh
set -e

# Production API Container Entrypoint
# Database migrations are executed in Render's isolated preDeployCommand phase prior to deployment.
echo "[API Entrypoint] Starting BMSCE Smart Academic API container..."

exec "$@"
