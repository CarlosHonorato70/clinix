/**
 * Clinix — Teste End-to-End de integração TISS
 *
 * Dispara um fluxo completo contra uma operadora (mock ou real):
 *   1. Verifica elegibilidade de um beneficiário
 *   2. Solicita autorização de procedimento
 *   3. Envia lote de guia
 *   4. Consulta status do protocolo
 *
 * POST /api/tiss/test-integration
 * Body: { operadora: 'hapvida' | 'saude-caixa', numeroCarteira?: string }
 */

import { withAuth } from '@/lib/auth/middleware'
import { enviarTransacao, type ConvenioConfig } from '@/lib/tiss/gateway'
import { MOCK_CONFIGS, MOCK_BENEFICIARIOS_DISPONIVEIS, type MockOperadora } from '@/lib/tiss/mock-server'

interface StepResult {
  step: string
  transacao: string
  sucesso: boolean
  latenciaMs: number
  protocolo?: string
  resumo?: string
  erro?: string
  xmlResposta?: string
}

export const POST = withAuth(async (req) => {
  const body = await req.json().catch(() => ({}))
  const operadora = (body.operadora || 'hapvida') as MockOperadora

  if (operadora !== 'hapvida' && operadora !== 'saude-caixa') {
    return Response.json({ error: 'Operadora deve ser hapvida ou saude-caixa' }, { status: 400 })
  }

  // Get the base URL of this deployment to point the mock gateway to our own /api/tiss/mock/*
  const proto = req.headers.get('x-forwarded-proto') || 'https'
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000'
  const baseUrl = `${proto}://${host}`

  const mockConfig = MOCK_CONFIGS[operadora]
  const convenio: ConvenioConfig = {
    ...mockConfig,
    wsdlUrl: `${baseUrl}/api/tiss/mock/${operadora}`,
  }

  const beneficiario = MOCK_BENEFICIARIOS_DISPONIVEIS[operadora][0]
  const numeroCarteira = body.numeroCarteira || beneficiario.numeroCarteira
  const cnpjPrestador = '00000000000191'

  const steps: StepResult[] = []

  // ─── Step 1: Verificar Elegibilidade ──────────────────────────────────────
  const step1Body = `
    <ans:consultaElegibilidade>
      <ans:beneficiario>
        <ans:numeroCarteira>${numeroCarteira}</ans:numeroCarteira>
      </ans:beneficiario>
    </ans:consultaElegibilidade>`

  const resp1 = await enviarTransacao({
    transacao: 'VERIFICA_ELEGIBILIDADE',
    corpo: step1Body,
    convenio,
    cnpjPrestador,
  })

  const situacao = resp1.xmlResposta?.match(/<(?:[^:]+:)?situacao[^>]*>([^<]+)</)?.[1]?.trim()
  const nomeBeneficiario = resp1.xmlResposta?.match(/<(?:[^:]+:)?nomeBeneficiario[^>]*>([^<]+)</)?.[1]?.trim()

  steps.push({
    step: '1. Verificar Elegibilidade',
    transacao: resp1.transacao,
    sucesso: resp1.sucesso,
    latenciaMs: resp1.latenciaMs,
    protocolo: resp1.protocolo,
    resumo: resp1.sucesso
      ? `${nomeBeneficiario ?? 'Beneficiário'} — Situação: ${situacao ?? '?'}`
      : resp1.erro,
    xmlResposta: resp1.xmlResposta,
  })

  // ─── Step 2: Solicitar Autorização ────────────────────────────────────────
  const step2Body = `
    <ans:solicitacaoProcedimento>
      <ans:beneficiario>
        <ans:numeroCarteira>${numeroCarteira}</ans:numeroCarteira>
      </ans:beneficiario>
      <ans:procedimentos>
        <ans:procedimento>
          <ans:codigoProcedimento>40304361</ans:codigoProcedimento>
          <ans:descricaoProcedimento>Eletrocardiograma de esforço</ans:descricaoProcedimento>
          <ans:quantidadeSolicitada>1</ans:quantidadeSolicitada>
        </ans:procedimento>
      </ans:procedimentos>
    </ans:solicitacaoProcedimento>`

  const resp2 = await enviarTransacao({
    transacao: 'SOLICITACAO_PROCEDIMENTO',
    corpo: step2Body,
    convenio,
    cnpjPrestador,
  })

  const senha = resp2.xmlResposta?.match(/<(?:[^:]+:)?senhaAutorizacao[^>]*>([^<]+)</)?.[1]?.trim()
  const statusAuto = resp2.xmlResposta?.match(/<(?:[^:]+:)?status[^>]*>([^<]+)</)?.[1]?.trim()

  steps.push({
    step: '2. Solicitar Autorização',
    transacao: resp2.transacao,
    sucesso: resp2.sucesso,
    latenciaMs: resp2.latenciaMs,
    protocolo: senha,
    resumo: resp2.sucesso ? `Senha: ${senha ?? '-'} · Status: ${statusAuto ?? '?'}` : resp2.erro,
    xmlResposta: resp2.xmlResposta,
  })

  // ─── Step 3: Envio de Lote ────────────────────────────────────────────────
  const step3Body = `
    <ans:loteGuias>
      <ans:numeroLote>${Date.now()}</ans:numeroLote>
      <ans:guia>
        <ans:numeroGuiaPrestador>G00001</ans:numeroGuiaPrestador>
        <ans:beneficiario><ans:numeroCarteira>${numeroCarteira}</ans:numeroCarteira></ans:beneficiario>
        <ans:procedimentos>
          <ans:procedimento>
            <ans:codigoProcedimento>40304361</ans:codigoProcedimento>
            <ans:valorTotal>180.00</ans:valorTotal>
          </ans:procedimento>
        </ans:procedimentos>
        <ans:valorTotalGeral>180.00</ans:valorTotalGeral>
      </ans:guia>
    </ans:loteGuias>`

  const resp3 = await enviarTransacao({
    transacao: 'ENVIO_LOTE_GUIAS',
    corpo: step3Body,
    convenio,
    cnpjPrestador,
  })

  const protocolo = resp3.xmlResposta?.match(/<(?:[^:]+:)?numeroProtocolo[^>]*>([^<]+)</)?.[1]?.trim()
  const qtdGuias = resp3.xmlResposta?.match(/<(?:[^:]+:)?quantidadeGuias[^>]*>([^<]+)</)?.[1]?.trim()

  steps.push({
    step: '3. Envio de Lote',
    transacao: resp3.transacao,
    sucesso: resp3.sucesso,
    latenciaMs: resp3.latenciaMs,
    protocolo,
    resumo: resp3.sucesso ? `Protocolo: ${protocolo ?? '-'} · Guias: ${qtdGuias ?? '?'}` : resp3.erro,
    xmlResposta: resp3.xmlResposta,
  })

  // ─── Step 4: Consultar Status do Protocolo ────────────────────────────────
  if (protocolo) {
    const step4Body = `
      <ans:consultaStatusProtocolo>
        <ans:numeroProtocolo>${protocolo}</ans:numeroProtocolo>
      </ans:consultaStatusProtocolo>`

    const resp4 = await enviarTransacao({
      transacao: 'SOLICITACAO_STATUS_PROTOCOLO',
      corpo: step4Body,
      convenio,
      cnpjPrestador,
    })

    const statusProto = resp4.xmlResposta?.match(/<(?:[^:]+:)?statusProtocolo[^>]*>([^<]+)</)?.[1]?.trim()
    const aprovadas = resp4.xmlResposta?.match(/<(?:[^:]+:)?quantidadeGuiasAprovadas[^>]*>([^<]+)</)?.[1]?.trim()
    const glosadas = resp4.xmlResposta?.match(/<(?:[^:]+:)?quantidadeGuiasGlosadas[^>]*>([^<]+)</)?.[1]?.trim()
    const valorLiberado = resp4.xmlResposta?.match(/<(?:[^:]+:)?valorTotalLiberado[^>]*>([^<]+)</)?.[1]?.trim()

    steps.push({
      step: '4. Consultar Status Protocolo',
      transacao: resp4.transacao,
      sucesso: resp4.sucesso,
      latenciaMs: resp4.latenciaMs,
      protocolo,
      resumo: resp4.sucesso
        ? `Status: ${statusProto ?? '?'} · Aprovadas: ${aprovadas ?? '?'} · Glosadas: ${glosadas ?? '?'} · Liberado: R$ ${valorLiberado ?? '?'}`
        : resp4.erro,
      xmlResposta: resp4.xmlResposta,
    })
  }

  const totalLatencia = steps.reduce((sum, s) => sum + s.latenciaMs, 0)
  const allSuccess = steps.every((s) => s.sucesso)

  return Response.json({
    operadora,
    operadoraNome: mockConfig.nome,
    beneficiario: {
      numeroCarteira,
      nome: beneficiario.nome,
      plano: beneficiario.plano,
    },
    steps,
    totalLatencia,
    allSuccess,
    mockMode: true,
    observacao: 'Teste executado contra mock interno (/api/tiss/mock/*). Para ativar com operadora real, configure wsdlUrl e credenciais na tabela convenios.',
  })
})
