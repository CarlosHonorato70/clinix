'use client'

import { useState } from 'react'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import AIChip from '@/components/ui/AIChip'
import { useApi, apiPost } from '@/lib/api/client'
import { useToast } from '@/components/ui/Toast'

// ─── Types ──────────────────────────────────────────────────────────────────
interface ConsultaAPI {
  id: string
  anamnese: string | null
  exameFisico: string | null
  conduta: string | null
  hipoteseDiagnostica: unknown
  prescricao: unknown
  iaExtraido: { cids?: { code: string; desc: string }[]; tuss?: { code: string; desc: string; qty: number }[] } | null
  createdAt: string
  paciente: { id: string; nome: string } | null
  medico: { id: string; nome: string } | null
}

// ─── Field helpers ──────────────────────────────────────────────────────────
function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text3)', marginBottom: 6 }}>
      {children}
    </label>
  )
}

function ClinicalTextarea({ value, onChange, rows = 4 }: { value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} style={{
      width: '100%', background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 'var(--r-sm)',
      padding: '10px 12px', fontSize: 13, color: 'var(--text)', fontFamily: 'var(--font)', lineHeight: 1.6,
      resize: 'vertical', outline: 'none', transition: 'border-color 0.15s',
    }}
      onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)' }}
      onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border2)' }}
    />
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────
export default function ProntuariosPage() {
  const { notify } = useToast()
  const { data } = useApi<{ consultas: ConsultaAPI[] }>('/prontuarios')
  const consultas = data?.consultas ?? []

  // Use first consulta as base or defaults
  const lastConsulta = consultas[0]

  const [anamnese, setAnamnese] = useState(
    'Paciente relata dor precordial de moderada intensidade há 3 dias, piora ao esforço, sem irradiação. Nega febre. Refere hipertensão arterial em tratamento com Losartana 50mg.'
  )
  const [exame, setExame] = useState(
    'PA: 148/92 mmHg. FC: 82 bpm. Ausculta cardíaca: ritmo regular, 2T, sem sopros. Pulmões limpos.'
  )
  const [conduta, setConduta] = useState(
    'Suspeita CID I20 (Angina pectoris). Solicitado ECG de esforço e troponina. Ajuste de Losartana para 100mg. Encaminhamento para cardiologia.'
  )

  const [extractState, setExtractState] = useState<'idle' | 'loading' | 'done'>('idle')
  const [extraction, setExtraction] = useState<{
    cids: { code: string; desc: string; isValid?: boolean }[]
    tuss: { code: string; desc: string; qty: number; confianca?: number; isValid?: boolean; errors?: string[] }[]
    confianca_geral?: number
    requiresReview?: boolean
    inferenceId?: string | null
    observacao?: string | null
  } | null>(null)

  async function handleExtract() {
    if (extractState === 'loading') return
    setExtractState('loading')

    try {
      // If we have a consulta, use the real API
      if (lastConsulta) {
        const result = await apiPost(`/prontuarios/${lastConsulta.id}/extrair-tuss`, {
          anamnese, exameFisico: exame, conduta,
        })
        // Map new validated response to UI format
        const raw = result.extraction
        const validation = result.validation
        if (raw && validation) {
          setExtraction({
            cids: [
              {
                code: validation.cid10_principal.code,
                desc: raw.cid10_principal,
                isValid: validation.cid10_principal.isValid,
              },
              ...validation.cid10_secundarios.map((c: { code: string; isValid: boolean }) => ({
                code: c.code,
                desc: c.code,
                isValid: c.isValid,
              })),
            ],
            tuss: validation.procedimentos.map((p: { tuss: string; descricao: string; quantidade: number; confianca: number; isValid: boolean; errors: string[] }) => ({
              code: p.tuss,
              desc: p.descricao,
              qty: p.quantidade,
              confianca: p.confianca,
              isValid: p.isValid,
              errors: p.errors,
            })),
            confianca_geral: raw.confianca_geral,
            requiresReview: result.requiresReview,
            inferenceId: result.inferenceId,
            observacao: raw.observacao_auditoria,
          })
        } else {
          setExtraction(result.extraction ?? result)
        }
      } else {
        // Fallback: simulated extraction
        await new Promise((r) => setTimeout(r, 1500))
        setExtraction({
          cids: [{ code: 'I20', desc: 'Angina pectoris' }, { code: 'I10', desc: 'Hipertensão' }],
          tuss: [
            { code: '10101012', desc: 'Consulta em consultório (clínica médica)', qty: 1 },
            { code: '40304361', desc: 'Eletrocardiograma com esforço (ECG)', qty: 1 },
            { code: '40302558', desc: 'Troponina I (quantitativa)', qty: 1 },
          ],
        })
      }
      setExtractState('done')
    } catch {
      notify('Erro na extração. Usando resultado simulado.', 'warning')
      setExtraction({
        cids: [{ code: 'I20', desc: 'Angina pectoris' }, { code: 'I10', desc: 'Hipertensão' }],
        tuss: [
          { code: '10101012', desc: 'Consulta em consultório', qty: 1 },
          { code: '40304361', desc: 'ECG com esforço', qty: 1 },
          { code: '40302558', desc: 'Troponina I', qty: 1 },
        ],
      })
      setExtractState('done')
    }
  }

  const patientName = lastConsulta?.paciente?.nome ?? 'João Carlos Ferreira'

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
      {/* LEFT COLUMN */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Patient header */}
        <Card style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
              {patientName.split(' ').slice(0, 2).map((w) => w[0]).join('')}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text)', lineHeight: 1.2 }}>{patientName}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text3)', marginTop: 2 }}>62 anos · masculino · Unimed</div>
            </div>
            <Badge color="amber" style={{ flexShrink: 0 }}>Ativo</Badge>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {[
              { label: 'Última consulta', value: consultas[0] ? new Date(consultas[0].createdAt).toLocaleDateString('pt-BR') : '—' },
              { label: 'Total consultas', value: `${consultas.length} registros` },
              { label: 'Alergias', value: 'Dipirona', special: true },
            ].map((chip) => (
              <div key={chip.label} style={{
                background: chip.special ? 'rgba(245,158,11,0.07)' : 'var(--bg3)',
                border: `1px solid ${chip.special ? 'rgba(245,158,11,0.18)' : 'var(--border)'}`,
                borderRadius: 'var(--r-sm)', padding: '8px 10px',
              }}>
                <div style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text3)', marginBottom: 4 }}>{chip.label}</div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: chip.special ? '#fbbf24' : 'var(--text)' }}>{chip.value}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Clinical form */}
        <Card style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Nova evolução clínica</span>
            <AIChip label="IA transcreve" size="sm" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div><FieldLabel>Anamnese / Queixa principal</FieldLabel><ClinicalTextarea value={anamnese} onChange={setAnamnese} rows={4} /></div>
            <div><FieldLabel>Exame físico</FieldLabel><ClinicalTextarea value={exame} onChange={setExame} rows={3} /></div>
            <div><FieldLabel>Conduta / Prescrição</FieldLabel><ClinicalTextarea value={conduta} onChange={setConduta} rows={3} /></div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
            <button onClick={handleExtract} disabled={extractState === 'loading'} style={{
              width: '100%', height: 36, borderRadius: 8,
              background: extractState === 'loading' ? 'rgba(139,92,246,0.35)' : 'linear-gradient(135deg, #7c3aed, #3b82f6)',
              border: '1px solid rgba(139,92,246,0.5)', color: '#fff', fontSize: 13, fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              cursor: extractState === 'loading' ? 'default' : 'pointer',
            }}>
              {extractState === 'loading' ? (
                <><span style={{ display: 'inline-block', width: 13, height: 13, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.7s linear infinite' }} />Analisando...<style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style></>
              ) : (
                <><span>⚡</span>Extrair TUSS com IA</>
              )}
            </button>
            <button style={{ width: '100%', height: 34, borderRadius: 8, background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text2)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
              Salvar rascunho
            </button>
          </div>
        </Card>
      </div>

      {/* RIGHT COLUMN */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {extractState !== 'idle' && (
          <Card style={{ padding: 16, animation: 'fadeIn 0.25s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', flex: 1 }}>Extração IA</span>
              <AIChip label="GPT-4o" size="sm" />
              {extractState === 'done' && <Badge color="green">Concluído</Badge>}
              {extractState === 'loading' && <Badge color="amber" pulse>Processando</Badge>}
            </div>

            {extractState === 'done' && extraction && (
              <>
                {/* Confiança geral */}
                {typeof extraction.confianca_geral === 'number' && (
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 12px', marginBottom: 12,
                    background: extraction.confianca_geral >= 0.9 ? 'rgba(16,185,129,0.08)'
                      : extraction.confianca_geral >= 0.7 ? 'rgba(251,191,36,0.08)'
                      : 'rgba(239,68,68,0.08)',
                    border: `1px solid ${
                      extraction.confianca_geral >= 0.9 ? 'rgba(16,185,129,0.25)'
                      : extraction.confianca_geral >= 0.7 ? 'rgba(251,191,36,0.25)'
                      : 'rgba(239,68,68,0.25)'
                    }`,
                    borderRadius: 6,
                  }}>
                    <span style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Confiança da extração
                    </span>
                    <span style={{
                      fontSize: 13, fontWeight: 700,
                      color: extraction.confianca_geral >= 0.9 ? '#34d399'
                        : extraction.confianca_geral >= 0.7 ? '#fbbf24'
                        : '#f87171',
                    }}>
                      {Math.round(extraction.confianca_geral * 100)}% · {extraction.confianca_geral >= 0.9 ? 'Alta' : extraction.confianca_geral >= 0.7 ? 'Média' : 'Baixa'}
                    </span>
                  </div>
                )}

                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text3)', marginBottom: 7 }}>CID-10</div>
                  <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                    {extraction.cids.map((c, idx) => (
                      <span key={`${c.code}-${idx}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 500 }}>
                        <Badge color={c.isValid === false ? 'red' : 'blue'}>{c.code}{c.isValid === false && ' ⚠'}</Badge>
                        <span style={{ color: 'var(--text2)', fontSize: 12 }}>{c.desc}</span>
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ borderTop: '1px solid var(--border)', marginBottom: 12 }} />
                <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text3)', marginBottom: 8 }}>Procedimentos TUSS</div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                      {['Código TUSS', 'Descrição', 'Qtd', 'Confiança'].map((col) => (
                        <th key={col} style={{ padding: '6px 8px', textAlign: 'left', fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text3)' }}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {extraction.tuss.map((item, i) => {
                      const conf = item.confianca ?? 1
                      const confColor = conf >= 0.9 ? '#34d399' : conf >= 0.7 ? '#fbbf24' : '#f87171'
                      const isInvalid = item.isValid === false
                      return (
                        <tr
                          key={i}
                          title={item.errors?.join('; ')}
                          style={{
                            borderBottom: i < extraction.tuss.length - 1 ? '1px solid var(--border)' : 'none',
                            background: isInvalid ? 'rgba(239,68,68,0.06)' : 'transparent',
                          }}
                        >
                          <td style={{ padding: '8px', fontFamily: 'var(--mono)', fontSize: 12, color: isInvalid ? '#f87171' : '#93bbfc' }}>
                            {item.code}{isInvalid && ' ⚠'}
                          </td>
                          <td style={{ padding: '8px', fontSize: 12.5, color: 'var(--text)' }}>{item.desc}</td>
                          <td style={{ padding: '8px', textAlign: 'center', fontSize: 12.5, color: 'var(--text2)' }}>{item.qty}</td>
                          <td style={{ padding: '8px', textAlign: 'right', fontSize: 11, fontWeight: 600, color: confColor, fontFamily: 'var(--mono)' }}>
                            {Math.round(conf * 100)}%
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>

                {extraction.observacao && (
                  <div style={{
                    marginTop: 12, padding: '10px 12px',
                    background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)',
                    borderRadius: 6, display: 'flex', gap: 8, alignItems: 'flex-start',
                  }}>
                    <span style={{ color: '#a78bfa', fontSize: 13 }}>ℹ</span>
                    <div style={{ fontSize: 11.5, color: 'var(--text2)', lineHeight: 1.5 }}>
                      <strong style={{ color: '#a78bfa' }}>Observação da IA:</strong> {extraction.observacao}
                    </div>
                  </div>
                )}
                <div style={{ borderTop: '1px solid var(--border)', margin: '12px 0' }} />

                {/* Aviso de revisão humana obrigatória */}
                <div style={{
                  padding: '10px 12px', marginBottom: 12,
                  background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)',
                  borderRadius: 6, display: 'flex', alignItems: 'flex-start', gap: 8,
                }}>
                  <span style={{ fontSize: 14, color: '#fbbf24' }}>⚠</span>
                  <div style={{ fontSize: 11.5, color: 'var(--text2)', lineHeight: 1.5 }}>
                    <strong style={{ color: '#fbbf24' }}>Revisão obrigatória.</strong> A extração IA é uma sugestão. Confirme os códigos antes de enviar para faturamento.
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={async () => {
                      if (extraction?.inferenceId) {
                        await apiPost('/ai/feedback', { inferenceId: extraction.inferenceId, accepted: false }).catch(() => {})
                      }
                      setExtraction(null); setExtractState('idle')
                      notify('Extração rejeitada. Edite o texto e tente novamente.', 'warning')
                    }}
                    style={{
                      flex: 1, height: 34, borderRadius: 8,
                      background: 'transparent', border: '1px solid var(--border2)',
                      color: 'var(--text2)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                    }}
                  >
                    Rejeitar
                  </button>
                  <button
                    onClick={async () => {
                      if (extraction?.inferenceId) {
                        await apiPost('/ai/feedback', { inferenceId: extraction.inferenceId, accepted: true }).catch(() => {})
                      }
                      notify('Extração confirmada! Enviando para faturamento...', 'success')
                      setTimeout(() => { window.location.href = '/faturamento' }, 800)
                    }}
                    style={{
                      flex: 2, height: 34, borderRadius: 8,
                      background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)',
                      color: '#34d399', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                  >
                    ✓ Confirmar e enviar para faturamento
                  </button>
                </div>
              </>
            )}

            {extractState === 'loading' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '8px 0' }}>
                {[80, 60, 90, 50].map((w, i) => (
                  <div key={i} style={{ height: 12, width: `${w}%`, background: 'var(--bg3)', borderRadius: 6, animation: 'pulse 1.5s infinite' }} />
                ))}
              </div>
            )}
          </Card>
        )}

        {/* History */}
        <Card style={{ padding: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>Histórico de consultas</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {consultas.length === 0 && (
              <div style={{ padding: 16, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>Nenhuma consulta registrada</div>
            )}
            {consultas.slice(0, 5).map((c) => (
              <div key={c.id} style={{
                background: 'var(--bg3)', border: '1px solid var(--border)',
                borderRadius: 'var(--r-sm)', padding: '10px 12px', cursor: 'pointer',
                transition: 'border-color 0.15s',
              }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border2)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5, gap: 8 }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 11.5, fontWeight: 500, color: 'var(--text2)' }}>
                    {new Date(c.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                  <Badge color="amber">{c.medico?.nome?.split(' ')[0] ?? ''}</Badge>
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text)', lineHeight: 1.5 }}>
                  {c.anamnese?.slice(0, 80) ?? c.conduta?.slice(0, 80) ?? 'Consulta registrada'}...
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
