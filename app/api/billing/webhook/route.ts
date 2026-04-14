import { db } from '@/lib/db'
import { tenants } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import type { AsaasWebhookPayload } from '@/lib/billing/asaas'
import { writeAuditLog } from '@/lib/audit/logger'
import { logger } from '@/lib/logging/logger'
import { invalidateTenantStatusCache } from '@/lib/auth/middleware'
import { redis, isRedisAvailable } from '@/lib/db/redis'

// A6: idempotência + ordering para webhooks Asaas.
// - Eventos duplicados (mesmo id) são ignorados por 7 dias.
// - Eventos com dateCreated anterior ao último processado para a
//   mesma subscription são ignorados (proteção contra retries que
//   chegam fora de ordem e podem downgradar um tenant já ativo).
async function shouldProcessEvent(
  eventId: string | undefined,
  eventDate: string | undefined,
  subscriptionId: string | undefined,
): Promise<{ process: boolean; reason?: string }> {
  const available = await isRedisAvailable()
  if (!available) return { process: true } // fail-open: processar sem Redis

  if (eventId) {
    const seenKey = `asaas:evt:${eventId}`
    const wasSet = await redis.set(seenKey, '1', 'EX', 7 * 24 * 3600, 'NX')
    if (wasSet === null) {
      return { process: false, reason: 'duplicate-event-id' }
    }
  }

  if (subscriptionId && eventDate) {
    const lastKey = `asaas:sub-last:${subscriptionId}`
    const last = await redis.get(lastKey)
    if (last && new Date(eventDate).getTime() < new Date(last).getTime()) {
      return { process: false, reason: 'out-of-order' }
    }
    await redis.set(lastKey, eventDate, 'EX', 30 * 24 * 3600)
  }

  return { process: true }
}

/**
 * Webhook endpoint for Asaas payment events.
 * Configure in Asaas dashboard: POST https://app.clinixproia.com.br/api/billing/webhook
 *
 * Asaas sends a webhook token in the header `asaas-access-token`
 * that should match ASAAS_WEBHOOK_TOKEN env var.
 *
 * Events handled:
 * - PAYMENT_CONFIRMED / PAYMENT_RECEIVED → activate tenant
 * - PAYMENT_OVERDUE → suspend tenant after grace period (3 days)
 * - PAYMENT_DELETED → ignore (just logged)
 * - SUBSCRIPTION_CREATED → log only
 * - SUBSCRIPTION_UPDATED → log only
 * - SUBSCRIPTION_DELETED → schedule cancellation at end of paid period
 */
export async function POST(req: Request) {
  // Verify webhook authenticity
  const webhookToken = req.headers.get('asaas-access-token')
  if (!process.env.ASAAS_WEBHOOK_TOKEN) {
    logger.warn('[Webhook] ASAAS_WEBHOOK_TOKEN not configured — rejecting')
    return Response.json({ error: 'Webhook not configured' }, { status: 503 })
  }
  if (webhookToken !== process.env.ASAAS_WEBHOOK_TOKEN) {
    logger.warn({ received: webhookToken?.slice(0, 8) }, '[Webhook] Invalid token')
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let payload: AsaasWebhookPayload
  try {
    payload = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  logger.info({ event: payload.event, paymentId: payload.payment?.id, eventId: payload.id }, '[Webhook] Event received')

  const subId = payload.payment?.subscription || payload.subscription?.id
  const gate = await shouldProcessEvent(payload.id, payload.dateCreated, subId)
  if (!gate.process) {
    logger.info(
      { eventId: payload.id, event: payload.event, reason: gate.reason },
      '[Webhook] Skipped (idempotency/ordering)'
    )
    return Response.json({ received: true, skipped: gate.reason })
  }

  try {
    switch (payload.event) {
      case 'PAYMENT_CONFIRMED':
      case 'PAYMENT_RECEIVED': {
        // Payment received → activate tenant
        const subId = payload.payment?.subscription
        if (!subId) break

        const [tenant] = await db
          .update(tenants)
          .set({ status: 'active' })
          .where(eq(tenants.billingSubscriptionId, subId))
          .returning({ id: tenants.id })

        if (tenant) {
          invalidateTenantStatusCache(tenant.id)
          logger.info({ tenantId: tenant.id, event: payload.event }, '[Webhook] Tenant activated')
          writeAuditLog({
            tenantId: tenant.id,
            usuarioId: null,
            acao: 'update',
            entidade: 'billing',
            dadosDepois: { status: 'active', event: payload.event },
            ip: 'asaas-webhook',
          })
        }
        break
      }

      case 'PAYMENT_OVERDUE': {
        // Payment overdue → suspend tenant (Asaas already gives 3-day grace by default)
        const subId = payload.payment?.subscription
        if (!subId) break

        const [tenant] = await db
          .update(tenants)
          .set({ status: 'suspended' })
          .where(eq(tenants.billingSubscriptionId, subId))
          .returning({ id: tenants.id })

        if (tenant) {
          invalidateTenantStatusCache(tenant.id)
          logger.warn({ tenantId: tenant.id }, '[Webhook] Tenant suspended (overdue)')
          writeAuditLog({
            tenantId: tenant.id,
            usuarioId: null,
            acao: 'update',
            entidade: 'billing',
            dadosDepois: { status: 'suspended', reason: 'overdue' },
            ip: 'asaas-webhook',
          })
        }
        break
      }

      case 'SUBSCRIPTION_DELETED': {
        // Cancellation → mark tenant as cancelled
        // (Asaas handles end-of-period effect on their side)
        const subId = payload.subscription?.id
        if (!subId) break

        const [tenant] = await db
          .update(tenants)
          .set({ status: 'cancelled' })
          .where(eq(tenants.billingSubscriptionId, subId))
          .returning({ id: tenants.id })

        if (tenant) {
          invalidateTenantStatusCache(tenant.id)
          logger.info({ tenantId: tenant.id }, '[Webhook] Tenant cancelled')
          writeAuditLog({
            tenantId: tenant.id,
            usuarioId: null,
            acao: 'delete',
            entidade: 'billing',
            dadosDepois: { status: 'cancelled' },
            ip: 'asaas-webhook',
          })
        }
        break
      }

      case 'PAYMENT_REFUNDED':
      case 'PAYMENT_CHARGEBACK_REQUESTED':
      case 'PAYMENT_CHARGEBACK_DISPUTE': {
        const subId = payload.payment?.subscription
        if (!subId) break

        const [tenant] = await db
          .update(tenants)
          .set({ status: 'suspended' })
          .where(eq(tenants.billingSubscriptionId, subId))
          .returning({ id: tenants.id })

        if (tenant) {
          invalidateTenantStatusCache(tenant.id)
          logger.warn({ tenantId: tenant.id, event: payload.event }, '[Webhook] Tenant suspended (chargeback/refund)')
        }
        break
      }

      case 'SUBSCRIPTION_CREATED':
      case 'SUBSCRIPTION_UPDATED':
        logger.info({ event: payload.event }, '[Webhook] Subscription event logged')
        break

      default:
        logger.info({ event: payload.event }, '[Webhook] Event not handled')
    }

    return Response.json({ received: true, event: payload.event })
  } catch (error) {
    logger.error(
      { err: error instanceof Error ? error.message : String(error), event: payload.event },
      '[Webhook] Processing error'
    )
    return Response.json({ error: 'Processing failed' }, { status: 500 })
  }
}
