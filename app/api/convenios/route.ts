import { withAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { convenios } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

export const GET = withAuth(async (_req, ctx) => {
  const list = await db
    .select()
    .from(convenios)
    .where(
      and(
        eq(convenios.tenantId, ctx.tenantId),
        eq(convenios.ativo, true),
      )
    )

  return Response.json({ convenios: list })
})

export const POST = withAuth(async (req, ctx) => {
  const body = await req.json()
  const { nome, codigoAns } = body

  if (!nome) {
    return Response.json({ error: 'Nome é obrigatório' }, { status: 400 })
  }

  const [created] = await db
    .insert(convenios)
    .values({
      tenantId: ctx.tenantId,
      nome,
      codigoAns: codigoAns || null,
    })
    .returning()

  return Response.json({ convenio: created }, { status: 201 })
}, ['admin', 'faturista'])
