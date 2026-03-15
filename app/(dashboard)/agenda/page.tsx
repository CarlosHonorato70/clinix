'use client'

import { useState, useMemo } from 'react'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { useApi } from '@/lib/api/client'

// ─── Types ──────────────────────────────────────────────────────────────────
interface Doctor {
  id: string
  nome: string
  email: string
  crm: string | null
  especialidade: string | null
  corAgenda: string | null
}

interface Appointment {
  id: string
  dataHora: string
  duracaoMin: number | null
  tipo: string
  status: string
  riscoNoshow: number | null
  paciente: { id: string; nome: string } | null
  medico: { id: string; nome: string; corAgenda: string | null } | null
  convenio: { id: string; nome: string } | null
}

// ─── Constants ──────────────────────────────────────────────────────────────
const TIME_SLOTS = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00']

const DOCTOR_COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b']
const DOCTOR_BGS = ['rgba(139,92,246,0.12)', 'rgba(59,130,246,0.12)', 'rgba(16,185,129,0.12)', 'rgba(245,158,11,0.12)']

function getDocColor(idx: number) { return DOCTOR_COLORS[idx % DOCTOR_COLORS.length] }
function getDocBg(idx: number) { return DOCTOR_BGS[idx % DOCTOR_BGS.length] }
function getInitials(name: string) { return name.split(' ').filter(w => w.length > 2).slice(0, 2).map(w => w[0]).join('').toUpperCase() }

// ─── Shared styles ──────────────────────────────────────────────────────────
const thStyle: React.CSSProperties = { padding: '7px 10px', textAlign: 'left', fontSize: 10, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text3)', whiteSpace: 'nowrap', borderBottom: '1px solid var(--border)', background: 'var(--bg2)', position: 'sticky', top: 0, zIndex: 1 }
const tdBase: React.CSSProperties = { padding: '0', verticalAlign: 'top', borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)' }

// ─── Visão Geral ────────────────────────────────────────────────────────────
function VisaoGeral({ doctors, appointments }: { doctors: Doctor[]; appointments: Appointment[] }) {
  function getAppt(docId: string, time: string) {
    return appointments.find((a) => {
      const t = new Date(a.dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      return a.medico?.id === docId && t === time
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 260px)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: 72, minWidth: 72, textAlign: 'center' }}>Hora</th>
                {doctors.map((doc, i) => (
                  <th key={doc.id} style={{ ...thStyle, minWidth: 160 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ color: doc.corAgenda ?? getDocColor(i), fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'none' }}>
                        {doc.nome.replace(/^Dr[a]?\.\s*/, '')}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                        {doc.especialidade ?? 'Médico'}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TIME_SLOTS.map((slot) => (
                <tr key={slot}>
                  <td style={{ ...tdBase, padding: '0 8px', textAlign: 'center', verticalAlign: 'middle', height: 54, width: 72 }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text3)' }}>{slot}</span>
                  </td>
                  {doctors.map((doc, dIdx) => {
                    const appt = getAppt(doc.id, slot)
                    const color = doc.corAgenda ?? getDocColor(dIdx)
                    const bg = getDocBg(dIdx)
                    return (
                      <td key={doc.id} style={{ ...tdBase, minWidth: 160 }}>
                        {appt ? (
                          <div style={{ margin: 3, padding: '5px 7px', borderRadius: 6, background: bg, borderLeft: `2px solid ${color}`, minHeight: 42 }}>
                            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text)', lineHeight: 1.35, display: 'flex', alignItems: 'center', gap: 4 }}>
                              {appt.paciente?.nome ?? '—'}
                              {(appt.riscoNoshow ?? 0) > 0.5 && <span style={{ color: '#fbbf24', fontSize: 10 }} title="Risco no-show">⚠</span>}
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 1, fontFamily: 'var(--mono)' }}>{appt.convenio?.nome ?? 'Particular'}</div>
                          </div>
                        ) : (
                          <div style={{ height: 48, background: 'var(--bg3)', margin: 3, borderRadius: 6, opacity: 0.4 }} />
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{ width: 28, height: 14, borderRadius: 4, background: 'rgba(59,130,246,0.12)', borderLeft: '2px solid #3b82f6' }} />
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>Agendado</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{ width: 28, height: 14, borderRadius: 4, background: 'var(--bg3)', opacity: 0.5 }} />
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>Disponível</span>
        </div>
        <div style={{ width: 1, height: 16, background: 'var(--border)', marginLeft: 4 }} />
        {doctors.map((doc, i) => (
          <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: doc.corAgenda ?? getDocColor(i), fontSize: 10 }}>●</span>
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>{doc.nome.replace(/^Dr[a]?\.\s*/, '')}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Por Médico ─────────────────────────────────────────────────────────────
function PorMedico({ doctor, appointments, docIdx }: { doctor: Doctor; appointments: Appointment[]; docIdx: number }) {
  const [search, setSearch] = useState('')
  const color = doctor.corAgenda ?? getDocColor(docIdx)
  const bg = getDocBg(docIdx)

  const docAppts = appointments.filter((a) => a.medico?.id === doctor.id)
  const todayCount = docAppts.length
  const riskCount = docAppts.filter((a) => (a.riscoNoshow ?? 0) > 0.5).length

  const patients = useMemo(() => {
    const unique = new Map<string, Appointment>()
    docAppts.forEach((a) => { if (a.paciente) unique.set(a.paciente.id, a) })
    return Array.from(unique.values())
  }, [docAppts])

  const filteredPatients = useMemo(() => {
    if (!search.trim()) return patients
    const q = search.toLowerCase()
    return patients.filter((a) => a.paciente?.nome?.toLowerCase().includes(q) || a.convenio?.nome?.toLowerCase().includes(q))
  }, [patients, search])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 52, height: 52, borderRadius: 12, background: bg, border: `1.5px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color, flexShrink: 0, letterSpacing: '0.04em' }}>
            {getInitials(doctor.nome)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text)' }}>{doctor.nome}</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--mono)', marginTop: 2 }}>{doctor.especialidade ?? 'Médico'} · {doctor.crm ?? ''}</div>
          </div>
          <div style={{ display: 'flex', gap: 24, flexShrink: 0 }}>
            <div style={{ textAlign: 'center' }}><div style={{ fontSize: 20, fontWeight: 600, color, lineHeight: 1.1 }}>{todayCount}</div><div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>hoje</div></div>
            <div style={{ textAlign: 'center' }}><div style={{ fontSize: 20, fontWeight: 600, color: riskCount > 0 ? '#fbbf24' : '#34d399', lineHeight: 1.1 }}>{riskCount}</div><div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>risco no-show</div></div>
          </div>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>Agenda do dia</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)', marginTop: 2 }}>{todayCount} agendamentos</div>
          </div>
          <div style={{ overflowY: 'auto', maxHeight: 480 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 340 }}>
              <thead><tr><th style={{ ...thStyle, width: 56, textAlign: 'center' }}>Hora</th><th style={thStyle}>Paciente</th><th style={thStyle}>Convênio</th></tr></thead>
              <tbody>
                {docAppts.map((appt) => {
                  const hora = new Date(appt.dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                  return (
                    <tr key={appt.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px', textAlign: 'center' }}><span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)' }}>{hora}</span></td>
                      <td style={{ padding: '8px' }}>
                        <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          {appt.paciente?.nome ?? '—'}
                          {(appt.riscoNoshow ?? 0) > 0.5 && <span style={{ color: '#fbbf24', fontSize: 10 }}>⚠</span>}
                        </div>
                      </td>
                      <td style={{ padding: '8px' }}><Badge color="default" style={{ fontSize: 9, padding: '2px 6px' }}>{appt.convenio?.nome ?? 'Particular'}</Badge></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>Pacientes</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)', marginTop: 2 }}>{patients.length} pacientes</div>
          </div>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 7, padding: '6px 10px' }}>
              <span style={{ color: 'var(--text3)', fontSize: 13, flexShrink: 0 }}>⌕</span>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar paciente..." style={{ flex: 1, background: 'transparent', color: 'var(--text)', fontSize: 13, outline: 'none', border: 'none' }} />
            </div>
          </div>
          <div style={{ overflowY: 'auto', maxHeight: 420 }}>
            {filteredPatients.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>Nenhum paciente encontrado</div>
            ) : (
              filteredPatients.map((a) => (
                <div key={a.paciente!.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderBottom: '1px solid var(--border)', transition: 'background 0.12s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.025)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                >
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--bg4)', border: '1px solid var(--border2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: 'var(--text2)', flexShrink: 0 }}>
                    {getInitials(a.paciente!.nome)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 5 }}>
                      {a.paciente!.nome}
                      {(a.riscoNoshow ?? 0) > 0.5 && <span style={{ color: '#fbbf24', fontSize: 11 }}>⚠</span>}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Badge color="default" style={{ fontSize: 9, padding: '2px 6px' }}>{a.convenio?.nome ?? 'Particular'}</Badge>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

// ─── Nav Button ─────────────────────────────────────────────────────────────
function NavBtn({ label }: { label: string }) {
  return (
    <button style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text2)', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'border-color 0.15s', flexShrink: 0 }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--text)' }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text2)' }}
    >
      {label}
    </button>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────────
type ViewMode = 'visao-geral' | 'por-medico'

export default function AgendaPage() {
  const [mode, setMode] = useState<ViewMode>('visao-geral')
  const [activeDocIdx, setActiveDocIdx] = useState(0)

  const { data: docData } = useApi<{ doctors: Doctor[] }>('/medicos')
  const { data: agendaData } = useApi<{ agendamentos: Appointment[] }>('/agenda')

  const doctors = docData?.doctors ?? []
  const appointments = agendaData?.agendamentos ?? []
  const activeDoc = doctors[activeDocIdx] ?? doctors[0]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: 3, gap: 2, flexShrink: 0 }}>
            {(['visao-geral', 'por-medico'] as ViewMode[]).map((v) => {
              const label = v === 'visao-geral' ? 'Visão geral' : 'Por médico'
              const isActive = mode === v
              return (
                <button key={v} onClick={() => setMode(v)} style={{
                  padding: '5px 13px', borderRadius: 6, fontSize: 12,
                  fontWeight: isActive ? 600 : 400, color: isActive ? 'var(--text)' : 'var(--text3)',
                  background: isActive ? 'var(--bg2)' : 'transparent',
                  border: isActive ? '1px solid var(--border2)' : '1px solid transparent', cursor: 'pointer', transition: 'all 0.15s',
                }}>
                  {label}
                </button>
              )
            })}
          </div>

          {mode === 'por-medico' && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 }}>
              {doctors.map((doc, i) => {
                const isActive = i === activeDocIdx
                const c = doc.corAgenda ?? getDocColor(i)
                const bg = getDocBg(i)
                return (
                  <button key={doc.id} onClick={() => setActiveDocIdx(i)} style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20,
                    fontSize: 12, fontWeight: isActive ? 600 : 400, color: isActive ? c : 'var(--text3)',
                    background: isActive ? bg : 'transparent', border: isActive ? `1px solid ${c}40` : '1px solid var(--border)',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                    onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.color = c; e.currentTarget.style.background = bg } }}
                    onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.color = 'var(--text3)'; e.currentTarget.style.background = 'transparent' } }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, flexShrink: 0 }} />
                    {doc.nome.replace(/^Dr[a]?\.\s*/, '')}
                  </button>
                )
              })}
            </div>
          )}

          {mode === 'visao-geral' && <div style={{ flex: 1 }} />}

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <NavBtn label="←" />
            <span style={{ fontSize: 12, color: 'var(--text2)', fontFamily: 'var(--mono)', padding: '0 6px', whiteSpace: 'nowrap' }}>
              {new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}
            </span>
            <NavBtn label="→" />
            <button style={{
              marginLeft: 8, height: 30, padding: '0 14px', borderRadius: 7,
              background: 'linear-gradient(135deg, #7c3aed, #3b82f6)', border: '1px solid rgba(139,92,246,0.5)',
              color: '#fff', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5,
              cursor: 'pointer', whiteSpace: 'nowrap',
            }}>
              <span style={{ fontSize: 14, lineHeight: 1 }}>+</span>
              Agendar
            </button>
          </div>
        </div>
      </Card>

      {!docData || !agendaData ? (
        <Card style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 14, color: 'var(--text3)' }}>Carregando agenda...</div>
        </Card>
      ) : mode === 'visao-geral' ? (
        <VisaoGeral doctors={doctors} appointments={appointments} />
      ) : activeDoc ? (
        <PorMedico doctor={activeDoc} appointments={appointments} docIdx={activeDocIdx} />
      ) : null}
    </div>
  )
}
