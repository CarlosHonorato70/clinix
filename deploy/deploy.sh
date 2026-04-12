#!/bin/bash
# ╔══════════════════════════════════════════════════════════════════╗
# ║  Clinix — Deploy Script                                       ║
# ║  Execute a cada novo deploy para atualizar a aplicação          ║
# ╚══════════════════════════════════════════════════════════════════╝

set -euo pipefail

APP_DIR="${APP_DIR:-/opt/clinix}"
DOMAIN="${DOMAIN:-app.clinixproia.com.br}"

cd "$APP_DIR"

echo "╔═══════════════════════════════════════╗"
echo "║  Clinix — Deploy                     ║"
echo "╚═══════════════════════════════════════╝"

# ─── 1. Pull latest code ─────────────────────────────────────────
echo "[1/6] Atualizando código..."
git pull origin main

# ─── 2. Verify environment ───────────────────────────────────────
echo "[2/6] Verificando variáveis de ambiente..."
if [ ! -f .env.production ]; then
  echo "ERRO: .env.production não encontrado!"
  echo "Copie .env.production.template para .env.production e preencha os valores."
  exit 1
fi

# Check critical vars
for var in DATABASE_URL JWT_SECRET JWT_REFRESH_SECRET ENCRYPTION_KEY; do
  if ! grep -q "^${var}=" .env.production || grep -q "CHANGE_ME" .env.production; then
    echo "AVISO: Variável $var não configurada ou com valor padrão!"
  fi
done

# ─── 3. Build and deploy ─────────────────────────────────────────
echo "[3/6] Construindo e deployando..."
docker compose -f docker-compose.prod.yml --env-file .env.production build --no-cache app
docker compose -f docker-compose.prod.yml --env-file .env.production up -d

# ─── 4. Wait for health check ────────────────────────────────────
echo "[4/6] Aguardando health check..."
RETRIES=30
until curl -sf http://localhost:3000/api/health > /dev/null 2>&1; do
  RETRIES=$((RETRIES - 1))
  if [ $RETRIES -le 0 ]; then
    echo "ERRO: Health check falhou após 30 tentativas"
    docker compose -f docker-compose.prod.yml logs app --tail 50
    exit 1
  fi
  sleep 2
done
echo "Health check OK!"

# ─── 5. Run migrations ───────────────────────────────────────────
echo "[5/6] Executando migrations..."
docker compose -f docker-compose.prod.yml exec app sh -c "npx drizzle-kit migrate" || true

# ─── 6. Setup SSL (first time only) ──────────────────────────────
echo "[6/6] Verificando SSL..."
if [ ! -d "/etc/letsencrypt/live/$DOMAIN" ]; then
  echo "Obtendo certificado SSL para $DOMAIN..."
  docker compose -f docker-compose.prod.yml run --rm certbot certonly \
    --webroot --webroot-path=/var/lib/letsencrypt \
    -d "$DOMAIN" \
    --email "admin@$DOMAIN" \
    --agree-tos --no-eff-email

  # Reload nginx with SSL
  docker compose -f docker-compose.prod.yml restart nginx
fi

echo ""
echo "╔═══════════════════════════════════════╗"
echo "║  Deploy concluído!                    ║"
echo "║                                       ║"
echo "║  App: https://$DOMAIN                 ║"
echo "║  Health: https://$DOMAIN/api/health   ║"
echo "╚═══════════════════════════════════════╝"
