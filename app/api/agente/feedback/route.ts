import { withAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { agentFeedback, convenioRegrasAprendidas } from '@/lib/db/schema'
import { eq, sql } from 'drizzle-orm'

export const POST = withAuth(async (req, ctx) => {
  const { regraId, acao, comentario } = await req.json()

  if (!regraId || !acao || !['confirmar', 'rejeitar'].includes(acao)) {
    return Response.json({ error: 'regraId e acao (confirmar|rejeitar) são obrigatórios' }, { status: 400 })
  }

  // Save feedback
  await db.insert(agentFeedback).values({
    tenantId: ctx.tenantId,
    regraId,
    usuarioId: ctx.userId,
    acao,
    comentario,
  })

  // Update rule counters
  if (acao === 'confirmar') {
    await db
      .update(convenioRegrasAprendidas)
      .set({
        confirmacoes: sql`${convenioRegrasAprendidas.confirmacoes} + 1`,
        confianca: sql`LEAST(0.99, ${convenioRegrasAprendidas.confianca} + (1 - ${convenioRegrasAprendidas.confianca}) * 0.15)`,
        confirmadaPorHumano: true,
        updatedAt: new Date(),
      })
      .where(eq(convenioRegrasAprendidas.id, regraId))
  } else {
    await db
      .update(convenioRegrasAprendidas)
      .set({
        rejeicoes: sql`${convenioRegrasAprendidas.rejeicoes} + 1`,
        confianca: sql`GREATEST(0.01, ${convenioRegrasAprendidas.confianca} * 0.7)`,
        updatedAt: new Date(),
      })
      .where(eq(convenioRegrasAprendidas.id, regraId))
  }

  return Response.json({ success: true })
}, ['admin', 'faturista'])
