#!/bin/bash
# Clinix — Backup automatizado do PostgreSQL
# Execute via cron: 0 3 * * * /opt/clinix/scripts/backup.sh

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/opt/clinix/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/clinix_$TIMESTAMP.dump"

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Iniciando backup..."

docker exec clinix-db pg_dump \
  --format=custom \
  --compress=9 \
  -U "${POSTGRES_USER:-clinix}" \
  "${POSTGRES_DB:-clinix}" \
  > "$BACKUP_FILE"

SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "[$(date)] Backup criado: $BACKUP_FILE ($SIZE)"

# Remover backups antigos
DELETED=$(find "$BACKUP_DIR" -name "*.dump" -mtime +$RETENTION_DAYS -delete -print | wc -l)
if [ "$DELETED" -gt 0 ]; then
  echo "[$(date)] $DELETED backups antigos removidos (> $RETENTION_DAYS dias)"
fi

echo "[$(date)] Backup concluído com sucesso"
