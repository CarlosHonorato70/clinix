import { withAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { lotesFaturamento, guiasTiss, convenios } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { buildLoteGuiasXML, buildGuiaXML, type CabecalhoLote, type DadosGuia, type Prestador, type Beneficiario } from '@/lib/tiss/xml-builder'
import { preAuditGuia } from '@/lib/tiss/pre-audit'

export const POST = withAuth(async (req, user) => {
  const id = req.url.split('/lotes/')[1]?.split('/enviar')[0]
  if (!id) return Response.json({ error: 'ID do lote não informado' }, { status: 400 })

  const [lote] = await db
    .select()
    .from(lotesFaturamento)
    .where(and(eq(lotesFaturamento.id, id), eq(lotesFaturamento.tenantId, user.tenantId)))
    .limit(1)

  if (!lote) return Response.json({ error: 'Lote não encontrado' }, { status: 404 })
  if (lote.status !== 'rascunho') {
    return Response.json({ error: 'Lote já foi enviado' }, { status: 400 })
  }

  const guias = await db
    .select()
    .from(guiasTiss)
    .where(
      and(
        eq(guiasTiss.tenantId, user.tenantId),
        eq(guiasTiss.convenioId, lote.convenioId),
        eq(guiasTiss.status, 'pendente_envio')
      )
    )

  if (guias.length === 0) {
    return Response.json({ error: 'Nenhuma guia pronta para envio neste lote' }, { status: 400 })
  }

  const [convenio] = await db
    .select()
    .from(convenios)
    .where(eq(convenios.id, lote.convenioId))
    .limit(1)

  const prestador: Prestador = {
    cnpj: '00000000000000',
    codigoPrestador: '000000',
    nomeContratado: 'Clínica MedFlow',
    cnes: '0000000',
  }

  const guiasXML: string[] = []
  const auditResults: Record<string, { score: number; bloqueios: number }> = {}

  for (const guia of guias) {
    const beneficiario: Beneficiario = {
      numeroCarteirinha: '0000000000',
      nomeBeneficiario: 'Beneficiário',
      codigoAns: convenio?.codigoAns ?? '000000',
    }

    const dadosGuia: DadosGuia = {
      numeroGuia: guia.numeroGuia ?? '',
      tipo: 'sp_sadt',
      dataAtendimento: guia.createdAt?.toISOString().slice(0, 10) ?? new Date().toISOString().slice(0, 10),
      procedimentos: [{
        codigoTuss: '10101012',
        descricao: 'Procedimento',
        quantidade: 1,
        valorUnitario: parseFloat(guia.valorFaturado ?? '0'),
        dataExecucao: guia.createdAt?.toISOString().slice(0, 10) ?? new Date().toISOString().slice(0, 10),
      }],
    }

    const audit = await preAuditGuia(dadosGuia, prestador, beneficiario, lote.convenioId, user.tenantId)
    auditResults[guia.id] = { score: audit.score, bloqueios: audit.bloqueios.length }

    if (audit.aprovado) {
      const xml = buildGuiaXML(dadosGuia, prestador, beneficiario)
      guiasXML.push(xml)
    }
  }

  if (guiasXML.length === 0) {
    return Response.json({ error: 'Nenhuma guia passou na pré-auditoria', auditResults }, { status: 400 })
  }

  const cabecalho: CabecalhoLote = {
    registroAns: convenio?.codigoAns ?? '000000',
    dataEnvio: new Date().toISOString().slice(0, 10),
    sequencialTransacao: id.slice(0, 12),
  }

  const xmlLote = buildLoteGuiasXML(guiasXML, cabecalho)

  await db
    .update(lotesFaturamento)
    .set({
      status: 'enviado',
      xmlLote,
      quantidadeGuias: guiasXML.length,
      enviadoAt: new Date(),
    })
    .where(eq(lotesFaturamento.id, id))

  for (const guia of guias) {
    await db
      .update(guiasTiss)
      .set({ status: 'enviado', xmlEnviado: xmlLote })
      .where(eq(guiasTiss.id, guia.id))
  }

  return Response.json({
    lote: { id, status: 'enviado', guiasEnviadas: guiasXML.length },
    auditResults,
  })
}, ['admin', 'faturista'])
