/**
 * POST /api/billing/subscribe
 *
 * Inicia uma assinatura via Stripe Checkout.
 * Cria o customer no Stripe se ainda não existir e retorna a URL
 * da sessão de checkout para redirecionar o usuário.
 *
 * Body: { planId: string }
 * Response: { url: string }
 */

import { withAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { tenants } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getPlan } from '@/lib/billing/plans'
import { getStripe, createCheckoutSession, getPriceId } from '@/lib/billing/stripe'
import { writeAuditLog } from '@/lib/audit/logger'
import { logger } from '@/lib/logging/logger'

export const POST = withAuth(async (req, ctx) => {
  const body = await req.json()
  const { planId } = body as { planId: string }

  // Valida plano e garante que tem preço (não é trial nem enterprise)
  const plan = getPlan(planId)
  if (!plan || plan.preco <= 0) {
    return Response.json({ error: 'Plano inválido' }, { status: 400 })
  }

  const priceId = getPriceId(planId)
  if (!priceId) {
    return Response.json(
      { error: 'Plano sem price ID configurado. Entre em contato com o suporte.' },
      { status: 400 },
    )
  }

  // Busca dados do tenant
  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, ctx.tenantId))
    .limit(1)

  if (!tenant) {
    return Response.json({ error: 'Tenant não encontrado' }, { status: 404 })
  }

  try {
    let customerId = tenant.billingCustomerId

    // Cria customer no Stripe se ainda não existe
    if (!customerId) {
      const stripe = getStripe()
      const customer = await stripe.customers.create({
        email: ctx.email,
        metadata: { tenantId: ctx.tenantId },
      })
      customerId = customer.id

      await db
        .update(tenants)
        .set({ billingCustomerId: customerId })
        .where(eq(tenants.id, ctx.tenantId))

      logger.info(
        { tenantId: ctx.tenantId, customerId },
        '[Billing] Customer Stripe criado',
      )
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.clinixproia.com.br'

    // Cria sessão de Checkout do Stripe
    const session = await createCheckoutSession({
      tenantId: ctx.tenantId,
      customerId,
      email: ctx.email,
      priceId,
      successUrl: `${appUrl}/dashboard?billing=success`,
      cancelUrl: `${appUrl}/dashboard?billing=cancelled`,
    })

    writeAuditLog({
      tenantId: ctx.tenantId,
      usuarioId: ctx.userId,
      acao: 'create',
      entidade: 'billing',
      dadosDepois: { planId, stripeSessionId: session.id },
      ip: ctx.ip,
    })

    logger.info(
      { tenantId: ctx.tenantId, planId, sessionId: session.id },
      '[Billing] Checkout session criada',
    )

    return Response.json({ url: session.url })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    logger.error({ err: msg, tenantId: ctx.tenantId, planId }, '[Billing] Erro ao criar assinatura')

    // Erro claro quando STRIPE_SECRET_KEY não está configurado
    if (msg.includes('Billing não configurado')) {
      return Response.json(
        { error: 'Sistema de pagamento ainda não configurado. Entre em contato com o suporte.' },
        { status: 503 },
      )
    }

    return Response.json({ error: 'Erro ao iniciar assinatura' }, { status: 500 })
  }
}, ['admin'])
