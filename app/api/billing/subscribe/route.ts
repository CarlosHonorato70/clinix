import { withAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { tenants } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { createCustomer, createSubscription } from '@/lib/billing/asaas'
import { getPlan } from '@/lib/billing/plans'
import { writeAuditLog } from '@/lib/audit/logger'

export const POST = withAuth(async (req, ctx) => {
  const body = await req.json()
  const { planId, billingType, cpfCnpj } = body as {
    planId: string
    billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX'
    cpfCnpj: string
  }

  const plan = getPlan(planId)
  if (!plan || plan.preco <= 0) {
    return Response.json({ error: 'Plano inválido' }, { status: 400 })
  }

  // Get tenant info
  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, ctx.tenantId))
    .limit(1)

  if (!tenant) {
    return Response.json({ error: 'Tenant não encontrado' }, { status: 404 })
  }

  try {
    // Create or reuse Asaas customer
    let customerId = tenant.billingCustomerId
    if (!customerId) {
      const customer = await createCustomer({
        name: tenant.nome,
        email: ctx.email,
        cpfCnpj,
      })
      customerId = customer.id

      await db
        .update(tenants)
        .set({ billingCustomerId: customerId })
        .where(eq(tenants.id, ctx.tenantId))
    }

    // Create subscription
    const nextDueDate = new Date()
    nextDueDate.setDate(nextDueDate.getDate() + 1)
    const dueDateStr = nextDueDate.toISOString().split('T')[0]

    const subscription = await createSubscription({
      customer: customerId,
      billingType,
      value: plan.preco,
      cycle: 'MONTHLY',
      nextDueDate: dueDateStr,
      description: `MedFlow - Plano ${plan.nome}`,
    })

    // Update tenant
    await db
      .update(tenants)
      .set({
        plano: planId,
        billingSubscriptionId: subscription.id,
        status: 'active',
      })
      .where(eq(tenants.id, ctx.tenantId))

    writeAuditLog({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: 'billing.subscribe',
      resource: 'billing',
      details: { planId, billingType, subscriptionId: subscription.id },
      ip: ctx.ip,
    })

    return Response.json({ subscription: { id: subscription.id, status: subscription.status } })
  } catch (error) {
    console.error('Billing subscribe error:', error)
    return Response.json({ error: 'Erro ao criar assinatura' }, { status: 500 })
  }
}, ['admin'])
