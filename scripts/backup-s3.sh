#!/bin/bash
# MedFlow — Backup PostgreSQL com upload para S3
# Roda via cron dentro do container 'backup' no docker-compose
# Cron: 0 3 * * * /opt/medflow/scripts/backup-s3.sh

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/tmp/medflow-backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/medflow_$TIMESTAMP.dump"
S3_BUCKET="${S3_BACKUP_BUCKET:-medflow-backups}"
DB_HOST="${DB_HOST:-medflow-db}"
DB_USER="${POSTGRES_USER:-medflow}"
DB_NAME="${POSTGRES_DB:-medflow}"

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Iniciando backup do PostgreSQL..."

# Dump database
PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump \
  --host="$DB_HOST" \
  --username="$DB_USER" \
  --format=custom \
  --compress=9 \
  "$DB_NAME" \
  > "$BACKUP_FILE"

SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "[$(date)] Dump criado: $BACKUP_FILE ($SIZE)"

# Upload to S3
if [ -n "${AWS_ACCESS_KEY_ID:-}" ] && [ -n "${S3_BACKUP_BUCKET:-}" ]; then
  echo "[$(date)] Enviando para S3: s3://$S3_BUCKET/..."
  aws s3 cp "$BACKUP_FILE" "s3://$S3_BUCKET/daily/medflow_$TIMESTAMP.dump" --quiet

  # Tag with expiration (lifecycle policy handles deletion)
  echo "[$(date)] Upload S3 concluído"
else
  echo "[$(date)] S3 não configurado — backup mantido apenas localmente"
fi

# Cleanup local dumps older than retention period
DELETED=$(find "$BACKUP_DIR" -name "*.dump" -mtime +$RETENTION_DAYS -delete -print 2>/dev/null | wc -l)
if [ "$DELETED" -gt 0 ]; then
  echo "[$(date)] $DELETED backups locais antigos removidos (> $RETENTION_DAYS dias)"
fi

echo "[$(date)] Backup concluído com sucesso"
