/**
 * POST /api/billing/webhook
 *
 * Endpoint público para receber eventos do Stripe via webhook.
 * Configure no Stripe Dashboard: POST https://app.clinixproia.com.br/api/billing/webhook
 *
 * Eventos tratados:
 *   checkout.session.completed    → associa customer/subscription ao tenant, ativa
 *   invoice.paid                  → ativa tenant
 *   invoice.payment_failed        → suspende tenant
 *   customer.subscription.deleted → cancela tenant
 *
 * Segurança: assinatura verificada com stripe.webhooks.constructEvent + STRIPE_WEBHOOK_SECRET.
 * Idempotência: cada event.id é armazenado no Redis por 7 dias (NX flag).
 */

import { db } from '@/lib/db'
import { tenants } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getStripe } from '@/lib/billing/stripe'
import { writeAuditLog } from '@/lib/audit/logger'
import { logger } from '@/lib/logging/logger'
import { invalidateTenantStatusCache } from '@/lib/auth/middleware'
import { redis, isRedisAvailable } from '@/lib/db/redis'
import type Stripe from 'stripe'

// ─── Idempotência via Redis ───────────────────────────────────────────────────

/**
 * Retorna false se o evento já foi processado (duplicata).
 * Registra o event.id com TTL de 7 dias.
 * Em caso de Redis indisponível, permite processar (fail-open).
 */
async function isNewEvent(eventId: string): Promise<boolean> {
  const available = await isRedisAvailable()
  if (!available) return true // fail-open: processar sem Redis

  const key = `stripe:evt:${eventId}`
  // SET key 1 EX 7d NX — retorna "OK" se inserido, null se já existia
  const wasSet = await redis.set(key, '1', 'EX', 7 * 24 * 3600, 'NX')
  return wasSet !== null // null = já existia → duplicata
}

// ─── Helper: extrair subscriptionId de Invoice (Stripe v22+) ─────────────────
// Na API 2026-03-25.dahlia, Invoice.subscription foi substituído por
// invoice.parent?.subscription_details?.subscription. Esse helper cobre ambas.
function getSubscriptionIdFromInvoice(invoice: Stripe.Invoice): string | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inv = invoice as any
  // v22+ (dahlia): parent.subscription_details.subscription
  const parentSub = inv.parent?.subscription_details?.subscription
  if (typeof parentSub === 'string') return parentSub
  if (parentSub?.id) return parentSub.id
  // fallback (versões anteriores): invoice.subscription
  if (typeof inv.subscription === 'string') return inv.subscription
  if (inv.subscription?.id) return inv.subscription.id
  return null
}

// ─── Helpers de atualização de status ────────────────────────────────────────

async function updateTenantStatus(
  where: { subscriptionId?: string; tenantId?: string },
  newStatus: string,
  extraFields?: Partial<{ plano: string; billingCustomerId: string; billingSubscriptionId: string }>,
  auditExtra?: Record<string, unknown>,
): Promise<string | null> {
  const whereClause =
    where.tenantId
      ? eq(tenants.id, where.tenantId)
      : where.subscriptionId
        ? eq(tenants.billingSubscriptionId, where.subscriptionId!)
        : null

  if (!whereClause) return null

  const [updated] = await db
    .update(tenants)
    .set({ status: newStatus, ...extraFields })
    .where(whereClause)
    .returning({ id: tenants.id })

  if (updated) {
    invalidateTenantStatusCache(updated.id)
    writeAuditLog({
      tenantId: updated.id,
      usuarioId: null,
      acao: 'update',
      entidade: 'billing',
      dadosDepois: { status: newStatus, ...auditExtra },
      ip: 'stripe-webhook',
    })
    return updated.id
  }

  return null
}

// ─── Handler principal ────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    logger.warn('[Webhook] STRIPE_WEBHOOK_SECRET não configurado — rejeitando')
    return Response.json({ error: 'Webhook não configurado' }, { status: 503 })
  }

  // Lê o body como texto para verificação de assinatura (necessário antes de parsear JSON)
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    logger.warn('[Webhook] Requisição sem header stripe-signature')
    return Response.json({ error: 'Assinatura ausente' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logger.warn({ err: msg }, '[Webhook] Falha na verificação da assinatura Stripe')
    return Response.json({ error: 'Assinatura inválida' }, { status: 400 })
  }

  logger.info({ eventId: event.id, type: event.type }, '[Webhook] Evento recebido')

  // Idempotência: ignora eventos já processados
  const isNew = await isNewEvent(event.id)
  if (!isNew) {
    logger.info({ eventId: event.id, type: event.type }, '[Webhook] Evento duplicado ignorado')
    return Response.json({ received: true, skipped: 'duplicate' })
  }

  try {
    switch (event.type) {

      // ── Checkout concluído → associa customer/subscription e ativa ──────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const tenantId = session.metadata?.tenantId

        if (!tenantId) {
          logger.warn({ sessionId: session.id }, '[Webhook] checkout.session.completed sem tenantId no metadata')
          break
        }

        const customerId =
          typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null
        const subscriptionId =
          typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription?.id ?? null
        const planId = session.metadata?.planId ?? null

        const updatedId = await updateTenantStatus(
          { tenantId },
          'active',
          {
            ...(customerId ? { billingCustomerId: customerId } : {}),
            ...(subscriptionId ? { billingSubscriptionId: subscriptionId } : {}),
            ...(planId ? { plano: planId } : {}),
          },
          { event: event.type, stripeSessionId: session.id },
        )

        if (updatedId) {
          logger.info({ tenantId: updatedId, customerId, subscriptionId }, '[Webhook] Tenant ativado após checkout')
        } else {
          logger.warn({ tenantId }, '[Webhook] Tenant não encontrado para checkout.session.completed')
        }
        break
      }

      // ── Fatura paga → ativa tenant ───────────────────────────────────────────
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId = getSubscriptionIdFromInvoice(invoice)

        if (!subscriptionId) break

        const updatedId = await updateTenantStatus(
          { subscriptionId },
          'active',
          {},
          { event: event.type, invoiceId: invoice.id },
        )

        if (updatedId) {
          logger.info({ tenantId: updatedId, subscriptionId }, '[Webhook] Tenant ativado (invoice.paid)')
        }
        break
      }

      // ── Falha no pagamento → suspende tenant ─────────────────────────────────
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId = getSubscriptionIdFromInvoice(invoice)

        if (!subscriptionId) break

        const updatedId = await updateTenantStatus(
          { subscriptionId },
          'suspended',
          {},
          { event: event.type, invoiceId: invoice.id },
        )

        if (updatedId) {
          logger.warn({ tenantId: updatedId, subscriptionId }, '[Webhook] Tenant suspenso (invoice.payment_failed)')
        }
        break
      }

      // ── Assinatura cancelada → marca como cancelado ──────────────────────────
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const subscriptionId = subscription.id

        const updatedId = await updateTenantStatus(
          { subscriptionId },
          'cancelled',
          {},
          { event: event.type },
        )

        if (updatedId) {
          logger.info({ tenantId: updatedId, subscriptionId }, '[Webhook] Tenant cancelado (subscription.deleted)')
        }
        break
      }

      default:
        logger.info({ type: event.type }, '[Webhook] Evento não tratado')
    }

    return Response.json({ received: true, event: event.type })
  } catch (error) {
    logger.error(
      { err: error instanceof Error ? error.message : String(error), eventId: event.id, type: event.type },
      '[Webhook] Erro ao processar evento',
    )
    return Response.json({ error: 'Erro ao processar evento' }, { status: 500 })
  }
}
