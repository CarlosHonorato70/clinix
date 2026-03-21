import { withAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { guiasTiss, convenios, recursosGlosa } from '@/lib/db/schema'
import { eq, sql } from 'drizzle-orm'

export const GET = withAuth(async (_req, user) => {
  const tenantId = user.tenantId
  const now = new Date()
  const mesAtual = new Date(now.getFullYear(), now.getMonth(), 1)

  const todasGuias = await db
    .select({
      id: guiasTiss.id,
      status: guiasTiss.status,
      valorFaturado: guiasTiss.valorFaturado,
      valorPago: guiasTiss.valorPago,
      convenioId: guiasTiss.convenioId,
      createdAt: guiasTiss.createdAt,
    })
    .from(guiasTiss)
    .where(eq(guiasTiss.tenantId, tenantId))

  const guiasMes = todasGuias.filter((g) => g.createdAt && g.createdAt >= mesAtual)

  const totalFaturado = guiasMes.reduce((s, g) => s + parseFloat(g.valorFaturado ?? '0'), 0)
  const totalRecebido = guiasMes.filter((g) => g.status === 'pago').reduce((s, g) => s + parseFloat(g.valorPago ?? g.valorFaturado ?? '0'), 0)
  const totalGlosado = guiasMes.filter((g) => g.status === 'glosado').reduce((s, g) => s + parseFloat(g.valorFaturado ?? '0'), 0)
  const taxaGlosa = totalFaturado > 0 ? ((totalGlosado / totalFaturado) * 100) : 0

  // Aging
  const guiasAbertas = todasGuias.filter((g) => !['pago', 'glosado'].includes(g.status))
  const aging: Record<string, number> = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 }

  for (const g of guiasAbertas) {
    if (!g.createdAt) continue
    const dias = Math.floor((now.getTime() - g.createdAt.getTime()) / (1000 * 60 * 60 * 24))
    const valor = parseFloat(g.valorFaturado ?? '0')
    if (dias <= 30) aging['0-30'] += valor
    else if (dias <= 60) aging['31-60'] += valor
    else if (dias <= 90) aging['61-90'] += valor
    else aging['90+'] += valor
  }

  // Top convênios
  const convenioMap = new Map<string, { faturado: number; recebido: number; glosado: number; total: number }>()
  for (const g of guiasMes) {
    const cid = g.convenioId ?? 'particular'
    const entry = convenioMap.get(cid) ?? { faturado: 0, recebido: 0, glosado: 0, total: 0 }
    entry.faturado += parseFloat(g.valorFaturado ?? '0')
    entry.total += 1
    if (g.status === 'pago') entry.recebido += parseFloat(g.valorPago ?? g.valorFaturado ?? '0')
    if (g.status === 'glosado') entry.glosado += parseFloat(g.valorFaturado ?? '0')
    convenioMap.set(cid, entry)
  }

  const convenioIds = Array.from(convenioMap.keys()).filter((id) => id !== 'particular')
  let nameMap = new Map<string, string>()
  if (convenioIds.length > 0) {
    const convList = await db.select({ id: convenios.id, nome: convenios.nome }).from(convenios).where(eq(convenios.tenantId, tenantId))
    nameMap = new Map(convList.map((c) => [c.id, c.nome]))
  }

  const topConvenios = Array.from(convenioMap.entries())
    .map(([id, data]) => ({ id, nome: nameMap.get(id) ?? 'Particular', ...data }))
    .sort((a, b) => b.faturado - a.faturado)
    .slice(0, 10)

  // Recursos
  const recursos = await db
    .select({ status: recursosGlosa.status, valorRecuperado: recursosGlosa.valorRecuperado })
    .from(recursosGlosa)
    .where(eq(recursosGlosa.tenantId, tenantId))

  return Response.json({
    periodo: { inicio: mesAtual.toISOString(), fim: now.toISOString() },
    metricas: { totalFaturado, totalRecebido, totalGlosado, taxaGlosa: Math.round(taxaGlosa * 100) / 100, totalGuias: guiasMes.length },
    aging,
    topConvenios,
    recursos: {
      total: recursos.length,
      aceitos: recursos.filter((r) => r.status === 'aceito' || r.status === 'parcialmente_aceito').length,
      valorRecuperado: recursos.reduce((s, r) => s + parseFloat(r.valorRecuperado ?? '0'), 0),
    },
  })
}, ['admin', 'faturista'])
