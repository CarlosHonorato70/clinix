import { withAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { tenants } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export const GET = withAuth(async (_req, ctx) => {
  const [tenant] = await db
    .select({
      id: tenants.id,
      nome: tenants.nome,
      subdominio: tenants.subdominio,
      plano: tenants.plano,
      status: tenants.status,
      trialEndsAt: tenants.trialEndsAt,
      createdAt: tenants.createdAt,
    })
    .from(tenants)
    .where(eq(tenants.id, ctx.tenantId))
    .limit(1)

  if (!tenant) {
    return Response.json({ error: 'Tenant não encontrado' }, { status: 404 })
  }

  return Response.json({ tenant })
}, ['admin'])
