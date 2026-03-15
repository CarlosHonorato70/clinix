import { db } from '@/lib/db'
import { tenants } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import type { AsaasWebhookPayload } from '@/lib/billing/asaas'
import { writeAuditLog } from '@/lib/audit/logger'

/**
 * Webhook endpoint for Asaas payment events.
 * Configure in Asaas dashboard: POST https://yourdomain.com/api/billing/webhook
 *
 * Asaas sends a webhook token in the header `asaas-access-token`
 * that should match ASAAS_WEBHOOK_TOKEN env var.
 */
export async function POST(req: Request) {
  // Verify webhook authenticity
  const webhookToken = req.headers.get('asaas-access-token')
  if (webhookToken !== process.env.ASAAS_WEBHOOK_TOKEN) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload: AsaasWebhookPayload = await req.json()

  try {
    switch (payload.event) {
      case 'PAYMENT_CONFIRMED':
      case 'PAYMENT_RECEIVED': {
        // Payment received → activate tenant
        if (payload.payment?.subscription) {
          await db
            .update(tenants)
            .set({ status: 'active' })
            .where(eq(tenants.billingSubscriptionId, payload.payment.subscription))
        }
        break
      }

      case 'PAYMENT_OVERDUE': {
        // Payment overdue → suspend tenant after grace period
        if (payload.payment?.subscription) {
          await db
            .update(tenants)
            .set({ status: 'suspended' })
            .where(eq(tenants.billingSubscriptionId, payload.payment.subscription))
        }
        break
      }

      case 'SUBSCRIPTION_DELETED': {
        // Subscription cancelled → cancel tenant
        if (payload.subscription?.id) {
          await db
            .update(tenants)
            .set({ status: 'cancelled' })
            .where(eq(tenants.billingSubscriptionId, payload.subscription.id))
        }
        break
      }
    }

    // Log webhook event
    writeAuditLog({
      tenantId: 'system',
      userId: 'system',
      action: 'billing.webhook',
      resource: 'billing',
      details: { event: payload.event },
      ip: req.headers.get('x-forwarded-for') || 'webhook',
    })

    return Response.json({ received: true })
  } catch (error) {
    console.error('Webhook processing error:', error)
    return Response.json({ error: 'Processing failed' }, { status: 500 })
  }
}
