/**
 * Clinix — Geração de relatórios em CSV
 *
 * Tipos suportados:
 * - produtividade: consultas por médico no período
 * - glosas: guias glosadas agrupadas por convênio e motivo
 * - faturamento: faturamento por convênio
 *
 * Query params:
 * - from: YYYY-MM-DD (opcional, default = início do mês atual)
 * - to: YYYY-MM-DD (opcional, default = hoje)
 */

import { withAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { consultas, usuarios, guiasTiss, convenios } from '@/lib/db/schema'
import { eq, and, gte, lte, sql } from 'drizzle-orm'

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.join(',')]
  for (const row of rows) {
    lines.push(row.map(escapeCsv).join(','))
  }
  return lines.join('\n')
}

function parseDateRange(url: URL): { from: Date; to: Date } {
  const fromParam = url.searchParams.get('from')
  const toParam = url.searchParams.get('to')

  const now = new Date()
  const from = fromParam
    ? new Date(fromParam)
    : new Date(now.getFullYear(), now.getMonth(), 1)
  const to = toParam ? new Date(toParam) : now

  // Normalize to end of day for 'to'
  to.setHours(23, 59, 59, 999)

  return { from, to }
}

export const GET = withAuth(async (req, ctx) => {
  const url = new URL(req.url)
  // Extract tipo from path: /api/relatorios/{tipo}
  const segments = url.pathname.split('/').filter(Boolean)
  const tipo = segments[segments.length - 1]
  const { from, to } = parseDateRange(url)
  const format = url.searchParams.get('format') || 'csv'

  let csvContent = ''
  let filename = ''

  if (tipo === 'produtividade') {
    const rows = await db
      .select({
        medicoId: consultas.medicoId,
        medicoNome: usuarios.nome,
        especialidade: usuarios.especialidade,
        totalConsultas: sql<number>`count(${consultas.id})::int`,
      })
      .from(consultas)
      .leftJoin(usuarios, eq(consultas.medicoId, usuarios.id))
      .where(
        and(
          eq(consultas.tenantId, ctx.tenantId),
          gte(consultas.dataAtendimento, from),
          lte(consultas.dataAtendimento, to),
        )
      )
      .groupBy(consultas.medicoId, usuarios.nome, usuarios.especialidade)
      .orderBy(sql`count(${consultas.id}) desc`)

    csvContent = toCsv(
      ['Medico', 'Especialidade', 'Total Consultas'],
      rows.map((r) => [r.medicoNome || 'Desconhecido', r.especialidade || '-', r.totalConsultas])
    )
    filename = `produtividade_${from.toISOString().slice(0, 10)}_${to.toISOString().slice(0, 10)}.csv`
  } else if (tipo === 'glosas') {
    const rows = await db
      .select({
        convenio: convenios.nome,
        motivo: guiasTiss.glosMotivo,
        numeroGuia: guiasTiss.numeroGuia,
        valorFaturado: guiasTiss.valorFaturado,
        valorPago: guiasTiss.valorPago,
        createdAt: guiasTiss.createdAt,
      })
      .from(guiasTiss)
      .leftJoin(convenios, eq(guiasTiss.convenioId, convenios.id))
      .where(
        and(
          eq(guiasTiss.tenantId, ctx.tenantId),
          eq(guiasTiss.status, 'glosado'),
          gte(guiasTiss.createdAt, from),
          lte(guiasTiss.createdAt, to),
        )
      )
      .orderBy(guiasTiss.createdAt)

    csvContent = toCsv(
      ['Convenio', 'Numero Guia', 'Motivo Glosa', 'Valor Faturado', 'Valor Pago', 'Data'],
      rows.map((r) => [
        r.convenio || '-',
        r.numeroGuia,
        r.motivo || '-',
        r.valorFaturado || '0',
        r.valorPago || '0',
        r.createdAt?.toISOString().slice(0, 10) || '-',
      ])
    )
    filename = `glosas_${from.toISOString().slice(0, 10)}_${to.toISOString().slice(0, 10)}.csv`
  } else if (tipo === 'faturamento') {
    const rows = await db
      .select({
        convenio: convenios.nome,
        codigoAns: convenios.codigoAns,
        totalGuias: sql<number>`count(${guiasTiss.id})::int`,
        totalFaturado: sql<string>`coalesce(sum(${guiasTiss.valorFaturado}::numeric), 0)::text`,
        totalPago: sql<string>`coalesce(sum(${guiasTiss.valorPago}::numeric), 0)::text`,
        guiasPagas: sql<number>`count(case when ${guiasTiss.status} = 'pago' then 1 end)::int`,
        guiasGlosadas: sql<number>`count(case when ${guiasTiss.status} = 'glosado' then 1 end)::int`,
      })
      .from(guiasTiss)
      .leftJoin(convenios, eq(guiasTiss.convenioId, convenios.id))
      .where(
        and(
          eq(guiasTiss.tenantId, ctx.tenantId),
          gte(guiasTiss.createdAt, from),
          lte(guiasTiss.createdAt, to),
        )
      )
      .groupBy(convenios.id, convenios.nome, convenios.codigoAns)
      .orderBy(sql`sum(${guiasTiss.valorFaturado}::numeric) desc nulls last`)

    csvContent = toCsv(
      ['Convenio', 'Codigo ANS', 'Total Guias', 'Total Faturado', 'Total Pago', 'Guias Pagas', 'Guias Glosadas'],
      rows.map((r) => [
        r.convenio || '-',
        r.codigoAns || '-',
        r.totalGuias,
        r.totalFaturado,
        r.totalPago,
        r.guiasPagas,
        r.guiasGlosadas,
      ])
    )
    filename = `faturamento_${from.toISOString().slice(0, 10)}_${to.toISOString().slice(0, 10)}.csv`
  } else {
    return Response.json({ error: 'Tipo de relatório inválido. Use: produtividade | glosas | faturamento' }, { status: 400 })
  }

  if (format === 'json') {
    return Response.json({
      tipo,
      periodo: { from: from.toISOString(), to: to.toISOString() },
      csv: csvContent,
    })
  }

  return new Response(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
})
