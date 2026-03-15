#!/bin/bash
# MedFlow — Restauração de backup PostgreSQL
# Uso: ./scripts/restore.sh /caminho/para/backup.dump

set -euo pipefail

if [ -z "${1:-}" ]; then
  echo "Uso: $0 <arquivo_backup.dump>"
  echo ""
  echo "Backups disponíveis:"
  ls -lh "${BACKUP_DIR:-/opt/medflow/backups}"/*.dump 2>/dev/null || echo "  Nenhum backup encontrado"
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Erro: Arquivo não encontrado: $BACKUP_FILE"
  exit 1
fi

echo "⚠️  ATENÇÃO: Isso irá SUBSTITUIR todos os dados do banco de dados!"
echo "Arquivo: $BACKUP_FILE"
echo ""
read -p "Tem certeza? (digite 'sim' para confirmar): " CONFIRM

if [ "$CONFIRM" != "sim" ]; then
  echo "Restauração cancelada."
  exit 0
fi

echo "[$(date)] Iniciando restauração..."

docker exec -i medflow-db pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  -U "${POSTGRES_USER:-medflow}" \
  -d "${POSTGRES_DB:-medflow}" \
  < "$BACKUP_FILE"

echo "[$(date)] Restauração concluída com sucesso"
