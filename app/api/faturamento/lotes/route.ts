import { withAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { lotesFaturamento, guiasTiss } from '@/lib/db/schema'
import { eq, and, inArray } from 'drizzle-orm'

export const GET = withAuth(async (_req, user) => {
  const lotes = await db
    .select()
    .from(lotesFaturamento)
    .where(eq(lotesFaturamento.tenantId, user.tenantId))
    .orderBy(lotesFaturamento.createdAt)

  return Response.json({ lotes })
}, ['admin', 'faturista'])

export const POST = withAuth(async (req, user) => {
  const body = await req.json()
  const { convenioId, guiaIds, competencia } = body

  if (!convenioId || !guiaIds?.length || !competencia) {
    return Response.json({ error: 'convenioId, guiaIds e competencia são obrigatórios' }, { status: 400 })
  }

  const guias = await db
    .select()
    .from(guiasTiss)
    .where(
      and(
        eq(guiasTiss.tenantId, user.tenantId),
        eq(guiasTiss.convenioId, convenioId),
        inArray(guiasTiss.id, guiaIds)
      )
    )

  const naoEnviaveis = guias.filter((g) => g.status !== 'pendente_envio')
  if (naoEnviaveis.length > 0) {
    return Response.json({
      error: `${naoEnviaveis.length} guia(s) não estão prontas para envio`,
      guias: naoEnviaveis.map((g) => ({ id: g.id, status: g.status })),
    }, { status: 400 })
  }

  const valorTotal = guias.reduce((sum, g) => sum + parseFloat(g.valorFaturado ?? '0'), 0)

  const [lote] = await db
    .insert(lotesFaturamento)
    .values({
      tenantId: user.tenantId,
      convenioId,
      competencia,
      quantidadeGuias: guias.length,
      valorTotal: valorTotal.toFixed(2),
      status: 'rascunho',
    })
    .returning()

  return Response.json({ lote }, { status: 201 })
}, ['admin', 'faturista'])
