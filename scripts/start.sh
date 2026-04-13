#!/bin/sh

echo "[Clinix] Waiting for database..."
RETRIES=30
until node -e "const pg=require('postgres');const sql=pg(process.env.DATABASE_URL);sql\`SELECT 1\`.then(()=>{console.log('DB ready');sql.end();process.exit(0)}).catch(()=>{sql.end();process.exit(1)})" 2>/dev/null; do
  RETRIES=$((RETRIES - 1))
  if [ $RETRIES -le 0 ]; then
    echo "[Clinix] WARNING: Database not reachable after 30 attempts"
    break
  fi
  sleep 2
done

echo "[Clinix] Starting application..."
exec node server.js
