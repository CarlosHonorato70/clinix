#!/bin/bash
# ╔══════════════════════════════════════════════════════════════════╗
# ║  Clinix — Setup DigitalOcean Droplet                          ║
# ║  Execute uma vez no servidor novo para configurar tudo          ║
# ║                                                                  ║
# ║  Requisitos: Ubuntu 22.04+, 4GB RAM, 2 vCPU                    ║
# ║  Droplet recomendado: s-2vcpu-4gb ($24/mês)                    ║
# ╚══════════════════════════════════════════════════════════════════╝

set -euo pipefail

echo "╔═══════════════════════════════════════╗"
echo "║  Clinix — Configuração do Servidor   ║"
echo "╚═══════════════════════════════════════╝"

# ─── 1. Atualizar sistema ────────────────────────────────────────
echo "[1/7] Atualizando sistema..."
apt-get update -qq && apt-get upgrade -y -qq

# ─── 2. Instalar Docker + Docker Compose ─────────────────────────
echo "[2/7] Instalando Docker..."
if ! command -v docker &> /dev/null; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
fi

if ! command -v docker compose &> /dev/null; then
  apt-get install -y -qq docker-compose-plugin
fi

echo "Docker version: $(docker --version)"

# ─── 3. Criar usuário clinix ────────────────────────────────────
echo "[3/7] Criando usuário clinix..."
if ! id "clinix" &>/dev/null; then
  useradd -m -s /bin/bash -G docker clinix
  echo "Usuário clinix criado"
else
  echo "Usuário clinix já existe"
fi

# ─── 4. Criar diretórios ─────────────────────────────────────────
echo "[4/7] Criando diretórios..."
mkdir -p /opt/clinix/{backups,nginx,certbot}
chown -R clinix:clinix /opt/clinix

# ─── 5. Configurar firewall ──────────────────────────────────────
echo "[5/7] Configurando firewall..."
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# ─── 6. Configurar swap (se < 4GB RAM) ───────────────────────────
echo "[6/7] Configurando swap..."
if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo "Swap de 2GB criado"
fi

# ─── 7. Instalar fail2ban ────────────────────────────────────────
echo "[7/7] Instalando fail2ban..."
apt-get install -y -qq fail2ban
systemctl enable fail2ban

echo ""
echo "╔═══════════════════════════════════════╗"
echo "║  Setup concluído!                     ║"
echo "║                                       ║"
echo "║  Próximos passos:                     ║"
echo "║  1. Clone o repo em /opt/clinix      ║"
echo "║  2. Copie .env.production.template    ║"
echo "║     para .env.production              ║"
echo "║  3. Edite .env.production             ║"
echo "║  4. Execute deploy/deploy.sh          ║"
echo "╚═══════════════════════════════════════╝"
