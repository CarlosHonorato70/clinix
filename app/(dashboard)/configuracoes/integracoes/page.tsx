'use client'

import { useState } from 'react'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { useApi, apiPost } from '@/lib/api/client'

// ─── Types ──────────────────────────────────────────────────────────────────
interface Convenio {
  id: string
  nome: string
  codigoAns: string | null
  ativo: boolean
  wsdlUrl: string | null
  authMethod: string | null
  integracaoAtiva: boolean
  integracaoTesteAt: string | null
}

interface CatalogoOperadora {
  nome: string
  codigoAns: string
  portalPrestador: string
  wsdlUrl: string | null
  wsDisponivel: boolean
  telefone: string | null
  cor: string
}

interface TesteResult {
  conectado: boolean
  latenciaMs: number
  mensagem: string
}

// ─── Page ──────────────────────────────────────────────────────────────────
export default function IntegracoesPage() {
  const { data: convData, mutate } = useApi<{ convenios: Convenio[] }>('/convenios')
  const { data: catData } = useApi<{ operadoras: CatalogoOperadora[] }>('/convenios/catalogo')
  const [testing, setTesting] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<Record<string, TesteResult>>({})

  const convenios = convData?.convenios ?? []
  const catalogo = catData?.operadoras ?? []

  const handleTestarConexao = async (id: string) => {
    setTesting(id)
    try {
      const result = await apiPost(`/convenios/${id}/testar-conexao`, {})
      setTestResult((prev) => ({ ...prev, [id]: result as TesteResult }))
      mutate()
    } catch {
      setTestResult((prev) => ({ ...prev, [id]: { conectado: false, latenciaMs: 0, mensagem: 'Erro ao testar conexão' } }))
    } finally {
      setTesting(null)
    }
  }

  const conectados = convenios.filter((c) => c.integracaoAtiva && c.wsdlUrl)
  const naoConfigurados = convenios.filter((c) => !c.wsdlUrl)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)', lineHeight: 1.25, margin: 0 }}>
          Integrações TISS
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 3, fontFamily: 'var(--mono)' }}>
          {conectados.length} convênio{conectados.length !== 1 ? 's' : ''} integrado{conectados.length !== 1 ? 's' : ''} · {naoConfigurados.length} pendente{naoConfigurados.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Status cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <Card style={{ padding: 16, borderLeft: '3px solid #10b981' }}>
          <div style={{ fontSize: 24, fontWeight: 600, color: '#10b981' }}>{conectados.length}</div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>Integrados</div>
        </Card>
        <Card style={{ padding: 16, borderLeft: '3px solid #f59e0b' }}>
          <div style={{ fontSize: 24, fontWeight: 600, color: '#f59e0b' }}>{naoConfigurados.length}</div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>Sem configuração</div>
        </Card>
        <Card style={{ padding: 16, borderLeft: '3px solid #3b82f6' }}>
          <div style={{ fontSize: 24, fontWeight: 600, color: '#3b82f6' }}>{catalogo.length}</div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>No catálogo ANS</div>
        </Card>
      </div>

      {/* Convenios list */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Seus convênios</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                {['Convênio', 'ANS', 'Auth', 'Status', 'Latência', 'Ações'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text3)', padding: '9px 14px', borderBottom: '1px solid var(--border)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {convenios.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: 32, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
                    Nenhum convênio cadastrado
                  </td>
                </tr>
              )}
              {convenios.map((conv) => {
                const result = testResult[conv.id]
                return (
                  <tr key={conv.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{conv.nome}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)', marginTop: 1 }}>
                        {conv.wsdlUrl ? conv.wsdlUrl.slice(0, 40) + '...' : 'Não configurado'}
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text2)' }}>
                      {conv.codigoAns ?? '—'}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <Badge color={conv.authMethod ? 'blue' : 'default'}>
                        {conv.authMethod ?? 'nenhum'}
                      </Badge>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      {conv.integracaoAtiva && conv.wsdlUrl ? (
                        <Badge color="green">Conectado</Badge>
                      ) : conv.wsdlUrl ? (
                        <Badge color="amber">Configurado</Badge>
                      ) : (
                        <Badge color="default">Pendente</Badge>
                      )}
                    </td>
                    <td style={{ padding: '10px 14px', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text2)' }}>
                      {result ? `${result.latenciaMs}ms` : '—'}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      {conv.wsdlUrl ? (
                        <button
                          onClick={() => handleTestarConexao(conv.id)}
                          disabled={testing === conv.id}
                          style={{
                            height: 28, padding: '0 12px', borderRadius: 7,
                            background: 'transparent', border: '1px solid var(--border2)',
                            color: 'var(--text2)', fontSize: 12, fontWeight: 500,
                            cursor: testing === conv.id ? 'wait' : 'pointer',
                          }}
                        >
                          {testing === conv.id ? 'Testando...' : 'Testar'}
                        </button>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--text3)' }}>Configurar endpoint</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Test results */}
      {Object.entries(testResult).map(([id, result]) => {
        const conv = convenios.find((c) => c.id === id)
        if (!conv) return null
        return (
          <div key={id} style={{
            padding: '10px 16px', borderRadius: 8,
            background: result.conectado ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
            border: `1px solid ${result.conectado ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
            fontSize: 13, color: result.conectado ? '#34d399' : '#f87171',
          }}>
            {result.conectado ? '✓' : '✗'} {conv.nome}: {result.mensagem}
          </div>
        )
      })}

      {/* Catalog reference */}
      <Card style={{ padding: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>
          Catálogo de operadoras
        </div>
        <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12 }}>
          Operadoras com integração TISS Web Service disponível. Contate a operadora para obter as credenciais.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
          {catalogo.filter((op) => op.wsDisponivel).map((op) => (
            <div key={op.codigoAns} style={{
              padding: '8px 12px', borderRadius: 8,
              background: 'var(--bg3)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: op.cor, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>{op.nome}</div>
                <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>ANS {op.codigoAns}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
