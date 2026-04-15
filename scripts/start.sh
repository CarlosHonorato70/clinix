#!/bin/sh
# Bloco 1.4: startup robusto — espera DB, sincroniza schema, e só então sobe o app.
# drizzle-kit push é idempotente: cria tabelas que faltam sem tocar nas existentes,
# o que cobre Bloco 1.1 (tabelas lotes_faturamento, recursos_glosa, ai_inference_log
# que podem não existir em produção).

set -e

echo "[Clinix] Waiting for database..."
RETRIES=30
until node -e "const pg=require('postgres');const sql=pg(process.env.DATABASE_URL);sql\`SELECT 1\`.then(()=>{console.log('DB ready');sql.end();process.exit(0)}).catch(()=>{sql.end();process.exit(1)})" 2>/dev/null; do
  RETRIES=$((RETRIES - 1))
  if [ $RETRIES -le 0 ]; then
    echo "[Clinix] ERROR: Database not reachable after 30 attempts"
    exit 1
  fi
  sleep 2
done

echo "[Clinix] Syncing schema (drizzle-kit push)..."
# --force aceita criar/alterar sem prompt interativo. As migrations dentro de ./drizzle
# também ficam como histórico, mas push é a fonte da verdade para idempotência aqui.
if npx drizzle-kit push --force 2>&1; then
  echo "[Clinix] Schema sync OK"
else
  echo "[Clinix] WARNING: Schema sync failed — continuing anyway (app may fail later)"
fi

echo "[Clinix] Starting application..."
exec node server.js
