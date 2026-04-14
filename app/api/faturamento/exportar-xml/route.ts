/**
 * Clinix — Exportação de lote XML TISS v4.02
 *
 * Gera um arquivo XML de lote contendo todas as guias selecionadas,
 * pronto para upload manual no portal de uma intermediária (AMHPTISS/ACB)
 * ou envio direto à operadora.
 *
 * Query params:
 * - status: filtrar por status (pendente_envio, pendente_auditoria, etc.)
 * - convenio: filtrar por convenio (UUID)
 * - guiaIds: CSV de IDs específicos de guias
 */

import { withAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { guiasTiss, convenios, consultas, pacientes, tenants, usuarios } from '@/lib/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { buildLoteGuiasXML, type CabecalhoLote, type Prestador, type Beneficiario, type DadosGuia } from '@/lib/tiss/xml-builder'
import { buildGuiaXML } from '@/lib/tiss/xml-builder'
import { decryptField } from '@/lib/security/encryption'
import { writeAuditLog } from '@/lib/audit/logger'

export const GET = withAuth(async (req, ctx) => {
  const url = new URL(req.url)
  const statusFilter = url.searchParams.get('status')
  const convenioFilter = url.searchParams.get('convenio')
  const guiaIdsParam = url.searchParams.get('guiaIds')

  // Build query conditions
  const conditions = [eq(guiasTiss.tenantId, ctx.tenantId)]

  if (statusFilter) {
    conditions.push(eq(guiasTiss.status, statusFilter))
  }
  if (convenioFilter) {
    conditions.push(eq(guiasTiss.convenioId, convenioFilter))
  }
  if (guiaIdsParam) {
    const ids = guiaIdsParam.split(',').filter(Boolean)
    if (ids.length > 0) {
      conditions.push(inArray(guiasTiss.id, ids))
    }
  }

  // Fetch guides with joined data
  const guias = await db
    .select({
      guia: guiasTiss,
      convenio: {
        id: convenios.id,
        nome: convenios.nome,
        codigoAns: convenios.codigoAns,
      },
      consulta: {
        id: consultas.id,
        dataAtendimento: consultas.dataAtendimento,
        iaExtraido: consultas.iaExtraido,
      },
      paciente: {
        id: pacientes.id,
        nome: pacientes.nome,
        cpf: pacientes.cpf,
        dataNascimento: pacientes.dataNascimento,
        sexo: pacientes.sexo,
        numeroCarteirinha: pacientes.numeroCarteirinha,
      },
      medico: {
        id: usuarios.id,
        nome: usuarios.nome,
        crm: usuarios.crm,
      },
    })
    .from(guiasTiss)
    .leftJoin(convenios, eq(guiasTiss.convenioId, convenios.id))
    .leftJoin(consultas, eq(guiasTiss.consultaId, consultas.id))
    .leftJoin(pacientes, eq(consultas.pacienteId, pacientes.id))
    .leftJoin(usuarios, eq(consultas.medicoId, usuarios.id))
    .where(and(...conditions))
    .limit(100)

  if (guias.length === 0) {
    return Response.json(
      { error: 'Nenhuma guia encontrada com os filtros aplicados' },
      { status: 404 }
    )
  }

  // Fetch tenant for prestador data
  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, ctx.tenantId))
    .limit(1)

  if (!tenant) {
    return Response.json({ error: 'Tenant não encontrado' }, { status: 404 })
  }

  // Build prestador (provider) data from tenant
  const prestador: Prestador = {
    cnpj: '00000000000000', // TODO: add cnpj field to tenants table
    codigoPrestador: tenant.subdominio,
    nomeContratado: tenant.nome,
    cnes: '0000000',
  }

  // Group guides by operadora (lote per convenio)
  const guiasPorConvenio = new Map<string, typeof guias>()
  for (const g of guias) {
    const key = g.convenio?.codigoAns ?? 'sem-convenio'
    if (!guiasPorConvenio.has(key)) guiasPorConvenio.set(key, [])
    guiasPorConvenio.get(key)!.push(g)
  }

  // Build XML guides per group
  const now = new Date()
  const seq = Date.now().toString()
  const allXmlPieces: string[] = []

  for (const [codigoAns, grupo] of guiasPorConvenio) {
    for (const item of grupo) {
      if (!item.paciente || !item.convenio || !item.medico) continue

      const beneficiario: Beneficiario = {
        numeroCarteirinha: item.paciente.numeroCarteirinha ?? '0000000000',
        nomeBeneficiario: item.paciente.nome,
        dataNascimento: item.paciente.dataNascimento || undefined,
        sexo: (item.paciente.sexo as 'M' | 'F') || undefined,
        codigoAns: codigoAns ?? '000000',
      }

      // Try to get TUSS codes from the AI extraction stored on the consulta
      const iaData = item.consulta?.iaExtraido as {
        procedimentos?: { tuss: string; descricao: string; quantidade: number }[]
      } | null

      const procedimentos = (iaData?.procedimentos ?? [
        { tuss: '10101012', descricao: 'Consulta em consultório', quantidade: 1 },
      ]).map((p) => ({
        codigoTuss: p.tuss,
        descricao: p.descricao,
        quantidade: p.quantidade,
        valorUnitario: item.guia.valorFaturado ? parseFloat(item.guia.valorFaturado) / p.quantidade : 0,
        dataExecucao: (item.consulta?.dataAtendimento ?? now).toISOString().slice(0, 10),
      }))

      const dadosGuia: DadosGuia = {
        numeroGuia: item.guia.numeroGuia ?? `${Date.now()}`,
        tipo: 'consulta',
        dataAtendimento: (item.consulta?.dataAtendimento ?? now).toISOString().slice(0, 10),
        procedimentos,
      }

      const xmlGuia = buildGuiaXML(dadosGuia, prestador, beneficiario)
      allXmlPieces.push(xmlGuia)
    }
  }

  const cabecalho: CabecalhoLote = {
    registroAns: Array.from(guiasPorConvenio.keys())[0] ?? '000000',
    dataEnvio: now.toISOString().slice(0, 10),
    sequencialTransacao: seq,
  }

  const loteXml = buildLoteGuiasXML(allXmlPieces, cabecalho)

  const filename = `clinix_lote_tiss_${now.toISOString().slice(0, 10)}_${allXmlPieces.length}guias.xml`

  writeAuditLog({
    tenantId: ctx.tenantId,
    usuarioId: ctx.userId,
    acao: 'export',
    entidade: 'guias_tiss',
    dadosDepois: { count: allXmlPieces.length, filename, operadoras: Array.from(guiasPorConvenio.keys()) },
    ip: ctx.ip,
  })

  // Unused import warning suppression
  void decryptField

  return new Response(loteXml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'X-Clinix-Guias-Count': String(allXmlPieces.length),
    },
  })
}, ['admin', 'faturista'])
