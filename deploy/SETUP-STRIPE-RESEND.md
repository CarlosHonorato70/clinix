# Setup Stripe + Resend — Passo a Passo

Este guia te leva da situação atual (Clinix deployed, sem billing/email) até comercialmente operante.

---

## Parte 1 — Stripe (billing de assinaturas)

### 1.1 Criar conta

1. Acesse https://dashboard.stripe.com/register
2. Crie a conta com dados da sua empresa
3. **Ative o modo Test** inicialmente (toggle no canto superior esquerdo — "Viewing test data")

### 1.2 Criar os Products + Prices

No Dashboard Stripe:

1. **Products** → **Add product**

   **Produto 1: Clinix Basic**
   - Name: `Clinix Basic`
   - Description: `Gestão clínica para clínicas de pequeno porte`
   - Pricing:
     - Recurring
     - Price: `R$ 197.00`
     - Billing period: `Monthly`
   - Save product
   - **Copie o Price ID** (começa com `price_...`) → salve como `STRIPE_PRICE_BASIC`

   **Produto 2: Clinix Pro**
   - Name: `Clinix Pro`
   - Description: `Gestão clínica com IA avançada e integrações`
   - Pricing:
     - Recurring
     - Price: `R$ 497.00`
     - Billing period: `Monthly`
   - Save product
   - **Copie o Price ID** → salve como `STRIPE_PRICE_PRO`

### 1.3 Habilitar o Customer Portal

1. **Settings** → **Billing** → **Customer portal**
2. Em "Products", adicione os dois produtos criados (permite trocar de plano)
3. Em "Features":
   - ✅ Customers can update payment methods
   - ✅ Customers can update billing address
   - ✅ Customers can view past invoices
   - ✅ Customers can cancel subscriptions
4. **Save**

### 1.4 Criar o Webhook

1. **Developers** → **Webhooks** → **Add endpoint**
2. Endpoint URL: `https://clinixproia.com.br/api/billing/webhook`
3. Listen to events:
   - `checkout.session.completed`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `customer.subscription.deleted`
4. **Add endpoint**
5. Abra o webhook criado e **copie o Signing secret** (começa com `whsec_...`) → salve como `STRIPE_WEBHOOK_SECRET`

### 1.5 Copiar as API Keys

1. **Developers** → **API keys**
2. Copie:
   - **Publishable key** (`pk_test_...`) → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - **Secret key** (clique "Reveal", `sk_test_...`) → `STRIPE_SECRET_KEY`

### 1.6 Configurar no Droplet

SSH no Droplet e edite o `.env.production`:

```bash
cd /opt/clinix
nano .env.production
```

Adicione ao final:

```env
# Billing (Stripe)
STRIPE_SECRET_KEY=sk_test_XXXXXXXXXXXXXXXXXXXX
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_XXXXXXXXXXXXXXXXXXXX
STRIPE_WEBHOOK_SECRET=whsec_XXXXXXXXXXXXXXXXXXXX
STRIPE_PRICE_BASIC=price_XXXXXXXXXXXXXXXXXXXX
STRIPE_PRICE_PRO=price_XXXXXXXXXXXXXXXXXXXX
```

Restart o container para carregar as variáveis:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --no-deps app
```

### 1.7 Testar o fluxo completo

1. Login no Clinix
2. Vá em **Configurações** → **Assinatura**
3. Clique num plano → **Confirmar upgrade**
4. Deve redirecionar para o **Stripe Checkout**
5. Use cartão de teste: `4242 4242 4242 4242`, qualquer CVC futuro, qualquer data futura, qualquer CEP
6. Após pagamento, deve voltar ao Clinix com status `active`
7. Veja no Stripe Dashboard: Customer criado, subscription ativa

### 1.8 Ir para produção (Live Mode)

Depois que tudo estiver testado:
1. Desative o "Test mode" no toggle
2. Refaça os passos 1.2-1.5 em **modo Live** (Products, Portal, Webhook, Keys)
3. Substitua as keys no `.env.production` (ficam `sk_live_...`, `pk_live_...`, `whsec_...` live)
4. Restart o container

---

## Parte 2 — Resend (emails transacionais)

### 2.1 Criar conta

1. Acesse https://resend.com/signup
2. Plano grátis cobre 3.000 emails/mês e 100 emails/dia

### 2.2 Verificar o domínio

1. **Domains** → **Add domain**
2. Domain: `clinixproia.com.br`
3. Region: São Paulo (mais próximo do Brasil)
4. Resend mostrará 3 registros DNS para adicionar no Cloudflare:
   - 1 registro `MX` (tipo: MX, prioridade normalmente 10)
   - 1 registro `TXT` para SPF (Sender Policy Framework)
   - 1 registro `TXT` para DKIM (DomainKeys)

### 2.3 Configurar DNS no Cloudflare

1. Login em https://dash.cloudflare.com
2. Selecione o domínio `clinixproia.com.br`
3. Vá em **DNS** → **Records** → **Add record**

   **Record 1: MX (Resend enviará mail via esse host)**
   - Type: MX
   - Name: `send` (ou conforme Resend instruir)
   - Mail server: `feedback-smtp.sa-east-1.amazonses.com` (ou o que Resend mostrar)
   - Priority: `10`
   - Proxy status: **DNS only** (nuvem cinza)

   **Record 2: TXT SPF**
   - Type: TXT
   - Name: `send`
   - Content: `v=spf1 include:amazonses.com ~all` (ou conforme Resend)
   - Proxy status: **DNS only**

   **Record 3: TXT DKIM**
   - Type: TXT
   - Name: `resend._domainkey` (ou conforme Resend)
   - Content: (conteúdo longo fornecido pelo Resend — cola o valor exato)
   - Proxy status: **DNS only**

4. Volte ao Resend → clique **Verify** no domínio (pode levar até 48h, geralmente 5-10 min)

### 2.4 Criar a API Key

1. **API Keys** → **Create API Key**
2. Name: `Clinix Production`
3. Permission: **Full access** (ou Sending only para menos privilégio)
4. Domain: `clinixproia.com.br`
5. **Copie a key** (começa com `re_...`) → só aparece uma vez!

### 2.5 Configurar no Droplet

```bash
cd /opt/clinix
nano .env.production
```

Adicione:

```env
# Email (Resend)
RESEND_API_KEY=re_XXXXXXXXXXXXXXXXXXXX
EMAIL_FROM=Clinix <noreply@clinixproia.com.br>
```

Restart:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --no-deps app
```

### 2.6 Testar emails

1. Signup com email real (ex: seu email pessoal)
2. Deve receber email de **welcome** em ~1 min
3. Teste forgot password:
   - `/login` → **Esqueci senha**
   - Insira seu email
   - Deve receber email de reset
4. Se não chegar, verifique:
   - Pasta de spam
   - Logs: `docker logs clinix-app --tail 20 | grep -i email`
   - Dashboard Resend → **Logs** mostra todos os envios com status

---

## Parte 3 — Checklist final pós-setup

- [ ] Stripe test mode configurado e testado
- [ ] Assinatura de teste completou com cartão `4242 4242 4242 4242`
- [ ] Customer Portal abre e mostra invoice
- [ ] Resend domain verified (✅ verde)
- [ ] Email de welcome chegou na caixa de entrada (não spam)
- [ ] Email de reset de senha chegou
- [ ] SPF/DKIM passando (teste em https://www.mail-tester.com)
- [ ] Stripe Live mode ativado
- [ ] Webhook Live configurado
- [ ] Keys `sk_live_*` no .env.production
- [ ] Container restarted com env atualizado
- [ ] Health check continua `healthy`: `curl https://clinixproia.com.br/api/health`

---

## Troubleshooting

### Erro "Billing não configurado" no checkout
→ `STRIPE_SECRET_KEY` não está no `.env.production` ou o container não foi restarted.

### Erro "Plano sem price ID configurado"
→ `STRIPE_PRICE_BASIC` ou `STRIPE_PRICE_PRO` faltam ou estão incorretos.

### Webhook Stripe retorna 401
→ `STRIPE_WEBHOOK_SECRET` incorreto. Copie de novo do Dashboard → Webhooks → o endpoint → "Signing secret → Reveal".

### Email "emails disabled" no log
→ `RESEND_API_KEY` não está no `.env.production`. Logs mostram:
`[Clinix] RESEND_API_KEY not configured — emails disabled`

### Email chega em spam
→ SPF/DKIM não verificados. Verifique DNS no Cloudflare, depois refaça "Verify" no Resend.

### Stripe Customer Portal erro "No configuration provided"
→ Customer Portal não foi configurado em Settings → Billing → Customer portal. Faça o passo 1.3.

---

## Custos estimados (mensal)

| Serviço | Plano inicial | Custo |
|---|---|---|
| Stripe | Pay-as-you-go | 2.9% + R$0.39 por transação (sem mensalidade) |
| Resend | Hobby | Grátis até 3.000 emails/mês |
| DigitalOcean Droplet | 4GB/80GB | R$~120/mês |
| Cloudflare | Free | Grátis |
| OpenAI (já configurado) | Pay-as-you-go | ~R$5-50/mês (dependendo de uso) |

**Total para começar:** ~R$120/mês fixo + variáveis conforme receita.
