'use client'

import MetricCard from '@/components/ui/MetricCard'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import AIChip from '@/components/ui/AIChip'
import { useApi } from '@/lib/api/client'
import type { BadgeColor } from '@/components/ui/Badge'

// ─── Types ──────────────────────────────────────────────────────────────────
interface ConciliacaoItem {
  convenioId: string
  convenioNome: string
  totalGuias: number
  totalFaturado: string
  totalRecebido: string
  totalGlosa: string
}

function formatMoney(val: string | number): string {
  const n = typeof val === 'string' ? parseFloat(val) : val
  if (isNaN(n) || n === 0) return 'R$ 0,00'
  return `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatShort(val: number): string {
  if (val >= 1000) return `R$ ${(val / 1000).toFixed(1)}k`
  return `R$ ${val.toFixed(0)}`
}

// ─── Page ──────────────────────────────────────────────────────────────────
export default function FinanceiroPage() {
  const { data } = useApi<{ conciliacao: ConciliacaoItem[] }>('/financeiro/conciliacao')
  const items = data?.conciliacao ?? []

  const totalFaturado = items.reduce((s, i) => s + parseFloat(i.totalFaturado), 0)
  const totalRecebido = items.reduce((s, i) => s + parseFloat(i.totalRecebido), 0)
  const totalGlosa = items.reduce((s, i) => s + parseFloat(i.totalGlosa), 0)
  const totalGuias = items.reduce((s, i) => s + i.totalGuias, 0)
  const ticketMedio = totalGuias > 0 ? totalFaturado / totalGuias : 0

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        <MetricCard label="Receita bruta" value={formatShort(totalFaturado)} delta="este mês" deltaDirection="up" />
        <MetricCard label="A receber" value={formatShort(totalFaturado - totalRecebido)} style={{ borderLeft: '3px solid #f59e0b' }} />
        <MetricCard label="Glosas" value={formatShort(totalGlosa)} style={{ borderLeft: '3px solid #ef4444' }} />
        <MetricCard label="Ticket médio" value={formatShort(ticketMedio)} />
      </div>

      <Card style={{ padding: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Conciliação por convênio</span>
            <AIChip label="IA" size="sm" />
          </div>
          <span style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
            {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                {['Convênio', 'Guias', 'Faturado', 'Recebido', 'Glosado', 'Taxa glosa', 'Status'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text3)', padding: '9px 14px', borderBottom: '1px solid var(--border)', letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!data && [1, 2, 3].map((i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                  {[1, 2, 3, 4, 5, 6, 7].map((j) => (<td key={j} style={{ padding: '12px 14px' }}><div style={{ height: 14, width: '60%', background: 'var(--bg3)', borderRadius: 6, animation: 'pulse 1.5s infinite' }} /></td>))}
                </tr>
              ))}
              {items.map((item) => {
                const faturado = parseFloat(item.totalFaturado)
                const glosa = parseFloat(item.totalGlosa)
                const recebido = parseFloat(item.totalRecebido)
                let taxaGlosa = '0,0%'
                let taxaBadge: BadgeColor = 'green'
                if (faturado > 0 && glosa > 0) {
                  const pct = (glosa / faturado) * 100
                  taxaGlosa = `${pct.toFixed(1)}%`
                  taxaBadge = pct >= 5 ? 'red' : pct >= 2 ? 'amber' : 'green'
                }
                const stBadge: BadgeColor = glosa > 0 ? 'amber' : 'green'
                const stLabel = glosa > 0 ? 'Pendências' : 'Conciliado'

                return (
                  <tr key={item.convenioId}
                    style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)' }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >
                    <td style={{ padding: '10px 14px' }}><span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{item.convenioNome}</span></td>
                    <td style={{ padding: '10px 14px', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text2)' }}>{item.totalGuias}</td>
                    <td style={{ padding: '10px 14px', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text)' }}>{formatMoney(faturado)}</td>
                    <td style={{ padding: '10px 14px', fontFamily: 'var(--mono)', fontSize: 12, color: '#34d399' }}>{formatMoney(recebido)}</td>
                    <td style={{ padding: '10px 14px', fontFamily: 'var(--mono)', fontSize: 12, color: glosa > 0 ? '#f87171' : 'var(--text3)' }}>{formatMoney(glosa)}</td>
                    <td style={{ padding: '10px 14px' }}><Badge color={taxaBadge}>{taxaGlosa}</Badge></td>
                    <td style={{ padding: '10px 14px' }}><Badge color={stBadge}>{stLabel}</Badge></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {items.length > 0 && (
          <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border)', display: 'flex', gap: 32 }}>
            {[
              { label: 'Total faturado', value: formatMoney(totalFaturado), color: 'var(--text)' },
              { label: 'Total recebido', value: formatMoney(totalRecebido), color: '#34d399' },
              { label: 'Total glosado', value: formatMoney(totalGlosa), color: '#f87171' },
            ].map((s) => (
              <div key={s.label}>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2 }}>{s.label}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 13, color: s.color, fontWeight: 600 }}>{s.value}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  )
}
