/**
 * Clinix — Mock Server TISS para Hapvida e Saúde Caixa
 *
 * Simula o comportamento dos Web Services reais das operadoras.
 * Usado para testar o gateway TISS end-to-end sem credenciais reais.
 *
 * Retorna respostas XML TISS v4.02 válidas baseadas em exemplos
 * reais extraídos dos manuais públicos das operadoras.
 */

import { TISS_NAMESPACE, TISS_VERSION } from './constants'

export type MockOperadora = 'hapvida' | 'saude-caixa'

export interface MockRequest {
  operadora: MockOperadora
  transacao: string
  body: string // XML do corpo recebido
}

export interface MockResponse {
  status: number
  xmlResposta: string
  latenciaMs: number
}

// ─── Beneficiários fake ─────────────────────────────────────────────────────

const BENEFICIARIOS_FAKE = {
  hapvida: [
    { numeroCarteira: '9998887771', nome: 'Maria Silva Santos', plano: 'Mix Hapvida', elegivel: true },
    { numeroCarteira: '8887776661', nome: 'João Pereira Lima', plano: 'Master Hapvida', elegivel: true },
    { numeroCarteira: '7776665551', nome: 'Ana Costa Oliveira', plano: 'Mix Hapvida', elegivel: false }, // suspenso
  ],
  'saude-caixa': [
    { numeroCarteira: '1234567890', nome: 'Carlos Mendes', plano: 'Saúde Caixa Padrão', elegivel: true },
    { numeroCarteira: '9876543210', nome: 'Juliana Rodrigues', plano: 'Saúde Caixa Master', elegivel: true },
  ],
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function extractTagValue(xml: string, tag: string): string | null {
  const regex = new RegExp(`<(?:[^:]+:)?${tag}[^>]*>([^<]*)<`, 'i')
  const match = xml.match(regex)
  return match?.[1]?.trim() || null
}

function generateProtocolo(): string {
  return `${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`
}

function generateSoapEnvelope(mensagemTiss: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ans="${TISS_NAMESPACE}">
  <soap:Body>
    ${mensagemTiss}
  </soap:Body>
</soap:Envelope>`
}

function cabecalhoResposta(transacao: string, registroAns: string): string {
  const now = new Date()
  const seq = generateProtocolo()
  return `<ans:cabecalho>
      <ans:identificacaoTransacao>
        <ans:tipoTransacao>${transacao}</ans:tipoTransacao>
        <ans:sequencialTransacao>${seq}</ans:sequencialTransacao>
        <ans:dataRegistroTransacao>${now.toISOString().slice(0, 10)}</ans:dataRegistroTransacao>
        <ans:horaRegistroTransacao>${now.toTimeString().slice(0, 8)}</ans:horaRegistroTransacao>
      </ans:identificacaoTransacao>
      <ans:origem>
        <ans:registroANS>${registroAns}</ans:registroANS>
      </ans:origem>
      <ans:destino>
        <ans:identificacaoPrestador>
          <ans:CNPJ>00000000000000</ans:CNPJ>
        </ans:identificacaoPrestador>
      </ans:destino>
      <ans:Padrao>${TISS_VERSION}</ans:Padrao>
    </ans:cabecalho>`
}

// ─── Mock: VERIFICA_ELEGIBILIDADE ───────────────────────────────────────────

function mockElegibilidade(req: MockRequest): MockResponse {
  const registroAns = req.operadora === 'hapvida' ? '368253' : '304701'
  const numeroCarteira = extractTagValue(req.body, 'numeroCarteira')
    ?? extractTagValue(req.body, 'carteira')
    ?? ''

  const beneficiarios = BENEFICIARIOS_FAKE[req.operadora]
  const found = beneficiarios.find((b) => b.numeroCarteira === numeroCarteira)

  const now = new Date()
  const validade = new Date(now.getFullYear(), now.getMonth() + 12, now.getDate())
    .toISOString().slice(0, 10)

  let mensagem: string

  if (!found) {
    mensagem = `<ans:mensagemTISS xmlns:ans="${TISS_NAMESPACE}">
    ${cabecalhoResposta('VERIFICA_ELEGIBILIDADE', registroAns)}
    <ans:consultaElegibilidade>
      <ans:respostaElegibilidade>
        <ans:situacao>INVALIDA</ans:situacao>
        <ans:motivo>
          <ans:codigoMotivo>1001</ans:codigoMotivo>
          <ans:descricaoMotivo>Beneficiário não encontrado</ans:descricaoMotivo>
        </ans:motivo>
      </ans:respostaElegibilidade>
    </ans:consultaElegibilidade>
  </ans:mensagemTISS>`
  } else if (!found.elegivel) {
    mensagem = `<ans:mensagemTISS xmlns:ans="${TISS_NAMESPACE}">
    ${cabecalhoResposta('VERIFICA_ELEGIBILIDADE', registroAns)}
    <ans:consultaElegibilidade>
      <ans:respostaElegibilidade>
        <ans:situacao>INVALIDA</ans:situacao>
        <ans:beneficiario>
          <ans:numeroCarteira>${found.numeroCarteira}</ans:numeroCarteira>
          <ans:nomeBeneficiario>${found.nome}</ans:nomeBeneficiario>
        </ans:beneficiario>
        <ans:motivo>
          <ans:codigoMotivo>2001</ans:codigoMotivo>
          <ans:descricaoMotivo>Contrato suspenso por inadimplência</ans:descricaoMotivo>
        </ans:motivo>
      </ans:respostaElegibilidade>
    </ans:consultaElegibilidade>
  </ans:mensagemTISS>`
  } else {
    mensagem = `<ans:mensagemTISS xmlns:ans="${TISS_NAMESPACE}">
    ${cabecalhoResposta('VERIFICA_ELEGIBILIDADE', registroAns)}
    <ans:consultaElegibilidade>
      <ans:respostaElegibilidade>
        <ans:situacao>VALIDA</ans:situacao>
        <ans:beneficiario>
          <ans:numeroCarteira>${found.numeroCarteira}</ans:numeroCarteira>
          <ans:nomeBeneficiario>${found.nome}</ans:nomeBeneficiario>
          <ans:plano>
            <ans:codigoPlano>001</ans:codigoPlano>
            <ans:descricaoPlano>${found.plano}</ans:descricaoPlano>
          </ans:plano>
          <ans:validadeCarteira>${validade}</ans:validadeCarteira>
        </ans:beneficiario>
      </ans:respostaElegibilidade>
    </ans:consultaElegibilidade>
  </ans:mensagemTISS>`
  }

  return {
    status: 200,
    xmlResposta: generateSoapEnvelope(mensagem),
    latenciaMs: req.operadora === 'hapvida' ? 180 : 320, // Saúde Caixa mais lenta
  }
}

// ─── Mock: ENVIO_LOTE_GUIAS ─────────────────────────────────────────────────

function mockEnvioLote(req: MockRequest): MockResponse {
  const registroAns = req.operadora === 'hapvida' ? '368253' : '304701'
  const protocolo = generateProtocolo()
  const now = new Date()

  // Contar quantas guias vieram no body
  const guiasCount = (req.body.match(/<ans:guia/g) || []).length || 1

  const mensagem = `<ans:mensagemTISS xmlns:ans="${TISS_NAMESPACE}">
    ${cabecalhoResposta('PROTOCOLO_RECEBIMENTO', registroAns)}
    <ans:protocoloRecebimento>
      <ans:numeroProtocolo>${protocolo}</ans:numeroProtocolo>
      <ans:dataProtocolo>${now.toISOString().slice(0, 10)}</ans:dataProtocolo>
      <ans:horaProtocolo>${now.toTimeString().slice(0, 8)}</ans:horaProtocolo>
      <ans:quantidadeGuias>${guiasCount}</ans:quantidadeGuias>
      <ans:status>RECEBIDO</ans:status>
      <ans:mensagem>Lote recebido com sucesso. Aguarde processamento em até 5 dias úteis.</ans:mensagem>
    </ans:protocoloRecebimento>
  </ans:mensagemTISS>`

  return {
    status: 200,
    xmlResposta: generateSoapEnvelope(mensagem),
    latenciaMs: req.operadora === 'hapvida' ? 450 : 780,
  }
}

// ─── Mock: SOLICITACAO_PROCEDIMENTO ─────────────────────────────────────────

function mockSolicitacaoProcedimento(req: MockRequest): MockResponse {
  const registroAns = req.operadora === 'hapvida' ? '368253' : '304701'
  const senhaAutorizacao = `AUTO${Date.now().toString().slice(-10)}`
  const validade = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  // Hapvida tende a autorizar direto, Saúde Caixa requer análise
  const status = req.operadora === 'hapvida' ? 'AUTORIZADO' : 'EM_ANALISE'

  const mensagem = `<ans:mensagemTISS xmlns:ans="${TISS_NAMESPACE}">
    ${cabecalhoResposta('SOLICITACAO_PROCEDIMENTO', registroAns)}
    <ans:solicitacaoProcedimentoResposta>
      <ans:senhaAutorizacao>${senhaAutorizacao}</ans:senhaAutorizacao>
      <ans:dataAutorizacao>${new Date().toISOString().slice(0, 10)}</ans:dataAutorizacao>
      <ans:dataValidadeSenha>${validade}</ans:dataValidadeSenha>
      <ans:status>${status}</ans:status>
      ${status === 'AUTORIZADO'
        ? '<ans:observacao>Autorização concedida para execução imediata.</ans:observacao>'
        : '<ans:observacao>Solicitação em análise pela auditoria médica. Prazo: 2 dias úteis.</ans:observacao>'}
    </ans:solicitacaoProcedimentoResposta>
  </ans:mensagemTISS>`

  return {
    status: 200,
    xmlResposta: generateSoapEnvelope(mensagem),
    latenciaMs: req.operadora === 'hapvida' ? 220 : 510,
  }
}

// ─── Mock: SOLICITACAO_STATUS_PROTOCOLO ─────────────────────────────────────

function mockStatusProtocolo(req: MockRequest): MockResponse {
  const registroAns = req.operadora === 'hapvida' ? '368253' : '304701'
  const protocolo = extractTagValue(req.body, 'numeroProtocolo') ?? '0000000000'

  const mensagem = `<ans:mensagemTISS xmlns:ans="${TISS_NAMESPACE}">
    ${cabecalhoResposta('SOLICITACAO_STATUS_PROTOCOLO', registroAns)}
    <ans:protocoloStatus>
      <ans:numeroProtocolo>${protocolo}</ans:numeroProtocolo>
      <ans:statusProtocolo>PROCESSADO</ans:statusProtocolo>
      <ans:dataProcessamento>${new Date().toISOString().slice(0, 10)}</ans:dataProcessamento>
      <ans:quantidadeGuiasRecebidas>5</ans:quantidadeGuiasRecebidas>
      <ans:quantidadeGuiasAprovadas>4</ans:quantidadeGuiasAprovadas>
      <ans:quantidadeGuiasGlosadas>1</ans:quantidadeGuiasGlosadas>
      <ans:valorTotalApresentado>1250.00</ans:valorTotalApresentado>
      <ans:valorTotalLiberado>1050.00</ans:valorTotalLiberado>
    </ans:protocoloStatus>
  </ans:mensagemTISS>`

  return {
    status: 200,
    xmlResposta: generateSoapEnvelope(mensagem),
    latenciaMs: req.operadora === 'hapvida' ? 190 : 420,
  }
}

// ─── Router principal ──────────────────────────────────────────────────────

export async function mockTissRequest(req: MockRequest): Promise<MockResponse> {
  // Simular latência de rede
  const baseLatency = req.operadora === 'hapvida' ? 150 : 300
  await new Promise((resolve) => setTimeout(resolve, baseLatency))

  switch (req.transacao) {
    case 'VERIFICA_ELEGIBILIDADE':
      return mockElegibilidade(req)
    case 'ENVIO_LOTE_GUIAS':
      return mockEnvioLote(req)
    case 'SOLICITACAO_PROCEDIMENTO':
      return mockSolicitacaoProcedimento(req)
    case 'SOLICITACAO_STATUS_PROTOCOLO':
      return mockStatusProtocolo(req)
    default: {
      const mensagem = `<ans:mensagemTISS xmlns:ans="${TISS_NAMESPACE}">
        ${cabecalhoResposta(req.transacao, req.operadora === 'hapvida' ? '368253' : '304701')}
        <ans:respostaGenerica>
          <ans:status>OK</ans:status>
          <ans:mensagem>Transação processada pelo mock</ans:mensagem>
        </ans:respostaGenerica>
      </ans:mensagemTISS>`
      return {
        status: 200,
        xmlResposta: generateSoapEnvelope(mensagem),
        latenciaMs: baseLatency,
      }
    }
  }
}

// ─── Configurações de teste ────────────────────────────────────────────────

export const MOCK_CONFIGS = {
  hapvida: {
    nome: 'Hapvida (MOCK)',
    codigoAns: '368253',
    wsdlUrl: '/api/tiss/mock/hapvida',
    authMethod: 'ws_security' as const,
    wsLogin: 'prestador_teste',
    wsSenha: 'senha123',
    codigoPrestador: '99999',
  },
  'saude-caixa': {
    nome: 'Saúde Caixa (MOCK)',
    codigoAns: '304701',
    wsdlUrl: '/api/tiss/mock/saude-caixa',
    authMethod: 'certificate' as const,
    codigoPrestador: '88888',
  },
}

export const MOCK_BENEFICIARIOS_DISPONIVEIS = BENEFICIARIOS_FAKE
