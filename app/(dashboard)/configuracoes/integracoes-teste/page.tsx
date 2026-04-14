'use client'

import { useState } from 'react'
import Card from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'

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

interface TestResult {
  operadora: string
  operadoraNome: string
  beneficiario: { numeroCarteira: string; nome: string; plano: string }
  steps: StepResult[]
  totalLatencia: number
  allSuccess: boolean
  mockMode: boolean
}

export default function IntegracoesTestePage() {
  const { notify } = useToast()
  const [running, setRunning] = useState<string | null>(null)
  const [results, setResults] = useState<Record<string, TestResult>>({})
  const [expandedXml, setExpandedXml] = useState<string | null>(null)

  async function runTest(operadora: 'hapvida' | 'saude-caixa') {
    setRunning(operadora)
    try {
      const res = await fetch('/api/tiss/test-integration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ operadora }),
      })
      if (!res.ok) {
        notify('Erro ao executar teste de integração', 'error')
        return
      }
      const data: TestResult = await res.json()
      setResults((prev) => ({ ...prev, [operadora]: data }))
      notify(
        data.allSuccess ? `Teste ${data.operadoraNome} passou` : `Teste ${data.operadoraNome} teve falhas`,
        data.allSuccess ? 'success' : 'warning'
      )
    } catch {
      notify('Erro de conexão', 'error')
    } finally {
      setRunning(null)
    }
  }

  const operadoras = [
    { id: 'hapvida' as const, nome: 'Hapvida', codigoAns: '368253', cor: '#00a651', auth: 'WS-Security' },
    { id: 'saude-caixa' as const, nome: 'Saúde Caixa', codigoAns: '304701', cor: '#005ca9', auth: 'Certificado (mTLS)' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)', margin: 0, lineHeight: 1.3 }}>
          Teste de integração TISS (Mock)
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4, lineHeight: 1.6 }}>
          Executa um fluxo end-to-end contra o Web Service da operadora.
          Testa elegibilidade, autorização, envio de lote e status de protocolo.
        </p>
      </div>

      <div style={{
        padding: 14, borderRadius: 10,
        background: 'rgba(251,191,36,0.08)',
        border: '1px solid rgba(251,191,36,0.2)',
        display: 'flex', gap: 12, alignItems: 'flex-start',
      }}>
        <span style={{ fontSize: 16, color: '#fbbf24' }}>⚠</span>
        <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>
          <strong style={{ color: '#fbbf24' }}>Modo mock.</strong> Estes testes rodam contra um servidor TISS
          interno que simula as respostas reais de Hapvida e Saúde Caixa. Para ativar com operadora real,
          credencie-se no portal do prestador e configure <code style={{ background: 'var(--bg3)', padding: '1px 5px', borderRadius: 3 }}>wsdl_url</code> + credenciais em <a href="/configuracoes/integracoes" style={{ color: '#93bbfc' }}>Integrações</a>.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 16 }}>
        {operadoras.map((op) => {
          const result = results[op.id]
          const isRunning = running === op.id

          return (
            <Card key={op.id} style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 10,
                  background: `${op.cor}22`, border: `1px solid ${op.cor}55`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 15, fontWeight: 700, color: op.cor,
                }}>
                  {op.nome[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{op.nome}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)', marginTop: 2 }}>
                    ANS {op.codigoAns} · {op.auth}
                  </div>
                </div>
                <button
                  onClick={() => runTest(op.id)}
                  disabled={isRunning}
                  style={{
                    padding: '8px 16px', borderRadius: 8,
                    background: isRunning ? 'var(--bg3)' : op.cor,
                    border: `1px solid ${op.cor}`, color: isRunning ? 'var(--text3)' : '#fff',
                    fontSize: 12, fontWeight: 600,
                    cursor: isRunning ? 'wait' : 'pointer',
                  }}
                >
                  {isRunning ? 'Executando...' : result ? 'Repetir teste' : 'Testar integração'}
                </button>
              </div>

              {result && (
                <div style={{ marginTop: 8 }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 12px', marginBottom: 10, borderRadius: 6,
                    background: result.allSuccess ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                    border: `1px solid ${result.allSuccess ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
                  }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: result.allSuccess ? '#34d399' : '#f87171' }}>
                        {result.allSuccess ? '✓ Todos os passos OK' : '⚠ Teste com falhas'}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>
                        Beneficiário: {result.beneficiario.nome}
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
                      {result.totalLatencia}ms total
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {result.steps.map((step, i) => (
                      <div key={i} style={{
                        padding: '8px 10px', borderRadius: 6,
                        background: 'var(--bg3)',
                        border: `1px solid ${step.sucesso ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}`,
                        borderLeft: `2px solid ${step.sucesso ? '#34d399' : '#f87171'}`,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                          <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text)' }}>
                            {step.sucesso ? '✓' : '✗'} {step.step}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
                            {step.latenciaMs}ms
                          </div>
                        </div>
                        {step.resumo && (
                          <div style={{ fontSize: 10.5, color: 'var(--text2)', marginTop: 4, lineHeight: 1.4 }}>
                            {step.resumo}
                          </div>
                        )}
                        {step.xmlResposta && (
                          <button
                            onClick={() => setExpandedXml(expandedXml === `${op.id}-${i}` ? null : `${op.id}-${i}`)}
                            style={{
                              background: 'transparent', border: 'none', color: '#93bbfc',
                              fontSize: 10, cursor: 'pointer', padding: 0, marginTop: 4,
                            }}
                          >
                            {expandedXml === `${op.id}-${i}` ? '▼ Ocultar XML' : '▶ Ver XML da resposta'}
                          </button>
                        )}
                        {expandedXml === `${op.id}-${i}` && step.xmlResposta && (
                          <pre style={{
                            fontSize: 9.5, color: 'var(--text2)', background: 'var(--bg)',
                            padding: 8, borderRadius: 4, marginTop: 6, overflow: 'auto',
                            maxHeight: 200, fontFamily: 'var(--mono)',
                          }}>
                            {step.xmlResposta}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          )
        })}
      </div>

      <Card style={{ padding: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 10 }}>
          O que o teste faz
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { step: '1. Verifica elegibilidade', desc: 'Consulta se o beneficiário tem cobertura ativa no plano' },
            { step: '2. Solicita autorização', desc: 'Pede autorização prévia para o procedimento 40304361 (ECG esforço)' },
            { step: '3. Envia lote de guia', desc: 'Submete uma guia de teste com 1 procedimento no valor de R$ 180,00' },
            { step: '4. Consulta status do protocolo', desc: 'Verifica resultado do processamento: aprovadas, glosadas, valor liberado' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, fontSize: 12 }}>
              <span style={{ color: '#93bbfc', fontWeight: 600, minWidth: 200 }}>{item.step}</span>
              <span style={{ color: 'var(--text3)' }}>{item.desc}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
