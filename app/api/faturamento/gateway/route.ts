import { withAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { lotesFaturamento, guiasTiss, convenios } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { enviarLoteGuias, consultarStatusProtocolo, type ConvenioConfig } from '@/lib/tiss/gateway'
import { buildLoteGuiasXML, type CabecalhoLote } from '@/lib/tiss/xml-builder'
import { writeAuditLog } from '@/lib/audit/logger'

/**
 * POST /api/faturamento/gateway
 *
 * Envia um lote de guias diretamente à operadora via Web Service TISS.
 * Body: { loteId: string }
 *
 * Fluxo:
 * 1. Busca o lote e suas guias
 * 2. Verifica se o convênio tem integração configurada
 * 3. Envia via gateway SOAP
 * 4. Grava protocolo e atualiza status
 */
export const POST = withAuth(async (req, user) => {
  const body = await req.json()
  const { loteId, acao } = body

  // ── Enviar lote ──────────────────────────────────────────────────
  if (acao === 'enviar' || !acao) {
    if (!loteId) {
      return Response.json({ error: 'loteId é obrigatório' }, { status: 400 })
    }

    // Fetch lote
    const [lote] = await db
      .select()
      .from(lotesFaturamento)
      .where(and(eq(lotesFaturamento.id, loteId), eq(lotesFaturamento.tenantId, user.tenantId)))
      .limit(1)

    if (!lote) return Response.json({ error: 'Lote não encontrado' }, { status: 404 })

    // Fetch convenio with integration config
    const [convenio] = await db
      .select()
      .from(convenios)
      .where(eq(convenios.id, lote.convenioId))
      .limit(1)

    if (!convenio) return Response.json({ error: 'Convênio não encontrado' }, { status: 404 })

    if (!convenio.wsdlUrl || !convenio.integracaoAtiva) {
      return Response.json({
        error: 'Integração não configurada para este convênio',
        detalhe: 'Configure a URL do Web Service TISS em Configurações > Convênios',
      }, { status: 400 })
    }

    // Use existing XML or generate
    const xmlLote = lote.xmlLote
    if (!xmlLote) {
      return Response.json({ error: 'XML do lote não gerado. Envie o lote primeiro.' }, { status: 400 })
    }

    // Build convenio config
    const config: ConvenioConfig = {
      nome: convenio.nome,
      codigoAns: convenio.codigoAns ?? '',
      wsdlUrl: convenio.wsdlUrl,
      codigoPrestador: convenio.codigoPrestador ?? undefined,
      wsLogin: convenio.wsLogin ?? undefined,
      wsSenha: convenio.wsSenha ?? undefined,
      wsConfig: (convenio.wsConfig as ConvenioConfig['wsConfig']) ?? undefined,
    }

    // Send via gateway
    const resultado = await enviarLoteGuias(xmlLote, config, '')

    // Update lote with result
    await db
      .update(lotesFaturamento)
      .set({
        status: resultado.sucesso ? 'enviado' : 'rascunho',
        protocoloOperadora: resultado.protocolo ?? null,
        enviadoAt: resultado.sucesso ? new Date() : null,
      })
      .where(eq(lotesFaturamento.id, loteId))

    // Audit log
    writeAuditLog({
      tenantId: user.tenantId,
      usuarioId: user.userId,
      acao: 'create',
      entidade: 'gateway_tiss',
      entidadeId: loteId,
      dadosDepois: {
        transacao: 'ENVIO_LOTE_GUIAS',
        convenio: convenio.nome,
        sucesso: resultado.sucesso,
        protocolo: resultado.protocolo,
        latenciaMs: resultado.latenciaMs,
      },
      ip: user.ip,
    })

    return Response.json({
      sucesso: resultado.sucesso,
      protocolo: resultado.protocolo,
      erro: resultado.erro,
      latenciaMs: resultado.latenciaMs,
    })
  }

  // ── Consultar status do protocolo ────────────────────────────────
  if (acao === 'status') {
    const { protocoloOperadora, convenioId } = body

    if (!protocoloOperadora || !convenioId) {
      return Response.json({ error: 'protocoloOperadora e convenioId são obrigatórios' }, { status: 400 })
    }

    const [convenio] = await db
      .select()
      .from(convenios)
      .where(and(eq(convenios.id, convenioId), eq(convenios.tenantId, user.tenantId)))
      .limit(1)

    if (!convenio?.wsdlUrl) {
      return Response.json({ error: 'Integração não configurada' }, { status: 400 })
    }

    const config: ConvenioConfig = {
      nome: convenio.nome,
      codigoAns: convenio.codigoAns ?? '',
      wsdlUrl: convenio.wsdlUrl,
      codigoPrestador: convenio.codigoPrestador ?? undefined,
      wsLogin: convenio.wsLogin ?? undefined,
      wsSenha: convenio.wsSenha ?? undefined,
      wsConfig: (convenio.wsConfig as ConvenioConfig['wsConfig']) ?? undefined,
    }

    const resultado = await consultarStatusProtocolo(protocoloOperadora, config, '')

    return Response.json({
      sucesso: resultado.sucesso,
      xmlResposta: resultado.xmlResposta,
      latenciaMs: resultado.latenciaMs,
    })
  }

  return Response.json({ error: 'Ação inválida. Use: enviar, status' }, { status: 400 })
}, ['admin', 'faturista'])
