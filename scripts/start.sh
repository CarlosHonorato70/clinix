#!/bin/sh
set -e

echo "[MedFlow] Running database migrations..."
npx drizzle-kit migrate 2>&1 || echo "[MedFlow] WARNING: Migration failed, continuing..."

echo "[MedFlow] Starting application..."
exec node server.js
