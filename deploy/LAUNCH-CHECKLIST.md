# Clinix — Checklist de Lancamento

## Infraestrutura

- [ ] Droplet DigitalOcean provisionado (4GB RAM minimo)
- [ ] Rodar `deploy/setup-droplet.sh` no servidor
- [ ] Dominio registrado (clinix.com.br ou alternativo)
- [ ] DNS A record apontando para IP do Droplet
- [ ] DNS propagado (verificar com `dig clinix.com.br`)
- [ ] SSL certificado emitido via Certbot
- [ ] HTTPS funcionando (verificar com `curl -I https://clinix.com.br`)

## Secrets e Configuracao

- [ ] `.env.production` criado a partir do template
- [ ] `JWT_SECRET` gerado (64+ chars): `openssl rand -base64 64`
- [ ] `JWT_REFRESH_SECRET` gerado (64+ chars): `openssl rand -base64 64`
- [ ] `ENCRYPTION_KEY` gerado (256-bit hex): `openssl rand -hex 32`
- [ ] `POSTGRES_PASSWORD` definido (senha forte)
- [ ] `OPENAI_API_KEY` configurado com creditos ativos
- [ ] `RESEND_API_KEY` configurado
- [ ] `RESEND_FROM_EMAIL` configurado (ex: noreply@clinix.com.br)
- [ ] `ASAAS_API_KEY` configurado (sandbox primeiro, depois producao)
- [ ] `ASAAS_WEBHOOK_TOKEN` definido
- [ ] `POSTHOG_KEY` configurado
- [ ] `SENTRY_DSN` configurado

## Email

- [ ] Dominio verificado no Resend
- [ ] SPF record adicionado no DNS
- [ ] DKIM record adicionado no DNS
- [ ] Enviar email de teste (signup e verificacao)
- [ ] Verificar que emails nao caem em spam

## Banco de Dados

- [ ] Stack iniciada com `docker compose -f docker-compose.prod.yml up -d`
- [ ] Migrations executadas automaticamente (verificar logs do app)
- [ ] Health check retornando 200: `curl http://localhost:3000/api/health`
- [ ] NAO executar seed de dados de teste em producao

## Billing

- [ ] Conta Asaas criada e ativada
- [ ] Webhook configurado: `https://clinix.com.br/api/billing/webhook`
- [ ] Planos Basic (R$197) e Pro (R$497) criados no Asaas
- [ ] Testar fluxo: signup > trial > upgrade > pagamento

## Monitoramento

- [ ] Projeto Sentry criado e DSN configurado
- [ ] PostHog project criado e key configurada
- [ ] Verificar que erros aparecem no Sentry (provocar um erro de teste)
- [ ] Verificar que eventos aparecem no PostHog (fazer um signup de teste)

## Backup

- [ ] AWS S3 bucket criado para backups
- [ ] Credenciais AWS configuradas no `.env.production`
- [ ] Verificar que backup roda as 3h: `docker logs clinix-backup`
- [ ] Testar restore de backup em ambiente separado

## Validacao Final

- [ ] Landing page carrega em https://clinix.com.br
- [ ] Signup cria conta com sucesso
- [ ] Email de verificacao chega na caixa de entrada
- [ ] Login funciona apos verificacao
- [ ] Onboarding wizard completa os 4 passos
- [ ] Dashboard carrega com dados zerados (sem erro)
- [ ] Faturamento TISS funcional (criar guia de teste)
- [ ] PWA instalavel no celular
- [ ] Responsividade mobile OK (testar em 375px)
- [ ] Performance: LCP < 2.5s (testar com PageSpeed Insights)

## Pos-Lancamento

- [ ] Criar conta admin da producao via `/signup`
- [ ] Desabilitar credenciais de dev (`admin@clinix.dev` etc)
- [ ] Monitorar Sentry nas primeiras 24h
- [ ] Monitorar PostHog nas primeiras 24h
- [ ] Verificar consumo do Droplet (CPU, RAM, disco)
- [ ] Confirmar que backup S3 executou com sucesso na primeira noite
