import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { guiasTiss } from '@/lib/db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { writeAuditLog } from '@/lib/audit/logger'

// Valid statuses from which a guia can be sent
const SENDABLE_STATUSES = ['pendente_envio', 'pendente_revisao']

export const POST = withAuth(async (req: NextRequest, ctx) => {
  const parts = req.nextUrl.pathname.split('/')
  const id = parts[parts.indexOf('guias') + 1]

  // Atomic status check + update to prevent race conditions
  // Only update if status is in SENDABLE_STATUSES
  const [updated] = await db
    .update(guiasTiss)
    .set({ status: 'enviado' })
    .where(
      and(
        eq(guiasTiss.id, id),
        eq(guiasTiss.tenantId, ctx.tenantId),
        sql`${guiasTiss.status} IN ('pendente_envio', 'pendente_revisao')`
      )
    )
    .returning()

  if (!updated) {
    // Check if guia exists to give a better error
    const [guia] = await db
      .select({ id: guiasTiss.id, status: guiasTiss.status })
      .from(guiasTiss)
      .where(and(eq(guiasTiss.id, id), eq(guiasTiss.tenantId, ctx.tenantId)))
      .limit(1)

    if (!guia) return Response.json({ error: 'Guia não encontrada' }, { status: 404 })

    return Response.json({
      error: `Guia não pode ser enviada no status atual: "${guia.status}"`,
      statusAtual: guia.status,
      statusPermitidos: SENDABLE_STATUSES,
    }, { status: 400 })
  }

  writeAuditLog({
    tenantId: ctx.tenantId,
    usuarioId: ctx.userId,
    acao: 'update',
    entidade: 'guias_tiss',
    entidadeId: id,
    dadosAntes: { status: 'pendente_envio' },
    dadosDepois: { status: 'enviado' },
    ip: ctx.ip,
  })

  return Response.json({ guia: updated })
}, ['admin', 'faturista'])
