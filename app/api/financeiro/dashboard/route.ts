import { withAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { guiasTiss, convenios, recursosGlosa } from '@/lib/db/schema'
import { eq, gte, and, sql, desc } from 'drizzle-orm'

// Safe money addition using integer cents to avoid floating-point errors
function sumMoney(values: (string | null)[]): number {
  const cents = values.reduce((sum, v) => {
    if (!v) return sum
    return sum + Math.round(parseFloat(v) * 100)
  }, 0)
  return cents / 100
}

export const GET = withAuth(async (_req, user) => {
  const tenantId = user.tenantId
  const now = new Date()
  const mesAtual = new Date(now.getFullYear(), now.getMonth(), 1)

  // Query with limit and date filter at DB level (not in memory)
  const guiasMes = await db
    .select({
      id: guiasTiss.id,
      status: guiasTiss.status,
      valorFaturado: guiasTiss.valorFaturado,
      valorPago: guiasTiss.valorPago,
      convenioId: guiasTiss.convenioId,
      createdAt: guiasTiss.createdAt,
    })
    .from(guiasTiss)
    .where(and(
      eq(guiasTiss.tenantId, tenantId),
      gte(guiasTiss.createdAt, mesAtual)
    ))
    .orderBy(desc(guiasTiss.createdAt))
    .limit(10000) // Hard cap to prevent memory exhaustion

  // Use integer cents for precise money calculations
  const totalFaturado = sumMoney(guiasMes.map((g) => g.valorFaturado))
  const totalRecebido = sumMoney(guiasMes.filter((g) => g.status === 'pago').map((g) => g.valorPago ?? g.valorFaturado))
  const totalGlosado = sumMoney(guiasMes.filter((g) => g.status === 'glosado').map((g) => g.valorFaturado))
  const taxaGlosa = totalFaturado > 0 ? Math.round((totalGlosado / totalFaturado) * 10000) / 100 : 0

  // Aging — query open guias separately with limit
  const guiasAbertas = await db
    .select({
      valorFaturado: guiasTiss.valorFaturado,
      createdAt: guiasTiss.createdAt,
    })
    .from(guiasTiss)
    .where(and(
      eq(guiasTiss.tenantId, tenantId),
      sql`${guiasTiss.status} NOT IN ('pago', 'glosado')`
    ))
    .limit(10000)

  const aging: Record<string, number> = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 }
  for (const g of guiasAbertas) {
    if (!g.createdAt) continue
    const dias = Math.floor((now.getTime() - g.createdAt.getTime()) / (1000 * 60 * 60 * 24))
    const centavos = Math.round(parseFloat(g.valorFaturado ?? '0') * 100)
    if (dias <= 30) aging['0-30'] += centavos
    else if (dias <= 60) aging['31-60'] += centavos
    else if (dias <= 90) aging['61-90'] += centavos
    else aging['90+'] += centavos
  }
  // Convert back from cents
  for (const key of Object.keys(aging)) {
    aging[key] = aging[key] / 100
  }

  // Top convênios
  const convenioMap = new Map<string, { faturado: number; recebido: number; glosado: number; total: number }>()
  for (const g of guiasMes) {
    const cid = g.convenioId ?? 'particular'
    const entry = convenioMap.get(cid) ?? { faturado: 0, recebido: 0, glosado: 0, total: 0 }
    entry.faturado += Math.round(parseFloat(g.valorFaturado ?? '0') * 100)
    entry.total += 1
    if (g.status === 'pago') entry.recebido += Math.round(parseFloat(g.valorPago ?? g.valorFaturado ?? '0') * 100)
    if (g.status === 'glosado') entry.glosado += Math.round(parseFloat(g.valorFaturado ?? '0') * 100)
    convenioMap.set(cid, entry)
  }

  let nameMap = new Map<string, string>()
  const convenioIds = Array.from(convenioMap.keys()).filter((id) => id !== 'particular')
  if (convenioIds.length > 0) {
    const convList = await db.select({ id: convenios.id, nome: convenios.nome }).from(convenios).where(eq(convenios.tenantId, tenantId))
    nameMap = new Map(convList.map((c) => [c.id, c.nome]))
  }

  const topConvenios = Array.from(convenioMap.entries())
    .map(([id, data]) => ({ id, nome: nameMap.get(id) ?? 'Particular', faturado: data.faturado / 100, recebido: data.recebido / 100, glosado: data.glosado / 100, total: data.total }))
    .sort((a, b) => b.faturado - a.faturado)
    .slice(0, 10)

  // Recursos
  const recursos = await db
    .select({ status: recursosGlosa.status, valorRecuperado: recursosGlosa.valorRecuperado })
    .from(recursosGlosa)
    .where(eq(recursosGlosa.tenantId, tenantId))
    .limit(5000)

  return Response.json({
    periodo: { inicio: mesAtual.toISOString(), fim: now.toISOString() },
    metricas: { totalFaturado, totalRecebido, totalGlosado, taxaGlosa, totalGuias: guiasMes.length },
    aging,
    topConvenios,
    recursos: {
      total: recursos.length,
      aceitos: recursos.filter((r) => r.status === 'aceito' || r.status === 'parcialmente_aceito').length,
      valorRecuperado: sumMoney(recursos.map((r) => r.valorRecuperado)),
    },
  })
}, ['admin', 'faturista'])
