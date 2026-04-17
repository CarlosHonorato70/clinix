# Clinix — Checklist de Lancamento

## Infraestrutura

- [ ] Droplet DigitalOcean provisionado (4GB RAM minimo)
- [ ] Rodar `deploy/setup-droplet.sh` no servidor
- [ ] Dominio registrado (clinixproia.com.br ou alternativo)
- [ ] DNS A record apontando para IP do Droplet
- [ ] DNS propagado (verificar com `dig clinixproia.com.br`)
- [ ] SSL certificado emitido via Certbot
- [ ] HTTPS funcionando (verificar com `curl -I https://clinixproia.com.br`)

## Secrets e Configuracao

- [ ] `.env.production` criado a partir do template
- [ ] `JWT_SECRET` gerado (64+ chars): `openssl rand -base64 64`
- [ ] `JWT_REFRESH_SECRET` gerado (64+ chars): `openssl rand -base64 64`
- [ ] `ENCRYPTION_KEY` gerado (256-bit hex): `openssl rand -hex 32`
- [ ] `POSTGRES_PASSWORD` definido (senha forte)
- [ ] `OPENAI_API_KEY` configurado com creditos ativos
- [ ] `RESEND_API_KEY` configurado
- [ ] `RESEND_FROM_EMAIL` configurado (ex: noreply@clinixproia.com.br)
- [ ] `STRIPE_SECRET_KEY` configurado (test primeiro, depois live)
- [ ] `STRIPE_WEBHOOK_SECRET` definido
- [ ] `STRIPE_PRICE_BASIC` e `STRIPE_PRICE_PRO` (IDs dos Prices criados no Stripe Dashboard)
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

- [ ] Conta Stripe criada e ativada
- [ ] Webhook configurado no Stripe Dashboard: `https://clinixproia.com.br/api/billing/webhook`
- [ ] Eventos do webhook: `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.deleted`
- [ ] Produtos Basic (R$197/mês) e Pro (R$497/mês) criados no Stripe
- [ ] Customer Portal habilitado no Stripe Dashboard (Settings > Billing > Customer portal)
- [ ] Testar fluxo: signup > trial > upgrade > checkout > pagamento

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

- [ ] Landing page carrega em https://clinixproia.com.br
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
