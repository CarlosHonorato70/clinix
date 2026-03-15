import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { guiasTiss } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

export const POST = withAuth(async (req: NextRequest, ctx) => {
  const parts = req.nextUrl.pathname.split('/')
  const id = parts[parts.indexOf('guias') + 1]

  const [guia] = await db
    .select()
    .from(guiasTiss)
    .where(and(eq(guiasTiss.id, id), eq(guiasTiss.tenantId, ctx.tenantId)))
    .limit(1)

  if (!guia) return Response.json({ error: 'Guia não encontrada' }, { status: 404 })

  if (guia.status === 'pendente_auditoria') {
    return Response.json({ error: 'Guia precisa ser auditada antes do envio' }, { status: 400 })
  }

  const [updated] = await db
    .update(guiasTiss)
    .set({ status: 'enviado' })
    .where(eq(guiasTiss.id, id))
    .returning()

  return Response.json({ guia: updated })
}, ['admin', 'faturista'])
