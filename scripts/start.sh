#!/bin/sh
set -e

echo "[Clinix] Running database migrations..."
npx drizzle-kit migrate 2>&1 || echo "[Clinix] WARNING: Migration failed, continuing..."

echo "[Clinix] Starting application..."
exec node server.js
