# MedFlow — Guia de Deploy (DigitalOcean)

## 1. Criar Droplet

1. Acesse [cloud.digitalocean.com](https://cloud.digitalocean.com)
2. Create Droplet:
   - **Image**: Ubuntu 22.04 LTS
   - **Plan**: Basic → Regular → **$24/mo** (2 vCPU, 4 GB RAM, 80 GB SSD)
   - **Region**: São Paulo (NYC se SP indisponível)
   - **Auth**: SSH Key (recomendado) ou senha
   - **Hostname**: `medflow-prod`
3. Anote o IP público (ex: `143.198.xxx.xxx`)

## 2. Registrar Domínio

### Opção A: Registro.br (recomendado para .com.br)
1. Acesse [registro.br](https://registro.br)
2. Pesquise `medflow.com.br`
3. Registre (~R$ 40/ano)
4. Em DNS, adicione:
   - **A** `@` → `IP_DO_DROPLET`
   - **A** `app` → `IP_DO_DROPLET`
   - **CNAME** `www` → `medflow.com.br`

### Opção B: Cloudflare (DNS gratuito + CDN)
1. Registre em qualquer registrador
2. Aponte nameservers para Cloudflare
3. Adicione registros A no dashboard Cloudflare

## 3. Configurar Servidor

```bash
# Conectar via SSH
ssh root@IP_DO_DROPLET

# Baixar e executar setup
git clone https://github.com/CarlosHonorato70/medflow.git /opt/medflow
cd /opt/medflow
chmod +x deploy/*.sh
./deploy/setup-droplet.sh
```

## 4. Configurar Ambiente

```bash
cd /opt/medflow

# Copiar template
cp .env.production.template .env.production

# Editar com seus valores reais
nano .env.production
```

### Variáveis obrigatórias:

```env
# Gere com: openssl rand -base64 64
JWT_SECRET=<seu-jwt-secret-64-chars>
JWT_REFRESH_SECRET=<outro-secret-64-chars>

# Gere com: openssl rand -hex 32
ENCRYPTION_KEY=<sua-chave-hex-64-chars>

# Senha do PostgreSQL
POSTGRES_PASSWORD=<senha-forte-aqui>
DATABASE_URL=postgresql://medflow:<senha-forte-aqui>@postgres:5432/medflow

# OpenAI (para IA)
OPENAI_API_KEY=sk-...

# URL da aplicação
NEXT_PUBLIC_APP_URL=https://app.medflow.com.br
```

## 5. Deploy

```bash
cd /opt/medflow
./deploy/deploy.sh
```

Após ~2 minutos, acesse: `https://app.medflow.com.br`

## 6. Primeiro Acesso

1. Acesse `https://app.medflow.com.br/signup`
2. Crie sua clínica
3. Pronto — você é o primeiro usuário admin

## 7. Monitoramento

```bash
# Ver logs da aplicação
docker compose -f docker-compose.prod.yml logs -f app

# Ver status dos serviços
docker compose -f docker-compose.prod.yml ps

# Health check
curl https://app.medflow.com.br/api/health
```

## 8. Backup

Backups automáticos rodam diariamente às 3h (container `backup`).

```bash
# Backup manual
docker exec medflow-db pg_dump -U medflow medflow > backup_$(date +%Y%m%d).sql

# Restaurar
docker exec -i medflow-db psql -U medflow medflow < backup_20260321.sql
```

## Custos Mensais Estimados

| Item | Custo |
|------|-------|
| DigitalOcean Droplet (4GB) | $24/mês |
| Domínio .com.br | ~R$ 3/mês |
| OpenAI API (estimado) | $5–20/mês |
| **Total** | **~R$ 200/mês** |
