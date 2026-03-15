'use client'

import Card from '@/components/ui/Card'
import AIChip from '@/components/ui/AIChip'
import { useToast } from '@/components/ui/Toast'

// ─── Report definitions ────────────────────────────────────────────────────────

const REPORTS = [
  {
    id: 'produtividade',
    title: 'Produtividade médica',
    description:
      'Análise detalhada de consultas, procedimentos e ocupação por médico. Comparativo por período e projeção de metas.',
    icon: '📊',
  },
  {
    id: 'glosas',
    title: 'Análise de glosas',
    description:
      'Breakdown de glosas por convênio, código de procedimento e motivo. Tendência mensal e sugestões automáticas de prevenção.',
    icon: '🔍',
  },
  {
    id: 'faturamento',
    title: 'Faturamento por convênio',
    description:
      'Receita bruta, recebido e pendências agrupadas por operadora. Mapa de risco e ranking de convênios mais problemáticos.',
    icon: '💰',
  },
]

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function RelatoriosPage() {
  const { notify } = useToast()

  const handleReportClick = (title: string) => {
    notify(`Gerando relatório "${title}"...`, 'info')
  }

  return (
    <Card style={{ padding: 0 }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 18px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
          Relatórios disponíveis
        </span>
        <span style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
          {REPORTS.length} relatórios
        </span>
      </div>

      {/* 3-column grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 16,
          padding: 18,
        }}
      >
        {REPORTS.map((report) => (
          <div
            key={report.id}
            onClick={() => handleReportClick(report.title)}
            style={{
              background: 'var(--bg3)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r)',
              padding: 16,
              cursor: 'pointer',
              transition: 'border-color 0.18s, transform 0.15s, background 0.15s',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement
              el.style.borderColor = 'var(--border2)'
              el.style.transform = 'translateY(-2px)'
              el.style.background = 'rgba(255,255,255,0.04)'
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement
              el.style.borderColor = 'var(--border)'
              el.style.transform = 'translateY(0)'
              el.style.background = 'var(--bg3)'
            }}
          >
            {/* Icon + chip */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: 'rgba(139,92,246,0.12)',
                  border: '1px solid rgba(139,92,246,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                }}
              >
                {report.icon}
              </div>
              <AIChip label="Gerado por IA" size="sm" />
            </div>

            {/* Title */}
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--text)',
                marginBottom: 6,
                lineHeight: 1.3,
              }}
            >
              {report.title}
            </div>

            {/* Description */}
            <div
              style={{
                fontSize: 12,
                color: 'var(--text3)',
                lineHeight: 1.6,
                marginBottom: 14,
              }}
            >
              {report.description}
            </div>

            {/* CTA */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 12,
                color: '#93bbfc',
                fontWeight: 500,
              }}
            >
              <span>Gerar relatório</span>
              <span style={{ fontSize: 14 }}>→</span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer note */}
      <div
        style={{
          padding: '12px 18px',
          borderTop: '1px solid var(--border)',
          fontSize: 12,
          color: 'var(--text3)',
          fontFamily: 'var(--mono)',
        }}
      >
        Relatórios gerados com base em dados de março/2026 · Atualizado em tempo real pelo Agente IA
      </div>
    </Card>
  )
}
