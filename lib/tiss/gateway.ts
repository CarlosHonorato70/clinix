/**
 * Clinix — Gateway TISS
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

/**
 * Método de autenticação do Web Service da operadora.
 *
 * - ws_security: WS-Security UsernameToken no header SOAP (padrão TISS)
 * - basic: HTTP Basic Auth (login:senha em Base64)
 * - bearer_token: OAuth 2.0 Bearer Token (header Authorization: Bearer <token>)
 * - session_token: Token de sessão (login primeiro, usa token nas chamadas seguintes)
 * - api_key: Chave de API (header customizado)
 * - certificate: Certificado digital (mTLS) — requer pfx/p12
 * - none: Sem autenticação
 */
export type AuthMethod = 'ws_security' | 'basic' | 'bearer_token' | 'session_token' | 'api_key' | 'certificate' | 'none'

export interface ConvenioConfig {
  nome: string
  codigoAns: string
  wsdlUrl: string
  codigoPrestador?: string

  // ── Autenticação ──────────────────────────────────────────────────
  /** Método de autenticação (default: ws_security) */
  authMethod?: AuthMethod
  /** Login/username para ws_security, basic, session_token */
  wsLogin?: string
  /** Senha para ws_security, basic, session_token */
  wsSenha?: string
  /** Token Bearer (OAuth 2.0) ou API Key */
  wsToken?: string
  /** URL de autenticação para OAuth 2.0 (token endpoint) */
  authUrl?: string
  /** Client ID para OAuth 2.0 */
  authClientId?: string
  /** Client Secret para OAuth 2.0 */
  authClientSecret?: string
  /** Nome do header para API Key (default: X-Api-Key) */
  apiKeyHeader?: string

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

// ─── Token cache (para OAuth e session tokens) ──────────────────────────────

interface CachedToken {
  token: string
  expiresAt: number
}

const tokenCache = new Map<string, CachedToken>()

/** Obter OAuth 2.0 Bearer Token via Client Credentials */
async function getOAuthToken(config: ConvenioConfig): Promise<string | null> {
  const cacheKey = `oauth:${config.codigoAns}:${config.authClientId}`
  const cached = tokenCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.token
  }

  if (!config.authUrl || !config.authClientId || !config.authClientSecret) {
    return null
  }

  try {
    const response = await fetch(config.authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${config.authClientId}:${config.authClientSecret}`).toString('base64')}`,
      },
      body: 'grant_type=client_credentials',
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) return null

    const data = await response.json() as { access_token: string; expires_in?: number }
    const token = data.access_token
    const expiresIn = data.expires_in ?? 3600

    tokenCache.set(cacheKey, {
      token,
      expiresAt: Date.now() + (expiresIn - 60) * 1000, // Renew 60s before expiry
    })

    return token
  } catch {
    return null
  }
}

/** Obter Session Token via login endpoint */
async function getSessionToken(config: ConvenioConfig): Promise<string | null> {
  const cacheKey = `session:${config.codigoAns}:${config.wsLogin}`
  const cached = tokenCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.token
  }

  if (!config.authUrl || !config.wsLogin || !config.wsSenha) {
    return null
  }

  try {
    const response = await fetch(config.authUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: config.wsLogin,
        password: config.wsSenha,
        login: config.wsLogin,
        senha: config.wsSenha,
      }),
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) return null

    const data = await response.json() as { token?: string; access_token?: string; sessionToken?: string; expires_in?: number }
    const token = data.token ?? data.access_token ?? data.sessionToken
    if (!token) return null

    const expiresIn = data.expires_in ?? 1800 // Default 30min session

    tokenCache.set(cacheKey, {
      token,
      expiresAt: Date.now() + (expiresIn - 60) * 1000,
    })

    return token
  } catch {
    return null
  }
}

/** Limpar cache de tokens de um convênio */
export function limparTokenCache(codigoAns: string): void {
  for (const key of tokenCache.keys()) {
    if (key.includes(codigoAns)) {
      tokenCache.delete(key)
    }
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

  // XML-escape credentials to prevent XML injection
  const escXml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')

  // WS-Security header only for ws_security auth method (or default when login is provided)
  const authMethod = req.convenio.authMethod ?? (req.convenio.wsLogin ? 'ws_security' : 'none')
  const wsSecurityHeader = authMethod === 'ws_security' && req.convenio.wsLogin ? `
  <soap:Header>
    <wsse:Security xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
      <wsse:UsernameToken>
        <wsse:Username>${escXml(req.convenio.wsLogin)}</wsse:Username>
        <wsse:Password>${escXml(req.convenio.wsSenha ?? '')}</wsse:Password>
      </wsse:UsernameToken>
    </wsse:Security>
  </soap:Header>` : ''

  return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:ans="${TISS_NAMESPACE}">
  ${wsSecurityHeader}
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
  const authMethod = req.convenio.authMethod ?? (req.convenio.wsLogin ? 'basic' : 'none')

  const soapXML = buildSOAPEnvelope(req)
  const inicio = Date.now()

  try {
    // Resolve authentication headers based on method
    const authHeaders: Record<string, string> = {}

    switch (authMethod) {
      case 'basic':
        if (req.convenio.wsLogin) {
          authHeaders['Authorization'] = `Basic ${Buffer.from(`${req.convenio.wsLogin}:${req.convenio.wsSenha ?? ''}`).toString('base64')}`
        }
        break

      case 'bearer_token': {
        // Static token or OAuth 2.0
        let token = req.convenio.wsToken
        if (!token && req.convenio.authUrl) {
          token = await getOAuthToken(req.convenio) ?? undefined
        }
        if (token) {
          authHeaders['Authorization'] = `Bearer ${token}`
        }
        break
      }

      case 'session_token': {
        const sessionToken = await getSessionToken(req.convenio)
        if (sessionToken) {
          authHeaders['Authorization'] = `Bearer ${sessionToken}`
          authHeaders['X-Session-Token'] = sessionToken
        }
        break
      }

      case 'api_key':
        if (req.convenio.wsToken) {
          const headerName = req.convenio.apiKeyHeader ?? 'X-Api-Key'
          authHeaders[headerName] = req.convenio.wsToken
        }
        break

      case 'ws_security':
        // Auth is in the SOAP header (XML), not in HTTP headers
        break

      case 'none':
      default:
        break
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': soapAction,
        ...authHeaders,
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
