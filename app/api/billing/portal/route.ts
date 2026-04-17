/**
 * POST /api/billing/portal
 *
 * Gera uma URL do Stripe Customer Portal para o tenant gerenciar sua
 * assinatura (trocar plano, atualizar cartão, cancelar, etc.).
 *
 * Response: { url: string }
 */

import { withAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { tenants } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { createCustomerPortalSession } from '@/lib/billing/stripe'
import { logger } from '@/lib/logging/logger'

export const POST = withAuth(async (req, ctx) => {
  // Busca o customer ID do tenant
  const [tenant] = await db
    .select({ billingCustomerId: tenants.billingCustomerId })
    .from(tenants)
    .where(eq(tenants.id, ctx.tenantId))
    .limit(1)

  if (!tenant) {
    return Response.json({ error: 'Tenant não encontrado' }, { status: 404 })
  }

  if (!tenant.billingCustomerId) {
    return Response.json(
      { error: 'Nenhuma assinatura ativa. Faça a assinatura de um plano para continuar.' },
      { status: 400 },
    )
  }

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.clinixproia.com.br'

    const session = await createCustomerPortalSession({
      customerId: tenant.billingCustomerId,
      returnUrl: `${appUrl}/dashboard`,
    })

    logger.info(
      { tenantId: ctx.tenantId },
      '[Billing] Customer Portal session criada',
    )

    return Response.json({ url: session.url })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    logger.error({ err: msg, tenantId: ctx.tenantId }, '[Billing] Erro ao criar portal session')

    // Erro claro quando STRIPE_SECRET_KEY não está configurado
    if (msg.includes('Billing não configurado')) {
      return Response.json(
        { error: 'Sistema de pagamento ainda não configurado. Entre em contato com o suporte.' },
        { status: 503 },
      )
    }

    return Response.json({ error: 'Erro ao abrir portal de assinatura' }, { status: 500 })
  }
}, ['admin'])
