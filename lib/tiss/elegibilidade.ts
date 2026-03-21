/**
 * MedFlow — Verificação de Elegibilidade TISS
 *
 * Verifica se o beneficiário está ativo no convênio antes do atendimento.
 * Usa o Web Service TISS (SOAP/XML) quando disponível, com fallback
 * para validação local.
 *
 * Ref: WSDL tissVerificaElegibilidadeV4_02_00
 */

import { TISS_VERSION, TISS_NAMESPACE } from './constants'
import { generateTissHash } from './xml-builder'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ElegibilidadeRequest {
  carteirinha: string
  codigoAns: string // Registro ANS da operadora
  cnpjPrestador: string
  dataAtendimento: string // YYYY-MM-DD
  wsdlUrl?: string // URL do Web Service da operadora
}

export interface ElegibilidadeResponse {
  elegivel: boolean
  nomeBeneficiario?: string
  plano?: string
  validadeCarteirinha?: string
  mensagem: string
  fonte: 'webservice' | 'local'
}

// ─── Build SOAP request XML ──────────────────────────────────────────────────

function buildElegibilidadeSOAP(req: ElegibilidadeRequest): string {
  const corpo = `
    <ans:prestadorParaOperadora>
      <ans:verificacaoElegibilidade>
        <ans:elegibilidadeVerificacao>
          <ans:registroANS>${req.codigoAns}</ans:registroANS>
          <ans:numeroCarteira>${req.carteirinha}</ans:numeroCarteira>
          <ans:dataAtendimento>${req.dataAtendimento}</ans:dataAtendimento>
        </ans:elegibilidadeVerificacao>
      </ans:verificacaoElegibilidade>
    </ans:prestadorParaOperadora>`

  const hash = generateTissHash(corpo)

  return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:ans="${TISS_NAMESPACE}">
  <soap:Body>
    <ans:mensagemTISS>
      <ans:cabecalho>
        <ans:identificacaoTransacao>
          <ans:tipoTransacao>VERIFICA_ELEGIBILIDADE</ans:tipoTransacao>
          <ans:sequencialTransacao>${Date.now()}</ans:sequencialTransacao>
          <ans:dataRegistroTransacao>${req.dataAtendimento}</ans:dataRegistroTransacao>
          <ans:horaRegistroTransacao>${new Date().toTimeString().slice(0, 8)}</ans:horaRegistroTransacao>
        </ans:identificacaoTransacao>
        <ans:origem>
          <ans:identificacaoPrestador>
            <ans:CNPJ>${req.cnpjPrestador}</ans:CNPJ>
          </ans:identificacaoPrestador>
        </ans:origem>
        <ans:destino>
          <ans:registroANS>${req.codigoAns}</ans:registroANS>
        </ans:destino>
        <ans:Padrao>${TISS_VERSION}</ans:Padrao>
      </ans:cabecalho>
      ${corpo}
      <ans:epilogo>
        <ans:hash>${hash}</ans:hash>
      </ans:epilogo>
    </ans:mensagemTISS>
  </soap:Body>
</soap:Envelope>`
}

// ─── Parse SOAP response ─────────────────────────────────────────────────────

function parseElegibilidadeResponse(xml: string): Partial<ElegibilidadeResponse> {
  // Simple XML tag extraction (no full XML parser dependency)
  const getTag = (tag: string): string | undefined => {
    const match = xml.match(new RegExp(`<[^:]*:?${tag}[^>]*>([^<]*)<`))
    return match?.[1]?.trim()
  }

  const elegivel = getTag('elegivel') ?? getTag('descricaoMotivoGlosa')
  const nome = getTag('nomeBeneficiario')
  const plano = getTag('nomePlano') ?? getTag('descricaoPlano')
  const validade = getTag('dataValidadeCarteira')
  const mensagem = getTag('descricaoMotivoGlosa') ?? getTag('mensagem')

  return {
    elegivel: elegivel?.toLowerCase() === 'true' || elegivel === 'S',
    nomeBeneficiario: nome,
    plano,
    validadeCarteirinha: validade,
    mensagem: mensagem ?? (elegivel ? 'Elegibilidade verificada' : 'Não elegível'),
  }
}

// ─── Verificar elegibilidade via Web Service ─────────────────────────────────

async function verificarViaWebService(
  req: ElegibilidadeRequest
): Promise<ElegibilidadeResponse | null> {
  if (!req.wsdlUrl) return null

  try {
    const soapXML = buildElegibilidadeSOAP(req)

    const response = await fetch(req.wsdlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': 'http://www.ans.gov.br/tiss/ws/verificar-elegibilidade',
      },
      body: soapXML,
      signal: AbortSignal.timeout(10000), // 10s timeout
    })

    if (!response.ok) return null

    const responseXML = await response.text()
    const parsed = parseElegibilidadeResponse(responseXML)

    return {
      elegivel: parsed.elegivel ?? false,
      nomeBeneficiario: parsed.nomeBeneficiario,
      plano: parsed.plano,
      validadeCarteirinha: parsed.validadeCarteirinha,
      mensagem: parsed.mensagem ?? 'Resposta recebida da operadora',
      fonte: 'webservice',
    }
  } catch {
    return null // Fallback to local validation
  }
}

// ─── Validação local (fallback) ──────────────────────────────────────────────

function verificarLocal(req: ElegibilidadeRequest): ElegibilidadeResponse {
  // Basic local validation when web service is unavailable
  const carteirinhaValida = req.carteirinha.length >= 4 && req.carteirinha.length <= 20
  const codigoAnsValido = /^\d{6}$/.test(req.codigoAns)

  if (!carteirinhaValida) {
    return {
      elegivel: false,
      mensagem: 'Número da carteirinha inválido',
      fonte: 'local',
    }
  }

  if (!codigoAnsValido) {
    return {
      elegivel: false,
      mensagem: 'Código ANS da operadora inválido',
      fonte: 'local',
    }
  }

  return {
    elegivel: true,
    mensagem: 'Validação local — verificação online indisponível. Confirme elegibilidade com a operadora.',
    fonte: 'local',
  }
}

// ─── Função principal ────────────────────────────────────────────────────────

export async function verificarElegibilidade(
  req: ElegibilidadeRequest
): Promise<ElegibilidadeResponse> {
  // Try web service first
  const wsResult = await verificarViaWebService(req)
  if (wsResult) return wsResult

  // Fallback to local
  return verificarLocal(req)
}
