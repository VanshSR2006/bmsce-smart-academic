# =============================================================================
# BMSCE Smart Academic — Optimizer Dockerfile
# Single-stage Python 3.12 slim image
# =============================================================================

FROM python:3.12-slim

# Install uv for fast, deterministic dependency installation
RUN pip install --no-cache-dir uv==0.5.1

WORKDIR /app

# Install dependencies first (cacheable layer)
COPY apps/optimizer/requirements.txt ./
RUN uv pip install --system --no-cache -r requirements.txt

# Copy application source
COPY apps/optimizer/ ./

# Non-root user for security
RUN useradd -r -s /bin/false bmsce
USER bmsce

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

# 2 workers for small-to-medium deployments; increase via CMD override in compose
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
