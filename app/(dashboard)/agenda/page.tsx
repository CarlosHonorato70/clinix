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
function NavBtn({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text2)', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'border-color 0.15s', flexShrink: 0 }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--text)' }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text2)' }}
    >
      {label}
    </button>
  )
}

// ─── Day View ───────────────────────────────────────────────────────────────
function DiaView({ doctors, appointments, currentDate }: { doctors: Doctor[]; appointments: Appointment[]; currentDate: Date }) {
  const dayAppts = appointments.filter((a) => {
    const d = new Date(a.dataHora)
    return d.toDateString() === currentDate.toDateString()
  }).sort((a, b) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime())

  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
          {currentDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)', marginTop: 2 }}>
          {dayAppts.length} {dayAppts.length === 1 ? 'agendamento' : 'agendamentos'}
        </div>
      </div>
      <div style={{ maxHeight: 'calc(100vh - 260px)', overflowY: 'auto' }}>
        {dayAppts.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>Nenhum agendamento para hoje</div>
        ) : (
          dayAppts.map((appt) => {
            const hora = new Date(appt.dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            const doctor = doctors.find((d) => d.id === appt.medico?.id)
            const docIdx = doctors.findIndex((d) => d.id === appt.medico?.id)
            const color = doctor?.corAgenda ?? getDocColor(docIdx >= 0 ? docIdx : 0)
            const bg = getDocBg(docIdx >= 0 ? docIdx : 0)
            return (
              <div key={appt.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 18px', borderBottom: '1px solid var(--border)', borderLeft: `3px solid ${color}`, background: bg }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 14, color: 'var(--text)', fontWeight: 600, minWidth: 60 }}>{hora}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {appt.paciente?.nome ?? '—'}
                    {(appt.riscoNoshow ?? 0) > 0.5 && <span style={{ color: '#fbbf24', fontSize: 12 }} title="Risco no-show">⚠</span>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>{appt.medico?.nome ?? '—'}</span>
                    <span>·</span>
                    <span>{appt.duracaoMin ?? 30} min</span>
                  </div>
                </div>
                <Badge color="default" style={{ fontSize: 10, padding: '3px 8px' }}>{appt.convenio?.nome ?? 'Particular'}</Badge>
              </div>
            )
          })
        )}
      </div>
    </Card>
  )
}

// ─── Week View ───────────────────────────────────────────────────────────────
function SemanaView({ doctors, appointments, currentDate }: { doctors: Doctor[]; appointments: Appointment[]; currentDate: Date }) {
  // Get Monday of current week
  const weekStart = new Date(currentDate)
  const dayOfWeek = weekStart.getDay()
  const diff = weekStart.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
  weekStart.setDate(diff)
  weekStart.setHours(0, 0, 0, 0)

  const days: Date[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    days.push(d)
  }

  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
          Semana {weekStart.getDate()} - {days[6].getDate()} de {weekStart.toLocaleDateString('pt-BR', { month: 'long' })}
        </div>
      </div>
      <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 260px)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: 72, textAlign: 'center' }}>Hora</th>
              {days.map((day, i) => (
                <th key={i} style={{ ...thStyle, minWidth: 120 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>
                    {day.toLocaleDateString('pt-BR', { weekday: 'short' })}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text2)', marginTop: 2 }}>
                    {day.getDate()}
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
                {days.map((day, dIdx) => {
                  const appt = appointments.find((a) => {
                    const ad = new Date(a.dataHora)
                    const t = ad.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                    return ad.toDateString() === day.toDateString() && t === slot
                  })
                  const docIdx = appt ? doctors.findIndex((d) => d.id === appt.medico?.id) : -1
                  const color = docIdx >= 0 ? (doctors[docIdx].corAgenda ?? getDocColor(docIdx)) : '#3b82f6'
                  const bg = docIdx >= 0 ? getDocBg(docIdx) : 'transparent'
                  return (
                    <td key={dIdx} style={{ ...tdBase, minWidth: 120 }}>
                      {appt ? (
                        <div style={{ margin: 3, padding: '5px 7px', borderRadius: 6, background: bg, borderLeft: `2px solid ${color}`, minHeight: 42 }}>
                          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text)', lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {appt.paciente?.nome ?? '—'}
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
  )
}

// ─── Month View ───────────────────────────────────────────────────────────────
function MesView({ appointments, currentDate }: { appointments: Appointment[]; currentDate: Date }) {
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // First day of month
  const firstDay = new Date(year, month, 1)
  // Last day of month
  const lastDay = new Date(year, month + 1, 0)

  // Start from Monday of the first week
  const startDate = new Date(firstDay)
  const dayOfWeek = firstDay.getDay()
  const offset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  startDate.setDate(firstDay.getDate() + offset)

  // 6 weeks × 7 days = 42 cells
  const cells: Date[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(startDate)
    d.setDate(startDate.getDate() + i)
    cells.push(d)
  }

  const weekdays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
          {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </div>
      </div>
      <div style={{ padding: 8 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 2 }}>
          {weekdays.map((d) => (
            <div key={d} style={{ padding: '6px 8px', fontSize: 10, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{d}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
          {cells.map((cell, i) => {
            const isCurrentMonth = cell.getMonth() === month
            const isToday = cell.toDateString() === new Date().toDateString()
            const dayAppts = appointments.filter((a) => new Date(a.dataHora).toDateString() === cell.toDateString())
            return (
              <div key={i} style={{
                minHeight: 80, padding: 6, borderRadius: 6,
                background: isCurrentMonth ? 'var(--bg3)' : 'transparent',
                border: isToday ? '1px solid var(--accent)' : '1px solid var(--border)',
                opacity: isCurrentMonth ? 1 : 0.4,
              }}>
                <div style={{ fontSize: 11, fontWeight: isToday ? 700 : 500, color: isToday ? 'var(--accent)' : 'var(--text2)', marginBottom: 4 }}>
                  {cell.getDate()}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {dayAppts.slice(0, 3).map((a, idx) => (
                    <div key={idx} style={{ fontSize: 9, padding: '1px 4px', borderRadius: 3, background: 'rgba(59,130,246,0.15)', color: '#93bbfc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {new Date(a.dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} {a.paciente?.nome?.split(' ')[0] ?? '—'}
                    </div>
                  ))}
                  {dayAppts.length > 3 && (
                    <div style={{ fontSize: 9, color: 'var(--text3)' }}>+{dayAppts.length - 3}</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </Card>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────────
type ViewMode = 'visao-geral' | 'por-medico' | 'dia' | 'semana' | 'mes'

export default function AgendaPage() {
  const [mode, setMode] = useState<ViewMode>('visao-geral')
  const [activeDocIdx, setActiveDocIdx] = useState(0)
  const [currentDate, setCurrentDate] = useState(new Date())

  const { data: docData } = useApi<{ doctors: Doctor[] }>('/medicos')
  const { data: agendaData } = useApi<{ agendamentos: Appointment[] }>('/agenda')

  const doctors = docData?.doctors ?? []
  const appointments = agendaData?.agendamentos ?? []
  const activeDoc = doctors[activeDocIdx] ?? doctors[0]

  function navigateDate(direction: 'prev' | 'next') {
    const d = new Date(currentDate)
    if (mode === 'mes') d.setMonth(d.getMonth() + (direction === 'prev' ? -1 : 1))
    else if (mode === 'semana') d.setDate(d.getDate() + (direction === 'prev' ? -7 : 7))
    else d.setDate(d.getDate() + (direction === 'prev' ? -1 : 1))
    setCurrentDate(d)
  }

  function formatDateLabel(): string {
    if (mode === 'mes') return currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    if (mode === 'semana') {
      const start = new Date(currentDate)
      const dow = start.getDay()
      start.setDate(start.getDate() - dow + (dow === 0 ? -6 : 1))
      const end = new Date(start)
      end.setDate(start.getDate() + 6)
      return `${start.getDate()}/${start.getMonth() + 1} - ${end.getDate()}/${end.getMonth() + 1}`
    }
    return currentDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: 3, gap: 2, flexShrink: 0, flexWrap: 'wrap' }}>
            {(['dia', 'semana', 'mes', 'visao-geral', 'por-medico'] as ViewMode[]).map((v) => {
              const labels: Record<ViewMode, string> = {
                'dia': 'Dia',
                'semana': 'Semana',
                'mes': 'Mês',
                'visao-geral': 'Visão geral',
                'por-medico': 'Por médico',
              }
              const isActive = mode === v
              return (
                <button key={v} onClick={() => setMode(v)} style={{
                  padding: '5px 13px', borderRadius: 6, fontSize: 12,
                  fontWeight: isActive ? 600 : 400, color: isActive ? 'var(--text)' : 'var(--text3)',
                  background: isActive ? 'var(--bg2)' : 'transparent',
                  border: isActive ? '1px solid var(--border2)' : '1px solid transparent', cursor: 'pointer', transition: 'all 0.15s',
                }}>
                  {labels[v]}
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

          {mode !== 'por-medico' && <div style={{ flex: 1 }} />}

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <NavBtn label="←" onClick={() => navigateDate('prev')} />
            <span style={{ fontSize: 12, color: 'var(--text2)', fontFamily: 'var(--mono)', padding: '0 6px', whiteSpace: 'nowrap' }}>
              {formatDateLabel()}
            </span>
            <NavBtn label="→" onClick={() => navigateDate('next')} />
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
      ) : mode === 'dia' ? (
        <DiaView doctors={doctors} appointments={appointments} currentDate={currentDate} />
      ) : mode === 'semana' ? (
        <SemanaView doctors={doctors} appointments={appointments} currentDate={currentDate} />
      ) : mode === 'mes' ? (
        <MesView appointments={appointments} currentDate={currentDate} />
      ) : mode === 'visao-geral' ? (
        <VisaoGeral doctors={doctors} appointments={appointments} />
      ) : activeDoc ? (
        <PorMedico doctor={activeDoc} appointments={appointments} docIdx={activeDocIdx} />
      ) : null}
    </div>
  )
}
