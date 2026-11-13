#!/usr/bin/env bash
# =============================================================================
# BMSCE Smart Academic — PostgreSQL Backup Script
# Usage: ./scripts/backup_postgres.sh [output_dir]
#
# Requires pg_dump accessible on PATH, or run inside the postgres container:
#   docker exec bmsce_pg_prod ./backup_postgres.sh
#
# Environment variables (or pass credentials inline):
#   PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE
# =============================================================================

set -euo pipefail

PGHOST="${PGHOST:-localhost}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-postgres}"
PGDATABASE="${PGDATABASE:-bmsce_academic}"
OUTPUT_DIR="${1:-./prisma/backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${OUTPUT_DIR}/bmsce_pg_backup_${TIMESTAMP}.sql.gz"

mkdir -p "$OUTPUT_DIR"

echo "[Backup] Starting PostgreSQL backup..."
echo "[Backup] Host:     ${PGHOST}:${PGPORT}"
echo "[Backup] Database: ${PGDATABASE}"
echo "[Backup] Output:   ${BACKUP_FILE}"

# pg_dump piped through gzip
PGPASSWORD="${PGPASSWORD:-}" \
pg_dump \
  --host="$PGHOST" \
  --port="$PGPORT" \
  --username="$PGUSER" \
  --dbname="$PGDATABASE" \
  --format=plain \
  --no-owner \
  --no-acl \
  | gzip > "$BACKUP_FILE"

FILESIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
echo "[Backup] ✓ Backup complete: ${BACKUP_FILE} (${FILESIZE})"
echo ""
echo "[Restore] To restore this backup:"
echo "  gunzip -c ${BACKUP_FILE} | psql -h \$PGHOST -U \$PGUSER \$PGDATABASE"

