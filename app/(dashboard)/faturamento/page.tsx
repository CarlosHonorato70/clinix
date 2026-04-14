'use client'

import { useState } from 'react'
import MetricCard from '@/components/ui/MetricCard'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import AIChip from '@/components/ui/AIChip'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { useApi, apiPost } from '@/lib/api/client'

// ─── Types ──────────────────────────────────────────────────────────────────
interface GuiaAPI {
  id: string
  numeroGuia: string
  status: string
  valorFaturado: string | null
  valorPago: string | null
  glosMotivo: string | null
  auditoriaIa: unknown
  createdAt: string
  convenio: { id: string; nome: string } | null
  paciente: { id: string; nome: string } | null
}

// ─── Helpers ────────────────────────────────────────────────────────────────
const convBadgeColor: Record<string, string> = {
  Amil: '#2dd4bf', Unimed: '#fbbf24', Bradesco: '#c4b5fd', SulAmérica: '#93bbfc', Hapvida: '#34d399',
}

function getConvColor(name: string): string {
  return convBadgeColor[name] ?? '#a1a1aa'
}

function statusInfo(status: string): { label: string; color: 'green' | 'amber' | 'red' | 'blue' } {
  switch (status) {
    case 'pendente_revisao': return { label: 'Revisão IA', color: 'amber' }
    case 'pendente_envio': return { label: 'Pronto envio', color: 'green' }
    case 'pendente_auditoria': return { label: 'Em auditoria', color: 'blue' }
    case 'enviado': return { label: 'Enviado', color: 'blue' }
    case 'glosado': return { label: 'Glosado', color: 'red' }
    case 'pago': return { label: 'Pago', color: 'green' }
    default: return { label: status, color: 'amber' }
  }
}

function formatMoney(val: string | null): string {
  if (!val) return '—'
  return `R$ ${parseFloat(val).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
}

// ─── Button helpers ─────────────────────────────────────────────────────────
function PrimaryBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick} style={{
      height: 28, padding: '0 12px', borderRadius: 7,
      background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
      border: '1px solid rgba(139,92,246,0.5)', color: '#fff',
      fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'opacity 0.15s', whiteSpace: 'nowrap',
    }}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
    >
      {children}
    </button>
  )
}

function GhostBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick} style={{
      height: 28, padding: '0 10px', borderRadius: 7,
      background: 'transparent', border: '1px solid var(--border2)',
      color: 'var(--text2)', fontSize: 12, fontWeight: 500, cursor: 'pointer',
      transition: 'border-color 0.15s, color 0.15s', whiteSpace: 'nowrap',
    }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; e.currentTarget.style.color = 'var(--text)' }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--text2)' }}
    >
      {children}
    </button>
  )
}

// ─── Auditoria Modal ────────────────────────────────────────────────────────
function AuditoriaModal({ isOpen, onClose, guia }: { isOpen: boolean; onClose: () => void; guia: GuiaAPI | null }) {
  const { notify } = useToast()
  if (!guia) return null

  const procedures = [
    { code: '10101012', desc: 'Consulta médica', status: 'OK', color: '#34d399', icon: '✓' },
    { code: '40304361', desc: 'Cintilografia óssea', status: 'Autorização prévia', color: '#fbbf24', icon: '⚠' },
    { code: '40302558', desc: 'Cintilografia renal', status: 'OK', color: '#34d399', icon: '✓' },
  ]

  const suggestions = [
    `Solicitar autorização prévia via portal ${guia.convenio?.nome ?? 'do convênio'} antes do envio.`,
    'Anexar laudo médico justificando necessidade clínica do procedimento.',
    'Verificar se o paciente possui plano com cobertura para o procedimento.',
  ]

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Auditoria IA — ${guia.paciente?.nome ?? ''} / ${guia.convenio?.nome ?? ''}`} maxWidth={560}>
      <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 20, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <span style={{ color: '#fbbf24', fontSize: 14, flexShrink: 0, marginTop: 1 }}>⚠</span>
        <div>
          <div style={{ fontSize: 13, color: '#fbbf24', fontWeight: 600, marginBottom: 2 }}>Pendência detectada pela IA</div>
          <div style={{ fontSize: 12, color: 'var(--text2)' }}>Guia {guia.numeroGuia} · Valor: {formatMoney(guia.valorFaturado)}</div>
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Procedimentos auditados</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>{['Código', 'Descrição', 'Status'].map((h) => (<th key={h} style={{ textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text3)', padding: '5px 10px', borderBottom: '1px solid var(--border)', letterSpacing: '0.04em' }}>{h}</th>))}</tr></thead>
          <tbody>
            {procedures.map((proc) => (
              <tr key={proc.code} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '8px 10px', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text)' }}>{proc.code}</td>
                <td style={{ padding: '8px 10px', fontSize: 13, color: 'var(--text2)' }}>{proc.desc}</td>
                <td style={{ padding: '8px 10px' }}><span style={{ color: proc.color, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}><span>{proc.icon}</span>{proc.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Sugestões do agente</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {suggestions.map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.25)', color: '#93bbfc', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
              <span style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>{s}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <GhostBtn onClick={onClose}>Cancelar</GhostBtn>
        <PrimaryBtn onClick={() => { notify('Solicitação de autorização prévia enviada.', 'success'); onClose() }}>Solicitar autorização prévia</PrimaryBtn>
      </div>
    </Modal>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────
export default function FaturamentoPage() {
  const { notify } = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedGuia, setSelectedGuia] = useState<GuiaAPI | null>(null)

  const { data, mutate } = useApi<{ guias: GuiaAPI[] }>('/faturamento/guias')
  const guias = data?.guias ?? []

  const pendentes = guias.filter((g) => g.status === 'pendente_revisao' || g.status === 'pendente_auditoria').length
  const prontas = guias.filter((g) => g.status === 'pendente_envio').length
  const glosadas = guias.filter((g) => g.status === 'glosado').length
  const totalFat = guias.reduce((sum, g) => sum + parseFloat(g.valorFaturado ?? '0'), 0)

  const handleAction = async (guia: GuiaAPI) => {
    if (guia.status === 'pendente_envio') {
      try {
        await apiPost(`/faturamento/guias/${guia.id}/enviar`, {})
        notify(`Guia de ${guia.paciente?.nome ?? ''} enviada com sucesso.`, 'success')
        mutate()
      } catch { notify('Erro ao enviar guia.', 'error') }
    } else if (guia.status === 'pendente_revisao' || guia.status === 'pendente_auditoria') {
      setSelectedGuia(guia)
      setModalOpen(true)
    } else {
      notify(`Status: ${guia.status}`, 'info')
    }
  }

  const highlightBg: Record<string, string> = { pendente_revisao: 'rgba(245,158,11,0.06)', glosado: 'rgba(239,68,68,0.06)' }

  return (
    <>
      <AuditoriaModal isOpen={modalOpen} onClose={() => setModalOpen(false)} guia={selectedGuia} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        <MetricCard label="Pendentes revisão" value={String(pendentes)} style={{ borderLeft: '3px solid #f59e0b' }} />
        <MetricCard label="Prontos para envio" value={String(prontas)} style={{ borderLeft: '3px solid #10b981' }} />
        <MetricCard label="Glosados este mês" value={String(glosadas)} style={{ borderLeft: '3px solid #ef4444' }} />
        <MetricCard label="Faturado este mês" value={totalFat > 0 ? `R$ ${(totalFat / 1000).toFixed(1)}k` : '—'} />
      </div>

      {pendentes > 0 && (
        <div style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.22)', borderRadius: 'var(--r)', padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>⚡</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#fbbf24', marginBottom: 4 }}>Agente IA detectou {pendentes} pendência{pendentes > 1 ? 's' : ''}</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>Revise as guias com status de alerta antes do envio para evitar glosas.</div>
          </div>
        </div>
      )}

      <Card style={{ padding: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--border)', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Guias em processo</span>
            <AIChip label="IA auditando" size="sm" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>{guias.length} guias</span>
            <button
              onClick={async () => {
                try {
                  notify('Gerando lote XML TISS...', 'info')
                  const res = await fetch('/api/faturamento/exportar-xml?status=pendente_envio', {
                    credentials: 'include',
                  })
                  if (!res.ok) {
                    const err = await res.json().catch(() => ({ error: 'Erro' }))
                    notify(err.error || 'Nenhuma guia pronta para envio', 'error')
                    return
                  }
                  const count = res.headers.get('X-Clinix-Guias-Count')
                  const disposition = res.headers.get('Content-Disposition') || ''
                  const match = disposition.match(/filename="([^"]+)"/)
                  const filename = match ? match[1] : 'lote_tiss.xml'
                  const blob = await res.blob()
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = filename
                  document.body.appendChild(a)
                  a.click()
                  document.body.removeChild(a)
                  URL.revokeObjectURL(url)
                  notify(`${count ?? ''} guias exportadas em ${filename}`, 'success')
                } catch {
                  notify('Erro ao exportar XML', 'error')
                }
              }}
              style={{
                height: 30, padding: '0 14px', borderRadius: 7,
                background: 'transparent', border: '1px solid var(--border2)',
                color: 'var(--text2)', fontSize: 12, fontWeight: 500,
                display: 'inline-flex', alignItems: 'center', gap: 6,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; e.currentTarget.style.color = 'var(--text)' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--text2)' }}
            >
              <span style={{ fontSize: 13 }}>↓</span>
              Exportar lote XML TISS
            </button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                {['Paciente', 'Convênio', 'Nº Guia', 'Valor', 'Status IA', 'Ações'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text3)', padding: '9px 14px', borderBottom: '1px solid var(--border)', letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!data && [1, 2, 3].map((i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                  {[1, 2, 3, 4, 5, 6].map((j) => (<td key={j} style={{ padding: '12px 14px' }}><div style={{ height: 14, width: '60%', background: 'var(--bg3)', borderRadius: 6, animation: 'pulse 1.5s infinite' }} /></td>))}
                </tr>
              ))}
              {guias.map((guia) => {
                const sb = statusInfo(guia.status)
                const cc = getConvColor(guia.convenio?.nome ?? '')
                return (
                  <tr key={guia.id}
                    style={{ background: highlightBg[guia.status] ?? 'transparent', borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}
                    onMouseEnter={(e) => { if (!highlightBg[guia.status]) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)' }}
                    onMouseLeave={(e) => { if (!highlightBg[guia.status]) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{guia.paciente?.nome ?? '—'}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>{guia.numeroGuia}</div>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: cc, background: `${cc}18`, border: `1px solid ${cc}30`, borderRadius: 20, padding: '2px 8px' }}>{guia.convenio?.nome ?? '—'}</span>
                    </td>
                    <td style={{ padding: '10px 14px', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text2)' }}>{guia.numeroGuia}</td>
                    <td style={{ padding: '10px 14px', fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{formatMoney(guia.valorFaturado)}</td>
                    <td style={{ padding: '10px 14px' }}><Badge color={sb.color}>{sb.label}</Badge></td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {guia.status === 'pendente_envio' ? (
                          <PrimaryBtn onClick={() => handleAction(guia)}>Enviar</PrimaryBtn>
                        ) : guia.status.startsWith('pendente') ? (
                          <GhostBtn onClick={() => handleAction(guia)}>Revisar</GhostBtn>
                        ) : (
                          <GhostBtn onClick={() => handleAction(guia)}>Ver</GhostBtn>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}
