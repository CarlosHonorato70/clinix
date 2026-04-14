/**
 * Clinix — Endpoint mock SOAP TISS
 *
 * Simula os Web Services de Hapvida e Saúde Caixa.
 * Usado pelo gateway real (lib/tiss/gateway.ts) quando apontado para /api/tiss/mock/hapvida
 * ou /api/tiss/mock/saude-caixa.
 *
 * Não requer autenticação — é apenas um mock interno para testar o fluxo E2E.
 */

import { NextRequest } from 'next/server'
import { mockTissRequest, type MockOperadora } from '@/lib/tiss/mock-server'

export async function POST(req: NextRequest) {
  const url = new URL(req.url)
  const operadora = url.pathname.split('/').at(-1) as string

  if (operadora !== 'hapvida' && operadora !== 'saude-caixa') {
    return new Response(
      `<?xml version="1.0"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><soap:Fault><faultstring>Operadora não suportada</faultstring></soap:Fault></soap:Body></soap:Envelope>`,
      { status: 404, headers: { 'Content-Type': 'text/xml; charset=utf-8' } }
    )
  }

  const body = await req.text()

  // Extract transaction type from SOAPAction header or from XML
  const soapAction = req.headers.get('SOAPAction') || ''
  let transacao = 'VERIFICA_ELEGIBILIDADE'

  if (soapAction.includes('enviar-lote-guias')) transacao = 'ENVIO_LOTE_GUIAS'
  else if (soapAction.includes('verificar-elegibilidade')) transacao = 'VERIFICA_ELEGIBILIDADE'
  else if (soapAction.includes('solicitar-procedimento')) transacao = 'SOLICITACAO_PROCEDIMENTO'
  else if (soapAction.includes('solicitar-status-protocolo')) transacao = 'SOLICITACAO_STATUS_PROTOCOLO'
  else {
    // Try to extract from XML body
    const tipoMatch = body.match(/<(?:[^:]+:)?tipoTransacao[^>]*>([^<]+)</)
    if (tipoMatch) transacao = tipoMatch[1].trim()
  }

  const response = await mockTissRequest({
    operadora: operadora as MockOperadora,
    transacao,
    body,
  })

  return new Response(response.xmlResposta, {
    status: response.status,
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      'X-Mock-Latency-Ms': String(response.latenciaMs),
      'X-Mock-Operadora': operadora,
      'X-Mock-Transacao': transacao,
    },
  })
}
