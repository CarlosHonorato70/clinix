'use client'

import { useState, useRef, useEffect } from 'react'
import MetricCard from '@/components/ui/MetricCard'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import AIChip from '@/components/ui/AIChip'
import { useToast } from '@/components/ui/Toast'
import { useApi, apiPost, apiPut } from '@/lib/api/client'
import type { BadgeColor } from '@/components/ui/Badge'

// ─── Types ──────────────────────────────────────────────────────────────────
interface ChatMessage {
  id: string
  role: 'agent' | 'user'
  content: string
  loading?: boolean
}

interface RegraAPI {
  id: string
  tipoRegra: string
  descricao: string
  confianca: string
  confirmacoes: number
  rejeicoes: number
  confirmadaPorHumano: boolean
  ativa: boolean
  tussCodigo: string | null
  cidCodigo: string | null
  convenio: { id: string; nome: string } | null
}

interface ConvenioAPI {
  id: string
  nome: string
  codigoAns: string | null
}

// ─── Initial messages ──────────────────────────────────────────────────────
const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'init-0',
    role: 'agent',
    content: 'Olá! Sou o <strong>Agente IA do MedFlow</strong>. Posso ajudar com análise de glosas, faturamento TISS, agenda médica, pacientes de risco e relatórios financeiros. O que você precisa hoje?',
  },
]

// ─── Risk color map ────────────────────────────────────────────────────────
const riskBgMap: Record<string, string> = { Alto: 'rgba(239,68,68,0.08)', Médio: 'rgba(245,158,11,0.08)', Baixo: 'rgba(16,185,129,0.08)' }
const riskBorderMap: Record<string, string> = { Alto: 'rgba(239,68,68,0.18)', Médio: 'rgba(245,158,11,0.18)', Baixo: 'rgba(16,185,129,0.18)' }
const riskTextMap: Record<string, string> = { Alto: '#f87171', Médio: '#fbbf24', Baixo: '#34d399' }

const convBadgeColor = (nome: string): BadgeColor => {
  if (nome?.startsWith('Unimed')) return 'amber'
  if (nome?.startsWith('Amil')) return 'teal'
  if (nome?.startsWith('Bradesco')) return 'purple'
  if (nome?.startsWith('SulAm')) return 'blue'
  if (nome?.startsWith('Hapvida')) return 'green'
  return 'default'
}

// ─── Page ──────────────────────────────────────────────────────────────────
export default function AgentePage() {
  const { notify } = useToast()
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES)
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const { data: regrasData, mutate: mutateRegras } = useApi<{ regras: RegraAPI[] }>('/agente/regras')
  const { data: convData } = useApi<{ convenios: ConvenioAPI[] }>('/convenios')

  const regras = regrasData?.regras ?? []
  const convenios = convData?.convenios ?? []
  const pendingRules = regras.filter((r) => !r.confirmadaPorHumano && r.ativa)

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const sendMessage = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || isLoading) return

    const userMsg: ChatMessage = { id: `msg-${Date.now()}-user`, role: 'user', content: trimmed }
    const loadingMsg: ChatMessage = { id: `msg-${Date.now()}-loading`, role: 'agent', content: '', loading: true }

    setMessages((prev) => [...prev, userMsg, loadingMsg])
    setInputValue('')
    setIsLoading(true)

    try {
      const result = await apiPost('/agente/chat', { message: trimmed })
      setMessages((prev) => prev.map((m) => m.loading ? { ...m, content: result.response, loading: false } : m))
    } catch {
      setMessages((prev) => prev.map((m) => m.loading ? { ...m, content: 'Desculpe, ocorreu um erro. Tente novamente.', loading: false } : m))
    }
    setIsLoading(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(inputValue) }
  }

  const handleRuleAction = async (ruleId: string, action: 'confirm' | 'reject') => {
    try {
      await apiPost('/agente/feedback', { regraId: ruleId, acao: action === 'confirm' ? 'confirmou' : 'rejeitou' })
      notify(action === 'confirm' ? 'Regra confirmada!' : 'Regra rejeitada.', action === 'confirm' ? 'success' : 'warning')
      mutateRegras()
    } catch { notify('Erro ao processar feedback.', 'error') }
  }

  const quickReplies = ['Unimed glosas', 'Amil docs', 'SulAmérica', 'Novas regras']

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        <MetricCard label="Convênios mapeados" value={String(convenios.length)} />
        <MetricCard label="Regras aprendidas" value={String(regras.length)} />
        <MetricCard label="Precisão do agente" value="94,3%" style={{ borderLeft: '3px solid #10b981' }} />
        <MetricCard label="Regras pendentes" value={String(pendingRules.length)} style={{ borderLeft: '3px solid #f59e0b' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Chat */}
        <Card style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Chat com o agente</span>
            <AIChip label="GPT-4o" size="sm" />
          </div>

          <div style={{ flex: 1, overflowY: 'auto', maxHeight: 380, padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {messages.map((msg) => (
              <div key={msg.id} style={{ display: 'flex', gap: 10, flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', alignItems: 'flex-start' }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700,
                  ...(msg.role === 'agent' ? { background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)', color: '#fff' } : { background: 'var(--bg4)', color: 'var(--text2)', border: '1px solid var(--border2)' }),
                }}>
                  {msg.role === 'agent' ? 'IA' : 'CM'}
                </div>
                <div style={{
                  maxWidth: '80%', padding: '9px 13px', fontSize: 13, lineHeight: 1.55,
                  borderRadius: msg.role === 'agent' ? '4px 12px 12px 12px' : '12px 4px 12px 12px',
                  ...(msg.role === 'agent' ? { background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)' } : { background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.25)', color: 'var(--text)' }),
                }}>
                  {msg.loading ? (
                    <div className="loading-dots"><span /><span /><span /></div>
                  ) : msg.role === 'agent' ? (
                    <span dangerouslySetInnerHTML={{ __html: msg.content }} />
                  ) : msg.content}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, flexShrink: 0 }}>
            <textarea value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={handleKeyDown} rows={2} placeholder="Pergunte sobre glosas, faturamento, convênios..."
              style={{ flex: 1, background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--text)', resize: 'none', lineHeight: 1.5, transition: 'border-color 0.15s' }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(59,130,246,0.5)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border2)')}
            />
            <button onClick={() => sendMessage(inputValue)} disabled={isLoading || !inputValue.trim()} style={{
              height: 56, padding: '0 14px', borderRadius: 8,
              background: isLoading || !inputValue.trim() ? 'rgba(59,130,246,0.2)' : 'linear-gradient(135deg, #7c3aed, #3b82f6)',
              border: '1px solid rgba(139,92,246,0.4)', color: isLoading || !inputValue.trim() ? 'var(--text3)' : '#fff',
              fontSize: 13, fontWeight: 600, cursor: isLoading || !inputValue.trim() ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
            }}>
              Enviar →
            </button>
          </div>

          <div style={{ padding: '0 14px 12px', display: 'flex', gap: 6, flexWrap: 'wrap', flexShrink: 0 }}>
            {quickReplies.map((q) => (
              <button key={q} onClick={() => sendMessage(q)} disabled={isLoading} style={{
                height: 26, padding: '0 10px', borderRadius: 20, background: 'var(--bg3)',
                border: '1px solid var(--border2)', color: 'var(--text2)', fontSize: 11, fontWeight: 500,
                cursor: isLoading ? 'not-allowed' : 'pointer', transition: 'border-color 0.15s, color 0.15s',
              }}
                onMouseEnter={(e) => { if (!isLoading) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.22)'; e.currentTarget.style.color = 'var(--text)' } }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--text2)' }}
              >
                {q}
              </button>
            ))}
          </div>
        </Card>

        {/* Pending Rules */}
        <Card style={{ padding: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Regras aguardando confirmação</span>
            <Badge color="amber">{pendingRules.length} novas</Badge>
          </div>

          <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {pendingRules.length === 0 && (
              <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>Todas as regras foram revisadas.</div>
            )}
            {pendingRules.map((rule) => {
              const conf = parseFloat(rule.confianca)
              return (
                <div key={rule.id} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                    <Badge color={convBadgeColor(rule.convenio?.nome ?? '')}>{rule.convenio?.nome ?? '—'}</Badge>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', lineHeight: 1.4, flex: 1 }}>{rule.descricao}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 10 }}>
                    {rule.tipoRegra} · Confiança: {conf.toFixed(0)}% · {rule.confirmacoes} confirmações
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ height: 4, background: 'var(--bg4)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${conf}%`, background: conf >= 85 ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, #f59e0b, #fbbf24)', borderRadius: 4 }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 7 }}>
                    <button onClick={() => handleRuleAction(rule.id, 'confirm')} style={{
                      height: 26, padding: '0 12px', borderRadius: 6, background: 'rgba(16,185,129,0.15)',
                      border: '1px solid rgba(16,185,129,0.3)', color: '#34d399', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    }}>
                      Confirmar
                    </button>
                    <button onClick={() => handleRuleAction(rule.id, 'reject')} style={{
                      height: 26, padding: '0 12px', borderRadius: 6, background: 'transparent',
                      border: '1px solid var(--border2)', color: 'var(--text3)', fontSize: 11, fontWeight: 500, cursor: 'pointer',
                    }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#f87171'; e.currentTarget.style.color = '#f87171' }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--text3)' }}
                    >
                      Rejeitar
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      {/* Convenio profiles */}
      <Card style={{ padding: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Convênios mapeados</span>
          <AIChip size="sm" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(convenios.length, 6)}, 1fr)`, gap: 12, padding: 14 }}>
          {convenios.map((conv) => {
            const convRegras = regras.filter((r) => r.convenio?.id === conv.id)
            const risco = convRegras.length >= 5 ? 'Alto' : convRegras.length >= 2 ? 'Médio' : 'Baixo'
            return (
              <div key={conv.id} onClick={() => sendMessage(`Convênio ${conv.nome}`)} style={{
                background: riskBgMap[risco], border: `1px solid ${riskBorderMap[risco]}`,
                borderRadius: 8, padding: '12px 10px', cursor: 'pointer',
                transition: 'transform 0.15s', textAlign: 'center',
              }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)' }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{conv.nome}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: riskTextMap[risco], fontFamily: 'var(--mono)', marginBottom: 2 }}>{convRegras.length}</div>
                <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 6 }}>regras</div>
                <div style={{ fontSize: 10, color: riskTextMap[risco], background: `${riskTextMap[risco]}18`, borderRadius: 20, padding: '2px 8px', display: 'inline-block', fontWeight: 600 }}>
                  Risco {risco}
                </div>
              </div>
            )
          })}
        </div>
      </Card>
    </>
  )
}
