/**
 * Integração com Stripe Billing
 * Substituição da integração Asaas por Stripe (checkout + portal + webhooks).
 *
 * Env vars necessárias:
 *   STRIPE_SECRET_KEY      — chave secreta do Stripe (sk_live_... ou sk_test_...)
 *   STRIPE_WEBHOOK_SECRET  — segredo de assinatura do webhook (whsec_...)
 *   STRIPE_PRICE_BASIC     — price ID do plano Basic  (price_...)
 *   STRIPE_PRICE_PRO       — price ID do plano Pro    (price_...)
 */

import Stripe from 'stripe'

// ─── Singleton lazy ────────────────────────────────────────────────────────────

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (_stripe) return _stripe

  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error('Billing não configurado — STRIPE_SECRET_KEY ausente')
  }

  _stripe = new Stripe(key, {
    apiVersion: '2026-03-25.dahlia',
    typescript: true,
  })

  return _stripe
}

// ─── Mapeamento planId → price ID do Stripe ───────────────────────────────────

const PRICE_IDS: Record<string, string | undefined> = {
  basic: process.env.STRIPE_PRICE_BASIC,
  pro: process.env.STRIPE_PRICE_PRO,
}

/**
 * Retorna o price ID do Stripe para um planId.
 * Retorna null para planos sem preço (trial, enterprise).
 */
export function getPriceId(planId: string): string | null {
  return PRICE_IDS[planId] ?? null
}

// ─── Checkout Session ──────────────────────────────────────────────────────────

interface CreateCheckoutSessionParams {
  tenantId: string
  customerId: string | null
  email: string
  priceId: string
  successUrl: string
  cancelUrl: string
}

/**
 * Cria uma Stripe Checkout Session para assinatura mensal.
 * Se o tenant já tem um customer ID salvo, reutiliza; caso contrário
 * passa o e-mail para o Stripe criar o customer automaticamente.
 */
export async function createCheckoutSession(
  params: CreateCheckoutSessionParams,
): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe()

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'subscription',
    line_items: [{ price: params.priceId, quantity: 1 }],
    metadata: { tenantId: params.tenantId },
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    // Habilita link de cobrança automático após expiração
    payment_method_collection: 'if_required',
  }

  if (params.customerId) {
    sessionParams.customer = params.customerId
  } else {
    sessionParams.customer_email = params.email
  }

  return stripe.checkout.sessions.create(sessionParams)
}

// ─── Customer Portal ───────────────────────────────────────────────────────────

interface CreateCustomerPortalSessionParams {
  customerId: string
  returnUrl: string
}

/**
 * Cria uma sessão do Stripe Customer Portal para que o cliente gerencie
 * sua assinatura (trocar plano, atualizar cartão, cancelar, etc.).
 */
export async function createCustomerPortalSession(
  params: CreateCustomerPortalSessionParams,
): Promise<Stripe.BillingPortal.Session> {
  const stripe = getStripe()

  return stripe.billingPortal.sessions.create({
    customer: params.customerId,
    return_url: params.returnUrl,
  })
}

// ─── Subscription helpers ─────────────────────────────────────────────────────

/**
 * Cancela uma assinatura imediatamente no Stripe.
 */
export async function cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  const stripe = getStripe()
  return stripe.subscriptions.cancel(subscriptionId)
}

/**
 * Recupera os dados de uma assinatura pelo ID.
 */
export async function getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  const stripe = getStripe()
  return stripe.subscriptions.retrieve(subscriptionId)
}
