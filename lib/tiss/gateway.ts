/**
 * MedFlow — Gateway TISS
 *
 * Cliente SOAP unificado para todas as transações TISS com operadoras.
 * Suporta: envio de lote de guias, elegibilidade, solicitação de procedimento,
 * status de autorização, recurso de glosa, e status de protocolo.
 *
 * Cada operadora (Unimed, Amil, Bradesco, SulAmérica, etc.) expõe os mesmos
 * Web Services padronizados pela ANS — apenas a URL do endpoint muda.
 *
 * Ref: TISS v4.02 — WSDLs padronizados pela ANS
 */

import { createHash } from 'crypto'
import { TISS_VERSION, TISS_NAMESPACE } from './constants'
import { logger } from '@/lib/logging/logger'

// ─── Types ──────────────────────────────────────────────────────────────────

export type TissTransacao =
  | 'ENVIO_LOTE_GUIAS'
  | 'VERIFICA_ELEGIBILIDADE'
  | 'SOLICITACAO_PROCEDIMENTO'
  | 'SOLICITACAO_STATUS_AUTORIZACAO'
  | 'SOLICITACAO_STATUS_PROTOCOLO'
  | 'CANCELA_GUIA'
  | 'RECURSO_GLOSA'
  | 'STATUS_RECURSO_GLOSA'
  | 'SOLICITACAO_DEMONSTRATIVO_RETORNO'

export interface ConvenioConfig {
  nome: string
  codigoAns: string
  wsdlUrl: string
  codigoPrestador?: string
  wsLogin?: string
  wsSenha?: string
  wsConfig?: {
    autorizacaoUrl?: string
    elegibilidadeUrl?: string
    recursoGlosaUrl?: string
    loteGuiasUrl?: string
    statusProtocoloUrl?: string
    tabelaPreco?: string
    prazoEnvioDias?: number
    timeout?: number
  }
}

export interface GatewayRequest {
  transacao: TissTransacao
  corpo: string // XML do corpo da mensagem
  convenio: ConvenioConfig
  cnpjPrestador: string
  sequencial?: string
}

export interface GatewayResponse {
  sucesso: boolean
  protocolo?: string
  xmlResposta?: string
  erro?: string
  httpStatus?: number
  latenciaMs: number
  transacao: TissTransacao
}

// ─── SOAP Envelope Builder ───────────────────────────────────────────────────

function buildSOAPEnvelope(req: GatewayRequest): string {
  const seq = req.sequencial ?? String(Date.now())
  const now = new Date()
  const data = now.toISOString().slice(0, 10)
  const hora = now.toTimeString().slice(0, 8)

  const hash = createHash('md5').update(req.corpo, 'utf8').digest('hex')

  const mensagemTISS = `
    <ans:mensagemTISS xmlns:ans="${TISS_NAMESPACE}">
      <ans:cabecalho>
        <ans:identificacaoTransacao>
          <ans:tipoTransacao>${req.transacao}</ans:tipoTransacao>
          <ans:sequencialTransacao>${seq}</ans:sequencialTransacao>
          <ans:dataRegistroTransacao>${data}</ans:dataRegistroTransacao>
          <ans:horaRegistroTransacao>${hora}</ans:horaRegistroTransacao>
        </ans:identificacaoTransacao>
        <ans:origem>
          <ans:identificacaoPrestador>
            ${req.convenio.codigoPrestador
              ? `<ans:codigoPrestadorNaOperadora>${req.convenio.codigoPrestador}</ans:codigoPrestadorNaOperadora>`
              : `<ans:CNPJ>${req.cnpjPrestador}</ans:CNPJ>`
            }
          </ans:identificacaoPrestador>
        </ans:origem>
        <ans:destino>
          <ans:registroANS>${req.convenio.codigoAns}</ans:registroANS>
        </ans:destino>
        <ans:Padrao>${TISS_VERSION}</ans:Padrao>
      </ans:cabecalho>
      ${req.corpo}
      <ans:epilogo>
        <ans:hash>${hash}</ans:hash>
      </ans:epilogo>
    </ans:mensagemTISS>`

  return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:ans="${TISS_NAMESPACE}">
  ${req.convenio.wsLogin ? `
  <soap:Header>
    <wsse:Security xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
      <wsse:UsernameToken>
        <wsse:Username>${req.convenio.wsLogin}</wsse:Username>
        <wsse:Password>${req.convenio.wsSenha ?? ''}</wsse:Password>
      </wsse:UsernameToken>
    </wsse:Security>
  </soap:Header>` : ''}
  <soap:Body>
    ${mensagemTISS}
  </soap:Body>
</soap:Envelope>`
}

// ─── SOAP Action mapping ─────────────────────────────────────────────────────

const SOAP_ACTIONS: Record<TissTransacao, string> = {
  ENVIO_LOTE_GUIAS: 'http://www.ans.gov.br/tiss/ws/enviar-lote-guias',
  VERIFICA_ELEGIBILIDADE: 'http://www.ans.gov.br/tiss/ws/verificar-elegibilidade',
  SOLICITACAO_PROCEDIMENTO: 'http://www.ans.gov.br/tiss/ws/solicitar-procedimento',
  SOLICITACAO_STATUS_AUTORIZACAO: 'http://www.ans.gov.br/tiss/ws/solicitar-status-autorizacao',
  SOLICITACAO_STATUS_PROTOCOLO: 'http://www.ans.gov.br/tiss/ws/solicitar-status-protocolo',
  CANCELA_GUIA: 'http://www.ans.gov.br/tiss/ws/cancelar-guia',
  RECURSO_GLOSA: 'http://www.ans.gov.br/tiss/ws/recurso-glosa',
  STATUS_RECURSO_GLOSA: 'http://www.ans.gov.br/tiss/ws/status-recurso-glosa',
  SOLICITACAO_DEMONSTRATIVO_RETORNO: 'http://www.ans.gov.br/tiss/ws/solicitar-demonstrativo-retorno',
}

// ─── Endpoint resolver ───────────────────────────────────────────────────────

function getEndpointUrl(transacao: TissTransacao, convenio: ConvenioConfig): string {
  const config = convenio.wsConfig
  const base = convenio.wsdlUrl

  // Check for transaction-specific URLs first
  switch (transacao) {
    case 'VERIFICA_ELEGIBILIDADE':
      return config?.elegibilidadeUrl ?? base
    case 'SOLICITACAO_PROCEDIMENTO':
    case 'SOLICITACAO_STATUS_AUTORIZACAO':
      return config?.autorizacaoUrl ?? base
    case 'RECURSO_GLOSA':
    case 'STATUS_RECURSO_GLOSA':
      return config?.recursoGlosaUrl ?? base
    case 'ENVIO_LOTE_GUIAS':
      return config?.loteGuiasUrl ?? base
    case 'SOLICITACAO_STATUS_PROTOCOLO':
      return config?.statusProtocoloUrl ?? base
    default:
      return base
  }
}

// ─── XML Response parser helpers ─────────────────────────────────────────────

function extractTag(xml: string, tag: string): string | undefined {
  // Match with or without namespace prefix
  const regex = new RegExp(`<(?:[^:]+:)?${tag}[^>]*>([^<]*)<`, 'i')
  const match = xml.match(regex)
  return match?.[1]?.trim() || undefined
}

function extractProtocolo(xml: string): string | undefined {
  return extractTag(xml, 'numeroProtocolo')
    ?? extractTag(xml, 'protocolo')
    ?? extractTag(xml, 'sequencialTransacao')
}

function extractErro(xml: string): string | undefined {
  return extractTag(xml, 'descricaoErro')
    ?? extractTag(xml, 'mensagemErro')
    ?? extractTag(xml, 'descricaoMotivoGlosa')
    ?? extractTag(xml, 'Fault')
}

// ─── Gateway principal ───────────────────────────────────────────────────────

export async function enviarTransacao(req: GatewayRequest): Promise<GatewayResponse> {
  const url = getEndpointUrl(req.transacao, req.convenio)
  const soapAction = SOAP_ACTIONS[req.transacao]
  const timeout = req.convenio.wsConfig?.timeout ?? 30000

  const soapXML = buildSOAPEnvelope(req)
  const inicio = Date.now()

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': soapAction,
        ...(req.convenio.wsLogin ? {
          'Authorization': `Basic ${Buffer.from(`${req.convenio.wsLogin}:${req.convenio.wsSenha ?? ''}`).toString('base64')}`,
        } : {}),
      },
      body: soapXML,
      signal: AbortSignal.timeout(timeout),
    })

    const xmlResposta = await response.text()
    const latenciaMs = Date.now() - inicio

    if (!response.ok) {
      const erro = extractErro(xmlResposta) ?? `HTTP ${response.status}`
      logger.warn(
        { transacao: req.transacao, convenio: req.convenio.nome, status: response.status, latenciaMs },
        `Gateway TISS: erro HTTP ${response.status}`
      )
      return {
        sucesso: false,
        erro,
        xmlResposta,
        httpStatus: response.status,
        latenciaMs,
        transacao: req.transacao,
      }
    }

    const protocolo = extractProtocolo(xmlResposta)
    const erro = extractErro(xmlResposta)

    logger.info(
      { transacao: req.transacao, convenio: req.convenio.nome, protocolo, latenciaMs },
      `Gateway TISS: transação ${req.transacao} ${erro ? 'com erros' : 'sucesso'}`
    )

    return {
      sucesso: !erro,
      protocolo,
      xmlResposta,
      erro,
      httpStatus: response.status,
      latenciaMs,
      transacao: req.transacao,
    }
  } catch (err) {
    const latenciaMs = Date.now() - inicio
    const message = err instanceof Error ? err.message : String(err)

    logger.error(
      { transacao: req.transacao, convenio: req.convenio.nome, error: message, latenciaMs },
      'Gateway TISS: falha de conexão'
    )

    return {
      sucesso: false,
      erro: message.includes('timeout')
        ? `Timeout (${timeout}ms) — operadora não respondeu`
        : `Falha de conexão: ${message}`,
      latenciaMs,
      transacao: req.transacao,
    }
  }
}

// ─── Funções de conveniência ─────────────────────────────────────────────────

/** Enviar lote de guias XML para a operadora */
export async function enviarLoteGuias(
  xmlLote: string,
  convenio: ConvenioConfig,
  cnpjPrestador: string
): Promise<GatewayResponse> {
  return enviarTransacao({
    transacao: 'ENVIO_LOTE_GUIAS',
    corpo: xmlLote,
    convenio,
    cnpjPrestador,
  })
}

/** Verificar elegibilidade do beneficiário */
export async function verificarElegibilidadeWS(
  carteirinha: string,
  convenio: ConvenioConfig,
  cnpjPrestador: string
): Promise<GatewayResponse> {
  const corpo = `
    <ans:prestadorParaOperadora>
      <ans:verificacaoElegibilidade>
        <ans:elegibilidadeVerificacao>
          <ans:registroANS>${convenio.codigoAns}</ans:registroANS>
          <ans:numeroCarteira>${carteirinha}</ans:numeroCarteira>
          <ans:dataAtendimento>${new Date().toISOString().slice(0, 10)}</ans:dataAtendimento>
        </ans:elegibilidadeVerificacao>
      </ans:verificacaoElegibilidade>
    </ans:prestadorParaOperadora>`

  return enviarTransacao({
    transacao: 'VERIFICA_ELEGIBILIDADE',
    corpo,
    convenio,
    cnpjPrestador,
  })
}

/** Solicitar autorização de procedimento */
export async function solicitarAutorizacao(
  guiaXML: string,
  convenio: ConvenioConfig,
  cnpjPrestador: string
): Promise<GatewayResponse> {
  const corpo = `
    <ans:prestadorParaOperadora>
      <ans:solicitacaoProcedimento>
        ${guiaXML}
      </ans:solicitacaoProcedimento>
    </ans:prestadorParaOperadora>`

  return enviarTransacao({
    transacao: 'SOLICITACAO_PROCEDIMENTO',
    corpo,
    convenio,
    cnpjPrestador,
  })
}

/** Consultar status de autorização */
export async function consultarStatusAutorizacao(
  senhaAutorizacao: string,
  convenio: ConvenioConfig,
  cnpjPrestador: string
): Promise<GatewayResponse> {
  const corpo = `
    <ans:prestadorParaOperadora>
      <ans:solicitacaoStatusAutorizacao>
        <ans:statusAutorizacao>
          <ans:registroANS>${convenio.codigoAns}</ans:registroANS>
          <ans:senhaAutorizacao>${senhaAutorizacao}</ans:senhaAutorizacao>
        </ans:statusAutorizacao>
      </ans:solicitacaoStatusAutorizacao>
    </ans:prestadorParaOperadora>`

  return enviarTransacao({
    transacao: 'SOLICITACAO_STATUS_AUTORIZACAO',
    corpo,
    convenio,
    cnpjPrestador,
  })
}

/** Consultar status de protocolo de lote */
export async function consultarStatusProtocolo(
  numeroProtocolo: string,
  convenio: ConvenioConfig,
  cnpjPrestador: string
): Promise<GatewayResponse> {
  const corpo = `
    <ans:prestadorParaOperadora>
      <ans:solicitacaoStatusProtocolo>
        <ans:statusProtocolo>
          <ans:registroANS>${convenio.codigoAns}</ans:registroANS>
          <ans:numeroProtocolo>${numeroProtocolo}</ans:numeroProtocolo>
        </ans:statusProtocolo>
      </ans:solicitacaoStatusProtocolo>
    </ans:prestadorParaOperadora>`

  return enviarTransacao({
    transacao: 'SOLICITACAO_STATUS_PROTOCOLO',
    corpo,
    convenio,
    cnpjPrestador,
  })
}

/** Enviar recurso de glosa */
export async function enviarRecursoGlosa(
  recursoXML: string,
  convenio: ConvenioConfig,
  cnpjPrestador: string
): Promise<GatewayResponse> {
  const corpo = `
    <ans:prestadorParaOperadora>
      <ans:recursoGlosa>
        ${recursoXML}
      </ans:recursoGlosa>
    </ans:prestadorParaOperadora>`

  return enviarTransacao({
    transacao: 'RECURSO_GLOSA',
    corpo,
    convenio,
    cnpjPrestador,
  })
}

/** Cancelar guia */
export async function cancelarGuia(
  numeroGuia: string,
  convenio: ConvenioConfig,
  cnpjPrestador: string
): Promise<GatewayResponse> {
  const corpo = `
    <ans:prestadorParaOperadora>
      <ans:cancelaGuia>
        <ans:registroANS>${convenio.codigoAns}</ans:registroANS>
        <ans:numeroGuiaPrestador>${numeroGuia}</ans:numeroGuiaPrestador>
      </ans:cancelaGuia>
    </ans:prestadorParaOperadora>`

  return enviarTransacao({
    transacao: 'CANCELA_GUIA',
    corpo,
    convenio,
    cnpjPrestador,
  })
}

// ─── Testar conexão com operadora ────────────────────────────────────────────

export async function testarConexao(
  convenio: ConvenioConfig,
  cnpjPrestador: string
): Promise<{ conectado: boolean; latenciaMs: number; mensagem: string }> {
  const result = await verificarElegibilidadeWS(
    '0000000000', // Carteirinha dummy para teste
    convenio,
    cnpjPrestador
  )

  // Mesmo com erro de elegibilidade, se respondeu é porque está conectado
  const conectado = result.httpStatus !== undefined && result.httpStatus < 500
  return {
    conectado,
    latenciaMs: result.latenciaMs,
    mensagem: conectado
      ? `Conectado — resposta em ${result.latenciaMs}ms`
      : result.erro ?? 'Sem resposta da operadora',
  }
}
